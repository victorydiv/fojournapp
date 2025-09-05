// Migration script to move existing public templates to separate templates table
const mysql = require('mysql2/promise');
const config = require('../backend/config/database');

async function migrateTemplatesToSeparateTable() {
  const connection = await mysql.createConnection(config);
  
  try {
    console.log('🔄 Migrating existing templates to separate templates table...\n');
    
    // Step 1: Create the new tables
    console.log('1. Creating new templates tables...');
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        creator_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category ENUM('general', 'packing', 'planning', 'activities', 'documents', 'food', 'other') DEFAULT 'general',
        color VARCHAR(7) DEFAULT '#1976d2',
        usage_count INT DEFAULT 0,
        last_used_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_category (category),
        INDEX idx_creator (creator_id),
        INDEX idx_usage (usage_count),
        INDEX idx_created (created_at)
      )
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS template_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_id INT NOT NULL,
        text TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
        INDEX idx_template (template_id),
        INDEX idx_sort (sort_order)
      )
    `);
    
    console.log('   ✅ Templates tables created');
    
    // Step 2: Migrate existing public templates
    console.log('\n2. Migrating existing public templates...');
    
    const [existingTemplates] = await connection.execute(`
      SELECT id, user_id, title, description, category, color, usage_count, created_at, updated_at
      FROM checklists 
      WHERE is_template = true AND is_public = true
    `);
    
    console.log(`   Found ${existingTemplates.length} existing public templates to migrate`);
    
    const templateMapping = new Map(); // Old checklist ID -> New template ID
    
    for (const template of existingTemplates) {
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
      templateMapping.set(template.id, newTemplateId);
      
      // Migrate template items
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
    
    // Step 3: Update user_template_library to reference new templates
    console.log('\n3. Updating user template library references...');
    
    // Add template_id column if it doesn't exist
    try {
      await connection.execute(`
        ALTER TABLE user_template_library 
        ADD COLUMN template_id INT NULL,
        ADD CONSTRAINT fk_template_library_template 
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate column name')) {
        throw error;
      }
    }
    
    // Update existing library entries
    const [libraryEntries] = await connection.execute(`
      SELECT id, template_id as old_template_id FROM user_template_library 
      WHERE template_id IS NOT NULL
    `);
    
    for (const entry of libraryEntries) {
      const newTemplateId = templateMapping.get(entry.old_template_id);
      if (newTemplateId) {
        await connection.execute(`
          UPDATE user_template_library 
          SET template_id = ? 
          WHERE id = ?
        `, [newTemplateId, entry.id]);
      }
    }
    
    console.log(`   ✅ Updated ${libraryEntries.length} library entries`);
    
    // Step 4: Clean up - remove template flags from checklists (optional)
    console.log('\n4. Cleaning up checklist template flags...');
    
    await connection.execute(`
      UPDATE checklists 
      SET is_template = false, is_public = false 
      WHERE is_template = true AND is_public = true
    `);
    
    console.log('   ✅ Removed template flags from checklists');
    
    console.log('\n✅ Migration completed successfully!');
    console.log(`\nSummary:`);
    console.log(`- Migrated ${existingTemplates.length} templates to separate templates table`);
    console.log(`- Updated ${libraryEntries.length} user library references`);
    console.log(`- Templates now have independent lifecycle from checklists`);
    console.log(`- Users can delete checklists without affecting templates`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await connection.rollback();
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  migrateTemplatesToSeparateTable();
}

module.exports = migrateTemplatesToSeparateTable;
