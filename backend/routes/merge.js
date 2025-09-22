const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Account Merging API Routes
 * Handles merge invitations, acceptance, and unmerging
 */

// Helper function to get admin setting
async function getAdminSetting(key, defaultValue) {
  try {
    const [settings] = await pool.execute(
      'SELECT setting_value, setting_type FROM admin_settings WHERE setting_key = ?',
      [key]
    );
    
    if (settings.length === 0) {
      return defaultValue;
    }
    
    const { setting_value, setting_type } = settings[0];
    
    switch (setting_type) {
      case 'number':
        return parseInt(setting_value);
      case 'boolean':
        return setting_value === 'true';
      case 'json':
        return JSON.parse(setting_value);
      default:
        return setting_value;
    }
  } catch (error) {
    console.error('Error getting admin setting:', error);
    return defaultValue;
  }
}

// Helper function to generate unique merge slug
async function generateMergeSlug(user1, user2) {
  const name1 = user1.first_name?.toLowerCase() || user1.username.toLowerCase();
  const name2 = user2.first_name?.toLowerCase() || user2.username.toLowerCase();
  
  // Sort names alphabetically for consistency
  const [firstName, secondName] = [name1, name2].sort();
  let baseSlug = `${firstName}-${secondName}-travels`;
  
  // Clean slug (remove special characters, limit length)
  baseSlug = baseSlug.replace(/[^a-z0-9-]/g, '').substring(0, 80);
  
  // Check for uniqueness and add number if needed
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const [existing] = await pool.execute(
      'SELECT id FROM account_merges WHERE merge_slug = ?',
      [slug]
    );
    
    if (existing.length === 0) {
      break;
    }
    
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
  
  return slug;
}

// Helper function to check if user can send invitation
async function canUserSendInvitation(userId, excludeInvitationId = null) {
  // Check if user is already merged
  const [mergedUsers] = await pool.execute(
    'SELECT id FROM users WHERE id = ? AND is_merged = 1',
    [userId]
  );
  
  if (mergedUsers.length > 0) {
    return { canSend: false, reason: 'User is already in a merged account' };
  }
  
  // Check if user has active invitations (as inviter or invitee)
  // Exclude the current invitation being processed if specified
  let query = 'SELECT id FROM account_merge_invitations WHERE (inviter_user_id = ? OR invited_user_id = ?) AND status = "pending"';
  let params = [userId, userId];
  
  if (excludeInvitationId) {
    query += ' AND id != ?';
    params.push(excludeInvitationId);
  }
  
  const [activeInvitations] = await pool.execute(query, params);
  
  if (activeInvitations.length > 0) {
    return { canSend: false, reason: 'User already has an active merge invitation' };
  }
  
  return { canSend: true };
}

// Get current user's merge status and invitations
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's current merge status
    const [userMergeInfo] = await pool.execute(
      'SELECT * FROM user_merge_info WHERE user_id = ?',
      [userId]
    );
    
    // Get pending invitations (sent and received)
    const [sentInvitations] = await pool.execute(`
      SELECT 
        ami.id,
        ami.invited_user_id,
        ami.invitation_message,
        ami.created_at,
        ami.expires_at,
        u.username as invited_username,
        u.first_name as invited_first_name,
        u.last_name as invited_last_name,
        u.public_username as invited_public_username
      FROM account_merge_invitations ami
      JOIN users u ON ami.invited_user_id = u.id
      WHERE ami.inviter_user_id = ? AND ami.status = 'pending'
    `, [userId]);
    
    const [receivedInvitations] = await pool.execute(`
      SELECT 
        ami.id,
        ami.inviter_user_id,
        ami.invitation_message,
        ami.created_at,
        ami.expires_at,
        u.username as inviter_username,
        u.first_name as inviter_first_name,
        u.last_name as inviter_last_name,
        u.public_username as inviter_public_username
      FROM account_merge_invitations ami
      JOIN users u ON ami.inviter_user_id = u.id
      WHERE ami.invited_user_id = ? AND ami.status = 'pending'
    `, [userId]);
    
    res.json({
      mergeInfo: userMergeInfo[0] || null,
      sentInvitations,
      receivedInvitations,
      canSendInvitation: (await canUserSendInvitation(userId)).canSend
    });
    
  } catch (error) {
    console.error('Error getting merge status:', error);
    res.status(500).json({ error: 'Failed to get merge status' });
  }
});

// Send merge invitation
router.post('/invite', authenticateToken, [
  body('invitedUser').notEmpty().withMessage('Invited user identifier is required'),
  body('message').optional().isLength({ max: 500 }).withMessage('Message must be 500 characters or less')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const inviterId = req.user.id;
    const { invitedUser, message } = req.body;
    
    // Check if inviter can send invitation
    const canSend = await canUserSendInvitation(inviterId);
    if (!canSend.canSend) {
      return res.status(400).json({ error: canSend.reason });
    }
    
    // Find invited user by username, email, or public_username
    const [invitedUsers] = await pool.execute(`
      SELECT id, username, email, first_name, last_name, public_username, is_merged
      FROM users 
      WHERE (username = ? OR email = ? OR public_username = ?) AND id != ?
    `, [invitedUser, invitedUser, invitedUser, inviterId]);
    
    if (invitedUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const invitedUserData = invitedUsers[0];
    
    // Check if invited user is already merged
    if (invitedUserData.is_merged) {
      return res.status(400).json({ error: 'The invited user is already in a merged account' });
    }
    
    // Check if invited user has active invitations
    const canReceive = await canUserSendInvitation(invitedUserData.id);
    if (!canReceive.canSend) {
      return res.status(400).json({ error: 'The invited user already has an active merge invitation' });
    }
    
    // Cancel any existing invitations from this user (shouldn't exist due to constraints, but just in case)
    await pool.execute(
      'UPDATE account_merge_invitations SET status = "cancelled" WHERE inviter_user_id = ? AND status = "pending"',
      [inviterId]
    );
    
    // Create new invitation
    const expiryDays = await getAdminSetting('merge_invitation_expiry_days', 7);
    
    const [result] = await pool.execute(`
      INSERT INTO account_merge_invitations 
      (inviter_user_id, invited_user_id, invitation_message, expires_at)
      VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))
    `, [inviterId, invitedUserData.id, message || null, expiryDays]);
    
    res.json({
      success: true,
      invitationId: result.insertId,
      message: `Merge invitation sent to ${invitedUserData.first_name || invitedUserData.username}`
    });
    
  } catch (error) {
    console.error('Error sending merge invitation:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Invitation already exists or user constraint violated' });
    }
    res.status(500).json({ error: 'Failed to send merge invitation' });
  }
});

// Accept merge invitation
router.post('/accept/:invitationId', authenticateToken, async (req, res) => {
  try {
    const invitationId = parseInt(req.params.invitationId);
    const userId = req.user.id;
    
    // Get invitation details
    const [invitations] = await pool.execute(`
      SELECT 
        ami.*,
        u1.username as inviter_username,
        u1.first_name as inviter_first_name,
        u1.last_name as inviter_last_name,
        u1.public_username as inviter_public_username,
        u2.username as invited_username,
        u2.first_name as invited_first_name,
        u2.last_name as invited_last_name,
        u2.public_username as invited_public_username
      FROM account_merge_invitations ami
      JOIN users u1 ON ami.inviter_user_id = u1.id
      JOIN users u2 ON ami.invited_user_id = u2.id
      WHERE ami.id = ? AND ami.invited_user_id = ? AND ami.status = 'pending'
    `, [invitationId, userId]);
    
    if (invitations.length === 0) {
      return res.status(404).json({ error: 'Invitation not found or already processed' });
    }
    
    const invitation = invitations[0];
    
    // Check if invitation has expired
    if (new Date() > new Date(invitation.expires_at)) {
      await pool.execute(
        'UPDATE account_merge_invitations SET status = "cancelled" WHERE id = ?',
        [invitationId]
      );
      return res.status(400).json({ error: 'Invitation has expired' });
    }
    
    // Verify both users can still merge (excluding the current invitation being processed)
    const inviterCanMerge = await canUserSendInvitation(invitation.inviter_user_id, invitationId);
    const inviteeCanMerge = await canUserSendInvitation(invitation.invited_user_id, invitationId);
    
    if (!inviterCanMerge.canSend) {
      return res.status(400).json({ error: `Inviter cannot merge: ${inviterCanMerge.reason}` });
    }
    
    if (!inviteeCanMerge.canSend) {
      return res.status(400).json({ error: `You cannot merge: ${inviteeCanMerge.reason}` });
    }
    
    // Start transaction for merge process
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Generate merge slug
      const mergeSlug = await generateMergeSlug(
        { first_name: invitation.inviter_first_name, username: invitation.inviter_username },
        { first_name: invitation.invited_first_name, username: invitation.invited_username }
      );
      
      // Create merge record
      const [mergeResult] = await connection.execute(`
        INSERT INTO account_merges (user1_id, user2_id, merge_slug, merge_settings)
        VALUES (?, ?, ?, ?)
      `, [
        invitation.inviter_user_id,
        invitation.invited_user_id,
        mergeSlug,
        JSON.stringify({
          display_order: 'chronological',
          profile_display: {
            show_both_names: true,
            bio_merge_strategy: 'combine'
          },
          privacy: {
            cross_user_visibility: true,
            shared_statistics: true
          }
        })
      ]);
      
      const mergeId = mergeResult.insertId;
      
      // Update both users
      await connection.execute(
        'UPDATE users SET merge_id = ?, is_merged = 1, original_public_username = public_username WHERE id IN (?, ?)',
        [mergeId, invitation.inviter_user_id, invitation.invited_user_id]
      );
      
      // Create URL redirects
      await connection.execute(`
        INSERT INTO merge_url_redirects (original_username, original_public_username, merge_slug, user_id)
        VALUES (?, ?, ?, ?), (?, ?, ?, ?)
      `, [
        invitation.inviter_username,
        invitation.inviter_public_username,
        mergeSlug,
        invitation.inviter_user_id,
        invitation.invited_username,
        invitation.invited_public_username,
        mergeSlug,
        invitation.invited_user_id
      ]);
      
      // Update invitation status
      await connection.execute(
        'UPDATE account_merge_invitations SET status = "accepted", responded_at = NOW() WHERE id = ?',
        [invitationId]
      );
      
      // Add to merge history
      await connection.execute(`
        INSERT INTO account_merge_history 
        (user1_id, user2_id, action, merge_slug, action_initiated_by)
        VALUES (?, ?, 'merged', ?, ?)
      `, [
        invitation.inviter_user_id,
        invitation.invited_user_id,
        mergeSlug,
        userId
      ]);
      
      await connection.commit();
      
      res.json({
        success: true,
        mergeSlug,
        message: 'Accounts successfully merged!',
        publicUrl: `/u/${mergeSlug}`
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error accepting merge invitation:', error);
    res.status(500).json({ error: 'Failed to accept merge invitation' });
  }
});

// Decline merge invitation
router.post('/decline/:invitationId', authenticateToken, async (req, res) => {
  try {
    const invitationId = parseInt(req.params.invitationId);
    const userId = req.user.id;
    
    const [result] = await pool.execute(
      'UPDATE account_merge_invitations SET status = "declined", responded_at = NOW() WHERE id = ? AND invited_user_id = ? AND status = "pending"',
      [invitationId, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Invitation not found or already processed' });
    }
    
    res.json({ success: true, message: 'Invitation declined' });
    
  } catch (error) {
    console.error('Error declining merge invitation:', error);
    res.status(500).json({ error: 'Failed to decline invitation' });
  }
});

// Cancel sent invitation
router.post('/cancel/:invitationId', authenticateToken, async (req, res) => {
  try {
    const invitationId = parseInt(req.params.invitationId);
    const userId = req.user.id;
    
    const [result] = await pool.execute(
      'UPDATE account_merge_invitations SET status = "cancelled" WHERE id = ? AND inviter_user_id = ? AND status = "pending"',
      [invitationId, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Invitation not found or already processed' });
    }
    
    res.json({ success: true, message: 'Invitation cancelled' });
    
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

// Unmerge accounts
router.post('/unmerge', authenticateToken, [
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason must be 500 characters or less')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.user.id;
    const { reason } = req.body;
    
    // Get user's merge info
    const [userMergeInfo] = await pool.execute(
      'SELECT * FROM user_merge_info WHERE user_id = ? AND is_merged = 1',
      [userId]
    );
    
    if (userMergeInfo.length === 0) {
      return res.status(400).json({ error: 'User is not in a merged account' });
    }
    
    const mergeInfo = userMergeInfo[0];
    
    // Check cooling period
    const coolingPeriodDays = await getAdminSetting('merge_unmerge_cooling_period_days', 0);
    const daysSinceMerge = (Date.now() - new Date(mergeInfo.merged_at).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceMerge < coolingPeriodDays) {
      const remainingDays = Math.ceil(coolingPeriodDays - daysSinceMerge);
      return res.status(400).json({ 
        error: `You must wait ${remainingDays} more day(s) before unmerging` 
      });
    }
    
    // Start transaction for unmerge process
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      const mergeId = mergeInfo.merge_id;
      const partnerId = mergeInfo.partner_user_id;
      const mergeSlug = mergeInfo.merge_slug;
      
      // Calculate merge duration
      const mergeDuration = Math.floor(daysSinceMerge);
      
      // Update both users - remove merge references and restore original usernames
      await connection.execute(`
        UPDATE users 
        SET merge_id = NULL, 
            is_merged = 0,
            public_username = original_public_username,
            original_public_username = NULL
        WHERE id IN (?, ?)
      `, [userId, partnerId]);
      
      // Delete the merge record
      await connection.execute(
        'DELETE FROM account_merges WHERE id = ?',
        [mergeId]
      );
      
      // Keep URL redirects but they'll now point to choice page
      // (Don't delete them as we need them for the choice interface)
      
      // Add to merge history
      await connection.execute(`
        INSERT INTO account_merge_history 
        (user1_id, user2_id, action, merge_slug, merge_duration, action_initiated_by, reason)
        VALUES (?, ?, 'unmerged', ?, ?, ?, ?)
      `, [
        Math.min(userId, partnerId), // Consistent ordering
        Math.max(userId, partnerId),
        mergeSlug,
        mergeDuration,
        userId,
        reason || null
      ]);
      
      await connection.commit();
      
      res.json({
        success: true,
        message: 'Accounts successfully unmerged',
        mergeDuration,
        note: 'Individual profile URLs will now show a choice page'
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error unmerging accounts:', error);
    res.status(500).json({ error: 'Failed to unmerge accounts' });
  }
});

// Get merge history for a user
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [history] = await pool.execute(`
      SELECT 
        amh.*,
        CASE 
          WHEN amh.user1_id = ? THEN u2.first_name
          ELSE u1.first_name
        END as partner_first_name,
        CASE 
          WHEN amh.user1_id = ? THEN u2.last_name
          ELSE u1.last_name
        END as partner_last_name,
        CASE 
          WHEN amh.user1_id = ? THEN u2.username
          ELSE u1.username
        END as partner_username
      FROM account_merge_history amh
      JOIN users u1 ON amh.user1_id = u1.id
      JOIN users u2 ON amh.user2_id = u2.id
      WHERE amh.user1_id = ? OR amh.user2_id = ?
      ORDER BY amh.action_at DESC
    `, [userId, userId, userId, userId, userId]);
    
    res.json({ history });
    
  } catch (error) {
    console.error('Error getting merge history:', error);
    res.status(500).json({ error: 'Failed to get merge history' });
  }
});

// Get public profile data for merged or individual accounts
router.get('/public-profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Check if this is a merge slug
    const [redirects] = await pool.execute(
      'SELECT * FROM merge_url_redirects WHERE merge_slug = ?',
      [username]
    );
    
    if (redirects.length > 0) {
      const redirect = redirects[0];
      
      // Check if accounts are currently merged
      const [mergeInfo] = await pool.execute(`
        SELECT am.*, 
               u1.username as user1_username, u1.public_username as user1_public_username,
               u1.first_name as user1_first_name, u1.last_name as user1_last_name,
               u1.profile_bio as user1_bio, u1.avatar_filename as user1_avatar,
               u1.hero_image_filename as user1_hero,
               u2.username as user2_username, u2.public_username as user2_public_username,
               u2.first_name as user2_first_name, u2.last_name as user2_last_name,
               u2.profile_bio as user2_bio, u2.avatar_filename as user2_avatar,
               u2.hero_image_filename as user2_hero
        FROM account_merges am
        JOIN users u1 ON am.user1_id = u1.id
        JOIN users u2 ON am.user2_id = u2.id
        WHERE am.id = ?
      `, [redirect.merge_id]);
      
      if (mergeInfo.length > 0) {
        // Accounts are currently merged - return combined profile data
        const merge = mergeInfo[0];
        
        // Get combined travel entries sorted chronologically
        const [entries] = await pool.execute(`
          SELECT te.*, u.first_name, u.last_name, u.username, u.avatar_filename,
                 'individual' as entry_type
          FROM travel_entries te
          JOIN users u ON te.user_id = u.id
          WHERE te.user_id IN (?, ?) AND te.is_public = 1
          ORDER BY te.date_visited DESC, te.created_at DESC
        `, [merge.user1_id, merge.user2_id]);
        
        // Get media counts
        const [mediaCounts] = await pool.execute(`
          SELECT 
            COUNT(mf.id) as total_media,
            COUNT(CASE WHEN mf.file_type = 'image' THEN 1 END) as image_count,
            COUNT(CASE WHEN mf.file_type = 'video' THEN 1 END) as video_count
          FROM media_files mf
          JOIN travel_entries te ON mf.entry_id = te.id
          WHERE te.user_id IN (?, ?) AND te.is_public = 1
        `, [merge.user1_id, merge.user2_id]);
        
        return res.json({
          type: 'merged',
          mergeSlug: merge.merge_slug,
          user1: {
            id: merge.user1_id,
            username: merge.user1_username,
            publicUsername: merge.user1_public_username,
            firstName: merge.user1_first_name,
            lastName: merge.user1_last_name,
            bio: merge.user1_bio,
            avatarFilename: merge.user1_avatar,
            heroImageFilename: merge.user1_hero
          },
          user2: {
            id: merge.user2_id,
            username: merge.user2_username,
            publicUsername: merge.user2_public_username,
            firstName: merge.user2_first_name,
            lastName: merge.user2_last_name,
            bio: merge.user2_bio,
            avatarFilename: merge.user2_avatar,
            heroImageFilename: merge.user2_hero
          },
          combinedName: `${merge.user1_first_name} ${merge.user1_last_name} & ${merge.user2_first_name} ${merge.user2_last_name}`,
          entries,
          stats: {
            totalEntries: entries.length,
            totalMedia: mediaCounts[0]?.total_media || 0,
            imageCount: mediaCounts[0]?.image_count || 0,
            videoCount: mediaCounts[0]?.video_count || 0
          },
          mergedAt: merge.merged_at
        });
      } else {
        // Accounts were unmerged - return choice data
        const [users] = await pool.execute(`
          SELECT id, username, public_username, first_name, last_name, 
                 profile_bio, avatar_filename, hero_image_filename, profile_public
          FROM users 
          WHERE id IN (?, ?)
        `, [redirect.user1_id, redirect.user2_id]);
        
        return res.json({
          type: 'unmerged_choice',
          mergeSlug: redirect.merge_slug,
          users: users.map(user => ({
            id: user.id,
            username: user.username,
            publicUsername: user.public_username,
            firstName: user.first_name,
            lastName: user.last_name,
            bio: user.profile_bio,
            avatarFilename: user.avatar_filename,
            heroImageFilename: user.hero_image_filename,
            profilePublic: user.profile_public
          }))
        });
      }
    }
    
    // Check if user is currently merged (redirect to merge slug)
    const [userMergeInfo] = await pool.execute(`
      SELECT umi.merge_slug
      FROM user_merge_info umi
      JOIN users u ON umi.user_id = u.id
      WHERE (u.username = ? OR u.public_username = ?) AND umi.is_merged = 1
    `, [username, username]);
    
    if (userMergeInfo.length > 0) {
      return res.json({
        type: 'redirect_to_merge',
        redirectTo: userMergeInfo[0].merge_slug
      });
    }
    
    // Regular individual profile
    const [users] = await pool.execute(`
      SELECT u.id, u.username, u.public_username, u.first_name, u.last_name,
             u.profile_bio, u.avatar_filename, u.hero_image_filename, u.profile_public,
             COUNT(te.id) as total_entries
      FROM users u
      LEFT JOIN travel_entries te ON u.id = te.user_id AND te.is_public = 1
      WHERE (u.username = ? OR u.public_username = ?) AND u.profile_public = 1
      GROUP BY u.id
    `, [username, username]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const user = users[0];
    
    // Get user's public entries
    const [entries] = await pool.execute(`
      SELECT te.*, 'individual' as entry_type
      FROM travel_entries te
      WHERE te.user_id = ? AND te.is_public = 1
      ORDER BY te.date_visited DESC, te.created_at DESC
    `, [user.id]);
    
    // Get media counts
    const [mediaCounts] = await pool.execute(`
      SELECT 
        COUNT(mf.id) as total_media,
        COUNT(CASE WHEN mf.file_type = 'image' THEN 1 END) as image_count,
        COUNT(CASE WHEN mf.file_type = 'video' THEN 1 END) as video_count
      FROM media_files mf
      JOIN travel_entries te ON mf.entry_id = te.id
      WHERE te.user_id = ? AND te.is_public = 1
    `, [user.id]);
    
    res.json({
      type: 'individual',
      user: {
        id: user.id,
        username: user.username,
        publicUsername: user.public_username,
        firstName: user.first_name,
        lastName: user.last_name,
        bio: user.profile_bio,
        avatarFilename: user.avatar_filename,
        heroImageFilename: user.hero_image_filename
      },
      entries,
      stats: {
        totalEntries: entries.length,
        totalMedia: mediaCounts[0]?.total_media || 0,
        imageCount: mediaCounts[0]?.image_count || 0,
        videoCount: mediaCounts[0]?.video_count || 0
      }
    });
    
  } catch (error) {
    console.error('Error getting public profile data:', error);
    res.status(500).json({ error: 'Failed to get profile data' });
  }
});

// Get merge display settings
router.get('/display-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user is merged
    const [mergeInfo] = await pool.execute(`
      SELECT am.merge_settings, am.user1_id, am.user2_id
      FROM account_merges am
      JOIN users u ON u.merge_id = am.id
      WHERE u.id = ?
    `, [userId]);

    if (mergeInfo.length === 0) {
      return res.status(404).json({ error: 'User is not in a merged account' });
    }

    const settings = mergeInfo[0].merge_settings || {};
    const isUser1 = mergeInfo[0].user1_id === userId;
    
    // Return current display settings, defaulting to user1 or combine
    const displaySettings = {
      avatar_display: settings.profile_display?.avatar_display || 'user1',
      hero_image_display: settings.profile_display?.hero_image_display || 'user1',
      bio_display: settings.profile_display?.bio_display || 'combine',
      current_user_is: isUser1 ? 'user1' : 'user2'
    };

    res.json(displaySettings);

  } catch (error) {
    console.error('Error getting display settings:', error);
    res.status(500).json({ error: 'Failed to get display settings' });
  }
});

// Update merge display settings
router.put('/display-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { avatar_display, hero_image_display, bio_display } = req.body;

    // Validate input
    if (avatar_display && !['user1', 'user2'].includes(avatar_display)) {
      return res.status(400).json({ error: 'Invalid avatar_display value' });
    }
    if (hero_image_display && !['user1', 'user2'].includes(hero_image_display)) {
      return res.status(400).json({ error: 'Invalid hero_image_display value' });
    }
    if (bio_display && !['user1', 'user2', 'combine'].includes(bio_display)) {
      return res.status(400).json({ error: 'Invalid bio_display value. Must be user1, user2, or combine' });
    }

    // Check if user is merged
    const [mergeInfo] = await pool.execute(`
      SELECT am.id, am.merge_settings
      FROM account_merges am
      JOIN users u ON u.merge_id = am.id
      WHERE u.id = ?
    `, [userId]);

    if (mergeInfo.length === 0) {
      return res.status(404).json({ error: 'User is not in a merged account' });
    }

    const mergeId = mergeInfo[0].id;
    let currentSettings = mergeInfo[0].merge_settings || {};

    // Ensure profile_display object exists
    if (!currentSettings.profile_display) {
      currentSettings.profile_display = {};
    }

    // Update only the provided settings
    if (avatar_display) {
      currentSettings.profile_display.avatar_display = avatar_display;
    }
    if (hero_image_display) {
      currentSettings.profile_display.hero_image_display = hero_image_display;
    }
    if (bio_display) {
      currentSettings.profile_display.bio_display = bio_display;
    }

    // Update the database
    await pool.execute(`
      UPDATE account_merges 
      SET merge_settings = ?
      WHERE id = ?
    `, [JSON.stringify(currentSettings), mergeId]);

    res.json({ 
      message: 'Display settings updated successfully',
      settings: {
        avatar_display: currentSettings.profile_display.avatar_display,
        hero_image_display: currentSettings.profile_display.hero_image_display,
        bio_display: currentSettings.profile_display.bio_display
      }
    });

  } catch (error) {
    console.error('Error updating display settings:', error);
    res.status(500).json({ error: 'Failed to update display settings' });
  }
});

module.exports = router;