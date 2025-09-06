-- Fix malformed tags data for specific blog post
-- This post has tags stored as comma-separated string instead of JSON array

USE victorydiv24_travel_log2;

-- First, let's see what the current tags look like for this post
SELECT id, title, slug, tags 
FROM blog_posts 
WHERE slug = '5-travel-friendly-finds-i-now-bring-on-every-trip';

-- Fix the tags by converting from comma-separated string to proper JSON array
UPDATE blog_posts 
SET tags = '["camping", "tech", "travel-friendly", "gadgets"]'
WHERE slug = '5-travel-friendly-finds-i-now-bring-on-every-trip';

-- Verify the fix
SELECT id, title, slug, tags 
FROM blog_posts 
WHERE slug = '5-travel-friendly-finds-i-now-bring-on-every-trip';

SELECT 'Blog post tags fixed successfully!' as status;
