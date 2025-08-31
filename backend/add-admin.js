const { pool } = require('./config/database');

async function addAdminToUser() {
  try {
    // First, check if is_admin column exists
    console.log('Checking users table structure...');
    
    try {
      const [columns] = await pool.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'travel_log' 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'is_admin'
      `);
      
      if (columns.length === 0) {
        console.log('is_admin column does not exist. Adding it...');
        await pool.execute('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE');
        console.log('Added is_admin column to users table');
      } else {
        console.log('is_admin column already exists');
      }
    } catch (err) {
      console.log('Error checking/adding column:', err.message);
    }
    
    // Now make user ID 1 an admin
    console.log('Making user ID 1 an admin...');
    const [result] = await pool.execute(
      'UPDATE users SET is_admin = TRUE WHERE id = 1'
    );
    
    if (result.affectedRows > 0) {
      console.log('Successfully made user ID 1 an admin');
    } else {
      console.log('User ID 1 not found');
    }
    
    // Verify the change
    const [users] = await pool.execute('SELECT id, username, email, is_admin FROM users WHERE id = 1');
    console.log('User 1 data:', users[0] || 'User not found');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addAdminToUser();
