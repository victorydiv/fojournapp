// Simple migration to copy existing checklist templates to new templates table
const mysql = require('mysql2/promise');
const config = require('../backend/config/database');

async function migrateSampleTemplates() {
  const connection = await mysql.createConnection(config);
  
  try {
    console.log('🔄 Migrating sample templates to separate templates table...\n');
    
    // Get existing public templates from checklists
    const [existingTemplates] = await connection.execute(`
      SELECT id, user_id, title, description, category, color, usage_count, created_at, updated_at
      FROM checklists 
      WHERE is_template = true AND is_public = true
    `);
    
    console.log(`Found ${existingTemplates.length} existing templates to migrate`);
    
    for (const template of existingTemplates) {
      // Check if template already exists in templates table
      const [existing] = await connection.execute(
        'SELECT id FROM templates WHERE creator_id = ? AND title = ?',
        [template.user_id, template.title]
      );
      
      if (existing.length > 0) {
        console.log(`   ⏭️  Template "${template.title}" already exists, skipping`);
        continue;
      }
      
      // Insert into templates table
      const [result] = await connection.execute(`
        INSERT INTO templates (creator_id, title, description, category, color, usage_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        template.user_id,
        template.title,
        template.description,
        template.category,
        template.color,
        template.usage_count || 0,
        template.created_at,
        template.updated_at
      ]);
      
      const newTemplateId = result.insertId;
      
      // Copy template items
      const [items] = await connection.execute(`
        SELECT text, category, priority, sort_order
        FROM checklist_items
        WHERE checklist_id = ?
        ORDER BY sort_order
      `, [template.id]);
      
      for (const item of items) {
        await connection.execute(`
          INSERT INTO template_items (template_id, text, category, priority, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `, [newTemplateId, item.text, item.category, item.priority, item.sort_order]);
      }
      
      console.log(`   ✅ Migrated template: "${template.title}" (${items.length} items)`);
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log(`Templates are now available in the separate templates table.`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrateSampleTemplates();
