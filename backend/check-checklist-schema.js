const { pool } = require('./config/database');

async function checkTableStructure() {
  try {
    const connection = await pool.getConnection();
    
    console.log('Checking checklists table structure...');
    const [rows] = await connection.execute('DESCRIBE checklists');
    
    console.log('Checklists table columns:');
    rows.forEach(row => {
      console.log(`${row.Field}: ${row.Type} ${row.Null} ${row.Default || ''}`);
    });
    
    // Check if enhanced columns exist
    const hasUsageCount = rows.some(row => row.Field === 'usage_count');
    const hasLastUsedAt = rows.some(row => row.Field === 'last_used_at');
    
    console.log('\nEnhanced schema status:');
    console.log(`usage_count column: ${hasUsageCount ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`last_used_at column: ${hasLastUsedAt ? '✅ EXISTS' : '❌ MISSING'}`);
    
    connection.release();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTableStructure();
