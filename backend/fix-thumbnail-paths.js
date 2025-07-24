const mysql = require('mysql2/promise');
const path = require('path');
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

async function fixThumbnailPaths() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Get all records with thumbnail_path containing full paths
    const [records] = await connection.execute(
      'SELECT id, thumbnail_path FROM media_files WHERE thumbnail_path IS NOT NULL AND thumbnail_path LIKE ?',
      ['%\\\\%'] // Looking for backslashes indicating full Windows paths
    );
    
    console.log(`Found ${records.length} records with full thumbnail paths to fix`);
    
    for (const record of records) {
      if (record.thumbnail_path) {
        const filename = path.basename(record.thumbnail_path);
        console.log(`Updating record ${record.id}: "${record.thumbnail_path}" -> "${filename}"`);
        
        await connection.execute(
          'UPDATE media_files SET thumbnail_path = ? WHERE id = ?',
          [filename, record.id]
        );
      }
    }
    
    console.log('Thumbnail path migration completed!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixThumbnailPaths();
