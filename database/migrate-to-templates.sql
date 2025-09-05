-- Migrate existing checklist templates to separate templates table
-- Run this in your MySQL client

USE victorydiv24_travel_log2;

-- Migrate checklists marked as templates to the templates table
INSERT INTO templates (title, description, category, creator_id, created_at, updated_at, usage_count)
SELECT 
    title,
    description,
    category,
    user_id as creator_id,
    created_at,
    updated_at,
    usage_count
FROM checklists 
WHERE is_template = 1;

-- Migrate checklist items to template items
INSERT INTO template_items (template_id, text, sort_order, created_at)
SELECT 
    t.id as template_id,
    ci.text,
    ci.sort_order,
    ci.created_at
FROM checklists c
JOIN templates t ON c.title = t.title AND c.user_id = t.creator_id
JOIN checklist_items ci ON c.id = ci.checklist_id
WHERE c.is_template = 1
ORDER BY c.id, ci.sort_order;

-- Verify the migration
SELECT 'Migration completed. Template counts:' as status;
SELECT COUNT(*) as template_count FROM templates;
SELECT COUNT(*) as template_items_count FROM template_items;

-- Show migrated templates
SELECT t.id, t.title, t.category, COUNT(ti.id) as item_count
FROM templates t
LEFT JOIN template_items ti ON t.id = ti.template_id
GROUP BY t.id, t.title, t.category
ORDER BY t.id;
