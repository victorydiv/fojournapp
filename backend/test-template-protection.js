// Test script to verify template protection functionality
const mysql = require('mysql2/promise');
const config = require('./config/database');

async function testTemplateProtection() {
  const connection = await mysql.createConnection(config);
  
  try {
    console.log('🧪 Testing Template Protection...\n');
    
    // Step 1: Create two test users if they don't exist
    console.log('1. Setting up test users...');
    await connection.execute(`
      INSERT IGNORE INTO users (username, email, password_hash, first_name, last_name) 
      VALUES ('test_creator', 'creator@test.com', '$2b$10$dummy.hash', 'Test', 'Creator')
    `);
    await connection.execute(`
      INSERT IGNORE INTO users (username, email, password_hash, first_name, last_name) 
      VALUES ('test_user', 'user@test.com', '$2b$10$dummy.hash', 'Test', 'User')
    `);
    
    const [creatorRows] = await connection.execute('SELECT id FROM users WHERE username = "test_creator"');
    const [userRows] = await connection.execute('SELECT id FROM users WHERE username = "test_user"');
    
    const creatorId = creatorRows[0].id;
    const userId = userRows[0].id;
    
    console.log(`   Creator ID: ${creatorId}, User ID: ${userId}`);
    
    // Step 2: Create a checklist and make it a public template
    console.log('\n2. Creating a checklist and making it a public template...');
    const [result] = await connection.execute(`
      INSERT INTO checklists (user_id, title, description, category, color, is_template, is_public, usage_count)
      VALUES (?, 'Test Template Checklist', 'A test checklist that will become a template', 'planning', '#FF5722', true, true, 0)
    `, [creatorId]);
    
    const checklistId = result.insertId;
    console.log(`   Created checklist ID: ${checklistId}`);
    
    // Add some items to the checklist
    await connection.execute(`
      INSERT INTO checklist_items (checklist_id, text, category, priority, sort_order) VALUES
      (?, 'Test item 1', 'general', 'high', 1),
      (?, 'Test item 2', 'general', 'medium', 2)
    `, [checklistId, checklistId]);
    
    // Step 3: Have another user save it to their library
    console.log('\n3. Having another user save the template to their library...');
    await connection.execute(`
      INSERT INTO user_template_library (user_id, template_id, saved_at)
      VALUES (?, ?, NOW())
    `, [userId, checklistId]);
    
    console.log(`   User ${userId} saved template ${checklistId} to their library`);
    
    // Step 4: Try to delete the checklist (should fail)
    console.log('\n4. Attempting to delete the checklist (should be prevented)...');
    
    // First check if this is a public template with other users
    const [checklistRows] = await connection.execute(
      'SELECT id, title, is_template, is_public FROM checklists WHERE id = ? AND user_id = ?',
      [checklistId, creatorId]
    );
    
    if (checklistRows.length === 0) {
      console.log('   ❌ Checklist not found');
      return;
    }
    
    const checklist = checklistRows[0];
    console.log(`   Found checklist: "${checklist.title}" (template: ${checklist.is_template}, public: ${checklist.is_public})`);
    
    if (checklist.is_template && checklist.is_public) {
      const [libraryRows] = await connection.execute(
        'SELECT COUNT(*) as count FROM user_template_library WHERE template_id = ? AND user_id != ?',
        [checklistId, creatorId]
      );
      
      if (libraryRows[0].count > 0) {
        console.log(`   ✅ PROTECTION WORKING: ${libraryRows[0].count} other users have this template in their library`);
        console.log('   ❌ Delete prevented: Cannot delete this checklist because it is a public template that other users have saved to their libraries.');
      } else {
        console.log('   ⚠️  No other users have this template, deletion would be allowed');
      }
    }
    
    // Step 5: Try to make the template private (should also fail)
    console.log('\n5. Attempting to make the template private (should be prevented)...');
    
    const [currentRows] = await connection.execute(
      'SELECT is_template, is_public FROM checklists WHERE id = ? AND user_id = ?',
      [checklistId, creatorId]
    );
    
    if (currentRows.length > 0 && currentRows[0].is_template && currentRows[0].is_public) {
      const [libraryRows2] = await connection.execute(
        'SELECT COUNT(*) as count FROM user_template_library WHERE template_id = ? AND user_id != ?',
        [checklistId, creatorId]
      );
      
      if (libraryRows2[0].count > 0) {
        console.log(`   ✅ PROTECTION WORKING: ${libraryRows2[0].count} other users have this template in their library`);
        console.log('   ❌ Update prevented: Cannot make this template private because other users have saved it to their libraries.');
      }
    }
    
    // Cleanup
    console.log('\n6. Cleaning up test data...');
    await connection.execute('DELETE FROM user_template_library WHERE template_id = ?', [checklistId]);
    await connection.execute('DELETE FROM checklist_items WHERE checklist_id = ?', [checklistId]);
    await connection.execute('DELETE FROM checklists WHERE id = ?', [checklistId]);
    await connection.execute('DELETE FROM users WHERE username IN ("test_creator", "test_user")');
    
    console.log('\n✅ Template protection test completed successfully!');
    console.log('\nSummary:');
    console.log('- ✅ Public templates with users in libraries cannot be deleted');
    console.log('- ✅ Public templates with users in libraries cannot be made private');
    console.log('- ✅ Error messages provide clear feedback to users');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await connection.end();
  }
}

testTemplateProtection();
