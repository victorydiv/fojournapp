require('dotenv').config();
const { pool } = require('./config/database');

async function checkAllDreamData() {
  try {
    const connection = await pool.getConnection();
    
    // Check all dreams by all users
    const [allDreams] = await connection.execute(`
      SELECT d.id, d.title, d.user_id, u.username, u.email 
      FROM dreams d 
      JOIN users u ON d.user_id = u.id 
      ORDER BY d.user_id, d.id
    `);
    console.log('All dreams by user:', allDreams);
    
    // Check if user 4 has any dreams
    const [user4Dreams] = await connection.execute(`
      SELECT d.id, d.title 
      FROM dreams d 
      WHERE d.user_id = 4
    `);
    console.log('User 4 dreams:', user4Dreams);
    
    // Check if we should create a test dream for user 4
    if (user4Dreams.length === 0) {
      console.log('User 4 has no dreams. The frontend should either:');
      console.log('1. Be logged in as user 1 (sean@estes-family.org)');
      console.log('2. Or access a dream owned by user 4');
      console.log('3. Or create a new dream for user 4');
    }
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Database error:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

checkAllDreamData();
