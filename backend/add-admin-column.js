const { pool } = require('./config/database');

async function addAdminColumn() {
  try {
    console.log('Adding is_admin column to users table...');
    
    // Check if column already exists
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'is_admin'
    `);
    
    if (columns.length === 0) {
      // Add the is_admin column
      await pool.execute(`
        ALTER TABLE users 
        ADD COLUMN is_admin BOOLEAN DEFAULT FALSE AFTER avatar_filename
      `);
      
      console.log('is_admin column added successfully');
      
      // Make the first user an admin (assuming user ID 1 exists)
      const [users] = await pool.execute('SELECT id FROM users ORDER BY id LIMIT 1');
      if (users.length > 0) {
        await pool.execute('UPDATE users SET is_admin = TRUE WHERE id = ?', [users[0].id]);
        console.log(`User ID ${users[0].id} has been made an admin`);
      }
    } else {
      console.log('is_admin column already exists');
    }
    
  } catch (error) {
    console.error('Error adding admin column:', error);
    throw error;
  }
}

// Run the migration if called directly
if (require.main === module) {
  addAdminColumn()
    .then(() => {
      console.log('Admin column migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addAdminColumn };
