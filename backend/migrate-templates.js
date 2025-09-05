const { pool } = require('./config/database');

async function migrateSampleTemplates() {
  try {
    console.log('Starting template migration...');
    
    // First check if templates table exists
    const [tables] = await pool.execute("SHOW TABLES LIKE 'templates'");
    if (tables.length === 0) {
      console.log('Templates table does not exist. Please run schema migration first.');
      return;
    }
    
    // Get all checklists that are marked as templates
    const [checklists] = await pool.execute(`
      SELECT * FROM checklists 
      WHERE is_template = 1
    `);
    
    console.log(`Found ${checklists.length} template checklists to migrate`);
    
    if (checklists.length === 0) {
      console.log('No template checklists found to migrate');
      return;
    }
    
    for (const checklist of checklists) {
      console.log(`Migrating template: ${checklist.title}`);
      
      // Insert into templates table
      const [templateResult] = await pool.execute(`
        INSERT INTO templates (
          title, description, category, is_public, 
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        checklist.title,
        checklist.description || '',
        'Travel', // Default category
        1, // Public templates
        checklist.user_id,
        checklist.created_at,
        checklist.updated_at
      ]);
      
      const templateId = templateResult.insertId;
      
      // Get checklist items for this template
      const [items] = await pool.execute(`
        SELECT * FROM checklist_items 
        WHERE checklist_id = ? 
        ORDER BY order_index
      `, [checklist.id]);
      
      console.log(`  Migrating ${items.length} items`);
      
      // Insert template items
      for (const item of items) {
        await pool.execute(`
          INSERT INTO template_items (
            template_id, text, order_index, created_at
          ) VALUES (?, ?, ?, ?)
        `, [
          templateId,
          item.text,
          item.order_index,
          item.created_at
        ]);
      }
      
      console.log(`  Template "${checklist.title}" migrated successfully`);
    }
    
    console.log('Template migration completed successfully!');
    
    // Show final count
    const [finalCount] = await pool.execute('SELECT COUNT(*) as count FROM templates');
    console.log(`Total templates in database: ${finalCount[0].count}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrateSampleTemplates();
