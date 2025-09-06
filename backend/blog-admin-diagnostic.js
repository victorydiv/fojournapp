// Diagnostic script to test blog admin route functionality
// Run this on your production server to identify the blog admin issue

const mysql = require('mysql2/promise');

// Use your production database credentials
const dbConfig = {
  host: 'mysql.fojourn.site',
  port: 3306,
  user: 'victorydiv24_dbu',
  password: 'admin1-tech',
  database: 'victorydiv24_travel_log2'
};

async function diagnose() {
  let connection;
  
  try {
    console.log('🔍 Starting blog admin diagnostic...');
    
    // Test database connection
    console.log('1. Testing database connection...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection successful');
    
    // Check if blog_posts table exists
    console.log('2. Checking blog_posts table...');
    const [tables] = await connection.execute("SHOW TABLES LIKE 'blog_posts'");
    if (tables.length === 0) {
      console.log('❌ blog_posts table does not exist!');
      return;
    }
    console.log('✅ blog_posts table exists');
    
    // Check if users table has is_admin column
    console.log('3. Checking users table for is_admin column...');
    const [columns] = await connection.execute("SHOW COLUMNS FROM users LIKE 'is_admin'");
    if (columns.length === 0) {
      console.log('❌ users table missing is_admin column!');
      console.log('   This is likely the cause of the 500 error');
      console.log('   You need to run: ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;');
      return;
    }
    console.log('✅ is_admin column exists');
    
    // Check specific blog post ID 9
    console.log('4. Checking blog post ID 9...');
    const [posts] = await connection.execute(`
      SELECT 
        bp.*,
        u.username as author_name,
        u.first_name,
        u.last_name
      FROM blog_posts bp
      JOIN users u ON bp.author_id = u.id
      WHERE bp.id = ?
    `, [9]);
    
    if (posts.length === 0) {
      console.log('❌ Blog post with ID 9 does not exist!');
    } else {
      console.log('✅ Blog post ID 9 found:', posts[0].title);
    }
    
    // Check if user has admin access
    console.log('5. Checking for admin users...');
    const [admins] = await connection.execute('SELECT id, username, email, is_admin FROM users WHERE is_admin = TRUE');
    console.log(`✅ Found ${admins.length} admin users:`, admins.map(u => u.email));
    
    // Test the exact query from the failing route
    console.log('6. Testing admin blog post query...');
    const [testPosts] = await connection.execute(`
      SELECT 
        bp.*,
        u.username as author_name,
        u.first_name,
        u.last_name
      FROM blog_posts bp
      JOIN users u ON bp.author_id = u.id
      WHERE bp.id = ?
    `, [9]);
    
    if (testPosts.length > 0) {
      console.log('✅ Admin query successful for post ID 9');
      
      // Test categories query
      const [categories] = await connection.execute(`
        SELECT c.id, c.name, c.slug, c.color
        FROM blog_categories c
        JOIN blog_post_categories bpc ON c.id = bpc.category_id
        WHERE bpc.blog_post_id = ?
      `, [9]);
      
      console.log(`✅ Found ${categories.length} categories for post ID 9`);
    }
    
    console.log('🎉 All diagnostic checks passed! The issue might be elsewhere.');
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error.message);
    console.error('   Error code:', error.code);
    console.error('   SQL State:', error.sqlState);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

diagnose();
