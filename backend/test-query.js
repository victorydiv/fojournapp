require('dotenv').config();
const { pool } = require('./config/database');

async function testDreamChecklistQuery() {
  try {
    const connection = await pool.getConnection();
    
    console.log('Testing the problematic query...');
    
    // This is the problematic query from the route
    try {
      const [checklists] = await connection.execute(
        `SELECT c.*, dc.attached_at, u.username as attached_by_username,
         COUNT(ci.id) as total_items,
         COUNT(CASE WHEN ci.is_completed = 1 THEN 1 END) as completed_items
         FROM dream_checklists dc
         JOIN checklists c ON dc.checklist_id = c.id
         JOIN users u ON dc.attached_by = u.id
         LEFT JOIN checklist_items ci ON c.id = ci.checklist_id
         WHERE dc.dream_id = ?
         GROUP BY c.id
         ORDER BY dc.attached_at DESC`,
        [10]
      );
      console.log('Query succeeded:', checklists);
    } catch (queryError) {
      console.error('Query failed with error:', queryError.message);
      console.error('This is likely the source of the 500 error!');
    }
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Database error:', error);
    process.exit(1);
  }
}

testDreamChecklistQuery();
