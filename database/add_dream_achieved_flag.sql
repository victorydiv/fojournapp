-- Add dream_achieved flag to travel_entries table
-- This flag indicates if the entry was created from an achieved dream

ALTER TABLE travel_entries 
ADD COLUMN dream_achieved BOOLEAN DEFAULT FALSE AFTER updated_at;

-- Add index for dream_achieved entries
CREATE INDEX idx_dream_achieved ON travel_entries(dream_achieved);
