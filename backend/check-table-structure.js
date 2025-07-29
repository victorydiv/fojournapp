const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'travellog_user',
  password: 'travel123',
  database: 'travel_log'
};

async function checkColumns() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('DESCRIBE travel_entries');
    console.log('travel_entries table structure:');
    rows.forEach(row => {
      console.log(`${row.Field}: ${row.Type} ${row.Null} ${row.Default}`);
    });
    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkColumns();
