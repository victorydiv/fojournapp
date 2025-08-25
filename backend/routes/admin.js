const express = require('express');
const { retroactivelyCopyPublicFiles } = require('../retroactive-copy-public-files');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Admin-only endpoint to retroactively copy public files
router.post('/copy-public-files', authenticateToken, async (req, res) => {
  try {
    // For security, only allow admin users (you can add admin check here)
    // For now, just check if user is authenticated
    
    console.log('Starting retroactive copy of public files triggered by API...');
    
    // Run the retroactive copy process
    await retroactivelyCopyPublicFiles();
    
    res.json({ 
      success: true, 
      message: 'Retroactive file copying completed successfully' 
    });
    
  } catch (error) {
    console.error('Error in retroactive copy API:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to copy public files',
      details: error.message 
    });
  }
});

module.exports = router;
