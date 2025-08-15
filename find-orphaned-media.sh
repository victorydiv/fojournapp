#!/bin/bash

# Comprehensive media cleanup script

echo "=== Finding Orphaned Media Records ==="

# Connect to MySQL and run comprehensive queries
mysql -u victorydiv24_traveluser -p victorydiv24_travel_log2 << 'EOF'

-- Show all media files to see what's actually in the database
SELECT id, entry_id, file_name, original_name FROM media_files ORDER BY id;

-- Look for any records with similar filenames (case variations, extra characters)
SELECT id, entry_id, file_name FROM media_files WHERE file_name LIKE '%1755263592580%';

-- Check for records where the file doesn't exist on disk
SELECT id, entry_id, file_name, 
       CONCAT('/home/vps65803/fojourn.site/fojournapp/backend/uploads/', file_name) as full_path
FROM media_files 
ORDER BY id;

-- Find entries with media counts
SELECT te.id, te.title, COUNT(mf.id) as media_count
FROM travel_entries te
LEFT JOIN media_files mf ON te.id = mf.entry_id
GROUP BY te.id, te.title
HAVING media_count > 0
ORDER BY te.id;

-- Specifically look for entry 40's media
SELECT * FROM media_files WHERE entry_id = 40;

EOF
