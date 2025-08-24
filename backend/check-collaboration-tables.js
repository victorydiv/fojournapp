const { pool } = require('./config/database');

async function checkCollaborationTables() {
  try {
    const connection = await pool.getConnection();
    
    console.log('Checking collaboration tables...');
    
    // Check journey_collaborators table
    const [collaboratorsDesc] = await connection.execute('DESCRIBE journey_collaborators');
    console.log('\njourney_collaborators table structure:');
    console.table(collaboratorsDesc);
    
    // Check if journey_invitations table exists
    try {
      const [invitationsDesc] = await connection.execute('DESCRIBE journey_invitations');
      console.log('\njourney_invitations table structure:');
      console.table(invitationsDesc);
    } catch (error) {
      console.log('\njourney_invitations table does not exist');
    }
    
    // Check sample data
    const [collaborators] = await connection.execute('SELECT * FROM journey_collaborators LIMIT 5');
    console.log('\nSample journey_collaborators data:');
    console.table(collaborators);
    
    connection.release();
  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

checkCollaborationTables().then(() => {
  console.log('Table check complete');
  process.exit(0);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
