const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Use the same connection parameters as the main app
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'travellog_user',
      password: process.env.DB_PASSWORD || 'travellog123',
      database: process.env.DB_NAME || 'travel_log'
    });

    console.log('Connected to database successfully');

    // First check if users table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
    `, [process.env.DB_NAME || 'travel_log']);

    if (tables.length === 0) {
      console.log('❌ Users table does not exist. Please run the main schema first.');
      return;
    }

    console.log('✅ Users table exists, proceeding with migration...');

    // Check if travel info table already exists
    const [existingTables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_travel_info'
    `, [process.env.DB_NAME || 'travel_log']);

    if (existingTables.length > 0) {
      console.log('✅ Travel info table already exists');
      return;
    }

    console.log('Creating travel info table...');
    
    const createTableSQL = `
      CREATE TABLE user_travel_info (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        frequent_flyer_programs JSON,
        known_traveler_number VARCHAR(50),
        global_entry_number VARCHAR(50),
        passport_number VARCHAR(50),
        passport_expiry DATE,
        passport_country VARCHAR(3),
        tsa_precheck BOOLEAN DEFAULT FALSE,
        clear_membership BOOLEAN DEFAULT FALSE,
        emergency_contact_name VARCHAR(100),
        emergency_contact_phone VARCHAR(20),
        emergency_contact_relationship VARCHAR(50),
        medical_conditions TEXT,
        allergies TEXT,
        medications TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_travel_info (user_id),
        INDEX idx_user_id (user_id)
      )
    `;

    await connection.execute(createTableSQL);
    console.log('✅ Travel info table created successfully');

  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
