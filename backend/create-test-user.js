const mysql = require('mysql2/promise');

async function createTestUser() {
  const dbConfig = {
    host: 'shuttle.proxy.rlwy.net',
    port: 12502,
    user: 'root',
    password: 'iDkIeFixKPDjutDuApRPFGIXEPkzLyqG',
    database: 'railway',
    ssl: { rejectUnauthorized: false }
  };
  
  try {
    console.log('Connecting to Railway MySQL...');
    const connection = await mysql.createConnection(dbConfig);
    
    // Use a simple hash for now - just to get login working
    // In production, use proper bcrypt
    const simpleHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // password: 'password'
    
    // First check if user exists
    const [existing] = await connection.execute('SELECT id FROM users WHERE username = ?', ['test']);
    
    if (existing.length > 0) {
      console.log('Test user already exists');
    } else {
      await connection.execute(
        'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)', 
        ['test', 'test@example.com', simpleHash, 'Test', 'User']
      );
      console.log('Test user created successfully with username: test, password: password');
    }
    
    await connection.end();
  } catch (error) {
    console.error('Error creating test user:', error.message);
    process.exit(1);
  }
}

createTestUser();
