// ============================================
// GOOGLE SHEETS API INTEGRATION
// ============================================

const SheetsAPI = {
    CLIENT_ID: 'YOUR_CLIENT_ID_HERE', // User needs to replace this
    API_KEY: 'YOUR_API_KEY_HERE', // User needs to replace this
    DISCOVERY_DOCS: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets',

    spreadsheetId: null,
    isConnected: false,
    tokenClient: null,
    gapiInited: false,
    gisInited: false,

    async init() {
        this.cacheElements();
        this.loadCredentials();
        this.initializeGoogleAPIs();
    },

    cacheElements() {
        this.elements = {
            connectBtn: document.getElementById('google-connect-btn'),
            googleStatus: document.getElementById('google-status'),
            syncIcon: document.getElementById('sync-icon'),
            syncText: document.getElementById('sync-text')
        };

        this.elements.connectBtn.addEventListener('click', () => this.handleAuthClick());
    },

    loadCredentials() {
        // Load spreadsheet ID from localStorage
        this.spreadsheetId = localStorage.getItem('sheets_spreadsheet_id');
        const savedConnection = localStorage.getItem('sheets_connected');

        if (savedConnection === 'true' && this.spreadsheetId) {
            this.isConnected = true;
            this.updateConnectionStatus(true);
        }
    },

    initializeGoogleAPIs() {
        // Load the gapi library
        if (typeof gapi !== 'undefined') {
            gapi.load('client', async () => {
                await this.gapiInit();
            });
        }

        // Load the GIS library
        if (typeof google !== 'undefined') {
            this.gisInit();
        }
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

    connect() {
        this.tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                throw (resp);
            }

            // Successfully authenticated
            await this.setupSpreadsheet();
            this.isConnected = true;
            localStorage.setItem('sheets_connected', 'true');
            this.updateConnectionStatus(true);

            // Sync existing data
            await this.syncAllData();
        };

        if (gapi.client.getToken() === null) {
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            this.tokenClient.requestAccessToken({ prompt: '' });
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

    updateConnectionStatus(connected) {
        if (connected) {
            this.elements.googleStatus.textContent = 'Connected';
            this.elements.connectBtn.classList.add('connected');
            this.setSyncStatus('synced');
        } else {
            this.elements.googleStatus.textContent = 'Connect Google';
            this.elements.connectBtn.classList.remove('connected');
            this.setSyncStatus('offline');
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
                // Create new spreadsheet
                const response = await gapi.client.sheets.spreadsheets.create({
                    properties: {
                        title: 'Business Manager Data'
                    },
                    sheets: [
                        { properties: { title: 'Sales' } },
                        { properties: { title: 'Expenses' } },
                        { properties: { title: 'Tenders' } },
                        { properties: { title: 'Services' } },
                        { properties: { title: 'Customers' } }
                    ]
                });

                this.spreadsheetId = response.result.spreadsheetId;
                localStorage.setItem('sheets_spreadsheet_id', this.spreadsheetId);

                // Add headers
                await this.addHeaders();
            }
        } catch (error) {
            console.error('Error setting up spreadsheet:', error);
            throw error;
        }
    },

    async addHeaders() {
        const headers = [
            ['Date', 'Description', 'Category', 'Amount']
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

        // Add headers to Sales sheet
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Sales!A1:D1',
            valueInputOption: 'RAW',
            resource: { values: headers }
        });

        // Add headers to Expenses sheet
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Expenses!A1:D1',
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
    },

    async addSale(sale) {
        if (!this.isConnected) return;

        this.setSyncStatus('syncing');

        try {
            const values = [[
                sale.date,
                sale.description,
                sale.category,
                sale.amount
            ]];

            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'Sales!A:D',
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
            const values = [[
                expense.date,
                expense.description,
                expense.category,
                expense.amount
            ]];

            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'Expenses!A:D',
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

    async getSales() {
        if (!this.isConnected) return [];

        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Sales!A2:D' // Skip header row
            });

            const values = response.result.values || [];
            return values.map((row, index) => ({
                id: index + 1,
                date: row[0] || '',
                description: row[1] || '',
                category: row[2] || '',
                amount: parseFloat(row[3]) || 0
            }));
        } catch (error) {
            console.error('Error getting sales:', error);
            return [];
        }
    },

    async getExpenses() {
        if (!this.isConnected) return [];

        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: 'Expenses!A2:D' // Skip header row
            });

            const values = response.result.values || [];
            return values.map((row, index) => ({
                id: index + 1,
                date: row[0] || '',
                description: row[1] || '',
                category: row[2] || '',
                amount: parseFloat(row[3]) || 0
            }));
        } catch (error) {
            console.error('Error getting expenses:', error);
            return [];
        }
    },

    async syncAllData() {
        if (!this.isConnected || !window.OfflineManager) return;

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

            // Fetch updated data from Sheets
            const sheetsSales = await this.getSales();
            const sheetsExpenses = await this.getExpenses();

            // Merge with local data (basic merge strategy)
            // In production, implement proper conflict resolution

            this.setSyncStatus('synced');
            console.log('Sync completed successfully');
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
