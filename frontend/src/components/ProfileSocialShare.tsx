import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  Divider
} from '@mui/material';
import {
  Share as ShareIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  ContentCopy as CopyIcon,
  Link as LinkIcon
} from '@mui/icons-material';

interface PublicUser {
  id: number;
  username: string;
  publicUsername?: string;
  firstName?: string;
  lastName?: string;
  profileBio?: string;
  avatarUrl?: string;
  heroImageUrl?: string;
  stats: {
    total_memories: number;
    featured_memories: number;
    earliest_memory?: string;
    latest_memory?: string;
  };
}

interface ProfileSocialShareProps {
  user: PublicUser;
  username: string;
}

interface ShareData {
  url: string;
  title: string;
  description: string;
  imageUrl?: string;
}

const ProfileSocialShare: React.FC<ProfileSocialShareProps> = ({ user, username }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const generateShareData = (): ShareData => {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    const displayName = fullName || user.publicUsername || user.username;
    
    const title = `${displayName}'s Travel Journey on Fojourn`;
    
    const description = user.profileBio || 
      `Check out ${displayName}'s amazing travel memories! They've shared ${user.stats.total_memories} travel experiences${user.stats.featured_memories > 0 ? ` with ${user.stats.featured_memories} featured highlights` : ''}.`;
    
    const url = window.location.href;
    
    // Use hero image if available, otherwise use avatar
    const imageUrl = user.heroImageUrl || user.avatarUrl;
    
    return {
      url,
      title,
      description,
      imageUrl
    };
  };

  const handleShareClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleFacebookShare = () => {
    try {
      setLoading(true);
      const shareData = generateShareData();
      
      console.log('Facebook Profile Share:', shareData);
      
      // Facebook shares the current page and reads Open Graph meta tags
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`;
      
      window.open(facebookUrl, '_blank', 'width=600,height=500,scrollbars=yes,resizable=yes');
      
      setSnackbarMessage('Opening Facebook share dialog...');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to share to Facebook:', error);
      setSnackbarMessage('Failed to share to Facebook');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  const handleTwitterShare = () => {
    try {
      setLoading(true);
      const shareData = generateShareData();
      
      const twitterText = `${shareData.title} - ${shareData.description}`;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(shareData.url)}`;
      
      window.open(twitterUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
      
      setSnackbarMessage('Opening Twitter share dialog...');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to share to Twitter:', error);
      setSnackbarMessage('Failed to share to Twitter');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  const handleCopyLink = async () => {
    try {
      const shareData = generateShareData();
      await navigator.clipboard.writeText(shareData.url);
      setSnackbarMessage('Profile link copied to clipboard!');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to copy link:', error);
      setSnackbarMessage('Failed to copy link');
      setSnackbarOpen(true);
    } finally {
      handleClose();
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        const shareData = generateShareData();
        await navigator.share({
          title: shareData.title,
          text: shareData.description,
          url: shareData.url,
        });
        setSnackbarMessage('Profile shared successfully!');
        setSnackbarOpen(true);
      } catch (error) {
        console.log('Native share cancelled or failed:', error);
      }
    }
    handleClose();
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<ShareIcon />}
        onClick={handleShareClick}
        size="large"
        disabled={loading}
      >
        Share Profile
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={handleFacebookShare} disabled={loading}>
          <ListItemIcon>
            <FacebookIcon sx={{ color: '#1877F2' }} />
          </ListItemIcon>
          <ListItemText>Share to Facebook</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleTwitterShare} disabled={loading}>
          <ListItemIcon>
            <TwitterIcon sx={{ color: '#1DA1F2' }} />
          </ListItemIcon>
          <ListItemText>Share to Twitter</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleCopyLink}>
          <ListItemIcon>
            <CopyIcon />
          </ListItemIcon>
          <ListItemText>Copy Link</ListItemText>
        </MenuItem>

        {'share' in navigator && (
          <MenuItem onClick={handleNativeShare}>
            <ListItemIcon>
              <LinkIcon />
            </ListItemIcon>
            <ListItemText>More Options</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProfileSocialShare;
