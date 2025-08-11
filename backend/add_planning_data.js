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

async function addPlanningDataColumn() {
  let connection;
  
  try {
    console.log('Connecting to Railway MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!');
    
    // Check if planning_data column exists
    console.log('Checking if planning_data column exists...');
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM journeys LIKE 'planning_data'
    `);
    
    if (columns.length > 0) {
      console.log('planning_data column already exists:', columns[0]);
    } else {
      console.log('Adding planning_data column to journeys table...');
      await connection.execute(`
        ALTER TABLE journeys 
        ADD COLUMN planning_data JSON NULL
      `);
      console.log('planning_data column added successfully!');
    }
    
    // Show the current journeys table structure
    console.log('\nCurrent journeys table structure:');
    const [allColumns] = await connection.execute('SHOW COLUMNS FROM journeys');
    allColumns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\nColumn addition completed successfully!');
    
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
addPlanningDataColumn();
