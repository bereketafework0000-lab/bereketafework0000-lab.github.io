# Google Sheets API Setup Guide

This guide will walk you through setting up Google Sheets API integration for Business Manager.

## Prerequisites

- A Google Account (free)
- Your deployed GitHub Pages URL (e.g., `https://yourusername.github.io/business-manager`)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `Business Manager`
4. Click **Create**
5. Wait for the project to be created (notification will appear)

## Step 2: Enable Google Sheets API

1. In the Google Cloud Console, ensure your new project is selected
2. Go to **APIs & Services** → **Library**
3. Search for "Google Sheets API"
4. Click on **Google Sheets API**
5. Click **Enable**

## Step 3: Create OAuth 2.0 Credentials

### Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Business Manager
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **Save and Continue**
6. On the Scopes page, click **Add or Remove Scopes**
7. Add: `https://www.googleapis.com/auth/spreadsheets`
8. Click **Update** → **Save and Continue**
9. On Test users page, click **Add Users**
10. Add your Google account email
11. Click **Save and Continue**
12. Review and click **Back to Dashboard**

### Create OAuth Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Business Manager Web Client`
5. Under **Authorized JavaScript origins**, click **+ Add URI**
   - For local testing: `http://localhost:8000`
   - For GitHub Pages: `https://yourusername.github.io`
6. Under **Authorized redirect URIs**, click **+ Add URI**
   - Same URLs as above
7. Click **Create**
8. **IMPORTANT**: Copy your **Client ID** (you'll need this!)
9. Click **OK**

## Step 4: Create API Key

1. Still in **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **API Key**
3. Copy the API key that appears
4. Click **Edit API key** (recommended)
5. Under **API restrictions**, select **Restrict key**
6. Check **Google Sheets API**
7. Click **Save**

## Step 5: Configure Your Application

1. Open your project's `js/sheets-api.js` file
2. Replace the placeholder values:

```javascript
CLIENT_ID: 'YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com',
API_KEY: 'YOUR_ACTUAL_API_KEY',
```

3. Save the file
4. Commit and push to GitHub:

```bash
git add js/sheets-api.js
git commit -m "Add Google Sheets API credentials"
git push
```

## Step 6: Update Authorized Origins (After Deployment)

After your GitHub Pages site is deployed:

1. Go back to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your **OAuth 2.0 Client ID** (Business Manager Web Client)
3. Under **Authorized JavaScript origins**, ensure you have:
   - `https://yourusername.github.io` (your actual GitHub Pages URL)
   - **Note**: DO NOT include a trailing slash (e.g., `...github.io/` is WRONG)
4. Click **Save**
5. **IMPORTANT**: Changes can take up to 5-10 minutes to propagate. Clear your browser cache or use an Incognito window to test.

## Step 7: Test the Integration

1. Open your deployed app
2. Log in with your PIN
3. Click **Connect Google** button
4. Sign in with your Google account
5. Grant permissions when prompted
6. Add a test sale or expense
7. Check your Google account - a new spreadsheet called "Business Manager Data" should appear in Google Drive

## Troubleshooting

### Error: "Access blocked: This app's request is invalid"

**Solution**: Make sure your authorized JavaScript origins match exactly with your deployment URL. No trailing slashes.

### Error: "Failed to connect to Google" on Live Site

**Solution**: 
1. **Authorized Origins**: Ensure `https://yourusername.github.io` is added to your OAuth Client ID origins.
2. **API Key Restrictions**: If your API Key has website restrictions, ensure your GitHub URL is listed there as well.
3. **Wait**: After saving in Google Cloud Console, wait 10 minutes.
4. **Deploy**: Ensure you have pushed the latest code changes (with improved error reporting) to GitHub.

### Error: "The OAuth client was not found"

**Solution**: 
- Verify your Client ID is correct
- Check that you copied it completely (including `.apps.googleusercontent.com`)
- Clear browser cache and try again

### Error: "idpiframe_initialization_failed"

**Solution**:
- Ensure cookies are enabled
- Check if you're in incognito/private mode
- Try a different browser

### Spreadsheet not appearing in Google Drive

**Solution**:
- Check browser console for errors
- Verify Google Sheets API is enabled
- Ensure you granted all requested permissions

### Connection works locally but not on GitHub Pages

**Solution**:
- Add your GitHub Pages URL to authorized JavaScript origins
- Wait a few minutes for changes to propagate
- Clear browser cache

## Security Notes

- Never commit your actual API credentials to public repositories
- Use environment variables or a config file (not tracked by git) for sensitive data
- The API key should be restricted to Google Sheets API only
- OAuth consent screen should be set to "External" for personal use

## Managing Your Data

### Finding Your Spreadsheet

1. Go to [Google Drive](https://drive.google.com/)
2. Look for "Business Manager Data"
3. You can edit it directly or download it

### Backing Up Data

1. Open the spreadsheet in Google Sheets
2. File → Download → choose your preferred format (Excel, CSV, PDF)

### Sharing Access

1. Open the spreadsheet
2. Click **Share** button
3. Add collaborators
4. Set permissions (View, Comment, or Edit)

## Next Steps

- ✅ API is configured!
- 📱 Install app as PWA on your phone
- 📊 Start tracking your business data
- 🔄 Data will sync across all your devices automatically

## Need Help?

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- Open an issue on GitHub if you encounter problems

---

**Estimated Setup Time**: 15-20 minutes

**Cost**: $0 - Everything uses free tiers!
