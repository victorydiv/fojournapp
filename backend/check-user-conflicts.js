require('dotenv').config();
const { pool } = require('./config/database');

async function checkUserConflicts() {
  try {
    const connection = await pool.getConnection();
    
    // Check all users and their usernames
    const [users] = await connection.execute('SELECT id, username, email FROM users ORDER BY id');
    console.log('All users:', users);
    
    // Check for duplicate usernames
    const [duplicates] = await connection.execute(`
      SELECT username, COUNT(*) as count 
      FROM users 
      GROUP BY username 
      HAVING COUNT(*) > 1
    `);
    console.log('Duplicate usernames:', duplicates);
    
    // Check specifically for "superduper"
    const [superduper] = await connection.execute('SELECT id, username, email FROM users WHERE username = "superduper"');
    console.log('Users with username "superduper":', superduper);
    
    // Check dreams ownership
    const [dreamOwnership] = await connection.execute(`
      SELECT d.id, d.title, d.user_id, u.username 
      FROM dreams d 
      JOIN users u ON d.user_id = u.id 
      ORDER BY d.id
    `);
    console.log('Dream ownership:', dreamOwnership);
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Database error:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

checkUserConflicts();
