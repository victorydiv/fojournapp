require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

async function copyAvatarsToApachePublic() {
  try {
    console.log('Starting copy of public avatars to Apache public directory...');
    
    // Get all users with public profiles who have avatars
    const [users] = await pool.execute(`
      SELECT id, username, avatar_filename 
      FROM users 
      WHERE profile_public = 1 AND avatar_filename IS NOT NULL
    `);
    
    console.log(`Found ${users.length} public users with avatars to process`);
    
    // Apache public directory (adjust this path for your server)
    const apachePublicDir = process.env.NODE_ENV === 'production' 
      ? '/home/victorydiv24/fojourn.site/public'
      : path.join(__dirname, 'public'); // Use local directory in development
    const apacheAvatarDir = path.join(apachePublicDir, 'avatars');
    
    // Create Apache avatars directory
    try {
      await fs.promises.mkdir(apacheAvatarDir, { recursive: true });
      console.log(`Created directory: ${apacheAvatarDir}`);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error(`Error creating directory: ${err.message}`);
        return;
      }
    }
    
    for (const user of users) {
      console.log(`\nProcessing user ${user.id}: "${user.username}" - avatar: ${user.avatar_filename}`);
      
      const sourceFile = path.join(__dirname, 'uploads', 'avatars', user.avatar_filename);
      const destFile = path.join(apacheAvatarDir, user.avatar_filename);
      
      try {
        // Check if source file exists
        await fs.promises.access(sourceFile);
        
        // Check if destination already exists
        try {
          await fs.promises.access(destFile);
          console.log(`  ${user.avatar_filename} already exists in Apache public directory`);
        } catch (err) {
          // File doesn't exist, copy it
          await fs.promises.copyFile(sourceFile, destFile);
          console.log(`  Copied ${user.avatar_filename} to Apache public directory`);
        }
      } catch (err) {
        console.error(`  Error copying ${user.avatar_filename}: ${err.message}`);
      }
    }
    
    console.log('\nApache public avatars copy completed!');
    
  } catch (error) {
    console.error('Error during Apache public avatars copying:', error);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run the copy process
copyAvatarsToApachePublic();
