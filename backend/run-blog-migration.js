const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runBlogMigration() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      authPlugin: 'mysql_native_password'
    });

    console.log('✅ Connected to database');

    // Read and execute blog schema
    const schemaPath = path.join(__dirname, '../database/blog_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and filter out empty statements
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await connection.execute(statement);
          console.log(`✓ Statement ${i + 1}/${statements.length} executed successfully`);
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log(`⚠️  Table already exists (statement ${i + 1})`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Blog schema migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Load environment variables
require('dotenv').config();

// Run migration
runBlogMigration();
