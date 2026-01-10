// ============================================
// MAIN APPLICATION CONTROLLER
// With Theme Toggle and New Modules
// ============================================

const App = {
    currentPage: 'dashboard',
    currentTheme: 'dark',

    init() {
        console.log('Initializing Business Manager...');

        // Load saved theme
        this.loadTheme();

        // Initialize all modules
        this.initModules();

        // Setup navigation
        this.setupNavigation();

        // Setup theme toggle
        this.setupThemeToggle();

        // Setup payment status handler
        this.setupPaymentStatusHandler();

        // Load initial data
        this.loadData();

        console.log('Business Manager initialized successfully!');
    },

    async initModules() {
        // Initialize offline manager (already initialized)
        // Initialize Google Sheets API
        if (window.SheetsAPI) {
            await SheetsAPI.init();
            SheetsAPI.startAutoSync();
        }

        // Initialize sales manager
        if (window.SalesManager) {
            SalesManager.init();
        }

        // Initialize expenses manager
        if (window.ExpensesManager) {
            ExpensesManager.init();
        }

        // Initialize services manager
        if (window.ServicesManager) {
            ServicesManager.init();
        }

        // Initialize customers manager
        if (window.CustomersManager) {
            CustomersManager.init();
        }

        // Initialize tenders manager
        if (window.TendersManager) {
            TendersManager.init();
        }

        // Initialize reports manager
        if (window.ReportsManager) {
            ReportsManager.init();
        }

        // Initialize dashboard
        if (window.Dashboard) {
            Dashboard.init();
        }
    },

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.navigateTo(page);
            });
        });
    },

    navigateTo(pageName) {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageName) {
                item.classList.add('active');
            }
        });

        // Update active page
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageName;

            // Refresh data when navigating to a page
            if (pageName === 'dashboard' && window.Dashboard) {
                Dashboard.updateStats();
            } else if (pageName === 'sales' && window.SalesManager) {
                SalesManager.loadSales();
            } else if (pageName === 'expenses' && window.ExpensesManager) {
                ExpensesManager.loadExpenses();
            } else if (pageName === 'services' && window.ServicesManager) {
                ServicesManager.render();
            } else if (pageName === 'customers' && window.CustomersManager) {
                CustomersManager.render();
            } else if (pageName === 'tenders' && window.TendersManager) {
                TendersManager.render();
            } else if (pageName === 'reports' && window.ReportsManager) {
                ReportsManager.setDefaultDates();
            }
        }
    },

    // Theme Toggle Functionality
    setupThemeToggle() {
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    },

    loadTheme() {
        const savedTheme = localStorage.getItem('business-manager-theme') || 'dark';
        this.currentTheme = savedTheme;
        this.applyTheme(savedTheme);
    },

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.currentTheme = newTheme;
        this.applyTheme(newTheme);
        localStorage.setItem('business-manager-theme', newTheme);
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);

        // Update theme icon
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            if (theme === 'light') {
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            } else {
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
            }
        }
    },

    // Payment Status Handler
    setupPaymentStatusHandler() {
        const paymentStatus = document.getElementById('sale-payment-status');
        const paidAmountGroup = document.getElementById('paid-amount-group');

        if (paymentStatus && paidAmountGroup) {
            paymentStatus.addEventListener('change', () => {
                if (paymentStatus.value === 'Partial') {
                    paidAmountGroup.style.display = 'block';
                } else {
                    paidAmountGroup.style.display = 'none';
                }
            });
        }
    },

    async loadData() {
        // Data is loaded by individual modules
        console.log('Loading application data...');
    }
};

// Make App available globally
window.App = App;

// Don't auto-initialize here - Auth module will call App.init() after login
