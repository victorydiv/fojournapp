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
  
  // Create directories if they don't exist
  await fs.promises.mkdir(publicMemoryDir, { recursive: true });
  
  for (const file of mediaFiles) {
    if (!file.file_name) {
      console.error('Error: file.file_name is undefined for file:', file);
      continue; // Skip this file
    }
    
    const sourcePath = path.join(__dirname, '../uploads', file.file_name);
    const destPath = path.join(publicMemoryDir, file.file_name);
    
    try {
      await fs.promises.copyFile(sourcePath, destPath);
      console.log(`Copied ${file.file_name} to public directory`);
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
  
  try {
    await fs.promises.rmdir(publicMemoryDir, { recursive: true });
    console.log(`Removed public media for memory ${entryId}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Error removing public media for memory ${entryId}:`, error);
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
  
  // Create directories if they don't exist
  await fs.promises.mkdir(publicAvatarDir, { recursive: true });
  
  const sourcePath = path.join(__dirname, '../uploads/avatars', avatarFilename);
  const destPath = path.join(publicAvatarDir, avatarFilename);
  
  try {
    await fs.promises.copyFile(sourcePath, destPath);
    console.log(`Copied avatar ${avatarFilename} to public directory`);
  } catch (error) {
    console.error(`Error copying avatar ${avatarFilename}:`, error);
  }
}

/**
 * Remove avatar from public directory when profile is made private
 */
async function removeAvatarFromPublic(userId) {
  const publicAvatarDir = path.join(__dirname, '../public/users', userId.toString(), 'avatar');
  
  try {
    await fs.promises.rmdir(publicAvatarDir, { recursive: true });
    console.log(`Removed public avatar for user ${userId}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Error removing public avatar for user ${userId}:`, error);
    }
  }
}

module.exports = {
  generateSlug,
  copyMediaToPublic,
  removeMediaFromPublic,
  copyAvatarToPublic,
  removeAvatarFromPublic
};
