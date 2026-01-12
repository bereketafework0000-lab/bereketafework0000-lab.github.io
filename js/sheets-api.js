// ============================================
// GOOGLE SHEETS API INTEGRATION
// ============================================

const SheetsAPI = {
    CLIENT_ID: '399988559636-h41n0ev5l4hni5mbdm84n2jaa64mmdpq.apps.googleusercontent.com', // User needs to replace this
    API_KEY: 'AIzaSyCY1JPzWbQLSWL4y_w9V4-4wcUxb9KcpVQ', // User needs to replace this
    DISCOVERY_DOCS: [
        'https://sheets.googleapis.com/$discovery/rest?version=v4',
        'https://www.googleapis.com/discovery/v1/rest?version=v3'
    ],
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',

    spreadsheetId: null,
    isConnected: false,
    tokenClient: null,
    gapiInited: false,
    gisInited: false,

    async init() {
        this.cacheElements();
        this.loadCredentials();
        if (this.checkProtocol()) {
            await this.initializeGoogleAPIs();

            // If previously connected, try to get a token silently
            if (this.isConnected) {
                try {
                    await this.ensureToken(true); // Silent request
                } catch (e) {
                    console.log('Silent token request failed, user may need to re-authenticate');
                }
            }
        }
    },

    initializeGoogleAPIs() {
        return new Promise((resolve) => {
            let gapiReady = false;
            let gisReady = false;

            const checkReady = () => {
                if (gapiReady && gisReady) resolve();
            };

            // Load the gapi library
            if (typeof gapi !== 'undefined') {
                gapi.load('client', async () => {
                    await this.gapiInit();
                    gapiReady = true;
                    checkReady();
                });
            } else {
                gapiReady = true; // Skip if script failed to load
            }

            // Load the GIS library
            if (typeof google !== 'undefined') {
                this.gisInit();
                gisReady = true;
                checkReady();
            } else {
                gisReady = true;
            }
        });
    },

    ensureToken(silent = false) {
        return new Promise((resolve, reject) => {
            if (!this.gisInited) return reject('GIS not initialized');

            if (gapi.client.getToken()) return resolve();

            this.tokenClient.callback = async (resp) => {
                if (resp.error !== undefined) {
                    return reject(resp);
                }
                resolve();
            };

            if (silent) {
                this.tokenClient.requestAccessToken({ prompt: '' });
            } else {
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            }
        });
    },

    async gapiInit() {
        try {
            await gapi.client.init({
                apiKey: this.API_KEY,
                discoveryDocs: this.DISCOVERY_DOCS,
            });
            this.gapiInited = true;
            this.maybeEnableButtons();
        } catch (error) {
            console.error('Error initializing GAPI:', error);
            this.updateConnectionStatus(false, 'GAPI Init Failed: ' + (error.details || error.message || 'Unknown error'));
        }
    },

    gisInit() {
        try {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.CLIENT_ID,
                scope: this.SCOPES,
                callback: '', // defined later
            });
            this.gisInited = true;
            this.maybeEnableButtons();
        } catch (error) {
            console.error('Error initializing GIS:', error);
            this.updateConnectionStatus(false, 'GIS Init Failed: Check Client ID');
        }
    },

    maybeEnableButtons() {
        if (this.gapiInited && this.gisInited) {
            this.elements.connectBtn.disabled = false;
        }
    },

    handleAuthClick() {
        if (this.isConnected) {
            this.disconnect();
        } else {
            this.connect();
        }
    },

    async connect() {
        try {
            await this.ensureToken(false); // Interactive prompt

            // Successfully authenticated
            await this.setupSpreadsheet();
            this.isConnected = true;
            localStorage.setItem('sheets_connected', 'true');
            this.updateConnectionStatus(true);

            // Sync existing data
            await this.syncAllData();

            // Sync security PIN if on a new device
            if (window.Auth && !localStorage.getItem(window.Auth.PIN_KEY)) {
                await window.Auth.syncFromCloud();
            }
        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    },

    disconnect() {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
        }

        this.isConnected = false;
        localStorage.removeItem('sheets_connected');
        this.updateConnectionStatus(false);
    },

    updateConnectionStatus(connected, errorMessage = null) {
        if (connected) {
            this.elements.googleStatus.textContent = 'Connected';
            this.elements.connectBtn.classList.add('connected');
            this.setSyncStatus('synced');
            this.elements.connectBtn.title = 'Google Account Connected';
        } else {
            this.elements.googleStatus.textContent = errorMessage || 'Connect Google';
            this.elements.connectBtn.classList.remove('connected');
            this.setSyncStatus('offline');
            if (errorMessage) {
                this.elements.connectBtn.title = errorMessage;
            }
        }
    },

    setSyncStatus(status) {
        const syncContainer = this.elements.syncIcon.parentElement;

        if (status === 'syncing') {
            this.elements.syncText.textContent = 'Syncing...';
            syncContainer.classList.add('syncing');
        } else if (status === 'synced') {
            this.elements.syncText.textContent = 'Synced';
            syncContainer.classList.remove('syncing');
        } else {
            this.elements.syncText.textContent = 'Offline';
            syncContainer.classList.remove('syncing');
        }
    },

    async setupSpreadsheet() {
        try {
            if (!this.spreadsheetId) {
                // 1. Search for existing spreadsheet
                const searchResponse = await gapi.client.drive.files.list({
                    q: "name = 'Business Manager Data' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
                    fields: 'files(id, name)',
                    spaces: 'drive'
                });

                const files = searchResponse.result.files;
                if (files && files.length > 0) {
                    console.log('Found existing spreadsheet:', files[0].name);
                    this.spreadsheetId = files[0].id;
                } else {
                    // 2. Create new spreadsheet if not found
                    console.log('Creating new spreadsheet...');
                    const response = await gapi.client.sheets.spreadsheets.create({
                        properties: {
                            title: 'Business Manager Data'
                        },
                        sheets: [
                            { properties: { title: 'Sales' } },
                            { properties: { title: 'Expenses' } },
                            { properties: { title: 'Tenders' } },
                            { properties: { title: 'Services' } },
                            { properties: { title: 'Customers' } },
                            { properties: { title: 'Companies' } },
                            { properties: { title: 'Settings' } }
                        ]
                    });
                    this.spreadsheetId = response.result.spreadsheetId;
                    await this.addHeaders();
                }

                localStorage.setItem('sheets_spreadsheet_id', this.spreadsheetId);
            }
        } catch (error) {
            console.error('Error setting up spreadsheet:', error);
            throw error;
        }
    },

    async addHeaders() {
        const headers = [
            ['ID', 'Date', 'Description', 'Category', 'Amount']
        ];
        const tenderHeaders = [
            ['ID', 'Reference', 'Title', 'Client', 'Status', 'Date', 'Bid Amount', 'Award Amount', 'Expenses']
        ];
        const serviceHeaders = [
            ['ID', 'Customer', 'Device', 'Problem', 'Status', 'Received', 'Due', 'Amount', 'Notes']
        ];
        const customerHeaders = [
            ['ID', 'Name', 'Phone', 'Email', 'Address', 'Balance']
        ];
        const settingsHeaders = [
            ['Key', 'Value']
        ];
        const companyHeaders = [
            ['ID', 'Name', 'Contact', 'Phone', 'Email']
        ];

        // Add headers to Sales sheet
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Sales!A1:E1',
            valueInputOption: 'RAW',
            resource: { values: headers }
        });

        // Add headers to Expenses sheet
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Expenses!A1:E1',
            valueInputOption: 'RAW',
            resource: { values: headers }
        });

        // Add headers to Tenders sheet
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Tenders!A1:I1',
            valueInputOption: 'RAW',
            resource: { values: tenderHeaders }
        });

        // Add headers to Services sheet
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Services!A1:I1',
            valueInputOption: 'RAW',
            resource: { values: serviceHeaders }
        });

        // Add headers to Customers sheet
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Customers!A1:F1',
            valueInputOption: 'RAW',
            resource: { values: customerHeaders }
        });

        // Add headers to Settings sheet
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Settings!A1:B1',
            valueInputOption: 'RAW',
            resource: { values: settingsHeaders }
        });

        // Add headers to Companies sheet
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Companies!A1:E1',
            valueInputOption: 'RAW',
            resource: { values: companyHeaders }
        });
    },

    async addSale(sale) {
        if (!this.isConnected) return;
        this.setSyncStatus('syncing');
        try {
            await this.ensureToken(true);
            const values = [[
                sale.id,
                sale.date,
                sale.description,
                sale.category,
                sale.amount
            ]];

            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'Sales!A:E',
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });

            this.setSyncStatus('synced');
        } catch (error) {
            console.error('Error adding sale:', error);
            this.setSyncStatus('synced');
        }
    },

    async addExpense(expense) {
        if (!this.isConnected) return;
        this.setSyncStatus('syncing');
        try {
            await this.ensureToken(true);
            const values = [[
                expense.id,
                expense.date,
                expense.description,
                expense.category,
                expense.amount
            ]];

            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'Expenses!A:E',
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });

            this.setSyncStatus('synced');
        } catch (error) {
            console.error('Error adding expense:', error);
            this.setSyncStatus('synced');
        }
    },

    async addTender(tender) {
        if (!this.isConnected) return;
        this.setSyncStatus('syncing');
        try {
            await this.ensureToken(true);
            const expensesStr = tender.expenses ? JSON.stringify(tender.expenses) : '[]';
            const values = [[
                tender.id,
                tender.reference,
                tender.title,
                tender.companyId, // Should verify if this is ID or Name, usually ID.
                tender.status,
                tender.submissionDate,
                tender.bidAmount,
                tender.awardAmount || 0,
                expensesStr
            ]];

            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'Tenders!A:I',
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });
            this.setSyncStatus('synced');
        } catch (error) {
            console.error('Error adding tender:', error);
            this.setSyncStatus('synced');
        }
    },

    async addService(service) {
        if (!this.isConnected) return;
        this.setSyncStatus('syncing');
        try {
            await this.ensureToken(true);
            const values = [[
                service.id,
                service.customer,
                service.device,
                service.problem,
                service.status,
                service.receivedDate,
                service.dueDate,
                service.amount,
                service.notes
            ]];

            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'Services!A:I',
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });
            this.setSyncStatus('synced');
        } catch (error) {
            console.error('Error adding service:', error);
            this.setSyncStatus('synced');
        }
    },

    async addCustomer(customer) {
        if (!this.isConnected) return;
        this.setSyncStatus('syncing');
        try {
            await this.ensureToken(true);
            const values = [[
                customer.id,
                customer.name,
                customer.phone,
                customer.email,
                customer.address,
                customer.balance
            ]];

            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'Customers!A:F',
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });
            this.setSyncStatus('synced');
        } catch (error) {
            console.error('Error adding customer:', error);
            this.setSyncStatus('synced');
        }
    },

    async addTenderCompany(company) {
        if (!this.isConnected) return;
        this.setSyncStatus('syncing');
        try {
            await this.ensureToken(true);
            const values = [[
                company.id,
                company.name,
                company.contact,
                company.phone,
                company.email
            ]];

            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'Companies!A:E',
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });
            this.setSyncStatus('synced');
        } catch (error) {
            console.error('Error adding company:', error);
            this.setSyncStatus('synced');
        }
    },

    async getSales() {
        if (!this.isConnected) return [];
        try {
            await this.ensureToken(true);
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Sales!A2:E' // Skip header row
            });

            const values = response.result.values || [];
            return values.map((row) => ({
                id: isNaN(row[0]) ? row[0] : parseInt(row[0]),
                date: row[1] || '',
                description: row[2] || '',
                category: row[3] || '',
                amount: parseFloat(row[4]) || 0
            }));
        } catch (error) {
            console.error('Error getting sales:', error);
            return [];
        }
    },

    async getExpenses() {
        if (!this.isConnected) return [];
        try {
            await this.ensureToken(true);
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Expenses!A2:E' // Skip header row
            });

            const values = response.result.values || [];
            return values.map((row) => ({
                id: isNaN(row[0]) ? row[0] : parseInt(row[0]),
                date: row[1] || '',
                description: row[2] || '',
                category: row[3] || '',
                amount: parseFloat(row[4]) || 0
            }));
        } catch (error) {
            console.error('Error getting expenses:', error);
            return [];
        }
    },

    async getTenders() {
        if (!this.isConnected) return [];
        try {
            await this.ensureToken(true);
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Tenders!A2:I'
            });
            const values = response.result.values || [];
            return values.map(row => ({
                id: row[0],
                reference: row[1] || '',
                title: row[2] || '',
                companyId: row[3] || '',
                status: row[4] || '',
                submissionDate: row[5] || '',
                bidAmount: parseFloat(row[6]) || 0,
                awardAmount: parseFloat(row[7]) || 0,
                expenses: JSON.parse(row[8] || '[]')
            }));
        } catch (error) {
            console.error('Error getting tenders:', error);
            return [];
        }
    },

    async getTenderCompanies() {
        if (!this.isConnected) return [];
        try {
            await this.ensureToken(true);
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Companies!A2:E'
            });
            const values = response.result.values || [];
            return values.map(row => ({
                id: row[0],
                name: row[1] || '',
                contact: row[2] || '',
                phone: row[3] || '',
                email: row[4] || ''
            }));
        } catch (error) {
            console.error('Error getting companies:', error);
            return [];
        }
    },

    async getServices() {
        if (!this.isConnected) return [];
        try {
            await this.ensureToken(true);
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Services!A2:I'
            });
            const values = response.result.values || [];
            return values.map(row => ({
                id: row[0],
                customer: row[1] || '',
                device: row[2] || '',
                problem: row[3] || '',
                status: row[4] || '',
                receivedDate: row[5] || '',
                dueDate: row[6] || '',
                amount: parseFloat(row[7]) || 0,
                notes: row[8] || ''
            }));
        } catch (error) {
            console.error('Error getting services:', error);
            return [];
        }
    },

    async getCustomers() {
        if (!this.isConnected) return [];
        try {
            await this.ensureToken(true);
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Customers!A2:F'
            });
            const values = response.result.values || [];
            return values.map(row => ({
                id: row[0],
                name: row[1] || '',
                phone: row[2] || '',
                email: row[3] || '',
                address: row[4] || '',
                balance: parseFloat(row[5]) || 0
            }));
        } catch (error) {
            console.error('Error getting customers:', error);
            return [];
        }
    },

    async getSetting(key) {
        if (!this.isConnected) return null;
        try {
            await this.ensureToken(true);
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Settings!A2:B100'
            });
            const values = response.result.values || [];
            const row = values.find(r => r[0] === key);
            return row ? row[1] : null;
        } catch (error) {
            console.error('Error getting setting:', error);
            return null;
        }
    },

    async setSetting(key, value) {
        if (!this.isConnected) return;
        try {
            await this.ensureToken(true);
            // Check if key already exists
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Settings!A2:B100'
            });
            const values = response.result.values || [];
            const rowIndex = values.findIndex(r => r[0] === key);

            if (rowIndex !== -1) {
                // Update existing
                await gapi.client.sheets.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `Settings!B${rowIndex + 2}`,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[value]] }
                });
            } else {
                // Append new
                await gapi.client.sheets.spreadsheets.values.append({
                    spreadsheetId: this.spreadsheetId,
                    range: 'Settings!A:B',
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[key, value]] }
                });
            }
        } catch (error) {
            console.error('Error setting setting:', error);
        }
    },

    async syncAllData() {
        if (!this.isConnected || typeof OfflineManager === 'undefined') return;

        this.setSyncStatus('syncing');

        try {
            // Get local unsynced data
            const unsyncedSales = await OfflineManager.getUnsynced('sales');
            const unsyncedExpenses = await OfflineManager.getUnsynced('expenses');

            // Upload unsynced data
            for (const sale of unsyncedSales) {
                await this.addSale(sale);
                await OfflineManager.markAsSynced('sales', sale.id);
            }

            for (const expense of unsyncedExpenses) {
                await this.addExpense(expense);
                await OfflineManager.markAsSynced('expenses', expense.id);
            }

            // Sync Tenders
            const unsyncedTenders = await OfflineManager.getUnsynced('tenders');
            for (const tender of unsyncedTenders) {
                await this.addTender(tender);
                await OfflineManager.markAsSynced('tenders', tender.id);
            }

            // Sync Services
            const unsyncedServices = await OfflineManager.getUnsynced('services');
            for (const service of unsyncedServices) {
                await this.addService(service);
                await OfflineManager.markAsSynced('services', service.id);
            }

            // Sync Customers
            const unsyncedCustomers = await OfflineManager.getUnsynced('customers');
            for (const customer of unsyncedCustomers) {
                await this.addCustomer(customer);
                await OfflineManager.markAsSynced('customers', customer.id);
            }

            // Sync Tender Companies
            const unsyncedCompanies = await OfflineManager.getUnsynced('tenderCompanies');
            for (const company of unsyncedCompanies) {
                await this.addTenderCompany(company);
                await OfflineManager.markAsSynced('tenderCompanies', company.id);
            }

            this.setSyncStatus('synced');
            console.log('Sync completed successfully. Refreshing local data...');

            // Pulse reload all components to fetch latest from cloud
            if (window.SalesManager) await SalesManager.loadSales();
            if (window.ExpensesManager) await ExpensesManager.loadExpenses();
            if (window.ServicesManager) await ServicesManager.loadServices();
            if (window.CustomersManager) await CustomersManager.loadCustomers();
            if (window.TendersManager) await TendersManager.loadData();

            // Refresh dashboard if visible
            if (window.Dashboard) Dashboard.updateStats();
        } catch (error) {
            console.error('Sync error:', error);
            this.setSyncStatus('synced');
        }
    },

    // Auto-sync every 5 minutes
    startAutoSync() {
        setInterval(() => {
            if (this.isConnected && navigator.onLine) {
                this.syncAllData();
            }
        }, 5 * 60 * 1000); // 5 minutes
    }
};

// Initialize after DOM loads
window.SheetsAPI = SheetsAPI;
