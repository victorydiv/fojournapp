-- Journey Collaborators Table
CREATE TABLE IF NOT EXISTS journey_collaborators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    journey_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'contributor') NOT NULL DEFAULT 'contributor',
    status ENUM('pending', 'accepted', 'declined') NOT NULL DEFAULT 'pending',
    invited_by INT NOT NULL,
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_journey_user (journey_id, user_id)
);

-- Journey Experience Approvals Table
CREATE TABLE IF NOT EXISTS journey_experience_approvals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    experience_id INT NOT NULL,
    suggested_by INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    reviewed_by INT NULL,
    review_notes TEXT NULL,
    suggested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (experience_id) REFERENCES journey_experiences(id) ON DELETE CASCADE,
    FOREIGN KEY (suggested_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Add suggested_by and approval_status to journey_experiences
ALTER TABLE journey_experiences 
ADD COLUMN suggested_by INT NULL,
ADD COLUMN approval_status ENUM('approved', 'pending', 'rejected') NOT NULL DEFAULT 'approved',
ADD FOREIGN KEY (suggested_by) REFERENCES users(id) ON DELETE SET NULL;

-- Journey Invitations Table (for email invitations to non-users)
CREATE TABLE IF NOT EXISTS journey_invitations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    journey_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    invited_by INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    status ENUM('pending', 'accepted', 'expired') NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_email_journey (email, journey_id)
);

-- Add owner_id to journeys table to track the original creator
ALTER TABLE journeys 
ADD COLUMN owner_id INT NULL,
ADD FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- Update existing journeys to set owner_id = user_id
UPDATE journeys SET owner_id = user_id WHERE owner_id IS NULL;
