// API routes for profile operations
const express = require('express');
const router = express.Router();
const Profile = require('../models/profile');

// POST endpoint to create a new profile
router.post('/profiles', async (req, res) => {
  try {
    const { name, url, about, bio, location, followerCount, connectionCount } = req.body;

    // Validate required fields (only URL is required now)
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required',
      });
    }

    // Check if profile already exists
    const existingProfile = await Profile.findOne({ where: { url } });
    if (existingProfile) {
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
    const profile = await Profile.create({
      name,
      url,
      about,
      bio,
      location,
      followerCount: followerCount || 0,
      connectionCount: connectionCount || 0,
    });

    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      data: profile,
    });
  } catch (error) {
    console.error('Error creating profile:', error);
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
