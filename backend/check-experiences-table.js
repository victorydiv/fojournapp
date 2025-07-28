require('dotenv').config();
const { pool } = require('./config/database');

async function checkAndCreateExperiencesTable() {
  try {
    const connection = await pool.getConnection();
    
    // Check if journey_experiences table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'journey_experiences'"
    );
    
    if (tables.length === 0) {
      console.log('Creating journey_experiences table...');
      
      // Create the table
      await connection.execute(`
        CREATE TABLE journey_experiences (
          id INT AUTO_INCREMENT PRIMARY KEY,
          journey_id INT NOT NULL,
          day INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          type ENUM('attraction', 'restaurant', 'accommodation', 'activity', 'other') NOT NULL,
          time TIME,
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          address VARCHAR(500),
          place_id VARCHAR(255),
          tags JSON,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
          INDEX idx_journey_day (journey_id, day),
          INDEX idx_journey_time (journey_id, day, time)
        )
      `);
      
      console.log('✅ journey_experiences table created successfully');
    } else {
      console.log('✅ journey_experiences table already exists');
      
      // Show table structure
      const [columns] = await connection.execute(
        "DESCRIBE journey_experiences"
      );
      console.log('Table structure:');
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }
    
    connection.release();
    console.log('Database check completed');
    process.exit(0);
    
  } catch (error) {
    console.error('Error checking/creating table:', error);
    process.exit(1);
  }
}

checkAndCreateExperiencesTable();