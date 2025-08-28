const mysql = require('mysql2/promise');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  ssl: false
};

async function generateMissingThumbnails() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database...');
    
    // Get all image files without thumbnails
    const [imageFiles] = await connection.execute(`
      SELECT id, file_name, file_path, file_type, mime_type
      FROM media_files 
      WHERE file_type = 'image' 
      AND (thumbnail_path IS NULL OR thumbnail_path = '')
    `);
    
    console.log(`Found ${imageFiles.length} image files without thumbnails`);
    
    let processed = 0;
    let errors = 0;
    
    for (const file of imageFiles) {
      try {
        console.log(`Processing: ${file.file_name}`);
        
        // Check if original file exists
        const originalPath = file.file_path;
        try {
          await fs.access(originalPath);
        } catch {
          console.log(`  ❌ Original file not found: ${originalPath}`);
          errors++;
          continue;
        }
        
        // Generate thumbnail filename
        const extension = path.extname(file.file_name);
        const baseName = path.basename(file.file_name, extension);
        const thumbnailFileName = `${baseName}_thumb.jpg`;
        const thumbnailPath = path.join(path.dirname(originalPath), thumbnailFileName);
        
        // Generate thumbnail
        try {
          await sharp(originalPath)
            .resize(320, 240, {
              fit: 'cover',
              position: 'center'
            })
            .jpeg({ quality: 85 })
            .toFile(thumbnailPath);
        } catch (sharpError) {
          // If Sharp fails, try a different approach or skip
          console.log(`  ⚠️  Sharp processing failed, trying with different settings: ${sharpError.message}`);
          try {
            // Try without specific JPEG settings
            await sharp(originalPath)
              .resize(320, 240, {
                fit: 'cover',
                position: 'center'
              })
              .toFile(thumbnailPath);
          } catch (secondError) {
            console.log(`  ❌ Failed with alternate settings too: ${secondError.message}`);
            throw secondError;
          }
        }
        
        // Update database
        await connection.execute(
          'UPDATE media_files SET thumbnail_path = ? WHERE id = ?',
          [thumbnailFileName, file.id]
        );
        
        console.log(`  ✅ Generated thumbnail: ${thumbnailFileName}`);
        processed++;
        
      } catch (error) {
        console.error(`  ❌ Error processing ${file.file_name}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n=== Thumbnail Generation Summary ===');
    console.log(`✅ Processed: ${processed}`);
    console.log(`❌ Errors: ${errors}`);
    
    if (errors === 0) {
      console.log('\n🎉 All thumbnails generated successfully!');
    } else {
      console.log('\n⚠️  Some errors occurred. Check the logs above.');
    }
    
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

generateMissingThumbnails();
