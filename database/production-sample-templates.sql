-- PRODUCTION DEPLOYMENT: Sample Template Data
-- Run this after the schema to populate with sample templates

USE victorydiv24_travel_log2;

-- First, ensure we have a user to create templates
-- Try to get an existing user first
SET @existing_user_id = (SELECT id FROM users LIMIT 1);

-- If no users exist, create a template user
INSERT IGNORE INTO users (username, email, password_hash, first_name, last_name, created_at, updated_at) 
VALUES ('system_templates', 'templates@fojournapp.com', '$2b$10$dummyhashfortemplateuser12345678901234567890', 'System', 'Templates', NOW(), NOW());

-- Get the template creator user ID (either existing or newly created)
SET @template_creator_id = COALESCE(@existing_user_id, (SELECT id FROM users WHERE username = 'system_templates'));

-- Create sample templates directly in templates table
INSERT INTO templates (creator_id, title, description, category, color, usage_count, created_at, updated_at) VALUES
(@template_creator_id, 'International Travel Essentials', 'Complete packing checklist for international trips including documents, electronics, and essentials.', 'packing', '#FF6B6B', 0, NOW(), NOW()),
(@template_creator_id, 'Road Trip Planning', 'Essential checklist for planning an epic road trip adventure.', 'planning', '#4ECDC4', 0, NOW(), NOW()),
(@template_creator_id, 'Business Travel Pack', 'Professional travel checklist for business trips and conferences.', 'packing', '#9B59B6', 0, NOW(), NOW());

-- Get template IDs
SET @template1_id = (SELECT id FROM templates WHERE title = 'International Travel Essentials' LIMIT 1);
SET @template2_id = (SELECT id FROM templates WHERE title = 'Road Trip Planning' LIMIT 1);
SET @template3_id = (SELECT id FROM templates WHERE title = 'Business Travel Pack' LIMIT 1);

-- Template 1: International Travel Essentials
INSERT INTO template_items (template_id, text, category, priority, sort_order, created_at) VALUES
(@template1_id, 'Passport (valid for 6+ months)', 'general', 'medium', 1, NOW()),
(@template1_id, 'Visa (if required)', 'general', 'medium', 2, NOW()),
(@template1_id, 'Travel insurance documents', 'general', 'medium', 3, NOW()),
(@template1_id, 'Flight tickets / boarding passes', 'general', 'medium', 4, NOW()),
(@template1_id, 'Hotel confirmations', 'general', 'medium', 5, NOW()),
(@template1_id, 'Driver\'s license / International permit', 'general', 'medium', 6, NOW()),
(@template1_id, 'Phone charger and adapters', 'general', 'medium', 7, NOW()),
(@template1_id, 'Camera and memory cards', 'general', 'medium', 8, NOW()),
(@template1_id, 'Portable battery pack', 'general', 'medium', 9, NOW()),
(@template1_id, 'Clothes for each day + 2 extra', 'general', 'medium', 10, NOW()),
(@template1_id, 'Comfortable walking shoes', 'general', 'medium', 11, NOW()),
(@template1_id, 'Weather-appropriate outerwear', 'general', 'medium', 12, NOW()),
(@template1_id, 'Toiletries and medications', 'general', 'medium', 13, NOW()),
(@template1_id, 'First aid kit', 'general', 'medium', 14, NOW()),
(@template1_id, 'Sunscreen and sunglasses', 'general', 'medium', 15, NOW());

-- Template 2: Road Trip Planning
INSERT INTO template_items (template_id, text, category, priority, sort_order, created_at) VALUES
(@template2_id, 'Plan route and stops', 'general', 'medium', 1, NOW()),
(@template2_id, 'Book accommodations', 'general', 'medium', 2, NOW()),
(@template2_id, 'Check vehicle maintenance', 'general', 'medium', 3, NOW()),
(@template2_id, 'Download offline maps', 'general', 'medium', 4, NOW()),
(@template2_id, 'Research local attractions', 'general', 'medium', 5, NOW()),
(@template2_id, 'Pack emergency car kit', 'general', 'medium', 6, NOW()),
(@template2_id, 'Bring jumper cables', 'general', 'medium', 7, NOW()),
(@template2_id, 'Pack spare tire and tools', 'general', 'medium', 8, NOW()),
(@template2_id, 'Road trip snacks and drinks', 'general', 'medium', 9, NOW()),
(@template2_id, 'Entertainment (music, podcasts)', 'general', 'medium', 10, NOW());

-- Template 3: Business Travel Pack
INSERT INTO template_items (template_id, text, category, priority, sort_order, created_at) VALUES
(@template3_id, 'Business cards', 'general', 'medium', 1, NOW()),
(@template3_id, 'Laptop and charger', 'general', 'medium', 2, NOW()),
(@template3_id, 'Presentation materials', 'general', 'medium', 3, NOW()),
(@template3_id, 'Professional attire', 'general', 'medium', 4, NOW()),
(@template3_id, 'Conference registration', 'general', 'medium', 5, NOW()),
(@template3_id, 'Travel expense receipts folder', 'general', 'medium', 6, NOW()),
(@template3_id, 'Portable phone stand', 'general', 'medium', 7, NOW()),
(@template3_id, 'Noise-canceling headphones', 'general', 'medium', 8, NOW());

-- Verify the data
SELECT 'Template data inserted successfully!' as status;
SELECT t.id, t.title, t.category, COUNT(ti.id) as item_count
FROM templates t
LEFT JOIN template_items ti ON t.id = ti.template_id
GROUP BY t.id, t.title, t.category
ORDER BY t.id;
