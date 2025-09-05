require('dotenv').config();
const { pool } = require('./config/database');

async function testQuery() {
  try {
    console.log('Testing database connection...');
    const connection = await pool.getConnection();
    
    // Test the journey table structure
    console.log('Checking journeys table...');
    const [journeys] = await connection.execute('SELECT * FROM journeys LIMIT 1');
    console.log('Journeys query works, sample:', journeys[0]);
    
    // Test if journey_collaborators table exists
    console.log('Checking journey_collaborators table...');
    try {
      const [collaborators] = await connection.execute('SELECT * FROM journey_collaborators LIMIT 1');
      console.log('journey_collaborators table exists');
    } catch (err) {
      console.log('journey_collaborators table does not exist:', err.message);
    }
    
    // Test the specific query from the route
    console.log('Testing the full query...');
    const journeyId = 5; // The journey ID from the error
    const userId = 1; // Assuming user ID 1 exists
    
    const [journeyAccess] = await connection.execute(
      `SELECT j.id, j.user_id, j.owner_id,
       CASE 
         WHEN j.user_id = ? OR j.owner_id = ? THEN 'owner'
         WHEN jc.user_id = ? AND jc.status = 'accepted' THEN jc.role
         ELSE NULL 
       END as user_role
       FROM journeys j
       LEFT JOIN journey_collaborators jc ON j.id = jc.journey_id AND jc.user_id = ?
       WHERE j.id = ?`,
      [userId, userId, userId, userId, journeyId]
    );
    
    console.log('Query result:', journeyAccess);
    
    connection.release();
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    process.exit(0);
  }
}

testQuery();
