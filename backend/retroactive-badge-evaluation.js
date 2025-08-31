const { pool } = require('./config/database');
const { checkAndAwardBadges, updateBadgeProgress } = require('./utils/badgeUtils');

/**
 * Retroactive Badge Evaluation Script
 * 
 * This script evaluates all existing user data against all available badges
 * and awards badges that users are eligible for based on their historical data.
 * 
 * Run this script after implementing the badge system to ensure existing users
 * receive badges they've already earned through past activities.
 */

async function runRetroactiveBadgeEvaluation() {
  console.log('🎯 Starting Retroactive Badge Evaluation...');
  console.log('═══════════════════════════════════════════════');
  
  try {
    // Get all users
    const [users] = await pool.execute('SELECT id, username FROM users ORDER BY id');
    console.log(`📊 Found ${users.length} users to evaluate`);
    
    // Get all active badges
    const [badges] = await pool.execute(`
      SELECT id, name, description, criteria_type, criteria_value 
      FROM badges 
      WHERE is_active = TRUE 
      ORDER BY id
    `);
    console.log(`🏆 Found ${badges.length} active badges to check`);
    
    let totalBadgesAwarded = 0;
    const userResults = {};
    
    // Process each user
    for (const user of users) {
      console.log(`\n👤 Evaluating user: ${user.username} (ID: ${user.id})`);
      userResults[user.id] = {
        username: user.username,
        badgesAwarded: 0,
        badgeNames: []
      };
      
      // Get user's existing data for evaluation
      const userData = await getUserDataForEvaluation(user.id);
      console.log(`   📈 User data: ${userData.memories} memories, ${userData.journeys} journeys, ${userData.dreams} dreams, ${userData.photos} photos, ${userData.videos} videos`);
      
      // Check each type of badge-earning action with user's data
      const badgeChecks = [
        // Memory-based badges
        ...userData.memoryData.map(memory => ({
          action: 'memory_created',
          data: {
            type: memory.memory_type || 'other',
            tags: memory.tags || [],
            locationName: memory.location_name,
            latitude: memory.latitude,
            longitude: memory.longitude
          }
        })),
        
        // Journey-based badges
        ...userData.journeyData.map(journey => ({
          action: 'journey_created',
          data: {
            journeyId: journey.id,
            title: journey.title,
            destination: journey.destination
          }
        })),
        
        // Dream-based badges
        ...userData.dreamData.map(dream => ({
          action: 'dream_created',
          data: {
            dreamId: dream.id,
            title: dream.title,
            dreamType: dream.dream_type || 'destination'
          }
        })),
        
        // Photo upload badges
        ...(userData.photos > 0 ? [{
          action: 'photo_uploaded',
          data: {
            fileCount: userData.photos
          }
        }] : []),
        
        // Video upload badges
        ...(userData.videos > 0 ? [{
          action: 'video_uploaded',
          data: {
            fileCount: userData.videos
          }
        }] : [])
      ];
      
      // Process each badge check
      for (const check of badgeChecks) {
        try {
          const awardedBadges = await checkAndAwardBadges(user.id, check.action, check.data);
          if (awardedBadges.length > 0) {
            userResults[user.id].badgesAwarded += awardedBadges.length;
            userResults[user.id].badgeNames.push(...awardedBadges.map(b => b.name));
            totalBadgesAwarded += awardedBadges.length;
            
            for (const badge of awardedBadges) {
              console.log(`   ✅ Awarded: "${badge.name}"`);
            }
          }
          
          // Update badge progress for all actions
          await updateBadgeProgress(user.id, check.action, check.data);
        } catch (error) {
          console.error(`   ❌ Error checking ${check.action}:`, error.message);
        }
      }
      
      if (userResults[user.id].badgesAwarded === 0) {
        console.log(`   📝 No new badges awarded`);
      }
    }
    
    // Summary report
    console.log('\n🎉 RETROACTIVE BADGE EVALUATION COMPLETE!');
    console.log('═══════════════════════════════════════════════');
    console.log(`📊 Total badges awarded: ${totalBadgesAwarded}`);
    console.log(`👥 Users evaluated: ${users.length}`);
    
    // Detailed results
    console.log('\n📋 DETAILED RESULTS:');
    console.log('─'.repeat(50));
    
    const sortedResults = Object.values(userResults)
      .sort((a, b) => b.badgesAwarded - a.badgesAwarded);
    
    for (const result of sortedResults) {
      if (result.badgesAwarded > 0) {
        console.log(`🏆 ${result.username}: ${result.badgesAwarded} badges`);
        result.badgeNames.forEach(name => console.log(`   • ${name}`));
      }
    }
    
    const usersWithNoBadges = sortedResults.filter(r => r.badgesAwarded === 0).length;
    if (usersWithNoBadges > 0) {
      console.log(`\n📝 ${usersWithNoBadges} users received no new badges`);
    }
    
    console.log('\n✨ Badge evaluation completed successfully!');
    
    // Return results for API usage
    return {
      totalBadgesAwarded,
      usersEvaluated: users.length,
      userResults: Object.values(userResults).filter(r => r.badgesAwarded > 0),
      usersWithNoBadges: Object.values(userResults).filter(r => r.badgesAwarded === 0).length
    };
    
  } catch (error) {
    console.error('💥 Error during retroactive badge evaluation:', error);
    throw error;
  }
}

/**
 * Get comprehensive user data for badge evaluation
 */
async function getUserDataForEvaluation(userId) {
  try {
    // Get memory count and data
    const [memoryCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM travel_entries WHERE user_id = ?',
      [userId]
    );
    
    const [memoryData] = await pool.execute(`
      SELECT 
        id, memory_type, location_name, latitude, longitude,
        (SELECT GROUP_CONCAT(tag) FROM entry_tags WHERE entry_id = travel_entries.id) as tags
      FROM travel_entries 
      WHERE user_id = ?
    `, [userId]);
    
    // Process tags for each memory
    const processedMemoryData = memoryData.map(memory => ({
      ...memory,
      tags: memory.tags ? memory.tags.split(',') : []
    }));
    
    // Get journey count and data
    const [journeyCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM journeys WHERE user_id = ?',
      [userId]
    );
    
    const [journeyData] = await pool.execute(
      'SELECT id, title, destination FROM journeys WHERE user_id = ?',
      [userId]
    );
    
    // Get dream count and data
    let dreamCount = [{ count: 0 }];
    let dreamData = [];
    try {
      const [dreams] = await pool.execute(
        'SELECT COUNT(*) as count FROM dreams WHERE user_id = ?',
        [userId]
      );
      dreamCount = dreams;
      
      const [dreamsData] = await pool.execute(
        'SELECT id, title, dream_type FROM dreams WHERE user_id = ?',
        [userId]
      );
      dreamData = dreamsData;
    } catch (error) {
      // Dreams table might not exist
      console.log(`   ℹ️  Dreams table not found for user ${userId}`);
    }
    
    // Get media counts
    const [photoCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM media_files WHERE user_id = ? AND file_type = "image"',
      [userId]
    );
    
    const [videoCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM media_files WHERE user_id = ? AND file_type = "video"',
      [userId]
    );
    
    return {
      memories: memoryCount[0].count,
      journeys: journeyCount[0].count,
      dreams: dreamCount[0].count,
      photos: photoCount[0].count,
      videos: videoCount[0].count,
      memoryData: processedMemoryData,
      journeyData: journeyData,
      dreamData: dreamData
    };
    
  } catch (error) {
    console.error(`Error getting user data for user ${userId}:`, error);
    return {
      memories: 0,
      journeys: 0,
      dreams: 0,
      photos: 0,
      videos: 0,
      memoryData: [],
      journeyData: [],
      dreamData: []
    };
  }
}

/**
 * Run the script if called directly
 */
if (require.main === module) {
  runRetroactiveBadgeEvaluation()
    .then(() => {
      console.log('\n🎯 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { runRetroactiveBadgeEvaluation };
