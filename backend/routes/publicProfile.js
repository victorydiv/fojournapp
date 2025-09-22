const express = require('express');
const { pool } = require('../config/database');
const router = express.Router();

// Handle merged account profile routing
async function handleMergedProfileRequest(username, req, res, next) {
  try {
    console.log('🔍 Checking merged account routing for username:', username);
    
    // First check if this is a merge slug from URL redirects
    const [redirects] = await pool.execute(
      'SELECT * FROM merge_url_redirects WHERE merge_slug = ?',
      [username]
    );
    
    if (redirects.length > 0) {
      const redirect = redirects[0];
      console.log('📍 Found URL redirect for merge slug:', username);
      
      // Check if accounts are currently merged
      const [mergeInfo] = await pool.execute(`
        SELECT am.*, 
               u1.username as user1_username, u1.public_username as user1_public_username,
               u1.first_name as user1_first_name, u1.last_name as user1_last_name,
               u2.username as user2_username, u2.public_username as user2_public_username,
               u2.first_name as user2_first_name, u2.last_name as user2_last_name
        FROM account_merges am
        JOIN users u1 ON am.user1_id = u1.id
        JOIN users u2 ON am.user2_id = u2.id
        WHERE am.id = ?
      `, [redirect.merge_id]);
      
      if (mergeInfo.length > 0) {
        // Accounts are currently merged - show combined profile
        console.log('✅ Accounts are merged - showing combined profile');
        return await serveMergedProfile(mergeInfo[0], req, res);
      } else {
        // Accounts were unmerged - show choice page
        console.log('🔄 Accounts were unmerged - showing choice page');
        return await serveUnmergedChoicePage(redirect, req, res);
      }
    }
    
    // Check if this username belongs to a user currently in a merge
    const [userMergeInfo] = await pool.execute(`
      SELECT umi.*, 
             u.username, u.public_username, u.first_name, u.last_name,
             am.merge_slug,
             partner.username as partner_username, 
             partner.public_username as partner_public_username,
             partner.first_name as partner_first_name, 
             partner.last_name as partner_last_name
      FROM user_merge_info umi
      JOIN users u ON umi.user_id = u.id
      JOIN account_merges am ON umi.merge_id = am.id
      JOIN users partner ON umi.partner_user_id = partner.id
      WHERE (u.username = ? OR u.public_username = ?) AND umi.is_merged = 1
    `, [username, username]);
    
    if (userMergeInfo.length > 0) {
      // User is currently merged - redirect to merge slug
      const mergeSlug = userMergeInfo[0].merge_slug;
      console.log('🔀 User is merged - redirecting to merge slug:', mergeSlug);
      return res.redirect(301, `/u/${mergeSlug}`);
    }
    
    // Not a merged account scenario - continue with normal profile handling
    console.log('👤 Normal individual profile request');
    return null; // Signal to continue with normal handling
    
  } catch (error) {
    console.error('Error in merged profile routing:', error);
    return next(error);
  }
}

// Serve combined profile for merged accounts
async function serveMergedProfile(mergeInfo, req, res) {
  try {
    const baseUrl = 'https://fojourn.site';
    
    // Get combined statistics
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(te.id) as total_memories,
        COUNT(CASE WHEN te.is_public = 1 THEN 1 END) as public_memories
      FROM travel_entries te
      WHERE te.user_id IN (?, ?) AND te.is_public = 1
    `, [mergeInfo.user1_id, mergeInfo.user2_id]);
    
    // Determine hero image (prefer the first user's, then second user's)
    const [heroImages] = await pool.execute(`
      SELECT hero_image_filename 
      FROM users 
      WHERE id IN (?, ?) AND hero_image_filename IS NOT NULL
      ORDER BY FIELD(id, ?, ?)
      LIMIT 1
    `, [mergeInfo.user1_id, mergeInfo.user2_id, mergeInfo.user1_id, mergeInfo.user2_id]);
    
    let imageUrl = `${baseUrl}/fojourn-icon.png`; // Default fallback
    if (heroImages.length > 0) {
      imageUrl = `${baseUrl}/api/auth/hero-image/${heroImages[0].hero_image_filename}`;
    }
    
    const user1Name = mergeInfo.user1_first_name || mergeInfo.user1_username;
    const user2Name = mergeInfo.user2_first_name || mergeInfo.user2_username;
    const displayName = `${user1Name} & ${user2Name}`;
    
    // Combined bio from both users
    const [bios] = await pool.execute(`
      SELECT profile_bio, first_name 
      FROM users 
      WHERE id IN (?, ?) AND profile_bio IS NOT NULL AND profile_bio != ''
    `, [mergeInfo.user1_id, mergeInfo.user2_id]);
    
    let description = `Travel memories and adventures from ${displayName}.`;
    if (bios.length > 0) {
      description = bios.map(bio => `${bio.first_name}: ${bio.profile_bio}`).join(' | ');
    }
    
    const memoriesText = stats[0].total_memories === 1 ? 'memory' : 'memories';
    description += ` ${stats[0].total_memories} shared travel ${memoriesText}.`;
    
    const title = `${displayName} - Fojourn`;
    const url = `${baseUrl}/u/${mergeInfo.merge_slug}`;
    
    console.log('📋 Generated merged profile meta data:');
    console.log('- Title:', title);
    console.log('- Description:', description);
    console.log('- Image URL:', imageUrl);
    console.log('- Profile URL:', url);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    
    <!-- Open Graph meta tags for Facebook sharing -->
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="400" />
    <meta property="og:site_name" content="Fojourn - Travel Memory Journal" />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${url}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    
    <title>${title}</title>
    
    <!-- Auto-redirect for human users -->
    <script>
        const userAgent = navigator.userAgent.toLowerCase();
        const isBot = /bot|crawler|spider|facebook|twitter|linkedin|whatsapp|telegram/i.test(userAgent);
        
        if (!isBot && typeof window !== 'undefined') {
            setTimeout(() => {
                window.location.href = '${url}';
            }, 1000);
        }
    </script>
</head>
<body>
    <div style="padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
        <h1 style="color: #1976d2; margin-bottom: 20px;">${displayName}</h1>
        <p style="color: #666; font-size: 18px; line-height: 1.6; margin-bottom: 30px;">${description}</p>
        ${heroImages.length > 0 ? `<img src="${imageUrl}" alt="${displayName}'s Hero Image" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 30px;" />` : ''}
        <p style="color: #888; font-size: 14px;">You will be redirected to the full profile shortly...</p>
    </div>
</body>
</html>`;

    return res.send(html);
    
  } catch (error) {
    console.error('Error serving merged profile:', error);
    throw error;
  }
}

// Serve choice page for unmerged accounts
async function serveUnmergedChoicePage(redirect, req, res) {
  try {
    const baseUrl = 'https://fojourn.site';
    
    // Get info about both users
    const [users] = await pool.execute(`
      SELECT id, username, public_username, first_name, last_name, profile_bio, hero_image_filename, profile_public
      FROM users 
      WHERE id IN (?, ?)
    `, [redirect.user1_id, redirect.user2_id]);
    
    if (users.length !== 2) {
      throw new Error('Could not find both users for unmerged choice page');
    }
    
    const user1 = users.find(u => u.id === redirect.user1_id);
    const user2 = users.find(u => u.id === redirect.user2_id);
    
    const title = `Choose Profile - ${user1.first_name} ${user1.last_name} or ${user2.first_name} ${user2.last_name}`;
    const description = `This travel profile was previously shared by ${user1.first_name} and ${user2.first_name}. Choose which individual profile you'd like to visit.`;
    const url = `${baseUrl}/u/${redirect.merge_slug}`;
    
    // Use the first available hero image as fallback
    let imageUrl = `${baseUrl}/fojourn-icon.png`;
    const userWithHero = users.find(u => u.hero_image_filename);
    if (userWithHero) {
      imageUrl = `${baseUrl}/api/auth/hero-image/${userWithHero.hero_image_filename}`;
    }
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    
    <!-- Open Graph meta tags -->
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:site_name" content="Fojourn - Travel Memory Journal" />
    
    <title>${title}</title>
    
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background-color: #f5f5f5;
        }
        .choice-container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .header h1 {
            color: #1976d2;
            margin-bottom: 10px;
        }
        .header p {
            color: #666;
            font-size: 18px;
            line-height: 1.6;
        }
        .profiles {
            display: flex;
            gap: 30px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .profile-card {
            flex: 1;
            min-width: 250px;
            max-width: 300px;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            border: 2px solid transparent;
            transition: all 0.3s ease;
            text-decoration: none;
            color: inherit;
        }
        .profile-card:hover {
            border-color: #1976d2;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(25, 118, 210, 0.15);
        }
        .profile-card h3 {
            color: #1976d2;
            margin: 0 0 15px 0;
            font-size: 24px;
        }
        .profile-card p {
            color: #666;
            font-size: 16px;
            line-height: 1.5;
            margin: 0;
        }
        .unavailable {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .unavailable:hover {
            border-color: transparent;
            transform: none;
            box-shadow: none;
        }
        .note {
            text-align: center;
            margin-top: 30px;
            color: #888;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="choice-container">
        <div class="header">
            <h1>Choose a Profile</h1>
            <p>${description}</p>
        </div>
        
        <div class="profiles">
            ${user1.profile_public ? `
                <a href="/u/${user1.public_username || user1.username}" class="profile-card">
                    <h3>${user1.first_name} ${user1.last_name}</h3>
                    <p>${user1.profile_bio || `${user1.first_name}'s travel memories and adventures.`}</p>
                </a>
            ` : `
                <div class="profile-card unavailable">
                    <h3>${user1.first_name} ${user1.last_name}</h3>
                    <p>Profile not publicly available</p>
                </div>
            `}
            
            ${user2.profile_public ? `
                <a href="/u/${user2.public_username || user2.username}" class="profile-card">
                    <h3>${user2.first_name} ${user2.last_name}</h3>
                    <p>${user2.profile_bio || `${user2.first_name}'s travel memories and adventures.`}</p>
                </a>
            ` : `
                <div class="profile-card unavailable">
                    <h3>${user2.first_name} ${user2.last_name}</h3>
                    <p>Profile not publicly available</p>
                </div>
            `}
        </div>
        
        <div class="note">
            <p>These accounts were previously merged but have since been separated.</p>
        </div>
    </div>
</body>
</html>`;

    return res.send(html);
    
  } catch (error) {
    console.error('Error serving unmerged choice page:', error);
    throw error;
  }
}

module.exports = {
  handleMergedProfileRequest,
  serveMergedProfile,
  serveUnmergedChoicePage
};