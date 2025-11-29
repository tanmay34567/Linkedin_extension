# Backend API

Node.js + Express + Sequelize backend for LinkedIn profile storage.

## Installation

```bash
npm install
```

## Running

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

## Environment

- **Port**: 4000 (configurable in `app.js`)
- **Database**: SQLite (`database.sqlite`)
- **CORS**: Enabled for all origins

## API Endpoints

### POST /api/profiles
Create a new profile

**Body:**
```json
{
  "name": "John Doe",
  "url": "https://www.linkedin.com/in/johndoe/",
  "about": "About text...",
  "bio": "Bio headline",
  "location": "City, State",
  "followerCount": 1000,
  "connectionCount": 500
}
```

### GET /api/profiles
Get all profiles

### GET /api/profiles/:id
Get single profile by ID

### DELETE /api/profiles/:id
Delete a profile

## Database Schema

```javascript
Profile {
  id: INTEGER (Primary Key, Auto Increment)
  name: STRING (Required)
  url: STRING (Required, Unique)
  about: TEXT
  bio: TEXT
  location: STRING
  followerCount: INTEGER (Default: 0)
  connectionCount: INTEGER (Default: 0)
  createdAt: DATE
  updatedAt: DATE
}
```

## File Structure

```
backend/
├── models/
│   ├── index.js       # Sequelize initialization
│   └── profile.js     # Profile model
├── routes/
│   └── profileRoutes.js  # API routes
├── app.js             # Express server
└── package.json       # Dependencies
```

## Dependencies

- **express**: Web framework
- **sequelize**: ORM for database
- **sqlite3**: SQLite driver
- **body-parser**: JSON parsing
- **cors**: Cross-origin requests
- **nodemon**: Auto-reload (dev)

## Testing

Test the API with curl:

```bash
# Create a profile
curl -X POST http://localhost:4000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "url": "https://www.linkedin.com/in/testuser/",
    "bio": "Test bio",
    "location": "Test City"
  }'

# Get all profiles
curl http://localhost:4000/api/profiles

# Get single profile
curl http://localhost:4000/api/profiles/1

# Delete profile
curl -X DELETE http://localhost:4000/api/profiles/1
```

## Notes

- Database is automatically created on first run
- Duplicate URLs are prevented by unique constraint
- All timestamps are managed automatically by Sequelize
