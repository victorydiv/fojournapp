import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  Share as ShareIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { TravelEntry } from '../types';
import { shareAPI } from '../services/api';

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
    instagram: { caption: string; hashtags: string[] };
    twitter: { text: string; url: string; hashtags: string[] };
  };
}

const SocialShare: React.FC<SocialShareProps> = ({ 
  entry, 
  variant = 'icon', 
  size = 'medium' 
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const generateShareContent = async (): Promise<ShareData> => {
    try {
      setLoading(true);
      const response = await shareAPI.getShareContent(entry.id);
      
      // Use the backend share page URL for social media sharing (has Open Graph meta tags)
      const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const sharePageUrl = `${baseUrl.replace('/api', '')}/api/share/page/${entry.id}`;
      
      return {
        url: sharePageUrl, // Use the share page URL for Facebook
        text: response.data.shareText,
        imageUrl: response.data.imageUrl,
        platforms: response.data.platforms
      };
    } catch (error) {
      console.error('Failed to get share content from API, using fallback:', error);
      // Fallback to local generation
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/entry/${entry.id}`;
      
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
      
      // Check if we're in development (localhost)
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isLocalhost) {
        // For localhost development, create a rich Facebook post manually
        // Use the quote parameter to include our content
        const shareUrl = window.location.href; // Current page URL
        const shareText = `🎯 ${entry.title}\n\n${shareData.text}`;
        
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?` +
          `u=${encodeURIComponent(shareUrl)}` +
          `&quote=${encodeURIComponent(shareText)}`;
        
        console.log('Facebook URL (localhost):', facebookUrl);
        window.open(facebookUrl, '_blank', 'width=600,height=500,scrollbars=yes,resizable=yes');
        
        // Show a helpful message
        setSnackbarMessage('💡 Tip: In development, Facebook can\'t see images. The share page will work in production!');
        setSnackbarOpen(true);
      } else {
        // For production, use the share page with Open Graph meta tags
        const sharePageUrl = shareData.url;
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sharePageUrl)}`;
        
        console.log('Facebook URL (production):', facebookUrl);
        window.open(facebookUrl, '_blank', 'width=600,height=500,scrollbars=yes,resizable=yes');
      }
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
    try {
      setLoading(true);
      const shareContent = await generateShareContent();
      setShareData(shareContent);
      setShareDialogOpen(true);
    } catch (error) {
      console.error('Failed to generate share content:', error);
      setSnackbarMessage('Failed to generate share content');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  const handleCopyLink = async () => {
    try {
      setLoading(true);
      const shareData = await generateShareContent();
      await navigator.clipboard.writeText(shareData.url);
      setSnackbarMessage('Link copied to clipboard!');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to copy link:', error);
      setSnackbarMessage('Failed to copy link');
      setSnackbarOpen(true);
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
    if (shareData.platforms?.instagram) {
      const { caption, hashtags } = shareData.platforms.instagram;
      const hashtagString = hashtags.map(tag => `#${tag}`).join(' ');
      return `${caption}\n\n${shareData.url}\n\n${hashtagString}`;
    }
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
        
        <MenuItem onClick={handleInstagramShare} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={20} /> : <InstagramIcon sx={{ color: '#E4405F' }} />}
          </ListItemIcon>
          <ListItemText>Share to Instagram</ListItemText>
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

      {/* Instagram Share Dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Share to Instagram</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Instagram doesn't support direct sharing from web apps. Copy the text below and paste it manually in your Instagram post.
          </Alert>
          
          {shareData && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Suggested Caption:
              </Typography>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.300',
                  mb: 2,
                }}
              >
                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                  {formatShareText(shareData)}
                </Typography>
              </Box>
              
              {shareData.imageUrl && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Image to share:
                  </Typography>
                  <Box
                    component="img"
                    src={shareData.imageUrl}
                    alt="Share image"
                    sx={{
                      width: '100%',
                      maxHeight: 300,
                      objectFit: 'cover',
                      borderRadius: 1,
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (shareData) {
                try {
                  await navigator.clipboard.writeText(
                    formatShareText(shareData)
                  );
                  setSnackbarMessage('Caption copied to clipboard!');
                  setSnackbarOpen(true);
                  setShareDialogOpen(false);
                } catch (error) {
                  console.error('Failed to copy caption:', error);
                  setSnackbarMessage('Failed to copy caption');
                  setSnackbarOpen(true);
                }
              }
            }}
            startIcon={<CopyIcon />}
          >
            Copy Caption
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </>
  );
};

export default SocialShare;
