const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config();

const { pool } = require('./config/database');

/**
 * Migration script to fix EXIF orientation issues in existing photos
 * This script will:
 * 1. Find all image files in the database
 * 2. Check if they need orientation correction
 * 3. Apply rotation based on EXIF data
 * 4. Regenerate thumbnails with correct orientation
 */

async function checkImageNeedsRotation(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();
    // orientation values 2-8 indicate the image needs rotation
    // orientation 1 or undefined means no rotation needed
    return metadata.orientation && metadata.orientation > 1;
  } catch (error) {
    console.warn(`Could not read metadata for ${imagePath}:`, error.message);
    return false;
  }
}

async function fixImageOrientation(imagePath) {
  try {
    console.log(`Processing: ${imagePath}`);
    
    // Check if image needs rotation
    const needsRotation = await checkImageNeedsRotation(imagePath);
    if (!needsRotation) {
      console.log(`✓ No rotation needed: ${imagePath}`);
      return { processed: false, reason: 'No rotation needed' };
    }
    
    // Create backup
    const backupPath = imagePath + '.backup';
    await fs.copyFile(imagePath, backupPath);
    console.log(`✓ Backup created: ${backupPath}`);
    
    // Fix orientation by rotating based on EXIF data
    await sharp(imagePath)
      .rotate() // Automatically rotate based on EXIF orientation
      .toFile(imagePath + '.temp');
    
    // Replace original with corrected version
    await fs.rename(imagePath + '.temp', imagePath);
    console.log(`✓ Orientation fixed: ${imagePath}`);
    
    return { processed: true, reason: 'Orientation corrected' };
  } catch (error) {
    console.error(`✗ Failed to fix orientation for ${imagePath}:`, error.message);
    
    // Clean up temp file if it exists
    try {
      await fs.unlink(imagePath + '.temp');
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    return { processed: false, reason: `Error: ${error.message}` };
  }
}

async function regenerateThumbnail(originalPath, thumbnailPath) {
  try {
    await sharp(originalPath)
      .resize(320, 240, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toFile(thumbnailPath);
    
    console.log(`✓ Thumbnail regenerated: ${thumbnailPath}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to regenerate thumbnail ${thumbnailPath}:`, error.message);
    return false;
  }
}

async function fixExistingPhotoOrientation() {
  console.log('🔄 Starting existing photo orientation fix...');
  console.log('Current date:', new Date().toISOString());
  
  try {
    // Get all image files from the database (includes memory images)
    const [mediaFiles] = await pool.execute(`
      SELECT mf.id, mf.file_name, mf.file_path, mf.file_type, mf.thumbnail_path, mf.entry_id,
             te.memory_type, te.title as entry_title
      FROM media_files mf
      LEFT JOIN travel_entries te ON mf.entry_id = te.id
      WHERE mf.file_type = 'image' 
      AND (mf.file_name LIKE '%.jpg' OR mf.file_name LIKE '%.jpeg' OR mf.file_name LIKE '%.png')
      ORDER BY mf.id ASC
    `);
    
    console.log(`📊 Found ${mediaFiles.length} image files to check`);
    
    if (mediaFiles.length === 0) {
      console.log('✅ No image files found to process');
      return;
    }
    
    let processed = 0;
    let fixed = 0;
    let errors = 0;
    let thumbnailsRegenerated = 0;
    
    for (const file of mediaFiles) {
      console.log(`\n--- Processing file ${processed + 1}/${mediaFiles.length} ---`);
      console.log(`File: ${file.file_name} (ID: ${file.id})`);
      if (file.memory_type) {
        console.log(`Memory Type: ${file.memory_type} - "${file.entry_title}"`);
      } else if (file.entry_title) {
        console.log(`Travel Entry: "${file.entry_title}"`);
      }
      // Construct full file path
      const uploadsDir = path.join(__dirname, 'uploads');
      const fullPath = path.join(uploadsDir, file.file_name);
      
      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch (fileError) {
        console.warn(`✗ File not found: ${fullPath}`);
        errors++;
        processed++;
        continue;
      }
      
      // Fix image orientation
      const result = await fixImageOrientation(fullPath);
      if (result.processed) {
        fixed++;
        
        // If there's a thumbnail, regenerate it from the corrected image
        if (file.thumbnail_path) {
          const thumbnailFullPath = path.join(uploadsDir, file.thumbnail_path);
          const thumbnailRegenerated = await regenerateThumbnail(fullPath, thumbnailFullPath);
          if (thumbnailRegenerated) {
            thumbnailsRegenerated++;
          }
        }
      } else if (result.reason.startsWith('Error:')) {
        errors++;
      }
      
      processed++;
      
      // Progress update every 10 files
      if (processed % 10 === 0) {
        console.log(`\n📈 Progress: ${processed}/${mediaFiles.length} files processed`);
        console.log(`   Fixed: ${fixed}, Errors: ${errors}, Thumbnails: ${thumbnailsRegenerated}`);
      }
    }
    
    // Final summary
    console.log('\n🎉 Photo orientation fix complete!');
    console.log('='.repeat(50));
    console.log(`📊 Summary:`);
    console.log(`   Total files processed: ${processed}`);
    console.log(`   Orientation fixes applied: ${fixed}`);
    console.log(`   Thumbnails regenerated: ${thumbnailsRegenerated}`);
    console.log(`   Errors encountered: ${errors}`);
    console.log(`   Files that didn't need fixing: ${processed - fixed - errors}`);
    
    if (errors > 0) {
      console.log(`\n⚠️  ${errors} files had errors. Check the logs above for details.`);
    }
    
    if (fixed > 0) {
      console.log(`\n✅ ${fixed} photos have been corrected and will now display with proper orientation!`);
    } else {
      console.log('\n✅ All photos were already correctly oriented!');
    }
    
  } catch (error) {
    console.error('💥 Fatal error during photo orientation fix:', error);
    throw error;
  }
}

// Check for other image upload locations
async function fixOtherImageLocations() {
  console.log('\n🔄 Checking other image locations...');
  
  const locations = [
    { dir: 'uploads/avatars', description: 'User avatars' },
    { dir: 'uploads/hero-images', description: 'Hero images' },
    { dir: 'uploads/blog-images', description: 'Blog images' }
  ];
  
  for (const location of locations) {
    console.log(`\n--- Checking ${location.description} ---`);
    
    const dirPath = path.join(__dirname, location.dir);
    try {
      const files = await fs.readdir(dirPath);
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png)$/i.test(file) && !file.includes('.backup')
      );
      
      console.log(`Found ${imageFiles.length} image files in ${location.dir}`);
      
      let fixed = 0;
      for (const file of imageFiles) {
        const filePath = path.join(dirPath, file);
        const result = await fixImageOrientation(filePath);
        if (result.processed) {
          fixed++;
        }
      }
      
      console.log(`✓ Fixed ${fixed} images in ${location.description}`);
      
    } catch (error) {
      console.log(`⚠️  Could not access ${location.dir}: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting comprehensive photo orientation fix');
    console.log('This will fix EXIF orientation issues in all existing photos');
    console.log('Backups will be created for all modified files');
    console.log('='.repeat(60));
    
    // Fix main media files
    await fixExistingPhotoOrientation();
    
    // Fix other image locations
    await fixOtherImageLocations();
    
    console.log('\n🎉 All photo orientation fixes completed successfully!');
    console.log('Your users will now see all photos with correct orientation.');
    
  } catch (error) {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (pool) {
      await pool.end();
    }
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { fixExistingPhotoOrientation, fixImageOrientation, checkImageNeedsRotation };