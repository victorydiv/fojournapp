import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  CircularProgress,
  Alert,
  Fade,
} from '@mui/material';
import {
  Share as ShareIcon,
  Facebook as FacebookIcon,
  ContentCopy as CopyIcon,
  X as TwitterIcon,
} from '@mui/icons-material';
import { TravelEntry } from '../types';
import { shareAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface SocialShareProps {
  entry: TravelEntry;
  variant?: 'button' | 'icon';
  size?: 'small' | 'medium' | 'large';
}

interface ShareData {
  url: string;
  text: string;
  imageUrl?: string;
  platforms?: {
    facebook: { text: string; url: string };
    twitter: { text: string; url: string; hashtags: string[] };
  };
}

const SocialShare: React.FC<SocialShareProps> = ({ 
  entry, 
  variant = 'icon', 
  size = 'medium' 
}) => {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const generateShareContent = async (): Promise<ShareData> => {
    try {
      setLoading(true);
      
      // Determine the URL to share based on whether the memory is public
      let shareUrl: string;
      
      if (entry.isPublic && entry.publicSlug && user?.username) {
        // Use public memory URL for public memories
        shareUrl = `${window.location.origin}/u/${user.username}/memory/${entry.publicSlug}`;
      } else {
        // Use private entry URL for private memories (fallback)
        shareUrl = `${window.location.origin}/entry/${entry.id}`;
      }
      
      try {
        const response = await shareAPI.getShareContent(entry.id);
        
        return {
          url: shareUrl, // Use the determined URL (public or private)
          text: response.data.shareText,
          imageUrl: response.data.imageUrl,
          platforms: response.data.platforms
        };
      } catch (apiError) {
        console.error('Failed to get share content from API, using fallback:', apiError);
        // Fallback to local generation
        
        // Create share text
        const locationText = entry.locationName ? ` at ${entry.locationName}` : '';
        const dateText = new Date(entry.entryDate).toLocaleDateString();
        const shareText = `Check out my travel memory: "${entry.title}"${locationText} from ${dateText}`;
        
        // Get the first image from media if available
        const firstImage = entry.media?.find(media => media.fileType === 'image');
        
        return {
          url: shareUrl,
          text: shareText,
          imageUrl: firstImage?.url
        };
      }
    } catch (error) {
      console.error('Error in generateShareContent:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleShareClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleFacebookShare = async () => {
    try {
      setLoading(true);
      const shareData = await generateShareContent();
      
      console.log('Facebook Share Debug:');
      console.log('- Share Data:', shareData);
      console.log('- Entry Title:', entry.title);
      console.log('- Share Text:', shareData.text);
      console.log('- Image URL:', shareData.imageUrl);
      
      // Always use the production-ready share page URL for Facebook
      // This ensures proper Open Graph meta tags and image sharing
      const sharePageUrl = shareData.url;
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sharePageUrl)}`;
      
      console.log('Facebook URL:', facebookUrl);
      window.open(facebookUrl, '_blank', 'width=600,height=500,scrollbars=yes,resizable=yes');
      
      setSnackbarMessage('Opening Facebook share dialog...');
      setSnackbarOpen(true);
      setTimeout(() => setSnackbarOpen(false), 3000);
    } catch (error) {
      console.error('Failed to generate share content:', error);
      setSnackbarMessage('Failed to generate share content');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  const handleTwitterShare = async () => {
    try {
      setLoading(true);
      const shareData = await generateShareContent();
      
      console.log('Twitter Share Debug:', shareData);
      
      // Create Twitter share URL
      const twitterText = shareData.platforms?.twitter?.text || shareData.text;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(shareData.url)}`;
      
      console.log('Twitter URL:', twitterUrl);
      window.open(twitterUrl, '_blank', 'width=600,height=500,scrollbars=yes,resizable=yes');
      
      setSnackbarMessage('Opening Twitter share dialog...');
      setSnackbarOpen(true);
      setTimeout(() => setSnackbarOpen(false), 3000);
    } catch (error) {
      console.error('Failed to generate share content:', error);
      setSnackbarMessage('Failed to generate share content');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  const handleInstagramShare = async () => {
    // Instagram sharing has been removed as it's not officially supported
    setSnackbarMessage('Instagram sharing is no longer available');
    setSnackbarOpen(true);
    setTimeout(() => setSnackbarOpen(false), 3000);
    handleClose();
  };

  const handleCopyLink = async () => {
    try {
      setLoading(true);
      const shareData = await generateShareContent();
      await navigator.clipboard.writeText(shareData.url);
      setSnackbarMessage('Link copied to clipboard!');
      setSnackbarOpen(true);
      setTimeout(() => setSnackbarOpen(false), 3000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      setSnackbarMessage('Failed to copy link');
      setSnackbarOpen(true);
      setTimeout(() => setSnackbarOpen(false), 3000);
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        setLoading(true);
        const shareData = await generateShareContent();
        await navigator.share({
          title: entry.title,
          text: shareData.text,
          url: shareData.url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      } finally {
        setLoading(false);
        handleClose();
      }
    }
  };

  const formatShareText = (shareData: ShareData) => {
    return `${shareData.text}\n\n${shareData.url}\n\n#TravelMemories #${entry.memoryType || 'Travel'}`;
  };

  const renderShareButton = () => {
    if (variant === 'button') {
      return (
        <Button
          variant="outlined"
          startIcon={<ShareIcon />}
          onClick={handleShareClick}
          size={size}
        >
          Share
        </Button>
      );
    }

    return (
      <IconButton 
        onClick={handleShareClick}
        size={size}
        color="primary"
      >
        <ShareIcon />
      </IconButton>
    );
  };

  return (
    <>
      {renderShareButton()}
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleFacebookShare} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={20} /> : <FacebookIcon sx={{ color: '#1877F2' }} />}
          </ListItemIcon>
          <ListItemText>Share to Facebook</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleTwitterShare} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={20} /> : <TwitterIcon sx={{ color: '#000000' }} />}
          </ListItemIcon>
          <ListItemText>Share to X (Twitter)</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleCopyLink} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={20} /> : <CopyIcon />}
          </ListItemIcon>
          <ListItemText>Copy Link</ListItemText>
        </MenuItem>
        
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <MenuItem onClick={handleNativeShare} disabled={loading}>
            <ListItemIcon>
              {loading ? <CircularProgress size={20} /> : <ShareIcon />}
            </ListItemIcon>
            <ListItemText>Share...</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Simple notification instead of problematic Snackbar */}
      <Fade in={snackbarOpen}>
        <Alert 
          severity="info"
          onClose={() => setSnackbarOpen(false)}
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            left: '50%', 
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: snackbarOpen ? 'flex' : 'none'
          }}
        >
          {snackbarMessage}
        </Alert>
      </Fade>
    </>
  );
};

export default SocialShare;
