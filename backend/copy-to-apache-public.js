require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

async function copyToApachePublic() {
  try {
    console.log('Starting copy of public memory files to Apache public directory...');
    
    // Get all public memories
    const [memories] = await pool.execute(`
      SELECT id, user_id, title, public_slug 
      FROM travel_entries 
      WHERE is_public = 1
    `);
    
    console.log(`Found ${memories.length} public memories to process`);
    
    // Apache public directory (adjust this path for your server)
    const apachePublicDir = '/home/victorydiv24/fojourn.site/public';
    
    for (const memory of memories) {
      console.log(`\nProcessing memory ${memory.id}: "${memory.title}" (user: ${memory.user_id})`);
      
      // Get media files for this memory
      const [mediaFiles] = await pool.execute(`
        SELECT file_name 
        FROM media_files 
        WHERE entry_id = ?
      `, [memory.id]);
      
      if (mediaFiles.length === 0) {
        console.log('  No media files found');
        continue;
      }
      
      console.log(`  Found ${mediaFiles.length} media files`);
      
      // Create Apache public directory structure
      const apacheMemoryDir = path.join(apachePublicDir, 'users', memory.user_id.toString(), 'memories', memory.id.toString());
      
      try {
        await fs.promises.mkdir(apacheMemoryDir, { recursive: true });
        console.log(`  Created directory: ${apacheMemoryDir}`);
      } catch (err) {
        if (err.code !== 'EEXIST') {
          console.error(`  Error creating directory: ${err.message}`);
          continue;
        }
      }
      
      // Copy each media file
      for (const mediaFile of mediaFiles) {
        const sourceFile = path.join(__dirname, 'uploads', mediaFile.file_name);
        const destFile = path.join(apacheMemoryDir, mediaFile.file_name);
        
        try {
          // Check if source file exists
          await fs.promises.access(sourceFile);
          
          // Check if destination already exists
          try {
            await fs.promises.access(destFile);
            console.log(`    ${mediaFile.file_name} already exists in Apache public directory`);
          } catch (err) {
            // File doesn't exist, copy it
            await fs.promises.copyFile(sourceFile, destFile);
            console.log(`    Copied ${mediaFile.file_name} to Apache public directory`);
          }
        } catch (err) {
          console.error(`    Error copying ${mediaFile.file_name}: ${err.message}`);
        }
      }
    }
    
    console.log('\nApache public copy completed!');
    
  } catch (error) {
    console.error('Error during Apache public copying:', error);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run the copy process
copyToApachePublic();
