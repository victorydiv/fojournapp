const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Load environment variables if .env exists
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  ssl: false
};

async function runAvatarMigration() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    // Read the migration SQL
    const migrationPath = path.join(__dirname, 'database', 'add_user_avatar.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        await connection.execute(statement);
      }
    }
    
    console.log('✅ Avatar migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ Avatar columns already exist - migration was already run');
    } else if (error.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️ Avatar index already exists - migration was already run');
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  runAvatarMigration().catch(console.error);
}

module.exports = runAvatarMigration;
