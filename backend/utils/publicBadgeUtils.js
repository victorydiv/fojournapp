const fs = require('fs').promises;
const path = require('path');

/**
 * Copy a badge icon to the public directory for unauthenticated access
 * @param {string} sourceFilename - The filename of the source badge icon
 * @returns {Promise<string>} - The public filename
 */
async function copyBadgeToPublic(sourceFilename) {
  try {
    const sourcePath = path.join(__dirname, '../uploads/badges', sourceFilename);
    const publicDir = path.join(__dirname, '../uploads/public-badges');
    const publicPath = path.join(publicDir, sourceFilename);

    // Ensure public badges directory exists
    try {
      await fs.access(publicDir);
    } catch {
      await fs.mkdir(publicDir, { recursive: true });
    }

    // Copy the file
    await fs.copyFile(sourcePath, publicPath);
    
    console.log(`Badge icon copied to public: ${sourceFilename}`);
    return sourceFilename;
  } catch (error) {
    console.error('Error copying badge to public directory:', error);
    throw error;
  }
}

/**
 * Remove a badge icon from the public directory
 * @param {string} filename - The filename to remove
 */
async function removeBadgeFromPublic(filename) {
  try {
    const publicPath = path.join(__dirname, '../uploads/public-badges', filename);
    
    try {
      await fs.access(publicPath);
      await fs.unlink(publicPath);
      console.log(`Public badge icon removed: ${filename}`);
    } catch (error) {
      // File doesn't exist, which is fine
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error removing badge from public directory:', error);
  }
}

module.exports = {
  copyBadgeToPublic,
  removeBadgeFromPublic
};
