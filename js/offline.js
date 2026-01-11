// ============================================
// OFFLINE SUPPORT - IndexedDB & Service Worker
// ============================================

const OfflineManager = {
    DB_NAME: 'BusinessManagerDB',
    DB_VERSION: 2,
    db: null,

    async init() {
        await this.initDB();
        this.registerServiceWorker();
        this.monitorConnection();
    },

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Sales store
                if (!db.objectStoreNames.contains('sales')) {
                    const salesStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
                    salesStore.createIndex('date', 'date', { unique: false });
                    salesStore.createIndex('synced', 'synced', { unique: false });
                }

                // Expenses store
                if (!db.objectStoreNames.contains('expenses')) {
                    const expensesStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
                    expensesStore.createIndex('date', 'date', { unique: false });
                    expensesStore.createIndex('synced', 'synced', { unique: false });
                }

                // Pending sync queue
                if (!db.objectStoreNames.contains('syncQueue')) {
                    db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                }

                // Tenders store
                if (!db.objectStoreNames.contains('tenders')) {
                    const tendersStore = db.createObjectStore('tenders', { keyPath: 'id' });
                    tendersStore.createIndex('synced', 'synced', { unique: false });
                }

                // Tender Companies store
                if (!db.objectStoreNames.contains('tenderCompanies')) {
                    const tenderCompaniesStore = db.createObjectStore('tenderCompanies', { keyPath: 'id' });
                    tenderCompaniesStore.createIndex('synced', 'synced', { unique: false });
                }

                // Services store
                if (!db.objectStoreNames.contains('services')) {
                    const servicesStore = db.createObjectStore('services', { keyPath: 'id' });
                    servicesStore.createIndex('synced', 'synced', { unique: false });
                }

                // Customers store
                if (!db.objectStoreNames.contains('customers')) {
                    const customersStore = db.createObjectStore('customers', { keyPath: 'id' });
                    customersStore.createIndex('synced', 'synced', { unique: false });
                }
            };
        });
    },

    async getDb() {
        if (this.db) return this.db;
        if (!this._initPromise) {
            this._initPromise = this.initDB();
        }
        return this._initPromise;
    },

    async save(storeName, data) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add({ ...data, synced: false, timestamp: Date.now() });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async update(storeName, data) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put({ ...data, synced: false, timestamp: Date.now() });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async delete(storeName, id) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getAll(storeName) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getUnsynced(storeName) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index('synced');
            const request = index.getAll(false);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async markAsSynced(storeName, id) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const data = getRequest.result;
                if (data) {
                    data.synced = true;
                    const updateRequest = store.put(data);
                    updateRequest.onsuccess = () => resolve();
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    resolve();
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    },

    async addToSyncQueue(action, storeName, data) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.add({
                action,
                storeName,
                data,
                timestamp: Date.now()
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getSyncQueue() {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['syncQueue'], 'readonly');
            const store = transaction.objectStore('syncQueue');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async clearSyncQueue() {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async saveData(storeName, data) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);

            if (Array.isArray(data)) {
                data.forEach(item => store.put(item));
            } else {
                store.put(data);
            }
        });
    },

    async getData(storeName) {
        return this.getAll(storeName);
    },

    async clear(storeName) {
        const db = await this.getDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        }
    },

    monitorConnection() {
        const offlineIndicator = document.getElementById('offline-indicator');

        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                offlineIndicator.classList.add('hidden');
                this.syncWhenOnline();
            } else {
                offlineIndicator.classList.remove('hidden');
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        // Initial check
        updateOnlineStatus();
    },

    async syncWhenOnline() {
        if (!navigator.onLine) return;

        try {
            // Get unsynced items
            const unsyncedSales = await this.getUnsynced('sales');
            const unsyncedExpenses = await this.getUnsynced('expenses');

            // Sync with Google Sheets if connected
            if (window.SheetsAPI && window.SheetsAPI.isConnected) {
                for (const sale of unsyncedSales) {
                    await window.SheetsAPI.addSale(sale);
                    await this.markAsSynced('sales', sale.id);
                }

                for (const expense of unsyncedExpenses) {
                    await window.SheetsAPI.addExpense(expense);
                    await this.markAsSynced('expenses', expense.id);
                }

                // Sync Tenders
                const unsyncedTenders = await this.getUnsynced('tenders');
                for (const tender of unsyncedTenders) {
                    await window.SheetsAPI.addTender(tender);
                    await this.markAsSynced('tenders', tender.id);
                }

                // Sync Services
                const unsyncedServices = await this.getUnsynced('services');
                for (const service of unsyncedServices) {
                    await window.SheetsAPI.addService(service);
                    await this.markAsSynced('services', service.id);
                }

                // Sync Customers
                const unsyncedCustomers = await this.getUnsynced('customers');
                for (const customer of unsyncedCustomers) {
                    await window.SheetsAPI.addCustomer(customer);
                    await this.markAsSynced('customers', customer.id);
                }

                // Sync Tender Companies
                const unsyncedCompanies = await this.getUnsynced('tenderCompanies');
                for (const company of unsyncedCompanies) {
                    await window.SheetsAPI.addTenderCompany(company);
                    await this.markAsSynced('tenderCompanies', company.id);
                }
            }

            console.log('Sync completed successfully');
        } catch (error) {
            console.error('Sync failed:', error);
        }
    },

    async getData(storeName) {
        return this.getAll(storeName);
    }
};

// Initialize offline manager
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => OfflineManager.init());
} else {
    OfflineManager.init();
}
