require('dotenv').config();
const { pool } = require('./config/database');

async function checkUserDreams() {
  try {
    const connection = await pool.getConnection();
    
    // Check what dreams user 4 has
    const [userDreams] = await connection.execute('SELECT id, title, user_id FROM dreams WHERE user_id = 4');
    console.log('User 4 dreams:', userDreams);
    
    // Check what dreams exist in general
    const [allDreams] = await connection.execute('SELECT id, title, user_id FROM dreams');
    console.log('All dreams:', allDreams);
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Database error:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

checkUserDreams();
