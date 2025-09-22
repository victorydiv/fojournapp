const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

/**
 * Account Merging Migration Script
 * Adds database tables and fields needed for account merging functionality
 */

async function runAccountMergingMigration() {
  console.log('🚀 Starting Account Merging Migration...');
  
  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'account_merging_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL statements (basic split on semicolons, ignoring those in strings)
    const statements = migrationSQL
      .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/) // Split on semicolons not in quotes
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--')); // Remove empty and comment lines
    
    console.log(`📄 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }
      
      try {
        console.log(`\n--- Executing statement ${i + 1}/${statements.length} ---`);
        
        // Show first part of statement for context
        const preview = statement.length > 100 
          ? statement.substring(0, 100) + '...'
          : statement;
        console.log(`SQL: ${preview}`);
        
        await pool.execute(statement);
        console.log(`✅ Success`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        console.error(`Statement: ${statement}`);
        errorCount++;
        
        // Continue with other statements even if one fails
        // Some errors are expected (like "column already exists")
        if (error.code === 'ER_DUP_FIELDNAME' || 
            error.code === 'ER_TABLE_EXISTS_ERROR' ||
            error.code === 'ER_DUP_KEYNAME') {
          console.log(`⚠️  Continuing (expected error for existing structure)`);
        }
      }
    }
    
    console.log('\n🎉 Account Merging Migration Complete!');
    console.log('=' .repeat(50));
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed, but this may be normal if tables already exist.');
      console.log('Check the error messages above to ensure no critical failures.');
    }
    
    // Verify the new tables exist
    console.log('\n🔍 Verifying new tables...');
    
    const tablesToCheck = [
      'account_merge_invitations',
      'account_merges', 
      'account_merge_history',
      'merge_url_redirects'
    ];
    
    for (const tableName of tablesToCheck) {
      try {
        const [tables] = await pool.execute(
          `SHOW TABLES LIKE '${tableName}'`
        );
        
        if (tables.length > 0) {
          console.log(`✅ Table '${tableName}' exists`);
          
          // Get column count
          const [columns] = await pool.execute(
            `SHOW COLUMNS FROM ${tableName}`
          );
          console.log(`   └─ ${columns.length} columns`);
        } else {
          console.log(`❌ Table '${tableName}' not found`);
        }
      } catch (error) {
        console.error(`❌ Error checking table '${tableName}':`, error.message);
      }
    }
    
    // Check if new columns were added to users table
    console.log('\n🔍 Checking users table modifications...');
    try {
      const [columns] = await pool.execute(`SHOW COLUMNS FROM users`);
      const columnNames = columns.map(col => col.Field);
      
      const newColumns = ['merge_id', 'original_public_username', 'is_merged'];
      for (const colName of newColumns) {
        if (columnNames.includes(colName)) {
          console.log(`✅ Column 'users.${colName}' exists`);
        } else {
          console.log(`❌ Column 'users.${colName}' not found`);
        }
      }
    } catch (error) {
      console.error('❌ Error checking users table:', error.message);
    }
    
    // Check if view was created
    console.log('\n🔍 Checking view creation...');
    try {
      const [views] = await pool.execute(`SHOW FULL TABLES WHERE Table_Type = 'VIEW'`);
      const viewExists = views.some(view => view.Tables_in_travel_log === 'user_merge_info');
      
      if (viewExists) {
        console.log(`✅ View 'user_merge_info' created successfully`);
      } else {
        console.log(`❌ View 'user_merge_info' not found`);
      }
    } catch (error) {
      console.error('❌ Error checking views:', error.message);
    }
    
    console.log('\n✅ Migration verification complete!');
    console.log('\nNext Steps:');
    console.log('1. Implement backend API routes for account merging');
    console.log('2. Create frontend interface for merge invitations');
    console.log('3. Update public profile routing for merged accounts');
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await runAccountMergingMigration();
  } catch (error) {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (pool) {
      await pool.end();
    }
  }
}

// Run the migration
if (require.main === module) {
  main();
}

module.exports = { runAccountMergingMigration };