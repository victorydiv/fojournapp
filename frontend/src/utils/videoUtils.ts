/**
 * Video utilities for thumbnail generation and processing
 */

export interface VideoThumbnail {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

/**
 * Generate a thumbnail from a video file
 * @param file - The video file
 * @param timeOffset - Time in seconds to capture thumbnail (default: 1 second)
 * @param quality - JPEG quality (0.1 to 1.0, default: 0.8)
 * @param maxWidth - Maximum thumbnail width (default: 320px)
 * @param maxHeight - Maximum thumbnail height (default: 180px)
 * @returns Promise<VideoThumbnail>
 */
export const generateVideoThumbnail = async (
  file: File,
  timeOffset: number = 1,
  quality: number = 0.8,
  maxWidth: number = 320,
  maxHeight: number = 180
): Promise<VideoThumbnail> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    video.addEventListener('loadedmetadata', () => {
      // Calculate thumbnail dimensions maintaining aspect ratio
      const aspectRatio = video.videoWidth / video.videoHeight;
      let thumbnailWidth = maxWidth;
      let thumbnailHeight = maxHeight;

      if (aspectRatio > maxWidth / maxHeight) {
        // Video is wider than target aspect ratio
        thumbnailHeight = maxWidth / aspectRatio;
      } else {
        // Video is taller than target aspect ratio
        thumbnailWidth = maxHeight * aspectRatio;
      }

      canvas.width = thumbnailWidth;
      canvas.height = thumbnailHeight;
    });

    video.addEventListener('seeked', () => {
      try {
        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const thumbnailUrl = URL.createObjectURL(blob);
              resolve({
                blob,
                url: thumbnailUrl,
                width: canvas.width,
                height: canvas.height,
              });
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        reject(error);
      }
    });

    video.addEventListener('error', (e) => {
      reject(new Error(`Video loading error: ${e.message || 'Unknown error'}`));
    });

    // Set up video
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.currentTime = timeOffset;

    // Load the video file
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;

    // Clean up on completion or error
    const cleanup = () => {
      URL.revokeObjectURL(videoUrl);
      video.remove();
      canvas.remove();
    };

    // Set a timeout to prevent hanging
    setTimeout(() => {
      cleanup();
      reject(new Error('Video thumbnail generation timeout'));
    }, 10000); // 10 second timeout

    video.load();
  });
};

/**
 * Check if a file is a video file
 * @param file - The file to check
 * @returns boolean
 */
export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};

/**
 * Get video duration
 * @param file - The video file
 * @returns Promise<number> - Duration in seconds
 */
export const getVideoDuration = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    
    video.addEventListener('loadedmetadata', () => {
      resolve(video.duration);
      URL.revokeObjectURL(video.src);
      video.remove();
    });

    video.addEventListener('error', (e) => {
      reject(new Error(`Video loading error: ${e.message || 'Unknown error'}`));
      URL.revokeObjectURL(video.src);
      video.remove();
    });

    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.load();
  });
};

/**
 * Format duration in mm:ss format
 * @param seconds - Duration in seconds
 * @returns string - Formatted duration
 */
export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
