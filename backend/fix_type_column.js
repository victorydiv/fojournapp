const mysql = require('mysql2/promise');

// Railway database configuration
const dbConfig = {
  host: 'shuttle.proxy.rlwy.net',
  port: 12502,
  user: 'root',
  password: 'iDkIeFixKPDjutDuApRPFGIXEPkzLyqG',
  database: 'railway',
  ssl: { rejectUnauthorized: false },
  connectTimeout: 60000
};

async function fixTypeColumn() {
  let connection;
  
  try {
    console.log('Connecting to Railway MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!');
    
    // Check current ENUM values
    console.log('Checking current column definition...');
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM journey_experiences WHERE Field = 'type'
    `);
    console.log('Current type column:', columns[0]);
    
    // Update the ENUM to include all the needed values
    console.log('Updating type column ENUM values...');
    await connection.execute(`
      ALTER TABLE journey_experiences 
      MODIFY COLUMN type ENUM(
        'attraction', 
        'restaurant', 
        'accommodation', 
        'activity', 
        'brewery', 
        'other'
      ) DEFAULT 'other'
    `);
    console.log('Type column updated successfully!');
    
    // Verify the change
    const [updatedColumns] = await connection.execute(`
      SHOW COLUMNS FROM journey_experiences WHERE Field = 'type'
    `);
    console.log('Updated type column:', updatedColumns[0]);
    
    console.log('\nColumn fix completed successfully!');
    
  } catch (error) {
    console.error('Fix failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the fix
fixTypeColumn();
