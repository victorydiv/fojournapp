const fs = require('fs');
const path = require('path');

/**
 * Generate a URL-friendly slug from a title
 */
function generateSlug(title, id) {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  
  return `${baseSlug}-${id}`;
}

/**
 * Copy media files to public directory when memory is made public
 */
async function copyMediaToPublic(entryId, userId, mediaFiles) {
  const publicUserDir = path.join(__dirname, '../public/users', userId.toString());
  const publicMemoryDir = path.join(publicUserDir, 'memories', entryId.toString());
  
  // Also copy to Apache public directory for production
  const apachePublicDir = process.env.NODE_ENV === 'production' 
    ? '/home/victorydiv24/fojourn.site/public'
    : path.join(__dirname, '../public'); // Use same directory in development
  const apacheUserDir = path.join(apachePublicDir, 'users', userId.toString());
  const apacheMemoryDir = path.join(apacheUserDir, 'memories', entryId.toString());
  
  // Create directories if they don't exist
  await fs.promises.mkdir(publicMemoryDir, { recursive: true });
  await fs.promises.mkdir(apacheMemoryDir, { recursive: true });
  
  for (const file of mediaFiles) {
    if (!file.file_name) {
      console.error('Error: file.file_name is undefined for file:', file);
      continue; // Skip this file
    }
    
    const sourcePath = path.join(__dirname, '../uploads', file.file_name);
    const destPath = path.join(publicMemoryDir, file.file_name);
    const apacheDestPath = path.join(apacheMemoryDir, file.file_name);
    
    try {
      // Copy to Node.js public directory
      await fs.promises.copyFile(sourcePath, destPath);
      console.log(`Copied ${file.file_name} to Node.js public directory`);
      
      // Copy to Apache public directory
      await fs.promises.copyFile(sourcePath, apacheDestPath);
      console.log(`Copied ${file.file_name} to Apache public directory`);
    } catch (error) {
      console.error(`Error copying ${file.file_name}:`, error);
    }
  }
}

/**
 * Remove media files from public directory when memory is made private
 */
async function removeMediaFromPublic(entryId, userId) {
  const publicMemoryDir = path.join(__dirname, '../public/users', userId.toString(), 'memories', entryId.toString());
  
  // Also remove from Apache public directory
  const apachePublicDir = process.env.NODE_ENV === 'production' 
    ? '/home/victorydiv24/fojourn.site/public'
    : path.join(__dirname, '../public'); // Use same directory in development
  const apacheMemoryDir = path.join(apachePublicDir, 'users', userId.toString(), 'memories', entryId.toString());
  
  try {
    await fs.promises.rmdir(publicMemoryDir, { recursive: true });
    console.log(`Removed public media for memory ${entryId} from Node.js directory`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Error removing Node.js public media for memory ${entryId}:`, error);
    }
  }
  
  try {
    await fs.promises.rmdir(apacheMemoryDir, { recursive: true });
    console.log(`Removed public media for memory ${entryId} from Apache directory`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Error removing Apache public media for memory ${entryId}:`, error);
    }
  }
}

/**
 * Copy avatar to public directory when profile is made public
 */
async function copyAvatarToPublic(userId, avatarFilename) {
  if (!avatarFilename) return;
  
  const publicUserDir = path.join(__dirname, '../public/users', userId.toString());
  const publicAvatarDir = path.join(publicUserDir, 'avatar');
  
  // Also copy to Apache public directory for production
  const apachePublicDir = process.env.NODE_ENV === 'production' 
    ? '/home/victorydiv24/fojourn.site/public'
    : path.join(__dirname, '../public'); // Use same directory in development
  const apacheAvatarDir = path.join(apachePublicDir, 'avatars');
  
  // Create directories if they don't exist
  await fs.promises.mkdir(publicAvatarDir, { recursive: true });
  await fs.promises.mkdir(apacheAvatarDir, { recursive: true });
  
  const sourcePath = path.join(__dirname, '../uploads/avatars', avatarFilename);
  const destPath = path.join(publicAvatarDir, avatarFilename);
  const apacheDestPath = path.join(apacheAvatarDir, avatarFilename);
  
  try {
    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      console.error(`Source avatar file does not exist: ${sourcePath}`);
      return;
    }

    // Copy to Node.js public directory
    await fs.promises.copyFile(sourcePath, destPath);
    console.log(`✅ Copied avatar ${avatarFilename} to Node.js public directory`);
    
    // Copy to Apache public directory
    await fs.promises.copyFile(sourcePath, apacheDestPath);
    console.log(`✅ Copied avatar ${avatarFilename} to Apache public directory`);
    
    // Verify the copy was successful
    if (fs.existsSync(apacheDestPath)) {
      console.log(`✅ Verified avatar ${avatarFilename} exists in Apache public directory`);
    } else {
      console.error(`❌ Avatar ${avatarFilename} copy verification failed`);
    }
  } catch (error) {
    console.error(`❌ Error copying avatar ${avatarFilename}:`, error);
    console.error(`Source: ${sourcePath}`);
    console.error(`Destinations: ${destPath}, ${apacheDestPath}`);
  }
}

/**
 * Remove avatar from public directory when profile is made private
 */
async function removeAvatarFromPublic(userId) {
  const publicAvatarDir = path.join(__dirname, '../public/users', userId.toString(), 'avatar');
  
  // Also remove from Apache public directory  
  const apachePublicDir = process.env.NODE_ENV === 'production' 
    ? '/home/victorydiv24/fojourn.site/public'
    : path.join(__dirname, '../public'); // Use same directory in development
  const apacheAvatarDir = path.join(apachePublicDir, 'avatars');
  
  try {
    await fs.promises.rmdir(publicAvatarDir, { recursive: true });
    console.log(`Removed public avatar for user ${userId} from Node.js directory`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Error removing Node.js public avatar for user ${userId}:`, error);
    }
  }
  
  // Note: We don't remove individual files from Apache avatars directory
  // since multiple users might have avatars there
}

module.exports = {
  generateSlug,
  copyMediaToPublic,
  removeMediaFromPublic,
  copyAvatarToPublic,
  removeAvatarFromPublic
};
