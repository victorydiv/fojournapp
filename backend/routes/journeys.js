const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkAndAwardBadges } = require('../utils/badgeUtils');

const router = express.Router();

// Get all journeys for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('User from auth:', req.user);
    const connection = await pool.getConnection();
    
    // Get own journeys and shared journeys
    const [rows] = await connection.execute(
      `SELECT DISTINCT j.id, j.title, j.description, j.destination, j.start_destination, j.end_destination, 
              j.start_date, j.end_date, j.status, j.created_at,
              CASE 
                WHEN j.user_id = ? OR j.owner_id = ? THEN 'owner'
                WHEN jc.user_id = ? AND jc.status = 'accepted' THEN jc.role
                ELSE 'owner'
              END as user_role,
              CASE 
                WHEN j.user_id = ? OR j.owner_id = ? THEN 1
                ELSE 0
              END as is_owner
       FROM journeys j
       LEFT JOIN journey_collaborators jc ON j.id = jc.journey_id AND jc.user_id = ? AND jc.status = 'accepted'
       WHERE j.user_id = ? OR (jc.user_id = ? AND jc.status = 'accepted')
       ORDER BY is_owner DESC, j.created_at DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]
    );
    
    console.log('Raw journeys from database:', rows);
    
    // Format dates to ensure they're in YYYY-MM-DD format
    const formattedJourneys = rows.map(journey => ({
      ...journey,
      start_date: journey.start_date instanceof Date ? 
        journey.start_date.toISOString().substring(0, 10) : 
        journey.start_date,
      end_date: journey.end_date instanceof Date ? 
        journey.end_date.toISOString().substring(0, 10) : 
        journey.end_date,
      userRole: journey.user_role,
      isOwner: journey.is_owner === 1,
      canEdit: journey.user_role === 'owner',
      canSuggest: journey.user_role === 'contributor'
    }));
    
    console.log('Formatted journeys:', formattedJourneys);
    connection.release();
    res.json(formattedJourneys);
  } catch (error) {
    console.error('Error fetching journeys:', error);
    res.status(500).json({ error: 'Failed to fetch journeys' });
  }
});

// Create a new journey
router.post('/', [
  body('title').isLength({ min: 1, max: 255 }).trim(),
  body('description').optional().trim(),
  body('destination').optional().isLength({ max: 255 }).trim(),
  body('start_date').isISO8601(),
  body('end_date').isISO8601()
], authenticateToken, async (req, res) => {
  try {
    console.log('Received journey data:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, start_date, end_date, destination } = req.body;
    const connection = await pool.getConnection();
    
    // Use title as destination if not provided
    const journeyDestination = destination || title || 'Unknown Destination';

    console.log('Using dates directly:', { start_date, end_date });
    
    const [result] = await connection.execute(
      'INSERT INTO journeys (user_id, owner_id, title, description, destination, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, req.user.id, title, description || null, journeyDestination, start_date, end_date, 'planning']
    );
    
    const journeyId = result.insertId;
    
    const [newJourney] = await connection.execute(
      'SELECT id, title, description, destination, start_destination, end_destination, start_date, end_date, status, created_at FROM journeys WHERE id = ?',
      [journeyId]
    );
    
    const journey = newJourney[0];
    const formattedJourney = {
      ...journey,
      start_date: journey.start_date instanceof Date ? 
        journey.start_date.toISOString().substring(0, 10) : 
        journey.start_date,
      end_date: journey.end_date instanceof Date ? 
        journey.end_date.toISOString().substring(0, 10) : 
        journey.end_date
    };
    
    // Check and award badges for journey creation
    let awardedBadges = [];
    try {
      awardedBadges = await checkAndAwardBadges(req.user.id, 'journey_created', {
        journeyId: journeyId,
        title: title,
        destination: journeyDestination
      });
      
      if (awardedBadges.length > 0) {
        console.log(`✓ User ${req.user.id} earned ${awardedBadges.length} badge(s) for creating journey:`, awardedBadges.map(b => b.name));
      }
    } catch (badgeError) {
      console.error('Badge checking error for journey creation:', badgeError);
      // Don't fail the journey creation if badge checking fails
    }
    
    connection.release();
    res.status(201).json({
      ...formattedJourney,
      awardedBadges: awardedBadges
    });
  } catch (error) {
    console.error('Error creating journey:', error);
    res.status(500).json({ error: 'Failed to create journey' });
  }
});

// Delete a journey
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      'DELETE FROM journeys WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Journey not found' });
    }
    
    connection.release();
    res.json({ message: 'Journey deleted successfully' });
  } catch (error) {
    console.error('Error deleting journey:', error);
    res.status(500).json({ error: 'Failed to delete journey' });
  }
});

// Get a specific journey
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Check if user has access to this journey (owner or collaborator)
    const [journeyAccess] = await connection.execute(
      `SELECT j.*, 
       CASE 
         WHEN j.user_id = ? OR j.owner_id = ? THEN 'owner'
         WHEN jc.user_id = ? AND jc.status = 'accepted' THEN jc.role
         ELSE NULL 
       END as user_role
       FROM journeys j
       LEFT JOIN journey_collaborators jc ON j.id = jc.journey_id AND jc.user_id = ?
       WHERE j.id = ?`,
      [req.user.id, req.user.id, req.user.id, req.user.id, req.params.id]
    );
    
    connection.release();
    
    if (journeyAccess.length === 0 || !journeyAccess[0].user_role) {
      return res.status(403).json({ error: 'Journey not found or access denied' });
    }
    
    const journey = journeyAccess[0];
    const { user_role, ...journeyData } = journey;
    
    res.json({
      ...journeyData,
      userRole: user_role,
      canEdit: user_role === 'owner',
      canSuggest: user_role === 'contributor'
    });
  } catch (error) {
    console.error('Error fetching journey:', error);
    res.status(500).json({ error: 'Failed to fetch journey' });
  }
});

// Update a journey
router.put('/:id', [
  body('title').optional().isLength({ min: 1, max: 255 }).trim(),
  body('description').optional().trim(),
  body('destination').optional().isLength({ max: 255 }).trim(),
  body('start_destination').optional().isLength({ max: 255 }).trim(),
  body('end_destination').optional().isLength({ max: 255 }).trim(),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, destination, start_destination, end_destination, start_date, end_date, route_data, status } = req.body;
    console.log('All PUT parameters:', { title, description, destination, start_destination, end_destination, start_date, end_date, route_data, status });
    console.log('Using dates directly:', { start_date, end_date });
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'UPDATE journeys SET title = COALESCE(?, title), description = COALESCE(?, description), destination = COALESCE(?, destination), start_destination = COALESCE(?, start_destination), end_destination = COALESCE(?, end_destination), start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date), planning_data = COALESCE(?, planning_data) WHERE id = ? AND user_id = ?',
      [title || null, description || null, destination || null, start_destination || null, end_destination || null, start_date, end_date, (route_data ? JSON.stringify(route_data) : null), req.params.id, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Journey not found' });
    }
    
    connection.release();
    res.json({ message: 'Journey updated successfully' });
  } catch (error) {
    console.error('Error updating journey:', error);
    res.status(500).json({ error: 'Failed to update journey' });
  }
});

// Delete a journey
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      'DELETE FROM journeys WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Journey not found' });
    }
    
    connection.release();
    res.json({ message: 'Journey deleted successfully' });
  } catch (error) {
    console.error('Error deleting journey:', error);
    res.status(500).json({ error: 'Failed to delete journey' });
  }
});

// Get experiences for a journey
router.get('/:id/experiences', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Check if user has access to this journey (owner or collaborator)
    const [journeyAccess] = await connection.execute(
      `SELECT j.id, j.user_id, j.owner_id,
       CASE 
         WHEN j.user_id = ? OR j.owner_id = ? THEN 'owner'
         WHEN jc.user_id = ? AND jc.status = 'accepted' THEN jc.role
         ELSE NULL 
       END as user_role
       FROM journeys j
       LEFT JOIN journey_collaborators jc ON j.id = jc.journey_id AND jc.user_id = ?
       WHERE j.id = ?`,
      [req.user.id, req.user.id, req.user.id, req.user.id, req.params.id]
    );
    
    if (journeyAccess.length === 0 || !journeyAccess[0].user_role) {
      connection.release();
      return res.status(403).json({ error: 'Journey not found or access denied' });
    }
    
    // Only show approved experiences in the main itinerary
    const [experiences] = await connection.execute(
      `SELECT id, journey_id, day, title, description, type, time, 
              latitude, longitude, address, place_id, tags, notes, 
              suggested_by, approval_status, created_at 
       FROM journey_experiences 
       WHERE journey_id = ? AND approval_status = 'approved'
       ORDER BY day ASC, time ASC, created_at ASC`,
      [req.params.id]
    );
    
    // Parse JSON fields
    const formattedExperiences = experiences.map(exp => ({
      ...exp,
      tags: exp.tags ? (typeof exp.tags === 'string' ? JSON.parse(exp.tags) : exp.tags) : [],
      location: exp.latitude && exp.longitude ? {
        lat: parseFloat(exp.latitude),
        lng: parseFloat(exp.longitude),
        address: exp.address,
        placeId: exp.place_id
      } : undefined
    }));
    
    connection.release();
    res.json(formattedExperiences);
  } catch (error) {
    console.error('Error fetching journey experiences:', error);
    res.status(500).json({ error: 'Failed to fetch experiences' });
  }
});

// Add experience to a journey
router.post('/:id/experiences', [
  body('day').isInt({ min: 1 }),
  body('title').isLength({ min: 1, max: 255 }).trim(),
  body('description').optional().trim(),
  body('type').isIn(['attraction', 'restaurant', 'accommodation', 'activity', 'brewery', 'other']),
  body('time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('location.lat').optional().isFloat({ min: -90, max: 90 }),
  body('location.lng').optional().isFloat({ min: -180, max: 180 }),
  body('location.address').optional().isLength({ max: 500 }).trim(),
  body('tags').optional().isArray(),
  body('notes').optional().trim()
], authenticateToken, async (req, res) => {
  try {
    console.log('=== Creating Experience ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Journey ID:', req.params.id);
    console.log('User ID:', req.user.id);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { day, title, description, type, time, location, tags, notes } = req.body;
    const connection = await pool.getConnection();
    
    console.log('Extracted data:', {
      day, title, description, type, time, location, tags, notes
    });
    
    // Verify journey access (owner or collaborator)
    const [journeyAccess] = await connection.execute(
      `SELECT j.id, j.user_id, j.owner_id,
       CASE 
         WHEN j.user_id = ? OR j.owner_id = ? THEN 'owner'
         WHEN jc.user_id = ? AND jc.status = 'accepted' THEN jc.role
         ELSE NULL 
       END as user_role
       FROM journeys j
       LEFT JOIN journey_collaborators jc ON j.id = jc.journey_id AND jc.user_id = ?
       WHERE j.id = ?`,
      [req.user.id, req.user.id, req.user.id, req.user.id, req.params.id]
    );
    
    if (journeyAccess.length === 0 || !journeyAccess[0].user_role) {
      console.log('Journey not found or no access for user');
      connection.release();
      return res.status(403).json({ error: 'Journey not found or access denied' });
    }
    
    const userRole = journeyAccess[0].user_role;
    console.log('Journey access verified, user role:', userRole);
    
    // Determine approval status based on user role
    const approvalStatus = userRole === 'owner' ? 'approved' : 'pending';
    const suggestedBy = userRole === 'contributor' ? req.user.id : null;
    
    console.log('Experience approval logic:', { userRole, approvalStatus, suggestedBy });
    
    console.log('Journey verification passed');
    
    // Prepare values for insertion
    const insertValues = [
      req.params.id,
      day,
      title,
      description || null,
      type,
      time || null,
      location?.lat || null,
      location?.lng || null,
      location?.address || null,
      location?.placeId || null,
      tags ? JSON.stringify(tags) : null,
      notes || null,
      suggestedBy,
      approvalStatus
    ];
    
    console.log('Insert values:', insertValues);
    
    const [result] = await connection.execute(
      `INSERT INTO journey_experiences 
       (journey_id, day, title, description, type, time, latitude, longitude, address, place_id, tags, notes, suggested_by, approval_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      insertValues
    );
    
    console.log('Insert successful, ID:', result.insertId);
    
    // Return the created experience
    const [newExperience] = await connection.execute(
      `SELECT id, journey_id, day, title, description, type, time, 
              latitude, longitude, address, place_id, tags, notes, suggested_by, approval_status, created_at 
       FROM journey_experiences WHERE id = ?`,
      [result.insertId]
    );
    
    const experience = newExperience[0];
    const formattedExperience = {
      ...experience,
      tags: experience.tags ? (typeof experience.tags === 'string' ? JSON.parse(experience.tags) : experience.tags) : [],
      location: experience.latitude && experience.longitude ? {
        lat: parseFloat(experience.latitude),
        lng: parseFloat(experience.longitude),
        address: experience.address,
        placeId: experience.place_id
      } : undefined,
      requiresApproval: approvalStatus === 'pending'
    };
    
    console.log('Returning formatted experience:', formattedExperience);
    console.log('Final approval status for response:', approvalStatus);
    
    // Check for journey completion badges when experience is added
    let awardedBadges = [];
    try {
      awardedBadges = await checkAndAwardBadges(req.user.id, 'journey_updated', {
        journeyId: parseInt(req.params.id),
        experienceAdded: true
      });
      
      if (awardedBadges.length > 0) {
        console.log(`✓ User ${req.user.id} earned ${awardedBadges.length} badge(s) for journey planning:`, awardedBadges.map(b => b.name));
      }
    } catch (badgeError) {
      console.error('Badge checking error for journey experience:', badgeError);
      // Don't fail the experience creation if badge checking fails
    }
    
    connection.release();
    
    const message = approvalStatus === 'pending' ? 
      'Experience suggestion submitted for approval' : 
      'Experience added successfully';
    
    res.status(201).json({ 
      experience: formattedExperience,
      message,
      awardedBadges: awardedBadges
    });
  } catch (error) {
    console.error('=== ERROR Creating Experience ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create experience' });
  }
});

// Update experience
router.put('/:id/experiences/:expId', [
  body('day').optional().isInt({ min: 1 }),
  body('title').optional().isLength({ min: 1, max: 255 }).trim(),
  body('description').optional().trim(),
  body('type').optional().isIn(['attraction', 'restaurant', 'accommodation', 'activity', 'brewery', 'other']),
  body('time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/),
  body('location.lat').optional().isFloat({ min: -90, max: 90 }),
  body('location.lng').optional().isFloat({ min: -180, max: 180 }),
  body('location.address').optional().isLength({ max: 500 }).trim(),
  body('tags').optional().isArray(),
  body('notes').optional().trim()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { day, title, description, type, time, location, tags, notes } = req.body;
    const connection = await pool.getConnection();
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    
    if (day !== undefined) { updates.push('day = ?'); values.push(day); }
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (type !== undefined) { updates.push('type = ?'); values.push(type); }
    if (time !== undefined) { updates.push('time = ?'); values.push(time); }
    if (location !== undefined) {
      updates.push('latitude = ?', 'longitude = ?', 'address = ?', 'place_id = ?');
      values.push(location.lat || null, location.lng || null, location.address || null, location.placeId || null);
    }
    if (tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(tags)); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
    
    if (updates.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    values.push(req.params.expId, req.params.id, req.user.id);
    
    const [result] = await connection.execute(
      `UPDATE journey_experiences SET ${updates.join(', ')} 
       WHERE id = ? AND journey_id = ? AND journey_id IN (SELECT id FROM journeys WHERE user_id = ?)`,
      values
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Experience not found' });
    }
    
    connection.release();
    res.json({ message: 'Experience updated successfully' });
  } catch (error) {
    console.error('Error updating experience:', error);
    res.status(500).json({ error: 'Failed to update experience' });
  }
});

// Delete experience
router.delete('/:id/experiences/:expId', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      `DELETE FROM journey_experiences 
       WHERE id = ? AND journey_id = ? AND journey_id IN (SELECT id FROM journeys WHERE user_id = ?)`,
      [req.params.expId, req.params.id, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Experience not found' });
    }
    
    connection.release();
    res.json({ message: 'Experience deleted successfully' });
  } catch (error) {
    console.error('Error deleting experience:', error);
    res.status(500).json({ error: 'Failed to delete experience' });
  }
});

module.exports = router;






















