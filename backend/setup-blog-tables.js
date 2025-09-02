const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function setupBlogTables() {
  try {
    // Check if blog tables exist
    const [tables] = await pool.execute("SHOW TABLES LIKE 'blog_%'");
    console.log('Existing blog tables:', tables);
    
    if (tables.length === 0) {
      console.log('No blog tables found. Creating them...');
      
      // Read and execute the blog schema
      const schemaPath = path.join(__dirname, '../database/blog_schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await pool.execute(statement);
        }
      }
      
      console.log('Blog tables created successfully!');
    } else {
      console.log('Blog tables already exist.');
    }
    
    // Test the blog posts table
    const [posts] = await pool.execute('SELECT COUNT(*) as count FROM blog_posts');
    console.log('Blog posts count:', posts[0].count);
    
    // Test the categories table
    const [categories] = await pool.execute('SELECT COUNT(*) as count FROM blog_categories');
    console.log('Blog categories count:', categories[0].count);
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up blog tables:', error);
    process.exit(1);
  }
}

setupBlogTables();
