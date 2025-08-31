const { pool } = require('../config/database');

/**
 * Badge evaluation and awarding system
 * This utility handles automatic badge checking and awarding when users perform actions
 */

/**
 * Check and award badges for a user based on a specific action
 * @param {number} userId - The user ID
 * @param {string} action - The action performed (e.g., 'memory_created', 'journey_created')
 * @param {object} actionData - Additional data about the action (e.g., entry details, tags)
 */
async function checkAndAwardBadges(userId, action, actionData = {}) {
  try {
    console.log(`Checking badges for user ${userId}, action: ${action}`, actionData);

    // Get all active badges that the user hasn't earned yet
    const [availableBadges] = await pool.execute(`
      SELECT id, name, description, criteria_type, criteria_value, points
      FROM badges 
      WHERE is_active = TRUE 
        AND id NOT IN (
          SELECT badge_id FROM user_badges WHERE user_id = ?
        )
    `, [userId]);

    const awardedBadges = [];

    for (const badge of availableBadges) {
      let criteria;
      try {
        criteria = JSON.parse(badge.criteria_value);
      } catch (e) {
        console.warn(`Invalid criteria JSON for badge ${badge.id}: ${badge.criteria_value}`);
        continue;
      }

      const shouldAward = await evaluateBadgeCriteria(userId, badge, criteria, action, actionData);
      
      if (shouldAward) {
        await awardBadge(userId, badge.id);
        awardedBadges.push(badge);
        console.log(`✓ Awarded badge "${badge.name}" to user ${userId}`);
      }
    }

    return awardedBadges;
  } catch (error) {
    console.error('Error checking badges:', error);
    return [];
  }
}

/**
 * Evaluate if a badge criteria is met
 * @param {number} userId - The user ID
 * @param {object} badge - The badge object
 * @param {object} criteria - Parsed criteria object
 * @param {string} action - Current action being performed
 * @param {object} actionData - Action-specific data
 * @returns {boolean} - Whether the badge should be awarded
 */
async function evaluateBadgeCriteria(userId, badge, criteria, action, actionData) {
  switch (badge.criteria_type) {
    case 'first_time':
      return await checkFirstTimeAction(userId, criteria, action);
    
    case 'count':
      return await checkCountCriteria(userId, criteria, action, actionData);
    
    case 'tag':
      return await checkTagCriteria(userId, criteria, action, actionData);
    
    case 'state_count':
      return await checkStateCountCriteria(userId, criteria, action, actionData);
    
    case 'location':
      return await checkLocationCriteria(userId, criteria, action, actionData);
    
    case 'completion':
      return await checkCompletionCriteria(userId, criteria, action, actionData);
    
    default:
      console.warn(`Unknown criteria type: ${badge.criteria_type}`);
      return false;
  }
}

/**
 * Check first-time action badges
 */
async function checkFirstTimeAction(userId, criteria, action) {
  const requiredAction = criteria.action;
  
  if (action !== requiredAction) {
    return false;
  }

  // For first-time actions, if we're here it means they just did it for the first time
  // (since we only call this when the action occurs)
  return true;
}

/**
 * Check count-based criteria badges
 */
async function checkCountCriteria(userId, criteria, action, actionData) {
  const { type, count: requiredCount } = criteria;
  
  // Only check count when creating a memory that matches the type
  if (action !== 'memory_created') {
    return false;
  }

  // Check if this memory matches the required type
  if (actionData.type !== type) {
    return false;
  }

  // Count how many memories of this type the user has
  const [result] = await pool.execute(`
    SELECT COUNT(*) as count 
    FROM travel_entries 
    WHERE user_id = ? AND memory_type = ?
  `, [userId, type]);

  const currentCount = result[0].count;
  console.log(`User ${userId} has ${currentCount} ${type} memories, needs ${requiredCount}`);
  
  return currentCount >= requiredCount;
}

/**
 * Check tag-based criteria badges
 */
async function checkTagCriteria(userId, criteria, action, actionData) {
  const requiredTag = criteria.tag;
  
  // Only check when creating memories or when tags are involved
  if (action !== 'memory_created') {
    return false;
  }

  // Check if the current entry has the required tag
  if (!actionData.tags || !actionData.tags.includes(requiredTag)) {
    return false;
  }

  // For tag badges, award on first use (like first_time)
  // Check if user has used this tag before
  const [result] = await pool.execute(`
    SELECT COUNT(*) as count
    FROM entry_tags et
    JOIN travel_entries te ON et.entry_id = te.id
    WHERE te.user_id = ? AND et.tag = ?
  `, [userId, requiredTag]);

  // Award badge if this is the first time using this tag
  return result[0].count === 1; // 1 because we just created the entry with this tag
}

/**
 * Check location-based criteria badges
 */
async function checkLocationCriteria(userId, criteria, action, actionData) {
  if (action !== 'memory_created') {
    return false;
  }

  if (criteria.states) {
    // TODO: State tracking needs to be implemented
    // For now, return false until we add state extraction from coordinates
    console.log('State-based badges not yet implemented');
    return false;
    
    // Count distinct states the user has visited
    /*
    const [result] = await pool.execute(`
      SELECT COUNT(DISTINCT state) as state_count
      FROM travel_entries 
      WHERE user_id = ? AND state IS NOT NULL AND state != ''
    `, [userId]);

    const stateCount = result[0].state_count;
    console.log(`User ${userId} has visited ${stateCount} states, needs ${criteria.states}`);
    
    return stateCount >= criteria.states;
    */
  }

  return false;
}

/**
 * Check state count criteria badges
 */
async function checkStateCountCriteria(userId, criteria, action, actionData) {
  if (action !== 'memory_created') {
    return false;
  }

  if (criteria.states) {
    // TODO: State tracking needs to be implemented
    // For now, return false until we add state extraction from coordinates
    console.log('State count badges not yet implemented - need geocoding to extract state from coordinates');
    return false;
    
    // Future implementation:
    /*
    const [result] = await pool.execute(`
      SELECT COUNT(DISTINCT state) as state_count
      FROM travel_entries 
      WHERE user_id = ? AND state IS NOT NULL AND state != ''
    `, [userId]);

    const stateCount = result[0].state_count;
    console.log(`User ${userId} has visited ${stateCount} states, needs ${criteria.states}`);
    
    return stateCount >= criteria.states;
    */
  }

  return false;
}

/**
 * Check location-based criteria badges (specific cities/states)
 */
async function checkLocationCriteria(userId, criteria, action, actionData) {
  if (action !== 'memory_created') {
    return false;
  }

  if (criteria.location_type && criteria.location_name) {
    const { location_type, location_name, visit_count = 1 } = criteria;
    
    // Check if the new memory matches the target location
    let locationMatches = false;
    
    if (location_type === 'city') {
      // Check if location_name contains the city name
      locationMatches = actionData.locationName && 
        actionData.locationName.toLowerCase().includes(location_name.toLowerCase());
    } else if (location_type === 'state') {
      // TODO: Extract state from coordinates or location_name
      console.log('State-specific location badges not yet implemented - need geocoding');
      return false;
    } else if (location_type === 'country') {
      // TODO: Extract country from coordinates
      console.log('Country-specific location badges not yet implemented - need geocoding');
      return false;
    }
    
    if (!locationMatches) {
      return false;
    }
    
    // Count how many times user has visited this location
    const [result] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM travel_entries 
      WHERE user_id = ? AND LOWER(location_name) LIKE LOWER(?)
    `, [userId, `%${location_name}%`]);

    const currentCount = result[0].count;
    console.log(`User ${userId} has visited ${location_name} ${currentCount} times, needs ${visit_count}`);
    
    return currentCount >= visit_count;
  }

  // Legacy state count handling (deprecated, use state_count type instead)
  if (criteria.states) {
    console.log('Legacy state-based badges deprecated - use state_count criteria type instead');
    return false;
  }

  return false;
}

/**
 * Check completion-based criteria badges
 */
async function checkCompletionCriteria(userId, criteria, action, actionData) {
  if (criteria.action === 'complete_journey_plan' && action === 'journey_updated') {
    // Check if this journey has activities planned for every day
    const journeyId = actionData.journeyId;
    
    if (!journeyId) {
      return false;
    }

    // Get journey duration and count experiences
    const [journeyData] = await pool.execute(`
      SELECT 
        DATEDIFF(end_date, start_date) + 1 as total_days,
        (SELECT COUNT(DISTINCT day) 
         FROM journey_experiences 
         WHERE journey_id = ?) as planned_days
      FROM journeys 
      WHERE id = ? AND user_id = ?
    `, [journeyId, journeyId, userId]);

    if (journeyData.length === 0) {
      return false;
    }

    const { total_days, planned_days } = journeyData[0];
    console.log(`Journey ${journeyId}: ${planned_days}/${total_days} days planned`);
    
    return planned_days >= total_days && total_days > 0;
  }

  return false;
}

/**
 * Award a badge to a user
 * @param {number} userId - The user ID
 * @param {number} badgeId - The badge ID
 * @param {object} progressData - Optional progress data
 */
async function awardBadge(userId, badgeId, progressData = null) {
  try {
    // Check if user already has this badge
    const [existing] = await pool.execute(`
      SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?
    `, [userId, badgeId]);

    if (existing.length > 0) {
      return false; // Already awarded
    }

    // Award the badge
    await pool.execute(`
      INSERT INTO user_badges (user_id, badge_id, progress_data)
      VALUES (?, ?, ?)
    `, [userId, badgeId, progressData ? JSON.stringify(progressData) : null]);

    // Remove from progress tracking if it exists
    await pool.execute(`
      DELETE FROM badge_progress WHERE user_id = ? AND badge_id = ?
    `, [userId, badgeId]);

    return true;
  } catch (error) {
    console.error('Error awarding badge:', error);
    return false;
  }
}

/**
 * Update badge progress for count-based badges
 * @param {number} userId - The user ID
 * @param {string} action - The action performed
 * @param {object} actionData - Action-specific data
 */
async function updateBadgeProgress(userId, action, actionData = {}) {
  try {
    // Get badges that track progress and aren't earned yet
    const [badges] = await pool.execute(`
      SELECT id, name, criteria_type, criteria_value
      FROM badges 
      WHERE is_active = TRUE 
        AND criteria_type IN ('count', 'location')
        AND id NOT IN (
          SELECT badge_id FROM user_badges WHERE user_id = ?
        )
    `, [userId]);

    for (const badge of badges) {
      let criteria;
      try {
        criteria = JSON.parse(badge.criteria_value);
      } catch (e) {
        continue;
      }

      if (badge.criteria_type === 'count' && action === 'memory_created') {
        const { type, count: targetCount } = criteria;
        
        if (actionData.type === type) {
          // Count current memories of this type
          const [result] = await pool.execute(`
            SELECT COUNT(*) as count 
            FROM travel_entries 
            WHERE user_id = ? AND memory_type = ?
          `, [userId, type]);

          const currentCount = result[0].count;
          
          // Update progress
          await pool.execute(`
            INSERT INTO badge_progress (user_id, badge_id, current_count, progress_data)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              current_count = VALUES(current_count),
              progress_data = VALUES(progress_data),
              last_updated = CURRENT_TIMESTAMP
          `, [userId, badge.id, currentCount, JSON.stringify({
            target: targetCount,
            type: type,
            percentage: Math.round((currentCount / targetCount) * 100)
          })]);
        }
      }
      
      if (badge.criteria_type === 'location' && action === 'memory_created') {
        if (criteria.states && actionData.state) {
          // TODO: State tracking needs to be implemented
          console.log('State-based badge progress tracking not yet implemented');
          
          /*
          // Count distinct states
          const [result] = await pool.execute(`
            SELECT COUNT(DISTINCT state) as state_count
            FROM travel_entries 
            WHERE user_id = ? AND state IS NOT NULL AND state != ''
          `, [userId]);

          const stateCount = result[0].state_count;
          const targetStates = criteria.states;
          
          // Update progress
          await pool.execute(`
            INSERT INTO badge_progress (user_id, badge_id, current_count, progress_data)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              current_count = VALUES(current_count),
              progress_data = VALUES(progress_data),
              last_updated = CURRENT_TIMESTAMP
          `, [userId, badge.id, stateCount, JSON.stringify({
            target: targetStates,
            type: 'states_visited',
            percentage: Math.round((stateCount / targetStates) * 100)
          })]);
          */
        }
      }
    }
  } catch (error) {
    console.error('Error updating badge progress:', error);
  }
}

module.exports = {
  checkAndAwardBadges,
  updateBadgeProgress,
  awardBadge
};
