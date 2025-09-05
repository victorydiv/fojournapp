-- Add missing columns to existing checklists table for template functionality
-- Run these ALTER TABLE commands to add the enhanced schema columns

-- Add usage_count column (for tracking template popularity)
ALTER TABLE checklists ADD COLUMN usage_count INT DEFAULT 0;

-- Add last_used_at column (for tracking when template was last used)
ALTER TABLE checklists ADD COLUMN last_used_at TIMESTAMP NULL;

-- Add indexes for better performance on template queries
CREATE INDEX idx_public_templates ON checklists (is_public, is_template);
CREATE INDEX idx_template_stats ON checklists (usage_count DESC, created_at DESC);

-- Verify the changes
DESCRIBE checklists;

-- Test query to see if templates are now accessible
SELECT c.id, c.title, c.category, c.usage_count, c.is_template, c.is_public
FROM checklists c 
WHERE c.is_template = 1 AND c.is_public = 1 
ORDER BY c.usage_count DESC
LIMIT 5;
