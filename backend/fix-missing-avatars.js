const { pool } = require('./config/database');
const path = require('path');
const fs = require('fs');

/**
 * Script to fix missing avatar files in public directory
 * This will copy avatar files from uploads/avatars to the Apache public directory
 */
async function fixMissingAvatars() {
  try {
    console.log('🔍 Checking for users with missing public avatars...');
    
    // Get all users with public profiles and avatar filenames
    const [users] = await pool.execute(`
      SELECT id, username, avatar_filename, profile_public
      FROM users 
      WHERE avatar_filename IS NOT NULL 
      AND avatar_filename != ''
      AND profile_public = 1
    `);
    
    console.log(`Found ${users.length} users with avatars and public profiles`);
    
    const uploadsAvatarsDir = path.join(__dirname, 'uploads/avatars');
    const apachePublicDir = process.env.NODE_ENV === 'production' 
      ? '/home/victorydiv24/fojourn.site/public'
      : path.join(__dirname, 'public');
    const apacheAvatarsDir = path.join(apachePublicDir, 'avatars');
    
    // Ensure Apache avatars directory exists
    await fs.promises.mkdir(apacheAvatarsDir, { recursive: true });
    
    let fixed = 0;
    let missing = 0;
    let alreadyExists = 0;
    
    for (const user of users) {
      const sourceFile = path.join(uploadsAvatarsDir, user.avatar_filename);
      const destFile = path.join(apacheAvatarsDir, user.avatar_filename);
      
      // Check if source file exists
      if (!fs.existsSync(sourceFile)) {
        console.log(`❌ Missing source file for user ${user.username}: ${user.avatar_filename}`);
        missing++;
        continue;
      }
      
      // Check if destination file already exists
      if (fs.existsSync(destFile)) {
        console.log(`✅ Avatar already exists for user ${user.username}: ${user.avatar_filename}`);
        alreadyExists++;
        continue;
      }
      
      // Copy the file
      try {
        await fs.promises.copyFile(sourceFile, destFile);
        console.log(`✅ Fixed avatar for user ${user.username}: ${user.avatar_filename}`);
        fixed++;
      } catch (error) {
        console.error(`❌ Failed to copy avatar for user ${user.username}:`, error);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Fixed: ${fixed}`);
    console.log(`✅ Already existed: ${alreadyExists}`);
    console.log(`❌ Missing source files: ${missing}`);
    console.log(`📁 Total users checked: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Error fixing avatars:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
fixMissingAvatars();
