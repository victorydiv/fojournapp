require('dotenv').config();
const mysql = require('mysql2/promise');
const { copyBadgeToPublic } = require('./utils/publicBadgeUtils');

/**
 * Copy all existing badge icons to the public directory
 * This should be run once to set up public access for existing badges
 */
async function copyExistingBadgesToPublic() {
  let connection;
  
  try {
    console.log('Starting to copy existing badge icons to public directory...');
    
    // Create a direct connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      charset: 'utf8mb4',
      ssl: false,
      authPlugins: {
        mysql_native_password: () => () => Buffer.alloc(0)
      }
    });
    
    // Get all badges with uploaded icons
    const [badges] = await connection.execute(`
      SELECT id, name, icon_url 
      FROM badges 
      WHERE icon_url IS NOT NULL 
        AND icon_url LIKE '/badges/%'
    `);
    
    console.log(`Found ${badges.length} badges with uploaded icons`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const badge of badges) {
      try {
        const filename = badge.icon_url.split('/').pop();
        await copyBadgeToPublic(filename);
        console.log(`✓ Copied: ${badge.name} (${filename})`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to copy ${badge.name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n=== Copy Complete ===');
    console.log(`Successfully copied: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    
  } catch (error) {
    console.error('Error copying badges to public directory:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script if called directly
if (require.main === module) {
  copyExistingBadgesToPublic()
    .then(() => {
      console.log('Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { copyExistingBadgesToPublic };
