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

async function fixSuggestedByColumn() {
  let connection;
  
  try {
    console.log('Connecting to Railway MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!');
    
    // Check current suggested_by column definition
    console.log('Checking current suggested_by column definition...');
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM journey_experiences WHERE Field = 'suggested_by'
    `);
    console.log('Current suggested_by column:', columns[0]);
    
    // Modify the suggested_by column to allow NULL values
    console.log('Modifying suggested_by column to allow NULL...');
    await connection.execute(`
      ALTER TABLE journey_experiences 
      MODIFY COLUMN suggested_by INT NULL
    `);
    console.log('suggested_by column updated to allow NULL values!');
    
    // Verify the change
    const [updatedColumns] = await connection.execute(`
      SHOW COLUMNS FROM journey_experiences WHERE Field = 'suggested_by'
    `);
    console.log('Updated suggested_by column:', updatedColumns[0]);
    
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
fixSuggestedByColumn();
