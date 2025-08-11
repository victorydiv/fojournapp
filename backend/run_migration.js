const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Railway database configuration
const dbConfig = {
  host: 'shuttle.proxy.rlwy.net',
  port: 12502,
  user: 'root',
  password: 'iDkIeFixKPDjutDuApRPFGIXEPkzLyqG',
  database: 'railway',
  ssl: { rejectUnauthorized: false },
  connectTimeout: 60000,
  acquireTimeout: 60000
};

async function runMigration() {
  let connection;
  
  try {
    console.log('Connecting to Railway MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!');
    
    // Create the missing journeys table first
    console.log('Creating journeys table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS journeys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        owner_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        destination VARCHAR(255),
        start_destination VARCHAR(255),
        end_destination VARCHAR(255),
        start_date DATE,
        end_date DATE,
        status ENUM('planning', 'active', 'completed', 'cancelled') DEFAULT 'planning',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_journey (user_id),
        INDEX idx_owner_journey (owner_id),
        INDEX idx_dates (start_date, end_date)
      )
    `);
    console.log('Journeys table created successfully!');
    
    // Create journey_collaborators table
    console.log('Creating journey_collaborators table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS journey_collaborators (
        id INT AUTO_INCREMENT PRIMARY KEY,
        journey_id INT NOT NULL,
        user_id INT NOT NULL,
        role ENUM('viewer', 'editor', 'admin') DEFAULT 'viewer',
        status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
        invited_by INT NOT NULL,
        invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP NULL,
        UNIQUE KEY unique_journey_user (journey_id, user_id),
        INDEX idx_user_collaborations (user_id),
        INDEX idx_journey_collaborators (journey_id)
      )
    `);
    console.log('Journey collaborators table created successfully!');
    
    // Create journey_experiences table
    console.log('Creating journey_experiences table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS journey_experiences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        journey_id INT NOT NULL,
        day INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type ENUM('activity', 'meal', 'accommodation', 'transportation', 'attraction', 'other') DEFAULT 'other',
        time TIME,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        address VARCHAR(500),
        place_id VARCHAR(255),
        tags JSON,
        notes TEXT,
        suggested_by INT NOT NULL,
        approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_journey_experiences (journey_id),
        INDEX idx_suggested_by (suggested_by),
        INDEX idx_approval_status (approval_status),
        INDEX idx_day_time (day, time)
      )
    `);
    console.log('Journey experiences table created successfully!');
    
    // Show all tables
    console.log('\nShowing all tables...');
    const [results] = await connection.execute('SHOW TABLES');
    console.log('Tables in database:');
    results.forEach((row, index) => {
      console.log(`  ${index + 1}. ${Object.values(row)[0]}`);
    });
    
    console.log('\nMigration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the migration
runMigration();
