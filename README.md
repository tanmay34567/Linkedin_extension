# 🔗 LinkedIn Scraper & Auto-Engagement Extension

A powerful Chrome extension for scraping LinkedIn profile data and automating feed engagement (likes and comments). Built with Chrome Extension Manifest V3, Node.js, Express, and SQLite.

## ✨ Features

### 📊 Profile Scraper
- **Scrape Multiple Profiles**: Extract data from 3+ LinkedIn profiles at once
- **Comprehensive Data Extraction**:
  - Name
  - Profile URL
  - Bio/Headline
  - Location (City, State, Country)
  - About Section
  - Follower Count
  - Connection Count
- **Smart Scraping**: Handles LinkedIn's dynamic content with intelligent scrolling and delays
- **Database Storage**: Saves all data to SQLite database via Node.js backend
- **Update Existing Profiles**: Automatically updates profiles if URL already exists

### 💬 Feed Auto-Engagement
- **Automated Liking**: Like posts on LinkedIn feed
- **Automated Commenting**: Comment on posts with generic professional messages
- **Flexible Configuration**: Set custom like and comment counts (1-50 each)
- **Natural Behavior**: Random delays between actions to appear human-like
- **Smart Scrolling**: Starts from top, engages with posts in order
- **Generic Comments**: 15 professional LinkedIn-style comments

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v14 or higher)
- **Chrome Browser**
- **LinkedIn Account** (logged in before using the extension)

### Installation

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd linkedin_ex
```

#### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

#### 3. Start Backend Server
```bash
npm start
```
Server will run on `http://localhost:4000`

#### 4. Load Chrome Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension` folder from this project
5. The extension icon should appear in your toolbar

## 📖 Usage Guide

### Profile Scraper

1. **Click the extension icon** in Chrome toolbar
2. **Paste LinkedIn Profile URLs** in the textarea (one per line)
   ```
   https://www.linkedin.com/in/satyanadella/
   https://www.linkedin.com/in/sundarpichai/
   https://www.linkedin.com/in/jeffweiner08/
   ```
3. **Click "🚀 Start Scraping"**
4. The extension will:
   - Open each profile in a new tab
   - Wait ~23 seconds per profile for content to load
   - Extract all available data
   - Save to database
   - Close the tab and move to next profile
5. **Check progress** in the popup or browser console

**Note**: Tabs close automatically after scraping. Each profile takes approximately 23 seconds.

### Feed Auto-Engagement

1. **Make sure you're logged into LinkedIn**
2. **Enter counts** in the Feed Auto-Engagement section:
   - **Like Count**: Number of posts to like (e.g., 5)
   - **Comment Count**: Number of posts to comment on (e.g., 3)
3. **Click "💙 Start Engagement"** (enabled only when both fields have values)
4. The extension will:
   - Open LinkedIn feed in a new tab
   - Scroll to top
   - Load posts
   - Like and comment on posts in order from top to bottom
5. **Wait for completion** (status shown in popup)

**Example Scenarios**:
- Input: 1 like, 1 comment → Engages with 1 post (likes + comments on it)
- Input: 5 likes, 3 comments → Engages with 5 posts (likes + comments on first 3, only likes on next 2)
- Input: 2 likes, 4 comments → Engages with 4 posts (likes + comments on first 2, only comments on next 2)

## 🏗️ Project Structure

```
linkedin_ex/
├── extension/                 # Chrome Extension
│   ├── manifest.json         # Extension configuration
│   ├── popup.html            # Extension popup UI
│   ├── popup.js              # Popup logic and event handlers
│   └── background.js         # Service worker (main scraping logic)
├── backend/                  # Node.js Backend
│   ├── app.js               # Express server setup
│   ├── config/
│   │   └── database.js      # Database configuration
│   ├── models/
│   │   └── profile.js       # Sequelize Profile model
│   ├── routes/
│   │   └── profileRoutes.js # API routes for profiles
│   ├── package.json         # Backend dependencies
│   └── database.sqlite      # SQLite database (auto-created)
└── README.md                # This file
```

## 🔧 Technical Details

### Architecture

#### Chrome Extension (Manifest V3)
- **Background Service Worker**: Orchestrates scraping and engagement
- **Popup UI**: User interface for configuration
- **Content Script Injection**: Executes scraping code in LinkedIn pages

#### Backend API
- **Framework**: Express.js
- **ORM**: Sequelize
- **Database**: SQLite
- **Endpoints**:
  - `POST /api/profiles` - Create or update profile
  - `GET /api/profiles` - Get all profiles

### Scraping Strategy

#### Profile Data Extraction
1. **Name**: Extracted from page title (`Satya Nadella | LinkedIn`)
2. **Bio**: Parsed from concatenated profile text, cleaned of duplicates
3. **Location**: Identified by country/state keywords, includes full City, State, Country
4. **About**: Searched in main content area, excludes sidebar profiles
5. **Followers/Connections**: Regex pattern matching from page text

#### Timing Strategy
- Initial page load: 8 seconds
- Scroll to About section: Single scroll to 60% of page
- Wait for lazy-loaded content: 10 seconds
- Click "see more" buttons: Expand About section
- Wait for expansion: 5 seconds
- **Total: ~23 seconds per profile**

#### Engagement Strategy
- Scroll from top to bottom
- Engage with posts in order (not random)
- Random delays: 1-5 seconds between actions
- Natural behavior to avoid detection

### Database Schema

```javascript
Profile {
  id: INTEGER (Primary Key, Auto-increment)
  name: STRING (nullable)
  url: STRING (unique, required)
  about: TEXT (nullable)
  bio: TEXT (nullable)
  location: STRING (nullable)
  followerCount: INTEGER (default: 0)
  connectionCount: INTEGER (default: 0)
  createdAt: DATETIME
  updatedAt: DATETIME
}
```

## 🎯 Key Features Explained

### Smart Content Parsing
- Handles concatenated text: `"Satya NadellaChairman and CEO at MicrosoftRedmond, Washington, United States"`
- Splits at location boundaries using keyword detection
- Removes duplicate words (MicrosoftMicrosoft → Microsoft)
- Cleans special characters and trailing commas

### Sidebar Filtering
- Excludes "People also viewed" profiles
- Filters out connection degree indicators (1st, 2nd, 3rd)
- Only extracts from main profile content

### Update vs Insert
- Checks if profile URL exists in database
- Updates existing profiles with new data
- Preserves existing data if new scrape has null values

### Generic Comments
- 15 professional LinkedIn-style comments
- Randomly selected for each comment
- Includes: "CFBR", "Great insights!", "Thanks for sharing!", etc.

## 🐛 Troubleshooting

### Extension Not Loading
- Make sure all required files exist in the `extension/` folder
- Check `chrome://extensions/` for error messages
- Reload the extension after making changes

### "Could not establish connection" Error
- This is a harmless warning when popup is closed during scraping
- Extension continues working normally

### Scraping Returns Empty Fields
- **Make sure you're logged into LinkedIn** before scraping
- LinkedIn may have changed their HTML structure
- Check browser console for DEBUG logs
- Increase wait times in `background.js` if needed

### Database Not Saving
- Ensure backend server is running (`npm start` in `backend/` folder)
- Check backend console for errors
- Verify API endpoint: `http://localhost:4000/api/profiles`

### Engagement Not Working
- **Must be logged into LinkedIn** before clicking button
- Check if LinkedIn's HTML structure changed
- Look for errors in browser console (LinkedIn feed tab)

## 📊 Performance

- **Profile Scraping**: ~23 seconds per profile
- **Database Size**: ~2KB per profile
- **Memory Usage**: Minimal (closes tabs after scraping)
- **Concurrent Profiles**: Sequential (one at a time to avoid detection)

## ⚠️ Limitations & Disclaimers

1. **Rate Limiting**: LinkedIn may rate limit or block excessive scraping
2. **Dynamic Content**: LinkedIn frequently updates their UI, may break selectors
3. **Login Required**: Must be manually logged into LinkedIn
4. **Terms of Service**: Using automation may violate LinkedIn's TOS
5. **Educational Purpose**: This project is for educational purposes only

## 🔐 Privacy & Security

- **No Data Transmission**: All data stays on your local machine
- **No Credentials Stored**: Extension doesn't store LinkedIn passwords
- **Local Database**: SQLite database stored locally in `backend/database.sqlite`
- **No External APIs**: Only communicates with local backend server

## 🛠️ Development

### Modifying Wait Times
Edit `background.js`:
```javascript
await sleep(8000);  // Initial load - increase if content not loading
await sleep(10000); // After scroll - increase for About section
await sleep(5000);  // After expansion - increase if still incomplete
```

### Adding Comments
Edit `background.js` in `engageWithFeed()` function:
```javascript
const comments = [
  'CFBR',
  'Your custom comment here!',
  // Add more...
];
```

### Changing Backend Port
Edit `backend/app.js`:
```javascript
const PORT = process.env.PORT || 4000; // Change port here
```

Also update `extension/background.js`:
```javascript
const API_URL = 'http://localhost:4000/api/profiles'; // Update port
```

## 📝 API Documentation

### Create/Update Profile
```http
POST /api/profiles
Content-Type: application/json

{
  "name": "John Doe",
  "url": "https://www.linkedin.com/in/johndoe/",
  "bio": "Software Engineer at Tech Corp",
  "location": "San Francisco, CA, United States",
  "about": "Passionate about building great products...",
  "followerCount": 5000,
  "connectionCount": 500
}
```

**Response** (201 Created or 200 OK):
```json
{
  "success": true,
  "message": "Profile created successfully",
  "data": { ...profile data... }
}
```

### Get All Profiles
```http
GET /api/profiles
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    { ...profile 1... },
    { ...profile 2... },
    ...
  ]
}
```

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is for educational purposes only. Use responsibly and in accordance with LinkedIn's Terms of Service.

## 🙏 Acknowledgments

- Built with Chrome Extension Manifest V3
- Uses Sequelize ORM for database operations
- Inspired by the need for automated LinkedIn data management

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review troubleshooting section above

---

**⚠️ Important**: This tool is for educational purposes. Excessive use of automation on LinkedIn may result in account restrictions. Use responsibly and respect LinkedIn's Terms of Service.

**Made with ❤️ for learning and automation**
#   L i n k e d i n _ e x t e n s i o n  
 