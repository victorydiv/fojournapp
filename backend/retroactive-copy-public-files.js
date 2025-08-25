require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

async function retroactivelyCopyPublicFiles() {
  try {
    console.log('Starting retroactive copy of public memory files...');
    
    // Get all public memories
    const [memories] = await pool.execute(`
      SELECT id, user_id, title, public_slug 
      FROM travel_entries 
      WHERE is_public = 1
    `);
    
    console.log(`Found ${memories.length} public memories to process`);
    
    for (const memory of memories) {
      console.log(`\nProcessing memory ${memory.id}: "${memory.title}" (user: ${memory.user_id})`);
      
      // Get media files for this memory
      const [mediaFiles] = await pool.execute(
        'SELECT file_name, original_name FROM media_files WHERE entry_id = ?',
        [memory.id]
      );
      
      console.log(`  Found ${mediaFiles.length} media files`);
      
      if (mediaFiles.length === 0) {
        console.log('  No media files to copy');
        continue;
      }
      
      // Create public directory structure
      const publicUserDir = path.join(__dirname, 'public/users', memory.user_id.toString());
      const publicMemoryDir = path.join(publicUserDir, 'memories', memory.id.toString());
      
      console.log(`  Creating directory: ${publicMemoryDir}`);
      await fs.promises.mkdir(publicMemoryDir, { recursive: true });
      
      // Copy each media file
      for (const file of mediaFiles) {
        const sourcePath = path.join(__dirname, 'uploads', file.file_name);
        const destPath = path.join(publicMemoryDir, file.file_name);
        
        try {
          // Check if source file exists
          await fs.promises.access(sourcePath);
          
          // Check if destination already exists
          try {
            await fs.promises.access(destPath);
            console.log(`    ${file.file_name} already exists in public directory`);
          } catch {
            // File doesn't exist in public, copy it
            await fs.promises.copyFile(sourcePath, destPath);
            console.log(`    ✓ Copied ${file.file_name}`);
          }
        } catch (error) {
          console.error(`    ✗ Error copying ${file.file_name}:`, error.message);
        }
      }
    }
    
    console.log('\nRetroactive copying completed!');
    
  } catch (error) {
    console.error('Error during retroactive copying:', error);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  retroactivelyCopyPublicFiles();
}

module.exports = { retroactivelyCopyPublicFiles };
