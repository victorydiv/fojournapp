-- Dreams Table - User wishlist of future travel destinations
CREATE TABLE IF NOT EXISTS dreams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_name VARCHAR(255),
    place_id VARCHAR(255), -- Google Places ID for future reference
    country VARCHAR(100),
    region VARCHAR(100),
    dream_type ENUM('destination', 'attraction', 'restaurant', 'accommodation', 'activity', 'other') DEFAULT 'destination',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    notes TEXT,
    tags JSON, -- Store tags as JSON array
    estimated_budget DECIMAL(10, 2), -- Optional budget estimate
    best_time_to_visit VARCHAR(100), -- e.g., "Spring", "Summer 2024", etc.
    research_links JSON, -- Store research URLs as JSON array
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_achieved BOOLEAN DEFAULT FALSE, -- Mark as achieved when visited
    achieved_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_dreams (user_id),
    INDEX idx_location (latitude, longitude),
    INDEX idx_dream_type (dream_type),
    INDEX idx_priority (priority)
);

-- Dreams to Journeys relationship - Many to many
CREATE TABLE IF NOT EXISTS journey_dreams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    journey_id INT NOT NULL,
    dream_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('planned', 'visited', 'skipped') DEFAULT 'planned',
    notes TEXT, -- Journey-specific notes about this dream
    FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
    FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE,
    UNIQUE KEY unique_journey_dream (journey_id, dream_id)
);

-- Add some indexes for better performance
CREATE INDEX idx_journey_dreams_journey ON journey_dreams(journey_id);
CREATE INDEX idx_journey_dreams_dream ON journey_dreams(dream_id);
CREATE INDEX idx_dreams_achieved ON dreams(is_achieved);
CREATE INDEX idx_dreams_created ON dreams(created_at);
