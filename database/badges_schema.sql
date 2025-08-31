-- Badge System Schema for Travel Log App
-- This creates the badge system with default badges and user achievements

-- Table for badge definitions
CREATE TABLE IF NOT EXISTS badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon_url VARCHAR(500),
    badge_type ENUM('achievement', 'milestone', 'social', 'content') DEFAULT 'achievement',
    criteria_type ENUM('count', 'first_time', 'location', 'tag', 'completion', 'state_count') NOT NULL,
    criteria_value VARCHAR(200), -- JSON string for complex criteria
    points INT DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table for user badge achievements
CREATE TABLE IF NOT EXISTS user_badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress_data JSON, -- Store progress details
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_badge (user_id, badge_id)
);

-- Table for badge progress tracking (for badges that require multiple actions)
CREATE TABLE IF NOT EXISTS badge_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    current_count INT DEFAULT 0,
    progress_data JSON, -- Store detailed progress information
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_badge_progress (user_id, badge_id)
);

-- Insert the initial 12 badges
INSERT INTO badges (name, description, icon_url, badge_type, criteria_type, criteria_value, points) VALUES
('Rookie Fojournor', 'First trip planned', '/badges/rookie-fojournor.png', 'milestone', 'first_time', '{"action": "journey_created"}', 15),
('Memory Maker', 'First memory created', '/badges/memory-maker.png', 'milestone', 'first_time', '{"action": "memory_created"}', 10),
('Dreamer', 'First dream created', '/badges/dreamer.png', 'milestone', 'first_time', '{"action": "dream_created"}', 10),
('Foodie', '5 restaurant memories', '/badges/foodie.png', 'achievement', 'count', '{"type": "restaurant", "count": 5}', 25),
('Here for the Beer', '5 brewery memories', '/badges/here-for-the-beer.png', 'achievement', 'count', '{"type": "brewery", "count": 5}', 25),
('Not Just Sittin Around', '5 activity memories', '/badges/not-just-sittin-around.png', 'achievement', 'count', '{"type": "activity", "count": 5}', 25),
('Look at Me!', 'First photo uploaded', '/badges/look-at-me.png', 'content', 'first_time', '{"action": "photo_uploaded"}', 15),
('Action!', 'First video uploaded', '/badges/action.png', 'content', 'first_time', '{"action": "video_uploaded"}', 20),
('Fido Approves', 'Used the "dog" tag for the first time', '/badges/fido-approves.png', 'social', 'tag', '{"tag": "dog"}', 10),
('Keep on Movin!', 'Logged a memory in 5 different states', '/badges/keep-on-movin.png', 'achievement', 'location', '{"states": 5}', 30),
('Prost!', 'Used the "beer" tag for the first time', '/badges/prost.png', 'social', 'tag', '{"tag": "beer"}', 10),
('I''m a Planner', 'Plan a journey where every day has an activity', '/badges/im-a-planner.png', 'achievement', 'completion', '{"action": "complete_journey_plan"}', 35);

-- Create indexes for better performance
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX idx_badge_progress_user_id ON badge_progress(user_id);
CREATE INDEX idx_badges_active ON badges(is_active);
CREATE INDEX idx_badges_type ON badges(badge_type);
