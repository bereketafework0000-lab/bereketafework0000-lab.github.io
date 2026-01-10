# MAHI TECHNOLOGY BUSINESS MANAGER 📊

A modern, feature-rich business management application for tracking sales, expenses, and analytics. Built with vanilla JavaScript and deployed on GitHub Pages.

## ✨ Features

- **📱 PIN Authentication** - Secure access with customizable PIN
- **💰 Sales Tracking** - Record and manage sales transactions
- **💳 Expense Management** - Track business expenses by category
- **📈 Dashboard Analytics** - Visual charts and statistics
- **☁️ Google Sheets Integration** - Sync data across all devices
- **🔄 Offline Support** - Works without internet, syncs when online
- **📲 PWA (Progressive Web App)** - Install on mobile devices
- **🌙 Dark Mode UI** - Premium glassmorphism design

## 🚀 Live Demo

Visit: `https://[your-username].github.io/business-manager`

## 📋 Prerequisites

Before using the app with Google Sheets integration, you need:

1. **Google Account** (free)
2. **GitHub Account** (free) - for deployment
3. **Google Cloud Project** (free tier) - for Sheets API

## 🛠️ Setup Instructions

### 1. Clone or Download

```bash
git clone https://github.com/[your-username]/business-manager.git
cd business-manager
```

### 2. Google Sheets API Setup

See [SETUP-GUIDE.md](SETUP-GUIDE.md) for detailed instructions on:
- Creating a Google Cloud Project
- Enabling Google Sheets API
- Setting up OAuth 2.0 credentials
- Configuring authorized origins

### 3. Configure API Credentials

Edit `js/sheets-api.js`:

```javascript
CLIENT_ID: 'your-client-id-here.apps.googleusercontent.com',
API_KEY: 'your-api-key-here',
```

### 4. Deploy to GitHub Pages

1. Create a new repository on GitHub
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/[your-username]/business-manager.git
   git push -u origin main
   ```
3. Enable GitHub Pages in repository settings:
   - Go to Settings → Pages
   - Source: GitHub Actions
   - The workflow will automatically deploy your site

## 💻 Local Development

Run a local server:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

Then visit `http://localhost:8000`

## 📱 Features Guide

### PIN Authentication
- First time: Set up a 4-6 digit PIN
- Automatic logout after 30 minutes of inactivity
- Reset option available (clears all data)

### Sales & Expenses
- Add, edit, delete transactions
- Search and filter by date, description, category
- Categorize entries for better analytics

### Dashboard
- Real-time statistics
- Period selection (7/30/90/365 days)
- Revenue and expense trends chart
- Expense breakdown by category
- Profit/loss calculations

### Google Sheets Sync
- One-click connection with Google account
- Automatic sync every 5 minutes
- Manual sync on demand
- Works offline - syncs when reconnected

### Offline Support
- Full functionality without internet
- Data stored locally in IndexedDB
- Service worker caches app files
- Install as PWA on mobile devices

## 🔒 Security & Privacy

- PIN stored locally with hashing
- Data stored in browser (IndexedDB)
- Google Sheets data synced with your account only
- No backend server - all client-side
- HTTPS enforced via GitHub Pages

## 🎨 Customization

- Edit `css/style.css` to change colors and styling
- Modify categories in HTML forms
- Adjust auto-sync interval in `sheets-api.js`
- Configure PIN timeout in `auth.js`

## 📄 File Structure

```
business-manager/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline support
├── css/
│   └── style.css          # Styling
├── js/
│   ├── app.js             # Main controller
│   ├── auth.js            # PIN authentication
│   ├── offline.js         # Offline/IndexedDB
│   ├── sheets-api.js      # Google Sheets integration
│   ├── sales.js           # Sales management
│   ├── expenses.js        # Expense management
│   └── dashboard.js       # Analytics & charts
└── .github/
    └── workflows/
        └── deploy.yml     # Auto-deployment
```

## 🐛 Troubleshooting

**Google Sheets not connecting?**
- Check if API credentials are correct
- Verify authorized JavaScript origins include your GitHub Pages URL
- Clear browser cache and try again

**Data not syncing?**
- Check internet connection
- Ensure Google account is still connected
- Check browser console for errors

**App not installing as PWA?**
- Only works on HTTPS (GitHub Pages provides this)
- Check browser compatibility
- Look for install prompt in browser address bar

## 🤝 Contributing

Contributions welcome! Please feel free to submit pull requests.

## 📜 License

MIT License - feel free to use for personal or commercial projects

## 🙏 Credits

- **Charts**: Chart.js
- **Icons**: Font Awesome
- **Fonts**: Google Fonts (Inter)

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

Made with ❤️ for small business owners
"# MAHITECH" 
