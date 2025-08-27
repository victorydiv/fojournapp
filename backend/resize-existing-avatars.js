const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { pool } = require('./config/database');

async function resizeExistingAvatars() {
  try {
    console.log('Starting bulk avatar resize process...');

    // Get all users with avatars
    const [users] = await pool.execute(`
      SELECT id, avatar_filename, profile_public 
      FROM users 
      WHERE avatar_filename IS NOT NULL AND avatar_filename != ''
    `);

    console.log(`Found ${users.length} users with avatars to process`);

    const uploadsDir = path.join(__dirname, 'uploads/avatars');
    const backupDir = path.join(__dirname, 'uploads/avatars-backup');
    
    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        const originalPath = path.join(uploadsDir, user.avatar_filename);
        
        // Check if original file exists
        if (!fs.existsSync(originalPath)) {
          console.log(`Skipping user ${user.id}: Original avatar file not found - ${user.avatar_filename}`);
          skipped++;
          continue;
        }

        // Skip if already a webp file with correct naming pattern
        if (user.avatar_filename.includes('.webp') && user.avatar_filename.includes(`avatar-${user.id}-`)) {
          console.log(`Skipping user ${user.id}: Avatar already processed - ${user.avatar_filename}`);
          skipped++;
          continue;
        }

        // Create backup of original
        const backupPath = path.join(backupDir, user.avatar_filename);
        fs.copyFileSync(originalPath, backupPath);

        // Generate new filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const newFilename = `avatar-${user.id}-${uniqueSuffix}.webp`;
        const newPath = path.join(uploadsDir, newFilename);

        // Resize and optimize the image
        await sharp(originalPath)
          .resize(200, 200, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 85 })
          .toFile(newPath);

        // Update database
        const newAvatarPath = `/uploads/avatars/${newFilename}`;
        await pool.execute(
          'UPDATE users SET avatar_path = ?, avatar_filename = ? WHERE id = ?',
          [newAvatarPath, newFilename, user.id]
        );

        // Handle public avatar if profile is public
        if (user.profile_public) {
          const publicAvatarsDir = path.join(__dirname, 'uploads/public/avatars');
          if (!fs.existsSync(publicAvatarsDir)) {
            fs.mkdirSync(publicAvatarsDir, { recursive: true });
          }

          const publicPath = path.join(publicAvatarsDir, newFilename);
          fs.copyFileSync(newPath, publicPath);

          // Remove old public avatar if exists
          const oldPublicPath = path.join(publicAvatarsDir, user.avatar_filename);
          if (fs.existsSync(oldPublicPath)) {
            fs.unlinkSync(oldPublicPath);
          }
        }

        // Remove old original file
        fs.unlinkSync(originalPath);

        console.log(`✅ Processed user ${user.id}: ${user.avatar_filename} → ${newFilename}`);
        processed++;

      } catch (error) {
        console.error(`❌ Error processing user ${user.id} (${user.avatar_filename}):`, error.message);
        errors++;
      }
    }

    console.log('\n=== Avatar Resize Summary ===');
    console.log(`✅ Processed: ${processed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📁 Backups saved to: ${backupDir}`);
    
    if (errors === 0) {
      console.log('\n🎉 All avatars processed successfully!');
    } else {
      console.log('\n⚠️  Some errors occurred. Check the logs above.');
    }

  } catch (error) {
    console.error('❌ Fatal error in bulk resize process:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
resizeExistingAvatars();
