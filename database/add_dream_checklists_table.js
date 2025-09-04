const mysql = require('mysql2/promise');
require('dotenv').config();
const { getDbConfig } = require('../backend/config/database');

async function addDreamChecklistsTable() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    const dbConfig = getDbConfig();
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Creating dream_checklists table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS dream_checklists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dream_id INT NOT NULL,
        checklist_id INT NOT NULL,
        attached_by INT NOT NULL,
        attached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE,
        FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE,
        FOREIGN KEY (attached_by) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_dream_checklist (dream_id, checklist_id),
        INDEX idx_dream_checklists (dream_id),
        INDEX idx_checklist_dreams (checklist_id)
      )
    `);
    
    console.log('dream_checklists table created successfully!');
    
  } catch (error) {
    console.error('Error creating dream_checklists table:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addDreamChecklistsTable();
