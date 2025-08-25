const fs = require('fs');
const path = require('path');
const { pool } = require('./config/database');

async function debugPublicFiles() {
  try {
    console.log('Checking public memory files...');
    
    // Get public memories
    const [memories] = await pool.execute(`
      SELECT id, user_id, title, public_slug, is_public, featured 
      FROM travel_entries 
      WHERE is_public = 1
    `);
    
    console.log(`Found ${memories.length} public memories:`);
    
    for (const memory of memories) {
      console.log(`\nMemory ${memory.id}: "${memory.title}"`);
      console.log(`  User: ${memory.user_id}, Slug: ${memory.public_slug}`);
      
      // Check if public directory exists
      const publicDir = path.join(__dirname, 'public/users', memory.user_id.toString(), 'memories', memory.id.toString());
      const publicDirExists = fs.existsSync(publicDir);
      console.log(`  Public directory exists: ${publicDirExists} (${publicDir})`);
      
      if (publicDirExists) {
        const files = fs.readdirSync(publicDir);
        console.log(`  Files in public directory: ${files.length}`);
        files.forEach(file => console.log(`    - ${file}`));
      }
      
      // Check media files in database
      const [mediaFiles] = await pool.execute(
        'SELECT file_name, original_name FROM media_files WHERE entry_id = ?',
        [memory.id]
      );
      
      console.log(`  Media files in database: ${mediaFiles.length}`);
      mediaFiles.forEach(file => {
        const originalPath = path.join(__dirname, 'uploads', file.file_name);
        const originalExists = fs.existsSync(originalPath);
        console.log(`    - ${file.file_name} (original exists: ${originalExists})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  require('dotenv').config();
  debugPublicFiles();
}

module.exports = { debugPublicFiles };
