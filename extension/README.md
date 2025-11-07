# Chrome Extension

LinkedIn profile scraper Chrome extension (Manifest V3).

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. Pin the extension to your toolbar

## Usage

1. **Login to LinkedIn** manually in Chrome
2. Click the extension icon
3. Enter LinkedIn profile URLs (one per line, minimum 3)
4. Click **Start Scraping**
5. Monitor progress in the popup

## Files

- **manifest.json**: Extension configuration (Manifest V3)
- **popup.html**: Extension UI with gradient design
- **popup.js**: UI logic and message handling
- **background.js**: Service worker for tab management and API calls
- **content.js**: Scraper that runs on LinkedIn pages
- **icon*.png**: Extension icons (16x16, 48x48, 128x128)

## How It Works

### 1. User Input (popup.html + popup.js)
- User enters LinkedIn URLs
- Validates format and minimum count
- Sends message to background script

### 2. Orchestration (background.js)
- Receives URLs from popup
- Opens each profile in a new tab
- Waits for page load (3 seconds)
- Executes scraping function
- Sends data to backend API
- Closes tab and waits 6 seconds
- Repeats for next profile

### 3. Scraping (background.js - injected function)
- Extracts name, bio, location, about
- Parses follower and connection counts
- Returns structured data object

### 4. API Communication
- POSTs scraped data to `http://localhost:4000/api/profiles`
- Handles success/error responses
- Updates popup with progress

## Scraping Selectors

The extension uses multiple CSS selectors to handle LinkedIn's dynamic layout:

```javascript
// Name
'h1.text-heading-xlarge'
'.pv-text-details__left-panel h1'

// Bio/Headline
'.text-body-medium.break-words'
'.pv-text-details__left-panel .text-body-medium'

// Location
'.text-body-small.inline.t-black--light.break-words'
'.pv-text-details__left-panel .text-body-small'

// About Section
'#about' (then navigate to parent section)

// Followers/Connections
Text parsing from various elements
```

## Configuration

### Change Scraping Delay

Edit `background.js`:

```javascript
const DELAY_BETWEEN_PROFILES = 10000; // 10 seconds
```

### Change API Endpoint

Edit `background.js`:

```javascript
const API_URL = 'http://localhost:5000/api/profiles';
```

## Permissions

- **activeTab**: Access current tab
- **scripting**: Inject content scripts
- **tabs**: Create and manage tabs
- **storage**: Save user preferences
- **host_permissions**: Access LinkedIn pages

## Debugging

### View Extension Console

**Popup Console:**
1. Right-click extension icon
2. Click "Inspect popup"
3. Go to Console tab

**Background Script Console:**
1. Go to `chrome://extensions/`
2. Find LinkedIn Scraper
3. Click "service worker" link
4. Console will open

**Content Script Console:**
1. Open LinkedIn profile page
2. Press F12 to open DevTools
3. Go to Console tab
4. Look for messages from content.js

## Common Issues

### Extension won't load
- Check all files are present
- Verify manifest.json is valid JSON
- Look for errors in chrome://extensions/

### Scraping fails
- Ensure you're logged into LinkedIn
- LinkedIn may have changed their HTML structure
- Update selectors in background.js
- Check browser console for errors

### API errors
- Verify backend is running on port 4000
- Check CORS is enabled in backend
- Look at Network tab in DevTools

### No data extracted
- Some profiles have privacy settings
- LinkedIn's layout varies by region/account type
- Try different profiles
- Check console logs for selector issues

## Icon Setup

The extension needs three icon sizes:

**Option 1: Create Custom Icons**
- Use any image editor
- Create 16x16, 48x48, and 128x128 PNG files
- Name them icon16.png, icon48.png, icon128.png

**Option 2: Use Online Generator**
- Visit https://www.favicon-generator.org/
- Upload an image
- Download all sizes

**Option 3: Skip Icons**
- Extension will work with default Chrome icon
- No functionality is lost

## Notes

- **Manual Login Required**: Extension does NOT automate login
- **Rate Limiting**: 6-second delay between profiles to avoid detection
- **LinkedIn TOS**: Web scraping may violate LinkedIn's Terms of Service
- **Privacy**: Only scrape profiles you have permission to access
- **Dynamic Content**: Selectors may need updates as LinkedIn changes

## Manifest V3 Features

This extension uses Manifest V3 (latest Chrome extension format):

- Service worker instead of background page
- Declarative permissions
- Improved security and performance
- Future-proof for Chrome updates

## Testing

1. Load extension in Chrome
2. Open extension popup
3. Enter test URLs:
   ```
   https://www.linkedin.com/in/test1/
   https://www.linkedin.com/in/test2/
   https://www.linkedin.com/in/test3/
   ```
4. Click Start Scraping
5. Watch console logs
6. Verify data in backend API

## Future Improvements

- [ ] Add profile image scraping
- [ ] Support for company pages
- [ ] Export to CSV functionality
- [ ] Duplicate detection before scraping
- [ ] Configurable delay settings in UI
- [ ] Dark mode theme
- [ ] Scraping history/logs
