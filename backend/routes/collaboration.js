const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Get collaborators for a journey
router.get('/:journeyId/collaborators', authenticateToken, async (req, res) => {
  try {
    const journeyId = parseInt(req.params.journeyId);
    const connection = await pool.getConnection();
    
    // Check if user has access to this journey
    const [journeyAccess] = await connection.execute(
      `SELECT j.id FROM journeys j 
       LEFT JOIN journey_collaborators jc ON j.id = jc.journey_id 
       WHERE j.id = ? AND (j.user_id = ? OR (jc.user_id = ? AND jc.status = 'accepted'))`,
      [journeyId, req.user.id, req.user.id]
    );
    
    if (journeyAccess.length === 0) {
      connection.release();
      return res.status(403).json({ error: 'Access denied to this journey' });
    }
    
    // Get all collaborators
    const [collaborators] = await connection.execute(
      `SELECT 
        jc.id, jc.role, jc.status, jc.invited_at, jc.responded_at,
        u.id as user_id, u.username, u.email, u.first_name, u.last_name,
        inviter.username as invited_by_username
       FROM journey_collaborators jc
       JOIN users u ON jc.user_id = u.id
       JOIN users inviter ON jc.invited_by = inviter.id
       WHERE jc.journey_id = ?
       ORDER BY jc.role DESC, jc.invited_at ASC`,
      [journeyId]
    );
    
    connection.release();
    res.json({ collaborators });
  } catch (error) {
    console.error('Get collaborators error:', error);
    res.status(500).json({ error: 'Failed to fetch collaborators' });
  }
});

// Get user's own pending suggestions for a journey (contributor view)
router.get('/:journeyId/my-suggestions', authenticateToken, async (req, res) => {
  try {
    const journeyId = parseInt(req.params.journeyId);
    console.log('Getting my suggestions for user:', req.user.id, 'journey:', journeyId);
    const connection = await pool.getConnection();
    
    // Check if user has access to this journey as a contributor
    const [journeyAccess] = await connection.execute(
      `SELECT j.id FROM journeys j 
       LEFT JOIN journey_collaborators jc ON j.id = jc.journey_id 
       WHERE j.id = ? AND (j.user_id = ? OR (jc.user_id = ? AND jc.status = 'accepted'))`,
      [journeyId, req.user.id, req.user.id]
    );
    
    if (journeyAccess.length === 0) {
      connection.release();
      return res.status(403).json({ error: 'Access denied to this journey' });
    }
    
    // Get user's pending suggestions for this journey
    const [suggestions] = await connection.execute(
      `SELECT 
        je.*, 
        u.username as suggested_by_username, u.first_name as suggested_by_first_name
       FROM journey_experiences je
       JOIN users u ON je.suggested_by = u.id
       WHERE je.journey_id = ? AND je.suggested_by = ? AND je.approval_status = 'pending'
       ORDER BY je.created_at DESC`,
      [journeyId, req.user.id]
    );
    
    // Format suggestions with location data
    const formattedSuggestions = suggestions.map(suggestion => ({
      ...suggestion,
      tags: suggestion.tags ? (typeof suggestion.tags === 'string' ? JSON.parse(suggestion.tags) : suggestion.tags) : [],
      location: suggestion.latitude && suggestion.longitude ? {
        lat: parseFloat(suggestion.latitude),
        lng: parseFloat(suggestion.longitude),
        address: suggestion.address,
        placeId: suggestion.place_id
      } : undefined
    }));
    
    connection.release();
    res.json({ suggestions: formattedSuggestions });
  } catch (error) {
    console.error('Get my suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch your suggestions' });
  }
});

// Update a pending suggestion (contributor can edit their own)
router.put('/suggestions/:suggestionId', authenticateToken, async (req, res) => {
  try {
    const suggestionId = parseInt(req.params.suggestionId);
    const { title, description, date, location, tags } = req.body;
    const connection = await pool.getConnection();
    
    // Check if this is the user's own pending suggestion
    const [suggestion] = await connection.execute(
      'SELECT * FROM journey_experiences WHERE id = ? AND suggested_by = ? AND approval_status = "pending"',
      [suggestionId, req.user.id]
    );
    
    if (suggestion.length === 0) {
      connection.release();
      return res.status(403).json({ error: 'Can only edit your own pending suggestions' });
    }
    
    // Update the suggestion
    await connection.execute(
      `UPDATE journey_experiences 
       SET title = ?, description = ?, experience_date = ?, 
           latitude = ?, longitude = ?, address = ?, place_id = ?, 
           tags = ?, updated_at = NOW()
       WHERE id = ? AND suggested_by = ?`,
      [
        title,
        description,
        date,
        location?.lat || null,
        location?.lng || null,
        location?.address || null,
        location?.placeId || null,
        JSON.stringify(tags || []),
        suggestionId,
        req.user.id
      ]
    );
    
    connection.release();
    res.json({ message: 'Suggestion updated successfully' });
  } catch (error) {
    console.error('Update suggestion error:', error);
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
});

// Delete a pending suggestion (contributor can delete their own)
router.delete('/suggestions/:suggestionId', authenticateToken, async (req, res) => {
  try {
    const suggestionId = parseInt(req.params.suggestionId);
    const connection = await pool.getConnection();
    
    // Check if this is the user's own pending suggestion
    const [suggestion] = await connection.execute(
      'SELECT * FROM journey_experiences WHERE id = ? AND suggested_by = ? AND approval_status = "pending"',
      [suggestionId, req.user.id]
    );
    
    if (suggestion.length === 0) {
      connection.release();
      return res.status(403).json({ error: 'Can only delete your own pending suggestions' });
    }
    
    // Delete the suggestion
    await connection.execute(
      'DELETE FROM journey_experiences WHERE id = ? AND suggested_by = ?',
      [suggestionId, req.user.id]
    );
    
    connection.release();
    res.json({ message: 'Suggestion deleted successfully' });
  } catch (error) {
    console.error('Delete suggestion error:', error);
    res.status(500).json({ error: 'Failed to delete suggestion' });
  }
});

// Invite a user to collaborate on a journey
router.post('/:journeyId/invite', [
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['contributor']), // Only allow contributor invitations
  body('message').optional().isLength({ max: 500 }).trim()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const journeyId = parseInt(req.params.journeyId);
    const { email, role = 'contributor', message } = req.body;
    const connection = await pool.getConnection();
    
    // Check if user is the owner of the journey
    const [journey] = await connection.execute(
      'SELECT id, title, owner_id FROM journeys WHERE id = ? AND (user_id = ? OR owner_id = ?)',
      [journeyId, req.user.id, req.user.id]
    );
    
    if (journey.length === 0) {
      connection.release();
      return res.status(403).json({ error: 'Only journey owners can invite collaborators' });
    }
    
    // Check if user exists
    const [existingUser] = await connection.execute(
      'SELECT id, username, email FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUser.length === 0) {
      // Create invitation for non-user
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      const [invitation] = await connection.execute(
        'INSERT INTO journey_invitations (journey_id, email, invited_by, token, expires_at) VALUES (?, ?, ?, ?, ?)',
        [journeyId, email, req.user.id, token, expiresAt]
      );
      
      connection.release();
      
      // TODO: Send email invitation with token
      res.status(201).json({
        message: 'Invitation sent to email address',
        type: 'email_invitation',
        invitation_id: invitation.insertId,
        token
      });
    } else {
      const userId = existingUser[0].id;
      
      // Check if already a collaborator
      const [existing] = await connection.execute(
        'SELECT id, status FROM journey_collaborators WHERE journey_id = ? AND user_id = ?',
        [journeyId, userId]
      );
      
      if (existing.length > 0) {
        connection.release();
        return res.status(400).json({ error: 'User is already invited or a collaborator' });
      }
      
      // Create collaboration invitation
      const [collaboration] = await connection.execute(
        'INSERT INTO journey_collaborators (journey_id, user_id, role, invited_by) VALUES (?, ?, ?, ?)',
        [journeyId, userId, role, req.user.id]
      );
      
      connection.release();
      
      // TODO: Send notification to user
      res.status(201).json({
        message: 'Collaboration invitation sent',
        type: 'user_invitation',
        collaboration_id: collaboration.insertId
      });
    }
  } catch (error) {
    console.error('Invite collaborator error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Respond to collaboration invitation
router.put('/invitations/:invitationId/respond', [
  body('response').isIn(['accept', 'decline'])
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invitationId = parseInt(req.params.invitationId);
    const { response } = req.body;
    const connection = await pool.getConnection();
    
    // Get invitation details
    const [invitation] = await connection.execute(
      `SELECT jc.*, j.title as journey_title 
       FROM journey_collaborators jc
       JOIN journeys j ON jc.journey_id = j.id
       WHERE jc.id = ? AND jc.user_id = ? AND jc.status = 'pending'`,
      [invitationId, req.user.id]
    );
    
    if (invitation.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Invitation not found or already responded' });
    }
    
    const status = response === 'accept' ? 'accepted' : 'declined';
    
    // Update invitation status
    await connection.execute(
      'UPDATE journey_collaborators SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, invitationId]
    );
    
    connection.release();
    
    res.json({ 
      message: `Invitation ${status} successfully`,
      journey_title: invitation[0].journey_title 
    });
  } catch (error) {
    console.error('Respond to invitation error:', error);
    res.status(500).json({ error: 'Failed to respond to invitation' });
  }
});

// Get pending invitations for current user
router.get('/invitations/pending', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [invitations] = await connection.execute(
      `SELECT 
        jc.id, jc.role, jc.invited_at,
        j.id as journey_id, j.title as journey_title, j.description as journey_description,
        j.start_date, j.end_date, j.destination,
        inviter.username as invited_by_username, inviter.first_name as invited_by_first_name
       FROM journey_collaborators jc
       JOIN journeys j ON jc.journey_id = j.id
       JOIN users inviter ON jc.invited_by = inviter.id
       WHERE jc.user_id = ? AND jc.status = 'pending'
       ORDER BY jc.invited_at DESC`,
      [req.user.id]
    );
    
    connection.release();
    res.json({ invitations });
  } catch (error) {
    console.error('Get pending invitations error:', error);
    res.status(500).json({ error: 'Failed to fetch pending invitations' });
  }
});

// Remove collaborator (owner only)
router.delete('/:journeyId/collaborators/:collaboratorId', authenticateToken, async (req, res) => {
  try {
    const journeyId = parseInt(req.params.journeyId);
    const collaboratorId = parseInt(req.params.collaboratorId);
    const connection = await pool.getConnection();
    
    // Check if user is the owner
    const [journey] = await connection.execute(
      'SELECT id FROM journeys WHERE id = ? AND (user_id = ? OR owner_id = ?)',
      [journeyId, req.user.id, req.user.id]
    );
    
    if (journey.length === 0) {
      connection.release();
      return res.status(403).json({ error: 'Only journey owners can remove collaborators' });
    }
    
    // Remove collaborator
    const [result] = await connection.execute(
      'DELETE FROM journey_collaborators WHERE id = ? AND journey_id = ?',
      [collaboratorId, journeyId]
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Collaborator not found' });
    }
    
    connection.release();
    res.json({ message: 'Collaborator removed successfully' });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});

// Get pending experience suggestions (owner only)
router.get('/:journeyId/suggestions', authenticateToken, async (req, res) => {
  try {
    const journeyId = parseInt(req.params.journeyId);
    const connection = await pool.getConnection();
    
    // Check if user is the owner
    const [journey] = await connection.execute(
      'SELECT id FROM journeys WHERE id = ? AND (user_id = ? OR owner_id = ?)',
      [journeyId, req.user.id, req.user.id]
    );
    
    if (journey.length === 0) {
      connection.release();
      return res.status(403).json({ error: 'Only journey owners can view suggestions' });
    }
    
    // Get pending suggestions
    const [suggestions] = await connection.execute(
      `SELECT 
        je.*, 
        u.username as suggested_by_username, u.first_name as suggested_by_first_name
       FROM journey_experiences je
       JOIN users u ON je.suggested_by = u.id
       WHERE je.journey_id = ? AND je.approval_status = 'pending'
       ORDER BY je.created_at DESC`,
      [journeyId]
    );
    
    // Format suggestions with location data
    const formattedSuggestions = suggestions.map(suggestion => ({
      ...suggestion,
      tags: suggestion.tags ? (typeof suggestion.tags === 'string' ? JSON.parse(suggestion.tags) : suggestion.tags) : [],
      location: suggestion.latitude && suggestion.longitude ? {
        lat: parseFloat(suggestion.latitude),
        lng: parseFloat(suggestion.longitude),
        address: suggestion.address,
        placeId: suggestion.place_id
      } : undefined
    }));
    
    connection.release();
    res.json({ suggestions: formattedSuggestions });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Approve or reject experience suggestion
router.put('/:journeyId/suggestions/:experienceId', [
  body('action').isIn(['approve', 'reject']),
  body('notes').optional().isLength({ max: 500 }).trim()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const journeyId = parseInt(req.params.journeyId);
    const experienceId = parseInt(req.params.experienceId);
    const { action, notes } = req.body;
    const connection = await pool.getConnection();
    
    // Check if user is the owner
    const [journey] = await connection.execute(
      'SELECT id FROM journeys WHERE id = ? AND (user_id = ? OR owner_id = ?)',
      [journeyId, req.user.id, req.user.id]
    );
    
    if (journey.length === 0) {
      connection.release();
      return res.status(403).json({ error: 'Only journey owners can approve/reject suggestions' });
    }
    
    const approvalStatus = action === 'approve' ? 'approved' : 'rejected';
    
    // Update experience approval status
    const [result] = await connection.execute(
      'UPDATE journey_experiences SET approval_status = ? WHERE id = ? AND journey_id = ? AND approval_status = ?',
      [approvalStatus, experienceId, journeyId, 'pending']
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Suggestion not found or already processed' });
    }
    
    // Create approval record
    await connection.execute(
      'INSERT INTO journey_experience_approvals (experience_id, suggested_by, status, reviewed_by, review_notes, reviewed_at) SELECT id, suggested_by, ?, ?, ?, CURRENT_TIMESTAMP FROM journey_experiences WHERE id = ?',
      [approvalStatus, req.user.id, notes || null, experienceId]
    );
    
    connection.release();
    
    res.json({ 
      message: `Suggestion ${action}ed successfully`,
      status: approvalStatus 
    });
  } catch (error) {
    console.error('Approve/reject suggestion error:', error);
    res.status(500).json({ error: 'Failed to process suggestion' });
  }
});

// Get notification counts for users (suggestions, invitations, approvals)
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    console.log('Getting notifications for user:', req.user.id);
    const connection = await pool.getConnection();
    
    // Count pending suggestions for journeys owned by user
    const [suggestionCount] = await connection.execute(
      `SELECT COUNT(*) as count
       FROM journey_experiences je
       JOIN journeys j ON je.journey_id = j.id
       WHERE (j.user_id = ? OR j.owner_id = ?) 
       AND je.approval_status = 'pending'`,
      [req.user.id, req.user.id]
    );
    
    // Count pending invitations for user
    const [invitationCount] = await connection.execute(
      `SELECT COUNT(*) as count
       FROM journey_collaborators jc
       WHERE jc.user_id = ? AND jc.status = 'pending'`,
      [req.user.id]
    );
    
    // Count recent approvals for user's suggestions (within last 7 days)
    const [approvalCount] = await connection.execute(
      `SELECT COUNT(*) as count
       FROM journey_experiences je
       WHERE je.suggested_by = ? 
       AND je.approval_status = 'approved'
       AND je.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [req.user.id]
    );
    
    // Count recent rejections for user's suggestions (within last 7 days)
    const [rejectionCount] = await connection.execute(
      `SELECT COUNT(*) as count
       FROM journey_experiences je
       WHERE je.suggested_by = ? 
       AND je.approval_status = 'rejected'
       AND je.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [req.user.id]
    );
    
    connection.release();
    
    const pendingSuggestions = suggestionCount[0].count || 0;
    const pendingInvitations = invitationCount[0].count || 0;
    const recentApprovals = approvalCount[0].count || 0;
    const recentRejections = rejectionCount[0].count || 0;
    
    console.log('Notification counts:', { pendingSuggestions, pendingInvitations, recentApprovals, recentRejections });
    
    res.json({
      pendingSuggestions,
      pendingInvitations,
      recentApprovals,
      recentRejections,
      total: pendingSuggestions + pendingInvitations + recentApprovals + recentRejections
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get detailed notifications for display in notification dropdown
router.get('/notifications/details', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Get pending suggestions for journeys owned by user
    const [pendingSuggestions] = await connection.execute(
      `SELECT 
        je.id, je.title, je.journey_id,
        j.title as journey_title,
        u.username as suggested_by_username,
        u.first_name as suggested_by_first_name,
        je.created_at as suggested_at
       FROM journey_experiences je
       JOIN journeys j ON je.journey_id = j.id
       JOIN users u ON je.suggested_by = u.id
       WHERE (j.user_id = ? OR j.owner_id = ?) 
       AND je.approval_status = 'pending'
       ORDER BY je.created_at DESC
       LIMIT 10`,
      [req.user.id, req.user.id]
    );
    
    // Get recent approvals/rejections for user's suggestions (within last 7 days)
    const [recentResponses] = await connection.execute(
      `SELECT 
        je.id, je.title, je.journey_id,
        j.title as journey_title,
        je.approval_status,
        je.updated_at as responded_at
       FROM journey_experiences je
       JOIN journeys j ON je.journey_id = j.id
       WHERE je.suggested_by = ? 
       AND je.approval_status IN ('approved', 'rejected')
       AND je.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY je.updated_at DESC
       LIMIT 10`,
      [req.user.id]
    );
    
    connection.release();
    
    res.json({
      pendingSuggestions: pendingSuggestions || [],
      recentResponses: recentResponses || []
    });
  } catch (error) {
    console.error('Get notification details error:', error);
    res.status(500).json({ error: 'Failed to fetch notification details' });
  }
});

module.exports = router;
