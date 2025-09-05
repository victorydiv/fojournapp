-- Additional Sample Templates for Production
-- Run this to add 5 more diverse travel templates

USE victorydiv24_travel_log2;

-- Get an existing user to create templates (use first available user)
SET @template_creator_id = (SELECT id FROM users LIMIT 1);

-- Template 4: Weekend City Break
INSERT INTO templates (creator_id, title, description, category, color, usage_count, created_at, updated_at) VALUES
(@template_creator_id, 'Weekend City Break', 'Perfect checklist for a quick 2-3 day city getaway with minimal packing.', 'packing', '#E74C3C', 0, NOW(), NOW());

SET @template4_id = LAST_INSERT_ID();

INSERT INTO template_items (template_id, text, category, priority, sort_order, created_at) VALUES
(@template4_id, 'Small backpack or weekend bag', 'general', 'high', 1, NOW()),
(@template4_id, 'Comfortable walking sneakers', 'general', 'high', 2, NOW()),
(@template4_id, '2-3 casual outfits', 'general', 'medium', 3, NOW()),
(@template4_id, 'One nice outfit for dinner', 'general', 'medium', 4, NOW()),
(@template4_id, 'Phone charger', 'general', 'high', 5, NOW()),
(@template4_id, 'City guidebook or app', 'general', 'medium', 6, NOW()),
(@template4_id, 'Metro/transit card', 'general', 'medium', 7, NOW()),
(@template4_id, 'Lightweight rain jacket', 'general', 'medium', 8, NOW()),
(@template4_id, 'Portable phone battery', 'general', 'medium', 9, NOW()),
(@template4_id, 'Comfortable day bag', 'general', 'medium', 10, NOW()),
(@template4_id, 'Cash for tips and small vendors', 'general', 'medium', 11, NOW()),
(@template4_id, 'Travel-size toiletries', 'general', 'medium', 12, NOW());

-- Template 5: Beach Vacation Essentials
INSERT INTO templates (creator_id, title, description, category, color, usage_count, created_at, updated_at) VALUES
(@template_creator_id, 'Beach Vacation Essentials', 'Everything you need for the perfect beach holiday, from sun protection to water activities.', 'packing', '#3498DB', 0, NOW(), NOW());

SET @template5_id = LAST_INSERT_ID();

INSERT INTO template_items (template_id, text, category, priority, sort_order, created_at) VALUES
(@template5_id, 'Sunscreen SPF 30+', 'general', 'high', 1, NOW()),
(@template5_id, 'Swimwear (2-3 sets)', 'general', 'high', 2, NOW()),
(@template5_id, 'Beach towels', 'general', 'high', 3, NOW()),
(@template5_id, 'Flip-flops or beach sandals', 'general', 'high', 4, NOW()),
(@template5_id, 'Sun hat or cap', 'general', 'high', 5, NOW()),
(@template5_id, 'Sunglasses with UV protection', 'general', 'high', 6, NOW()),
(@template5_id, 'After-sun lotion or aloe vera', 'general', 'medium', 7, NOW()),
(@template5_id, 'Waterproof phone case', 'general', 'medium', 8, NOW()),
(@template5_id, 'Beach bag', 'general', 'medium', 9, NOW()),
(@template5_id, 'Snorkel gear (if needed)', 'general', 'low', 10, NOW()),
(@template5_id, 'Water shoes for rocky beaches', 'general', 'low', 11, NOW()),
(@template5_id, 'Beach umbrella or pop-up tent', 'general', 'low', 12, NOW()),
(@template5_id, 'Cooler with ice packs', 'general', 'low', 13, NOW()),
(@template5_id, 'Beach games (frisbee, volleyball)', 'general', 'low', 14, NOW());

-- Template 6: Hiking & Outdoor Adventure
INSERT INTO templates (creator_id, title, description, category, color, usage_count, created_at, updated_at) VALUES
(@template_creator_id, 'Hiking & Outdoor Adventure', 'Complete gear list for day hikes and multi-day outdoor adventures.', 'activities', '#27AE60', 0, NOW(), NOW());

SET @template6_id = LAST_INSERT_ID();

INSERT INTO template_items (template_id, text, category, priority, sort_order, created_at) VALUES
(@template6_id, 'Hiking boots (broken in)', 'general', 'high', 1, NOW()),
(@template6_id, 'Daypack or hiking backpack', 'general', 'high', 2, NOW()),
(@template6_id, 'Water bottles or hydration system', 'general', 'high', 3, NOW()),
(@template6_id, 'Trail snacks and energy bars', 'general', 'high', 4, NOW()),
(@template6_id, 'First aid kit', 'general', 'high', 5, NOW()),
(@template6_id, 'Map and compass/GPS', 'general', 'high', 6, NOW()),
(@template6_id, 'Whistle for emergencies', 'general', 'high', 7, NOW()),
(@template6_id, 'Weather-appropriate clothing layers', 'general', 'high', 8, NOW()),
(@template6_id, 'Rain gear', 'general', 'medium', 9, NOW()),
(@template6_id, 'Headlamp or flashlight', 'general', 'medium', 10, NOW()),
(@template6_id, 'Multi-tool or knife', 'general', 'medium', 11, NOW()),
(@template6_id, 'Insect repellent', 'general', 'medium', 12, NOW()),
(@template6_id, 'Trekking poles', 'general', 'low', 13, NOW()),
(@template6_id, 'Emergency shelter/space blanket', 'general', 'medium', 14, NOW());

-- Template 7: Family Travel with Kids
INSERT INTO templates (creator_id, title, description, category, color, usage_count, created_at, updated_at) VALUES
(@template_creator_id, 'Family Travel with Kids', 'Essential items and planning tips for stress-free family vacations with children.', 'planning', '#F39C12', 0, NOW(), NOW());

SET @template7_id = LAST_INSERT_ID();

INSERT INTO template_items (template_id, text, category, priority, sort_order, created_at) VALUES
(@template7_id, 'Kids\' travel documents (passport/ID)', 'general', 'high', 1, NOW()),
(@template7_id, 'Car seats or travel boosters', 'general', 'high', 2, NOW()),
(@template7_id, 'Stroller or baby carrier', 'general', 'high', 3, NOW()),
(@template7_id, 'Diaper bag with supplies', 'general', 'high', 4, NOW()),
(@template7_id, 'Kids\' medications', 'general', 'high', 5, NOW()),
(@template7_id, 'Favorite toys and comfort items', 'general', 'high', 6, NOW()),
(@template7_id, 'Tablets/devices with downloaded content', 'general', 'medium', 7, NOW()),
(@template7_id, 'Snacks for travel day', 'general', 'high', 8, NOW()),
(@template7_id, 'Extra clothes in carry-on', 'general', 'high', 9, NOW()),
(@template7_id, 'Baby wipes (multipurpose)', 'general', 'medium', 10, NOW()),
(@template7_id, 'Travel games and activity books', 'general', 'medium', 11, NOW()),
(@template7_id, 'Kid-friendly sunscreen', 'general', 'medium', 12, NOW()),
(@template7_id, 'Emergency contact list', 'general', 'high', 13, NOW()),
(@template7_id, 'First aid kit with kid-specific items', 'general', 'medium', 14, NOW());

-- Template 8: Photography Travel
INSERT INTO templates (creator_id, title, description, category, color, usage_count, created_at, updated_at) VALUES
(@template_creator_id, 'Photography Travel', 'Specialized gear and preparation checklist for photography-focused trips.', 'activities', '#8E44AD', 0, NOW(), NOW());

SET @template8_id = LAST_INSERT_ID();

INSERT INTO template_items (template_id, text, category, priority, sort_order, created_at) VALUES
(@template8_id, 'DSLR/Mirrorless camera body', 'general', 'high', 1, NOW()),
(@template8_id, 'Primary lens (24-70mm or similar)', 'general', 'high', 2, NOW()),
(@template8_id, 'Wide-angle lens for landscapes', 'general', 'medium', 3, NOW()),
(@template8_id, 'Telephoto lens for wildlife/portraits', 'general', 'medium', 4, NOW()),
(@template8_id, 'Extra batteries (at least 3)', 'general', 'high', 5, NOW()),
(@template8_id, 'Memory cards (multiple high-capacity)', 'general', 'high', 6, NOW()),
(@template8_id, 'Battery charger and power bank', 'general', 'high', 7, NOW()),
(@template8_id, 'Sturdy tripod', 'general', 'medium', 8, NOW()),
(@template8_id, 'Lens cleaning kit', 'general', 'medium', 9, NOW()),
(@template8_id, 'Camera bag or backpack', 'general', 'high', 10, NOW()),
(@template8_id, 'Portable hard drive for backup', 'general', 'medium', 11, NOW()),
(@template8_id, 'Laptop for editing/backup', 'general', 'medium', 12, NOW()),
(@template8_id, 'Neutral density filters', 'general', 'low', 13, NOW()),
(@template8_id, 'Polarizing filter', 'general', 'low', 14, NOW()),
(@template8_id, 'Remote shutter release', 'general', 'low', 15, NOW()),
(@template8_id, 'Weather protection for gear', 'general', 'medium', 16, NOW());

-- Verify the new templates
SELECT 'Additional templates inserted successfully!' as status;
SELECT t.id, t.title, t.category, COUNT(ti.id) as item_count
FROM templates t
LEFT JOIN template_items ti ON t.id = ti.template_id
WHERE t.title IN ('Weekend City Break', 'Beach Vacation Essentials', 'Hiking & Outdoor Adventure', 'Family Travel with Kids', 'Photography Travel')
GROUP BY t.id, t.title, t.category
ORDER BY t.id;
