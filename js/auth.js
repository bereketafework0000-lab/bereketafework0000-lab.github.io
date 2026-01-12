// ============================================
// AUTHENTICATION MODULE - PIN Login System
// ============================================

const Auth = {
    PIN_KEY: 'business_manager_pin',
    SESSION_KEY: 'business_manager_session',
    TIMEOUT_DURATION: 30 * 60 * 1000, // 30 minutes

    elements: {
        loginScreen: null,
        app: null,
        pinSetup: null,
        pinLogin: null,
        setupPin: null,
        confirmPin: null,
        loginPin: null,
        createPinBtn: null,
        loginBtn: null,
        loginError: null,
        resetPinBtn: null,
        logoutBtn: null,
        syncGoogleBtn: null
    },

    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.checkAuth();
        this.startInactivityTimer();
    },

    cacheElements() {
        this.elements = {
            loginScreen: document.getElementById('login-screen'),
            app: document.getElementById('app'),
            pinSetup: document.getElementById('pin-setup'),
            pinLogin: document.getElementById('pin-login'),
            setupPin: document.getElementById('setup-pin'),
            confirmPin: document.getElementById('confirm-pin'),
            loginPin: document.getElementById('login-pin'),
            createPinBtn: document.getElementById('create-pin-btn'),
            loginBtn: document.getElementById('login-btn'),
            loginError: document.getElementById('login-error'),
            resetPinBtn: document.getElementById('reset-pin-btn'),
            logoutBtn: document.getElementById('logout-btn'),
            syncGoogleBtn: document.getElementById('sync-google-setup-btn')
        };
    },

    attachEventListeners() {
        // PIN Setup
        this.elements.createPinBtn.addEventListener('click', () => this.createPin());
        this.elements.setupPin.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.elements.confirmPin.focus();
        });
        this.elements.confirmPin.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createPin();
        });

        // PIN Login
        this.elements.loginBtn.addEventListener('click', () => this.login());
        this.elements.loginPin.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });

        // Reset
        this.elements.resetPinBtn.addEventListener('click', () => this.reset());

        // Logout
        this.elements.logoutBtn.addEventListener('click', () => this.logout());

        // Track user activity
        ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => this.resetInactivityTimer());
        });

        // Sync from Google (Setup screen)
        if (this.elements.syncGoogleBtn) {
            this.elements.syncGoogleBtn.addEventListener('click', () => this.handleGoogleSync());
        }
    },

    async handleGoogleSync() {
        if (window.SheetsAPI) {
            try {
                // Check for protocol error first (if it was detected during init)
                if (window.location.protocol === 'file:') {
                    alert('Google Sync is not supported when opening the file directly (file://). Please use the GitHub Pages link or a local server (like Live Server).');
                    return;
                }

                // If not connected, connect first
                if (!window.SheetsAPI.isConnected) {
                    await window.SheetsAPI.connect();
                }

                // After connection, sync PIN
                await this.syncFromCloud();
            } catch (error) {
                console.error('Google Sync Error:', error);
                const msg = error.details || error.message || error.error || 'Connection failed';
                alert('Failed to connect to Google: ' + msg + '\n\nPlease ensure you are not using file:// and your internet is active.');
            }
        }
    },

    checkAuth() {
        const storedPin = localStorage.getItem(this.PIN_KEY);
        const session = sessionStorage.getItem(this.SESSION_KEY);

        if (!storedPin) {
            // First time user - show PIN setup
            this.showPinSetup();
        } else if (session) {
            // Valid session - show app
            this.showApp();
        } else {
            // PIN exists but no session - show login
            this.showPinLogin();
        }
    },

    showPinSetup() {
        this.elements.pinSetup.classList.remove('hidden');
        this.elements.pinLogin.classList.add('hidden');
        this.elements.setupPin.focus();
    },

    showPinLogin() {
        this.elements.pinSetup.classList.add('hidden');
        this.elements.pinLogin.classList.remove('hidden');
        this.elements.loginPin.focus();
    },

    showApp() {
        this.elements.loginScreen.classList.add('hidden');
        this.elements.app.classList.remove('hidden');

        // Initialize app modules
        if (window.App && window.App.init) {
            window.App.init();
        }
    },

    createPin() {
        const pin = this.elements.setupPin.value;
        const confirmPin = this.elements.confirmPin.value;

        // Validation
        if (pin.length < 4 || pin.length > 6) {
            this.showError('PIN must be 4-6 digits', this.elements.setupPin);
            return;
        }

        if (!/^\d+$/.test(pin)) {
            this.showError('PIN must contain only numbers', this.elements.setupPin);
            return;
        }

        if (pin !== confirmPin) {
            this.showError('PINs do not match', this.elements.confirmPin);
            return;
        }

        // Hash and store PIN
        const hashedPin = this.hashPin(pin);
        localStorage.setItem(this.PIN_KEY, hashedPin);

        // Sync to cloud if connected
        if (window.SheetsAPI && window.SheetsAPI.isConnected) {
            window.SheetsAPI.setSetting('pin_hash', hashedPin);
        }

        // Create session
        sessionStorage.setItem(this.SESSION_KEY, Date.now());

        // Clear inputs
        this.elements.setupPin.value = '';
        this.elements.confirmPin.value = '';

        // Show app
        this.showApp();
    },

    async syncFromCloud() {
        if (!window.SheetsAPI || !window.SheetsAPI.isConnected) return;

        try {
            const cloudPin = await window.SheetsAPI.getSetting('pin_hash');
            if (cloudPin) {
                localStorage.setItem(this.PIN_KEY, cloudPin);
                alert('PIN synchronized from cloud! You can now log in.');
                this.checkAuth();
            } else {
                console.log('No PIN found in cloud.');
            }
        } catch (error) {
            console.error('Error syncing PIN from cloud:', error);
        }
    },

    login() {
        const pin = this.elements.loginPin.value;
        const storedPin = localStorage.getItem(this.PIN_KEY);

        if (!pin) {
            this.showLoginError('Please enter your PIN');
            return;
        }

        const hashedPin = this.hashPin(pin);

        if (hashedPin === storedPin) {
            // Successful login
            sessionStorage.setItem(this.SESSION_KEY, Date.now());
            this.elements.loginPin.value = '';
            this.elements.loginError.classList.add('hidden');
            this.showApp();
        } else {
            // Failed login
            this.showLoginError('Incorrect PIN. Please try again.');
            this.elements.loginPin.value = '';
            this.elements.loginPin.focus();
        }
    },

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
        this.elements.app.classList.add('hidden');
        this.elements.loginScreen.classList.remove('hidden');
        this.showPinLogin();
    },

    reset() {
        if (confirm('This will delete all your data including PIN, sales, and expenses. Are you sure?')) {
            localStorage.clear();
            sessionStorage.clear();
            if ('indexedDB' in window) {
                indexedDB.deleteDatabase('BusinessManagerDB');
            }
            location.reload();
        }
    },

    hashPin(pin) {
        // Simple hash function (in production, use a proper crypto library)
        let hash = 0;
        const str = pin + 'business_manager_salt_2024';
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    },

    showError(message, input) {
        alert(message);
        input.focus();
        input.select();
    },

    showLoginError(message) {
        this.elements.loginError.textContent = message;
        this.elements.loginError.classList.remove('hidden');
    },

    startInactivityTimer() {
        this.inactivityTimer = setTimeout(() => {
            if (sessionStorage.getItem(this.SESSION_KEY)) {
                this.logout();
            }
        }, this.TIMEOUT_DURATION);
    },

    resetInactivityTimer() {
        clearTimeout(this.inactivityTimer);
        if (sessionStorage.getItem(this.SESSION_KEY)) {
            this.startInactivityTimer();
        }
    }
};

// Initialize authentication when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Auth.init());
} else {
    Auth.init();
}
