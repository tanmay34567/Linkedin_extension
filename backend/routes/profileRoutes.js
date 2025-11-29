// API routes for profile operations
const express = require('express');
const router = express.Router();
const Profile = require('../models/profile');

// POST endpoint to create a new profile
router.post('/profiles', async (req, res) => {
  try {
<<<<<<< HEAD
    console.log('📥 Received POST request');
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Request body:', JSON.stringify(req.body).substring(0, 300));
    
=======
>>>>>>> a1df76eb3f69ee4710cf81f6900e26f995e4a1db
    const { name, url, about, bio, location, followerCount, connectionCount } = req.body;

    // Validate required fields (only URL is required now)
    if (!url) {
<<<<<<< HEAD
      console.error('❌ Validation failed: URL is missing');
      return res.status(400).json({
        success: false,
        message: 'URL is required',
        received: req.body
      });
    }

    // Validate URL format
    if (typeof url !== 'string' || !url.includes('linkedin.com')) {
      console.error('❌ Validation failed: Invalid URL format:', url);
      return res.status(400).json({
        success: false,
        message: 'Invalid LinkedIn URL format',
        received: url
      });
    }

    console.log('✅ Validation passed for URL:', url);

    // Check if profile already exists
    const existingProfile = await Profile.findOne({ where: { url } });
    if (existingProfile) {
      console.log('📝 Updating existing profile:', url);
=======
      return res.status(400).json({
        success: false,
        message: 'URL is required',
      });
    }

    // Check if profile already exists
    const existingProfile = await Profile.findOne({ where: { url } });
    if (existingProfile) {
>>>>>>> a1df76eb3f69ee4710cf81f6900e26f995e4a1db
      // Update existing profile
      await existingProfile.update({
        name: name || existingProfile.name,
        about: about || existingProfile.about,
        bio: bio || existingProfile.bio,
        location: location || existingProfile.location,
        followerCount: followerCount || existingProfile.followerCount,
        connectionCount: connectionCount || existingProfile.connectionCount,
      });

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: existingProfile,
      });
    }

    // Create new profile
<<<<<<< HEAD
    console.log('➕ Creating new profile:', url);
=======
>>>>>>> a1df76eb3f69ee4710cf81f6900e26f995e4a1db
    const profile = await Profile.create({
      name,
      url,
      about,
      bio,
      location,
      followerCount: followerCount || 0,
      connectionCount: connectionCount || 0,
    });

<<<<<<< HEAD
    console.log('✅ Profile created with ID:', profile.id);
=======
>>>>>>> a1df76eb3f69ee4710cf81f6900e26f995e4a1db
    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      data: profile,
    });
  } catch (error) {
<<<<<<< HEAD
    console.error('❌ Error creating/updating profile:', error);
    console.error('Error details:', error.message);
=======
    console.error('Error creating profile:', error);
>>>>>>> a1df76eb3f69ee4710cf81f6900e26f995e4a1db
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

// GET endpoint to retrieve all profiles
router.get('/profiles', async (req, res) => {
  try {
    const profiles = await Profile.findAll({
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      count: profiles.length,
      data: profiles,
    });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

// GET endpoint to retrieve a single profile by ID
router.get('/profiles/:id', async (req, res) => {
  try {
    const profile = await Profile.findByPk(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

// DELETE endpoint to remove a profile
router.delete('/profiles/:id', async (req, res) => {
  try {
    const profile = await Profile.findByPk(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    await profile.destroy();

    res.status(200).json({
      success: true,
      message: 'Profile deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

module.exports = router;
