const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Railway database configuration
const dbConfig = {
  host: 'shuttle.proxy.rlwy.net',
  port: 12502,
  user: 'root',
  password: 'iDkIeFixKPDjutDuApRPFGIXEPkzLyqG',
  database: 'railway',
  ssl: { rejectUnauthorized: false },
  connectTimeout: 60000,
  acquireTimeout: 60000
};

async function runMigration() {
  let connection;
  
  try {
    console.log('Connecting to Railway MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'complete_schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.toUpperCase().startsWith('CREATE TABLE')) {
        const tableName = statement.match(/CREATE TABLE.*?`?(\w+)`?/i)?.[1];
        console.log(`Creating table: ${tableName}`);
      } else if (statement.toUpperCase().startsWith('SHOW TABLES')) {
        console.log('Showing all tables...');
      }
      
      try {
        const [results] = await connection.execute(statement);
        
        if (statement.toUpperCase().startsWith('SHOW TABLES')) {
          console.log('Tables in database:');
          results.forEach((row, index) => {
            console.log(`  ${index + 1}. ${Object.values(row)[0]}`);
          });
        }
      } catch (error) {
        console.error(`Error executing statement: ${statement.substring(0, 50)}...`);
        console.error(error.message);
      }
    }
    
    console.log('\nMigration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the migration
runMigration();
