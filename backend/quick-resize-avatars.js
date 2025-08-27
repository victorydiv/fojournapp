const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function quickResizeExistingAvatars() {
  try {
    console.log('Starting quick resize of existing avatars...');

    const uploadsDir = path.join(__dirname, 'uploads/avatars');
    const files = fs.readdirSync(uploadsDir);

    for (const filename of files) {
      if (filename.includes('.jpg') || filename.includes('.jpeg') || filename.includes('.png')) {
        try {
          const originalPath = path.join(uploadsDir, filename);
          const tempPath = path.join(uploadsDir, 'temp-' + filename);
          const newFilename = filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
          const newPath = path.join(uploadsDir, newFilename);

          console.log(`Processing: ${filename} → ${newFilename}`);

          // Resize to WebP
          await sharp(originalPath)
            .resize(200, 200, {
              fit: 'cover',
              position: 'center'
            })
            .webp({ quality: 85 })
            .toFile(newPath);

          // Move original to temp (backup)
          fs.renameSync(originalPath, tempPath);
          
          console.log(`✅ Resized: ${filename} → ${newFilename}`);
        } catch (error) {
          console.error(`❌ Error processing ${filename}:`, error.message);
        }
      }
    }

    console.log('Quick resize completed!');
  } catch (error) {
    console.error('Error:', error);
  }
}

quickResizeExistingAvatars();
