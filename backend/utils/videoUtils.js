const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs').promises;

// Set the path to the ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Generate a thumbnail from a video file
 * @param {string} videoPath - Path to the video file
 * @param {string} outputPath - Path where thumbnail should be saved
 * @param {object} options - Thumbnail generation options
 * @returns {Promise<string>} - Path to generated thumbnail
 */
const generateVideoThumbnail = async (videoPath, outputPath, options = {}) => {
  const {
    timeOffset = 1, // Time in seconds to capture thumbnail
    width = 320,
    height = 180,
    quality = 2 // FFmpeg quality scale (1-31, lower is better)
  } = options;

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timeOffset)
      .frames(1)
      .size(`${width}x${height}`)
      .outputOptions([
        '-q:v', quality.toString(),
        '-f', 'image2'
      ])
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        console.log('Thumbnail generation progress:', progress.percent + '%');
      })
      .on('end', () => {
        console.log('Thumbnail generated successfully:', outputPath);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
};

/**
 * Get video metadata
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<object>} - Video metadata
 */
const getVideoMetadata = async (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });
};

/**
 * Get video duration in seconds
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<number>} - Duration in seconds
 */
const getVideoDuration = async (videoPath) => {
  try {
    const metadata = await getVideoMetadata(videoPath);
    return metadata.format.duration;
  } catch (error) {
    console.error('Error getting video duration:', error);
    throw error;
  }
};

/**
 * Generate thumbnail filename from video filename
 * @param {string} videoFileName - Original video filename
 * @returns {string} - Thumbnail filename
 */
const getThumbnailFileName = (videoFileName) => {
  const extension = path.extname(videoFileName);
  const baseName = path.basename(videoFileName, extension);
  return `${baseName}_thumb.jpg`;
};

/**
 * Check if a file is a video file based on mime type
 * @param {string} mimeType - File mime type
 * @returns {boolean} - True if video file
 */
const isVideoFile = (mimeType) => {
  return mimeType && mimeType.startsWith('video/');
};

module.exports = {
  generateVideoThumbnail,
  getVideoMetadata,
  getVideoDuration,
  getThumbnailFileName,
  isVideoFile
};
