const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load environment variables
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

async function runMigration() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(path.join(__dirname, '../database/add_memory_type_and_ratings.sql'), 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let statement of statements) {
      const trimmed = statement.trim();
      if (trimmed && !trimmed.startsWith('--') && !trimmed.toUpperCase().startsWith('USE')) {
        console.log(`Executing: ${trimmed.substring(0, 50)}...`);
        try {
          await connection.query(trimmed);
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Field already exists, skipping...');
            continue;
          }
          throw error;
        }
      }
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
