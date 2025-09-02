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

    // Blog system tables
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        excerpt TEXT,
        content LONGTEXT NOT NULL,
        hero_image_url VARCHAR(500),
        hero_image_filename VARCHAR(255),
        author_id INT NOT NULL,
        status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
        featured BOOLEAN DEFAULT FALSE,
        published_at DATETIME,
        seo_title VARCHAR(60),
        seo_description VARCHAR(160),
        tags JSON,
        reading_time INT,
        view_count INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_slug (slug),
        INDEX idx_status_published (status, published_at),
        INDEX idx_featured (featured),
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS blog_categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(7),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS blog_post_categories (
        blog_post_id INT NOT NULL,
        category_id INT NOT NULL,
        PRIMARY KEY (blog_post_id, category_id),
        FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES blog_categories(id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS blog_post_views (
        id INT PRIMARY KEY AUTO_INCREMENT,
        blog_post_id INT NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        referer VARCHAR(500),
        viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
        INDEX idx_post_date (blog_post_id, viewed_at)
      )
    `);

    // Insert default blog categories if they don't exist
    await connection.execute(`
      INSERT IGNORE INTO blog_categories (name, slug, description, color) VALUES
      ('Travel Tips', 'travel-tips', 'Helpful tips and advice for travelers', '#2196F3'),
      ('Destinations', 'destinations', 'Featured destinations and travel guides', '#4CAF50'),
      ('Food & Culture', 'food-culture', 'Local cuisine and cultural experiences', '#FF5722'),
      ('Adventure', 'adventure', 'Adventure travel and outdoor activities', '#FF9800'),
      ('Budget Travel', 'budget-travel', 'Money-saving tips and budget-friendly travel', '#9C27B0'),
      ('Travel Stories', 'travel-stories', 'Personal travel experiences and stories', '#E91E63')
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
