-- Sample Template Data for Travel Log Application
-- Run these queries in your MySQL client to add sample templates

-- First, create a template creator user (if it doesn't exist)
INSERT IGNORE INTO users (username, email, password_hash, first_name, last_name) 
VALUES ('template_creator', 'templates@fojournapp.com', '$2b$10$dummy.hash.for.template.user', 'Template', 'Creator');

-- Get the user ID for the template creator
SET @template_user_id = (SELECT id FROM users WHERE username = 'template_creator');

-- 1. International Travel Packing Checklist
INSERT INTO checklists (user_id, title, description, category, color, is_template, is_public, usage_count) 
VALUES (@template_user_id, 'International Travel Packing Checklist', 'Complete packing checklist for international trips including documents, electronics, and essentials.', 'packing', '#FF6B6B', true, true, 45);

SET @checklist1_id = LAST_INSERT_ID();

INSERT INTO checklist_items (checklist_id, text, category, priority, sort_order) VALUES
(@checklist1_id, 'Passport (valid for 6+ months)', 'documents', 'high', 1),
(@checklist1_id, 'Visa (if required)', 'documents', 'high', 2),
(@checklist1_id, 'Travel insurance documents', 'documents', 'high', 3),
(@checklist1_id, 'Flight tickets / boarding passes', 'documents', 'high', 4),
(@checklist1_id, 'Hotel confirmations', 'documents', 'medium', 5),
(@checklist1_id, 'Driver\'s license / International permit', 'documents', 'medium', 6),
(@checklist1_id, 'Phone charger and adapters', 'electronics', 'high', 7),
(@checklist1_id, 'Camera and memory cards', 'electronics', 'medium', 8),
(@checklist1_id, 'Portable battery pack', 'electronics', 'medium', 9),
(@checklist1_id, 'Clothes for each day + 2 extra', 'clothing', 'high', 10),
(@checklist1_id, 'Comfortable walking shoes', 'clothing', 'high', 11),
(@checklist1_id, 'Weather-appropriate outerwear', 'clothing', 'medium', 12),
(@checklist1_id, 'Toiletries and medications', 'personal', 'high', 13),
(@checklist1_id, 'First aid kit', 'personal', 'medium', 14),
(@checklist1_id, 'Sunscreen and sunglasses', 'personal', 'medium', 15);

-- 2. Road Trip Planning Checklist
INSERT INTO checklists (user_id, title, description, category, color, is_template, is_public, usage_count) 
VALUES (@template_user_id, 'Road Trip Planning Checklist', 'Essential checklist for planning an epic road trip adventure.', 'planning', '#4ECDC4', true, true, 32);

SET @checklist2_id = LAST_INSERT_ID();

INSERT INTO checklist_items (checklist_id, text, category, priority, sort_order) VALUES
(@checklist2_id, 'Plan route and stops', 'planning', 'high', 1),
(@checklist2_id, 'Book accommodations', 'planning', 'high', 2),
(@checklist2_id, 'Check vehicle maintenance', 'planning', 'high', 3),
(@checklist2_id, 'Download offline maps', 'planning', 'medium', 4),
(@checklist2_id, 'Research local attractions', 'planning', 'medium', 5),
(@checklist2_id, 'Pack emergency car kit', 'safety', 'high', 6),
(@checklist2_id, 'Bring jumper cables', 'safety', 'medium', 7),
(@checklist2_id, 'Pack spare tire and tools', 'safety', 'high', 8),
(@checklist2_id, 'Road trip snacks and drinks', 'food', 'medium', 9),
(@checklist2_id, 'Entertainment (music, podcasts)', 'entertainment', 'low', 10),
(@checklist2_id, 'Travel games and books', 'entertainment', 'low', 11),
(@checklist2_id, 'Car phone mount', 'electronics', 'medium', 12),
(@checklist2_id, 'Car chargers for devices', 'electronics', 'high', 13);

-- 3. Beach Vacation Essentials
INSERT INTO checklists (user_id, title, description, category, color, is_template, is_public, usage_count) 
VALUES (@template_user_id, 'Beach Vacation Essentials', 'Everything you need for the perfect beach getaway.', 'packing', '#45B7D1', true, true, 28);

SET @checklist3_id = LAST_INSERT_ID();

INSERT INTO checklist_items (checklist_id, text, category, priority, sort_order) VALUES
(@checklist3_id, 'Swimwear (2-3 sets)', 'clothing', 'high', 1),
(@checklist3_id, 'Beach towels', 'beach', 'high', 2),
(@checklist3_id, 'Sunscreen (SPF 30+)', 'beach', 'high', 3),
(@checklist3_id, 'Sun hat and sunglasses', 'beach', 'high', 4),
(@checklist3_id, 'Beach bag', 'beach', 'medium', 5),
(@checklist3_id, 'Flip flops / water shoes', 'clothing', 'high', 6),
(@checklist3_id, 'Waterproof phone case', 'electronics', 'medium', 7),
(@checklist3_id, 'Beach umbrella or tent', 'beach', 'medium', 8),
(@checklist3_id, 'Snorkel gear (if needed)', 'activities', 'low', 9),
(@checklist3_id, 'Beach games (volleyball, frisbee)', 'activities', 'low', 10),
(@checklist3_id, 'Cooler for drinks', 'beach', 'medium', 11),
(@checklist3_id, 'After-sun lotion', 'personal', 'medium', 12),
(@checklist3_id, 'Light evening clothes', 'clothing', 'medium', 13);

-- 4. Business Trip Checklist
INSERT INTO checklists (user_id, title, description, category, color, is_template, is_public, usage_count) 
VALUES (@template_user_id, 'Business Trip Checklist', 'Professional travel checklist for business trips and conferences.', 'planning', '#96CEB4', true, true, 41);

SET @checklist4_id = LAST_INSERT_ID();

INSERT INTO checklist_items (checklist_id, text, category, priority, sort_order) VALUES
(@checklist4_id, 'Business cards', 'business', 'high', 1),
(@checklist4_id, 'Laptop and charger', 'electronics', 'high', 2),
(@checklist4_id, 'Phone charger', 'electronics', 'high', 3),
(@checklist4_id, 'Presentation materials', 'business', 'high', 4),
(@checklist4_id, 'Business attire', 'clothing', 'high', 5),
(@checklist4_id, 'Comfortable shoes', 'clothing', 'medium', 6),
(@checklist4_id, 'Travel-sized toiletries', 'personal', 'medium', 7),
(@checklist4_id, 'Expense tracking app/receipts', 'business', 'medium', 8),
(@checklist4_id, 'Conference agenda', 'business', 'medium', 9),
(@checklist4_id, 'Notebook and pens', 'business', 'medium', 10),
(@checklist4_id, 'Portable WiFi hotspot', 'electronics', 'low', 11),
(@checklist4_id, 'Business casual outfit', 'clothing', 'low', 12);

-- 5. Camping Adventure Checklist
INSERT INTO checklists (user_id, title, description, category, color, is_template, is_public, usage_count) 
VALUES (@template_user_id, 'Camping Adventure Checklist', 'Complete checklist for outdoor camping trips and adventures.', 'activities', '#FFEAA7', true, true, 37);

SET @checklist5_id = LAST_INSERT_ID();

INSERT INTO checklist_items (checklist_id, text, category, priority, sort_order) VALUES
(@checklist5_id, 'Tent and stakes', 'shelter', 'high', 1),
(@checklist5_id, 'Sleeping bag and pillow', 'shelter', 'high', 2),
(@checklist5_id, 'Camping stove and fuel', 'cooking', 'high', 3),
(@checklist5_id, 'Matches/lighter in waterproof container', 'cooking', 'high', 4),
(@checklist5_id, 'Food and snacks', 'food', 'high', 5),
(@checklist5_id, 'Water bottles and purification tablets', 'food', 'high', 6),
(@checklist5_id, 'First aid kit', 'safety', 'high', 7),
(@checklist5_id, 'Flashlight and extra batteries', 'safety', 'high', 8),
(@checklist5_id, 'Multi-tool or knife', 'tools', 'medium', 9),
(@checklist5_id, 'Rope/paracord', 'tools', 'medium', 10),
(@checklist5_id, 'Insect repellent', 'personal', 'medium', 11),
(@checklist5_id, 'Weather-appropriate clothing', 'clothing', 'high', 12),
(@checklist5_id, 'Rain gear', 'clothing', 'medium', 13),
(@checklist5_id, 'Hiking boots', 'clothing', 'high', 14),
(@checklist5_id, 'Trash bags (Leave No Trace)', 'environment', 'medium', 15);

-- Verify the data was inserted
SELECT 'Templates Created:' as result;
SELECT c.id, c.title, c.category, c.usage_count, COUNT(ci.id) as item_count
FROM checklists c 
LEFT JOIN checklist_items ci ON c.id = ci.checklist_id 
WHERE c.is_template = 1 AND c.is_public = 1 
GROUP BY c.id, c.title, c.category, c.usage_count
ORDER BY c.id;
