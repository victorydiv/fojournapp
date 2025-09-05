require('dotenv').config();
const { pool } = require('./config/database');

async function testJourneyChecklistQuery() {
  try {
    console.log('Testing journey checklist query...');
    const connection = await pool.getConnection();
    
    // First, let's just check if journey 5 exists
    const [journey] = await connection.execute('SELECT * FROM journeys WHERE id = ?', [5]);
    console.log('Journey 5:', journey);
    
    // Check if journey_collaborators table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'journey_collaborators'");
    console.log('journey_collaborators table exists:', tables.length > 0);
    
    // Now test the simpler query first
    const [journeyAccess] = await connection.execute(
      'SELECT id, user_id, owner_id FROM journeys WHERE id = ?',
      [5]
    );
    
    console.log('Journey access result:', journeyAccess);
    
    connection.release();
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testJourneyChecklistQuery();
