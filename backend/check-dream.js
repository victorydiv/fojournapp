require('dotenv').config();
const { pool } = require('./config/database');

async function checkDream() {
  try {
    const connection = await pool.getConnection();
    
    // Check dream 10 details
    const [dreams] = await connection.execute('SELECT id, title, user_id FROM dreams WHERE id = 10');
    console.log('Dream 10:', dreams);
    
    // Check if dream_checklists table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE '%dream%'");
    console.log('Dream-related tables:', tables);
    
    // Check for any dream checklists
    const [dreamChecklists] = await connection.execute('SELECT * FROM dream_checklists WHERE dream_id = 10');
    console.log('Dream 10 checklists:', dreamChecklists);
    
    // Check if checklist tables exist
    const [checklistTables] = await connection.execute("SHOW TABLES LIKE '%checklist%'");
    console.log('Checklist tables:', checklistTables);
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Database error:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

checkDream();
