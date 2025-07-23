const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4',
  ssl: false
};

const dbConfigWithDatabase = {
  ...dbConfig,
  database: process.env.DB_NAME
};

// Create connection pool immediately when module loads
const pool = mysql.createPool({
  ...dbConfigWithDatabase,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection and create database if needed
const testConnection = async () => {
  try {
    console.log('Attempting to connect to MySQL...');
    console.log(`Connecting to: ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user}`);
    
    // First, try to create the database if it doesn't exist
    const tempConnection = await mysql.createConnection(dbConfig);
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    console.log(`Database '${process.env.DB_NAME}' created or already exists`);
    await tempConnection.end();
    
    // Test the connection with the database using the existing pool
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.error('Please check your MySQL credentials and make sure MySQL is running');
    
    // Try to provide more specific error information
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Access denied - check username and password');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - check if MySQL is running');
    } else if (error.message.includes('mysql_native_password')) {
      console.error('Authentication plugin issue - try creating user with mysql_native_password');
    }
    
    process.exit(1);
  }
};

// Initialize database tables
const initializeDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    // Create travel_entries table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS travel_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        location_name VARCHAR(255),
        entry_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_date (user_id, entry_date),
        INDEX idx_location (latitude, longitude)
      )
    `);

    // Create media_files table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS media_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entry_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_type ENUM('image', 'video', 'document') NOT NULL,
        file_size INT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entry_id) REFERENCES travel_entries(id) ON DELETE CASCADE
      )
    `);

    // Create activity_links table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS activity_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entry_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        url VARCHAR(500) NOT NULL,
        description TEXT,
        link_type ENUM('activity', 'attraction', 'restaurant', 'accommodation', 'other') DEFAULT 'other',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entry_id) REFERENCES travel_entries(id) ON DELETE CASCADE
      )
    `);

    // Create search tags table for better search functionality
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS entry_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entry_id INT NOT NULL,
        tag VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entry_id) REFERENCES travel_entries(id) ON DELETE CASCADE,
        UNIQUE KEY unique_entry_tag (entry_id, tag),
        INDEX idx_tag (tag)
      )
    `);

    connection.release();
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  testConnection,
  initializeDatabase
};
