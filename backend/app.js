// Main Express application setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sequelize = require('./models/index');
const profileRoutes = require('./routes/profileRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: false
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body).substring(0, 200));
  }
  next();
});

// Validation middleware for profile routes
app.use('/api/profiles', (req, res, next) => {
  if (req.method === 'POST' && (!req.body || typeof req.body !== 'object')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request body',
    });
  }
  next();
});

// Routes
app.use('/api', profileRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'LinkedIn Profile Scraper API',
    version: '1.0.0',
    endpoints: {
      'POST /api/profiles': 'Create a new profile',
      'GET /api/profiles': 'Get all profiles',
      'GET /api/profiles/:id': 'Get a single profile',
      'DELETE /api/profiles/:id': 'Delete a profile',
    },
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'running' });
});

// ===== GENERIC COMMENTS INFO =====
// The LinkedIn extension uses a set of generic professional comments for auto-engagement
// These comments are defined in: extension/background.js -> engageWithFeed() function
//
// Available generic comments (you can use some generic comments for posting like "CFBR"):
//
// - 'CFBR' (Come For Business Reason)
// - 'Great insights!'
// - 'Thanks for sharing!'
// - 'Very informative!'
// - 'Interesting perspective!'
// - 'Well said!'
// - 'Agreed!'
// - 'Nice post!'
// - 'Love this!'
// - 'Absolutely!'
// - 'Great content!'
// - 'This is helpful!'
// - 'Thanks!'
// - 'Inspiring!'
// - 'Well articulated!'
//
// The extension randomly selects one of these comments when engaging with posts.
// To customize comments, modify the 'comments' array in background.js -> engageWithFeed()

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message,
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Sync database (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📊 API endpoint: http://localhost:${PORT}/api/profiles`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
