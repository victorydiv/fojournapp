const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get checklists attached to a journey
router.get('/:journeyId/checklists', authenticateToken, async (req, res) => {
  try {
    console.log('DEBUG: Journey checklists route hit, journeyId:', req.params.journeyId);
    console.log('DEBUG: User from token:', req.user ? req.user.id : 'No user');
    
    const connection = await pool.getConnection();
    console.log('DEBUG: Database connection obtained');
    
    // Verify journey access
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
      [req.user.id, req.user.id, req.user.id, req.user.id, req.params.journeyId]
    );
    
    console.log('DEBUG: Journey access query result:', journeyAccess);
    
    if (journeyAccess.length === 0 || !journeyAccess[0].user_role) {
      connection.release();
      console.log('DEBUG: Access denied - no journey found or no user role');
      return res.status(403).json({ error: 'Journey not found or access denied' });
    }
    
    console.log('DEBUG: Access granted, fetching checklists for journey:', req.params.journeyId);
    
    // Get attached checklists
    const [checklists] = await connection.execute(
      `SELECT c.id, c.user_id, c.title, c.description, c.category, c.is_template, 
       c.is_public, c.color, c.created_at, c.updated_at, 
       jc.attached_at, u.username as attached_by_username,
       COUNT(ci.id) as total_items,
       COUNT(CASE WHEN ci.is_completed = 1 THEN 1 END) as completed_items
       FROM journey_checklists jc
       JOIN checklists c ON jc.checklist_id = c.id
       JOIN users u ON jc.attached_by = u.id
       LEFT JOIN checklist_items ci ON c.id = ci.checklist_id
       WHERE jc.journey_id = ?
       GROUP BY c.id, c.user_id, c.title, c.description, c.category, c.is_template, 
                c.is_public, c.color, c.created_at, c.updated_at, 
                jc.attached_at, u.username, jc.attached_by
       ORDER BY jc.attached_at DESC`,
      [req.params.journeyId]
    );
    
    console.log('DEBUG: Checklists query result:', checklists);
    
    connection.release();
    console.log('DEBUG: Sending response with', checklists.length, 'checklists');
    res.json(checklists);
  } catch (error) {
    console.error('DEBUG: Error in journey checklists route:', error);
    console.error('DEBUG: Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch journey checklists' });
  }
});

// Attach checklist to journey
router.post('/:journeyId/checklists', [
  body('checklist_id').isInt()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { checklist_id } = req.body;
    const connection = await pool.getConnection();
    
    // Verify journey access
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
      [req.user.id, req.user.id, req.user.id, req.user.id, req.params.journeyId]
    );
    
    if (journeyAccess.length === 0 || !journeyAccess[0].user_role) {
      connection.release();
      return res.status(403).json({ error: 'Journey not found or access denied' });
    }
    
    // Verify checklist access
    const [checklist] = await connection.execute(
      'SELECT * FROM checklists WHERE id = ? AND (user_id = ? OR is_public = 1)',
      [checklist_id, req.user.id]
    );
    
    if (checklist.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not found or access denied' });
    }
    
    // Check if already attached
    const [existing] = await connection.execute(
      'SELECT * FROM journey_checklists WHERE journey_id = ? AND checklist_id = ?',
      [req.params.journeyId, checklist_id]
    );
    
    if (existing.length > 0) {
      connection.release();
      return res.status(409).json({ error: 'Checklist already attached to this journey' });
    }
    
    // Attach checklist
    await connection.execute(
      'INSERT INTO journey_checklists (journey_id, checklist_id, attached_by) VALUES (?, ?, ?)',
      [req.params.journeyId, checklist_id, req.user.id]
    );
    
    // Get the attached checklist with stats
    const [attachedChecklist] = await connection.execute(
      `SELECT c.id, c.user_id, c.title, c.description, c.category, c.is_template, 
       c.is_public, c.color, c.created_at, c.updated_at, 
       jc.attached_at, u.username as attached_by_username,
       COUNT(ci.id) as total_items,
       COUNT(CASE WHEN ci.is_completed = 1 THEN 1 END) as completed_items
       FROM journey_checklists jc
       JOIN checklists c ON jc.checklist_id = c.id
       JOIN users u ON jc.attached_by = u.id
       LEFT JOIN checklist_items ci ON c.id = ci.checklist_id
       WHERE jc.journey_id = ? AND jc.checklist_id = ?
       GROUP BY c.id, c.user_id, c.title, c.description, c.category, c.is_template, 
                c.is_public, c.color, c.created_at, c.updated_at, 
                jc.attached_at, u.username, jc.attached_by`,
      [req.params.journeyId, checklist_id]
    );
    
    connection.release();
    res.status(201).json(attachedChecklist[0]);
  } catch (error) {
    console.error('Error attaching checklist to journey:', error);
    res.status(500).json({ error: 'Failed to attach checklist to journey' });
  }
});

// Detach checklist from journey
router.delete('/:journeyId/checklists/:checklistId', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Verify journey access
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
      [req.user.id, req.user.id, req.user.id, req.user.id, req.params.journeyId]
    );
    
    if (journeyAccess.length === 0 || !journeyAccess[0].user_role) {
      connection.release();
      return res.status(403).json({ error: 'Journey not found or access denied' });
    }
    
    // Only owners can detach checklists
    if (journeyAccess[0].user_role !== 'owner') {
      connection.release();
      return res.status(403).json({ error: 'Only journey owners can detach checklists' });
    }
    
    const [result] = await connection.execute(
      'DELETE FROM journey_checklists WHERE journey_id = ? AND checklist_id = ?',
      [req.params.journeyId, req.params.checklistId]
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not attached to this journey' });
    }
    
    connection.release();
    res.json({ message: 'Checklist detached from journey successfully' });
  } catch (error) {
    console.error('Error detaching checklist from journey:', error);
    res.status(500).json({ error: 'Failed to detach checklist from journey' });
  }
});

// Get checklists attached to a journey experience
router.get('/:journeyId/experiences/:experienceId/checklists', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Verify journey and experience access
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
      [req.user.id, req.user.id, req.user.id, req.user.id, req.params.journeyId]
    );
    
    if (journeyAccess.length === 0 || !journeyAccess[0].user_role) {
      connection.release();
      return res.status(403).json({ error: 'Journey not found or access denied' });
    }
    
    // Verify experience exists
    const [experience] = await connection.execute(
      'SELECT * FROM journey_experiences WHERE id = ? AND journey_id = ?',
      [req.params.experienceId, req.params.journeyId]
    );
    
    if (experience.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Experience not found' });
    }
    
    // Get attached checklists
    const [checklists] = await connection.execute(
      `SELECT c.*, jec.attached_at, u.username as attached_by_username,
       COUNT(ci.id) as total_items,
       COUNT(CASE WHEN ci.is_completed = 1 THEN 1 END) as completed_items
       FROM journey_experience_checklists jec
       JOIN checklists c ON jec.checklist_id = c.id
       JOIN users u ON jec.attached_by = u.id
       LEFT JOIN checklist_items ci ON c.id = ci.checklist_id
       WHERE jec.journey_experience_id = ?
       GROUP BY c.id
       ORDER BY jec.attached_at DESC`,
      [req.params.experienceId]
    );
    
    connection.release();
    res.json(checklists);
  } catch (error) {
    console.error('Error fetching experience checklists:', error);
    res.status(500).json({ error: 'Failed to fetch experience checklists' });
  }
});

// Attach checklist to journey experience
router.post('/:journeyId/experiences/:experienceId/checklists', [
  body('checklist_id').isInt()
], authenticateToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { checklist_id } = req.body;
    const connection = await pool.getConnection();
    
    // Verify journey and experience access
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
      [req.user.id, req.user.id, req.user.id, req.user.id, req.params.journeyId]
    );
    
    if (journeyAccess.length === 0 || !journeyAccess[0].user_role) {
      connection.release();
      return res.status(403).json({ error: 'Journey not found or access denied' });
    }
    
    // Verify experience exists
    const [experience] = await connection.execute(
      'SELECT * FROM journey_experiences WHERE id = ? AND journey_id = ?',
      [req.params.experienceId, req.params.journeyId]
    );
    
    if (experience.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Experience not found' });
    }
    
    // Verify checklist access
    const [checklist] = await connection.execute(
      'SELECT * FROM checklists WHERE id = ? AND (user_id = ? OR is_public = 1)',
      [checklist_id, req.user.id]
    );
    
    if (checklist.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not found or access denied' });
    }
    
    // Check if already attached
    const [existing] = await connection.execute(
      'SELECT * FROM journey_experience_checklists WHERE journey_experience_id = ? AND checklist_id = ?',
      [req.params.experienceId, checklist_id]
    );
    
    if (existing.length > 0) {
      connection.release();
      return res.status(409).json({ error: 'Checklist already attached to this experience' });
    }
    
    // Attach checklist
    await connection.execute(
      'INSERT INTO journey_experience_checklists (journey_experience_id, checklist_id, attached_by) VALUES (?, ?, ?)',
      [req.params.experienceId, checklist_id, req.user.id]
    );
    
    // Get the attached checklist with stats
    const [attachedChecklist] = await connection.execute(
      `SELECT c.*, jec.attached_at, u.username as attached_by_username,
       COUNT(ci.id) as total_items,
       COUNT(CASE WHEN ci.is_completed = 1 THEN 1 END) as completed_items
       FROM journey_experience_checklists jec
       JOIN checklists c ON jec.checklist_id = c.id
       JOIN users u ON jec.attached_by = u.id
       LEFT JOIN checklist_items ci ON c.id = ci.checklist_id
       WHERE jec.journey_experience_id = ? AND jec.checklist_id = ?
       GROUP BY c.id`,
      [req.params.experienceId, checklist_id]
    );
    
    connection.release();
    res.status(201).json(attachedChecklist[0]);
  } catch (error) {
    console.error('Error attaching checklist to experience:', error);
    res.status(500).json({ error: 'Failed to attach checklist to experience' });
  }
});

// Detach checklist from journey experience
router.delete('/:journeyId/experiences/:experienceId/checklists/:checklistId', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Verify journey access
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
      [req.user.id, req.user.id, req.user.id, req.user.id, req.params.journeyId]
    );
    
    if (journeyAccess.length === 0 || !journeyAccess[0].user_role) {
      connection.release();
      return res.status(403).json({ error: 'Journey not found or access denied' });
    }
    
    // Only owners can detach checklists
    if (journeyAccess[0].user_role !== 'owner') {
      connection.release();
      return res.status(403).json({ error: 'Only journey owners can detach checklists' });
    }
    
    const [result] = await connection.execute(
      'DELETE FROM journey_experience_checklists WHERE journey_experience_id = ? AND checklist_id = ?',
      [req.params.experienceId, req.params.checklistId]
    );
    
    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Checklist not attached to this experience' });
    }
    
    connection.release();
    res.json({ message: 'Checklist detached from experience successfully' });
  } catch (error) {
    console.error('Error detaching checklist from experience:', error);
    res.status(500).json({ error: 'Failed to detach checklist from experience' });
  }
});

module.exports = router;
