const { pool } = require('../config/database');

async function migrateTemplateLibrarySchema() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🚀 Starting template library schema migration...');
    
    // Create user_template_library table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_template_library (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        original_template_id INT NOT NULL,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        custom_title VARCHAR(255) NULL,
        custom_description TEXT NULL,
        custom_category ENUM('general', 'packing', 'planning', 'activities', 'documents', 'food', 'other') NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (original_template_id) REFERENCES checklists(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_template (user_id, original_template_id),
        INDEX idx_user_library (user_id),
        INDEX idx_template_saves (original_template_id)
      )
    `);
    console.log('✅ Created user_template_library table');
    
    // Create checklist_instances table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS checklist_instances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        template_id INT NOT NULL,
        instance_type ENUM('journey', 'dream', 'standalone') NOT NULL,
        instance_reference_id INT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        category ENUM('general', 'packing', 'planning', 'activities', 'documents', 'food', 'other') DEFAULT 'general',
        color VARCHAR(7) DEFAULT '#1976d2',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES checklists(id) ON DELETE CASCADE,
        INDEX idx_user_instances (user_id),
        INDEX idx_template_instances (template_id),
        INDEX idx_instance_reference (instance_type, instance_reference_id)
      )
    `);
    console.log('✅ Created checklist_instances table');
    
    // Create checklist_instance_items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS checklist_instance_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        instance_id INT NOT NULL,
        text VARCHAR(500) NOT NULL,
        description TEXT,
        is_completed BOOLEAN DEFAULT FALSE,
        sort_order INT DEFAULT 0,
        category VARCHAR(100),
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        due_date DATE NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (instance_id) REFERENCES checklist_instances(id) ON DELETE CASCADE,
        INDEX idx_instance_items (instance_id),
        INDEX idx_sort_order (instance_id, sort_order),
        INDEX idx_completion (instance_id, is_completed)
      )
    `);
    console.log('✅ Created checklist_instance_items table');
    
    // Add new columns to existing checklists table
    try {
      await connection.execute(`
        ALTER TABLE checklists 
        ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP NULL
      `);
      console.log('✅ Added usage tracking columns to checklists table');
    } catch (error) {
      // Columns might already exist
      console.log('ℹ️ Usage tracking columns already exist or error adding them:', error.message);
    }
    
    // Add indexes for better performance
    try {
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_public_templates ON checklists (is_public, is_template)
      `);
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_template_stats ON checklists (usage_count DESC, created_at DESC)
      `);
      console.log('✅ Added performance indexes');
    } catch (error) {
      console.log('ℹ️ Indexes already exist:', error.message);
    }
    
    console.log('🎉 Template library schema migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during template library schema migration:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateTemplateLibrarySchema()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateTemplateLibrarySchema };
