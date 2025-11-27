<div align="center">

# 🔗 LinkedIn Profile Scraper

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)](https://www.google.com/chrome/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18.2-404D59)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3.41+-07405E?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**A Chrome extension that extracts LinkedIn profile data and stores it in a local SQLite database.**

[Features](#-features) • [Quick Start](#-quick-start) • [Usage](#-usage-guide) • [API](#-api-documentation) • [Database](#-database-schema) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### 📊 Profile Scraper
- **Multi-Profile Scraping**: Process multiple LinkedIn profiles in sequence
- **Comprehensive Data Extraction**:
  - Full Name
  - Profile URL
  - Professional Headline
  - Location Information
  - Detailed About Section
  - Follower Count
  - Connection Count
- **Smart Scraping**:
  - Handles dynamic content loading
  - Intelligent scrolling and delays
  - Automatic expansion of "See more" sections
  - Robust error handling
- **Data Management**:
  - Local SQLite database storage
  - Automatic updates of existing profiles
  - Progress tracking
  - Detailed logging

## 🚀 Quick Start

### Prerequisites
- Google Chrome browser
- Node.js 18 or higher
- npm or yarn package manager
- Active LinkedIn account (must be logged in)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/linkedin-profile-scraper.git
   cd linkedin-profile-scraper
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Load the Chrome extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked" and select the `extension` folder
   - The extension icon should appear in your toolbar

4. **Start the backend server**
   ```bash
   npm start
   ```
   Server will be available at `http://localhost:4000`

## �️ Usage Guide

### Scraping Profiles

1. **Prepare Profile URLs**
   - Open LinkedIn and navigate to profiles you want to scrape
   - Copy the profile URLs (one per line)

2. **Using the Extension**
   - Click the extension icon in Chrome
   - Paste the profile URLs in the text area
   - Click "🚀 Start Scraping"
   - The extension will open each profile in a new tab
   - Progress will be shown in the popup

3. **Viewing Results**
   - All scraped data is saved to the SQLite database
   - Access the data via the API or a database viewer
   - The database file is located at `backend/database.sqlite`

### Scraping Process
- Each profile takes approximately 23 seconds to process
- The extension handles scrolling and content loading automatically
- Progress is saved if the extension is closed
- Failed profiles can be retried by running the process again

## 📊 Database Schema

```sql
CREATE TABLE profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  url TEXT NOT NULL UNIQUE,
  about TEXT,
  bio TEXT,
  location TEXT,
  followerCount INTEGER DEFAULT 0,
  connectionCount INTEGER DEFAULT 0,
  createdAt DATETIME,
  updatedAt DATETIME
);
```

## 🌐 API Documentation

### POST /api/profiles
Create or update a profile

**Request Body:**
```json
{
  "name": "John Doe",
  "url": "https://www.linkedin.com/in/johndoe",
  "about": "Experienced professional...",
  "bio": "Software Engineer at Tech Corp",
  "location": "San Francisco, CA",
  "followerCount": 500,
  "connectionCount": 300
}
```

### GET /api/profiles
Get all profiles

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "url": "https://www.linkedin.com/in/johndoe",
      "about": "Experienced professional...",
      "bio": "Software Engineer at Tech Corp",
      "location": "San Francisco, CA",
      "followerCount": 500,
      "connectionCount": 300,
      "createdAt": "2023-11-27T12:00:00.000Z",
      "updatedAt": "2023-11-27T12:00:00.000Z"
    }
  ]
}
```

## 🏗️ Project Structure

```
linkedin-profile-scraper/
├── extension/                 # Chrome Extension
│   ├── manifest.json         # Extension configuration
│   ├── popup.html            # Extension popup UI
│   ├── popup.js              # Popup logic and event handlers
│   ├── background.js         # Service worker (main scraping logic)
│   ├── content.js            # Content script for DOM interaction
│   └── icons/                # Extension icons
├── backend/                  # Node.js Backend
│   ├── app.js               # Express server setup
│   ├── models/
│   │   └── profile.js       # Sequelize Profile model
│   ├── routes/
│   │   └── profileRoutes.js # API routes for profiles
│   ├── database.sqlite      # SQLite database (auto-created)
│   └── package.json         # Backend dependencies
└── README.md                # This file
```

## 🔧 Technical Details

### Scraping Strategy
- Uses a combination of DOM queries and text analysis
- Handles LinkedIn's dynamic content loading
- Implements smart delays to avoid rate limiting
- Automatically expands "See more" sections
- Robust error handling and retries

### Performance
- Processes each profile in ~23 seconds
- Supports concurrent tab management
- Efficient memory usage
- Detailed logging for debugging

## 🚨 Important Notes

### Rate Limiting
- The extension includes built-in delays to avoid LinkedIn's rate limits
- Do not reduce delays below recommended values
- Processing too many profiles too quickly may trigger LinkedIn's security measures

### Data Privacy
- All data is stored locally in your SQLite database
- No data is sent to external servers
- The extension only communicates with your local backend

### LinkedIn Policies
- Use this tool responsibly and in compliance with LinkedIn's Terms of Service
- Be mindful of LinkedIn's scraping policies
- The extension is for educational purposes only

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Create a new Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- Backend powered by [Express.js](https://expressjs.com/) and [Sequelize](https://sequelize.org/)
- Database using [SQLite](https://www.sqlite.org/)
- Icons from [Feather Icons](https://feathericons.com/)

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

## 🎬 Demo

Watch the extension in action:

1. **Profile Scraping**: Opens LinkedIn profiles → Scrolls → Extracts data → Saves to database
2. **Feed Engagement**: Opens feed → Scrolls from top → Likes & comments on posts

> **Note**: Replace with actual demo video or GIFs when available

---

## 🌟 Why Use This Extension?

| Feature | Benefit |
|---------|---------|
| 🚀 **Fast Scraping** | Extract data from multiple profiles in minutes |
| 💾 **Local Storage** | All data stays on your machine - complete privacy |
| 🤖 **Automation** | Save hours of manual work |
| 🎯 **Targeted Engagement** | Control exactly how many likes/comments |
| 🔄 **Auto-Update** | Updates existing profiles instead of duplicating |
| 📊 **Structured Data** | Clean, organized data in SQLite database |

---

## 🏆 Tech Stack

<table>
<tr>
<td align="center" width="33%">

### Frontend
![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=google-chrome&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

</td>
<td align="center" width="33%">

### Backend
![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-404D59)
![Sequelize](https://img.shields.io/badge/Sequelize-52B0E7?logo=sequelize&logoColor=white)

</td>
<td align="center" width="33%">

### Database
![SQLite](https://img.shields.io/badge/SQLite-07405E?logo=sqlite&logoColor=white)

</td>
</tr>
</table>

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=tanmay34567/Linkedin_extension&type=Date)](https://star-history.com/#tanmay34567/Linkedin_extension&Date)

---

## 📈 Roadmap

- [ ] Add profile comparison feature
- [ ] Export data to CSV/JSON
- [ ] Support for company pages
- [ ] Advanced filtering options
- [ ] Bulk profile search
- [ ] Custom comment templates
- [ ] Engagement analytics dashboard

---

## ⚠️ Disclaimer

**Important**: This tool is for **educational purposes only**. 

- Excessive automation may violate LinkedIn's Terms of Service
- Use responsibly and at your own risk
- Account restrictions may occur with heavy usage
- Always respect LinkedIn's rate limits and policies

---

## 📞 Support

Having issues? We're here to help!

- 🐛 [Report a Bug](https://github.com/tanmay34567/Linkedin_extension/issues)
- 💡 [Request a Feature](https://github.com/tanmay34567/Linkedin_extension/issues)
- 📖 [Read Documentation](#-usage-guide)
- ⭐ [Star this repo](https://github.com/tanmay34567/Linkedin_extension) if you find it useful!

---

## 👨‍💻 Author

**Tanmay**

- GitHub: [@tanmay34567](https://github.com/tanmay34567)
- Project: [Linkedin_extension](https://github.com/tanmay34567/Linkedin_extension)

---

## 📜 License

This project is licensed under the **Educational Use License**.

- ✅ Free to use for learning
- ✅ Free to modify for personal use
- ❌ Not for commercial use
- ❌ Not for production deployment

---

<div align="center">

### 🌟 If you found this helpful, please give it a star!

[![GitHub stars](https://img.shields.io/github/stars/tanmay34567/Linkedin_extension?style=social)](https://github.com/tanmay34567/Linkedin_extension/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/tanmay34567/Linkedin_extension?style=social)](https://github.com/tanmay34567/Linkedin_extension/network/members)

**Made with ❤️ for learning and automation**

[⬆ Back to Top](#-linkedin-scraper--auto-engagement-extension)

</div>