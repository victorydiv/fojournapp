const { pool } = require('./config/database');
const fs = require('fs').promises;
const path = require('path');

async function runProductionMigration() {
  let connection;
  try {
    // Read the SQL migration file
    const sqlFilePath = path.join(__dirname, '../database/add_public_profiles.sql');
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
    
    // Split SQL content into individual statements (basic split by semicolon)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log('Starting production database migration...');
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Get a connection from the pool
    connection = await pool.getConnection();
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\nExecuting statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        await connection.execute(statement);
        console.log('✅ Statement executed successfully');
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('⚠️  Column already exists, skipping...');
        } else if (error.code === 'ER_DUP_KEYNAME') {
          console.log('⚠️  Index already exists, skipping...');
        } else {
          console.error('❌ Error executing statement:', error.message);
          throw error;
        }
      }
    }
    
    console.log('\n🎉 Production database migration completed successfully!');
    
    // Verify the changes by checking table structure
    console.log('\nVerifying table structure...');
    
    const [userColumns] = await connection.execute('DESCRIBE users');
    console.log('\nUsers table columns:');
    userColumns.forEach(col => {
      if (['profile_bio', 'profile_public'].includes(col.Field)) {
        console.log(`✅ ${col.Field} - ${col.Type}`);
      }
    });
    
    const [entryColumns] = await connection.execute('DESCRIBE travel_entries');
    console.log('\nTravel entries table columns:');
    entryColumns.forEach(col => {
      if (['is_public', 'public_slug', 'featured'].includes(col.Field)) {
        console.log(`✅ ${col.Field} - ${col.Type}`);
      }
    });
    
    console.log('\n✅ Migration verification complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit(0);
  }
}

// Run the migration
console.log('🚀 Starting production database migration...');
runProductionMigration().catch(console.error);
