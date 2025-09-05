-- Debug queries for template save issue
-- Run these in your MySQL client to check the data

USE travel_log;

-- Check if template 1 is already saved for user 1
SELECT * FROM user_template_library WHERE user_id = 1 AND original_template_id = 1;

-- Check all saved templates for user 1
SELECT * FROM user_template_library WHERE user_id = 1;

-- Check if template 1 exists
SELECT * FROM templates WHERE id = 1;

-- Check all templates
SELECT id, title, creator_id FROM templates;

-- Check template_items table structure
DESCRIBE template_items;

-- Check checklist_items table structure  
DESCRIBE checklist_items;

-- Check template 1 items
SELECT * FROM template_items WHERE template_id = 1;

-- Clear user_template_library if needed (run this if template is already saved and you want to test save again)
-- DELETE FROM user_template_library WHERE user_id = 1 AND original_template_id = 1;
