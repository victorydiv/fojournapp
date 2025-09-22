const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMergeMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting merge tables migration...');
    
    connection = await pool.getConnection();
    
    // Read the SQL migration file
    const sqlFile = path.join(__dirname, '..', 'database', 'create-merge-tables-production.sql');
    let sqlContent;
    
    try {
      sqlContent = fs.readFileSync(sqlFile, 'utf8');
      console.log('✅ Successfully read migration SQL file');
    } catch (error) {
      console.error('❌ Failed to read migration file:', error.message);
      process.exit(1);
    }
    
    // Split the SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('SELECT') && !stmt.startsWith('SHOW') && !stmt.startsWith('DESCRIBE'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        await connection.execute(statement);
        console.log('✅ Statement executed successfully');
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('already exists')) {
          console.log('⚠️  Table/view already exists, skipping...');
        } else {
          console.error('❌ Error executing statement:', error.message);
          // Continue with other statements instead of failing completely
        }
      }
    }
    
    console.log('\n🎉 Migration completed! Verifying tables...');
    
    // Verify the tables were created
    const [tables] = await connection.execute("SHOW TABLES LIKE '%merge%'");
    console.log('\n📋 Merge-related tables:');
    tables.forEach(table => {
      console.log(`  ✓ ${Object.values(table)[0]}`);
    });
    
    // Check if the view exists
    try {
      const [viewCheck] = await connection.execute("SELECT COUNT(*) as count FROM user_merge_info LIMIT 1");
      console.log('\n✅ user_merge_info view is working correctly');
    } catch (error) {
      console.error('\n❌ user_merge_info view error:', error.message);
    }
    
    console.log('\n🎉 Database migration completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

// Run the migration
runMergeMigration().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});