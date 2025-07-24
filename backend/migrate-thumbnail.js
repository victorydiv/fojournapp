const mysql = require('mysql2/promise');
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

async function migrateThumbnailColumn() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database...');
    
    // Check if thumbnail_path column already exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'media_files' 
      AND TABLE_SCHEMA = ? 
      AND COLUMN_NAME = 'thumbnail_path'
    `, [process.env.DB_NAME]);
    
    if (columns.length > 0) {
      console.log('thumbnail_path column already exists!');
      return;
    }
    
    // Add thumbnail_path column
    await connection.execute(`
      ALTER TABLE media_files 
      ADD COLUMN thumbnail_path VARCHAR(500) NULL 
      AFTER mime_type
    `);
    
    console.log('Successfully added thumbnail_path column to media_files table!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateThumbnailColumn();
