require('dotenv').config();
const { pool } = require('./config/database');

async function addBreweryType() {
  try {
    console.log('Adding brewery type to enums...');
    
    const connection = await pool.getConnection();
    
    // Update travel_entries table
    await connection.execute(`
      ALTER TABLE travel_entries 
      MODIFY COLUMN memory_type ENUM('attraction', 'restaurant', 'accommodation', 'activity', 'brewery', 'other') DEFAULT 'other'
    `);
    console.log('✓ Updated travel_entries memory_type enum');
    
    // Update journey_experiences table
    await connection.execute(`
      ALTER TABLE journey_experiences 
      MODIFY COLUMN type ENUM('attraction', 'restaurant', 'accommodation', 'activity', 'brewery', 'other') NOT NULL
    `);
    console.log('✓ Updated journey_experiences type enum');
    
    // Verify the changes
    const [memoryTypeInfo] = await connection.execute(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'travel_log' 
      AND TABLE_NAME = 'travel_entries' 
      AND COLUMN_NAME = 'memory_type'
    `);
    
    const [experienceTypeInfo] = await connection.execute(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'travel_log' 
      AND TABLE_NAME = 'journey_experiences' 
      AND COLUMN_NAME = 'type'
    `);
    
    console.log('✓ Memory type enum:', memoryTypeInfo[0].COLUMN_TYPE);
    console.log('✓ Experience type enum:', experienceTypeInfo[0].COLUMN_TYPE);
    
    connection.release();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
  
  process.exit(0);
}

addBreweryType();
