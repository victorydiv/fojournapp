require('dotenv').config();
const { pool } = require('./config/database');

async function testFixedDreamChecklistQuery() {
  try {
    const connection = await pool.getConnection();
    
    console.log('Testing the FIXED query...');
    
    // This is the fixed query
    try {
      const [checklists] = await connection.execute(
        `SELECT c.id, c.user_id, c.title, c.description, c.category, c.is_template, 
         c.is_public, c.color, c.created_at, c.updated_at, 
         dc.attached_at, u.username as attached_by_username,
         COUNT(ci.id) as total_items,
         COUNT(CASE WHEN ci.is_completed = 1 THEN 1 END) as completed_items
         FROM dream_checklists dc
         JOIN checklists c ON dc.checklist_id = c.id
         JOIN users u ON dc.attached_by = u.id
         LEFT JOIN checklist_items ci ON c.id = ci.checklist_id
         WHERE dc.dream_id = ?
         GROUP BY c.id, c.user_id, c.title, c.description, c.category, c.is_template, 
                  c.is_public, c.color, c.created_at, c.updated_at, 
                  dc.attached_at, u.username, dc.attached_by
         ORDER BY dc.attached_at DESC`,
        [10]
      );
      console.log('Fixed query succeeded!');
      console.log('Results:', checklists);
    } catch (queryError) {
      console.error('Query still failed:', queryError.message);
    }
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Database error:', error);
    process.exit(1);
  }
}

testFixedDreamChecklistQuery();
