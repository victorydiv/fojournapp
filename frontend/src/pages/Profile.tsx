import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Fade,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Divider,
  Stack,
  Switch,
  FormControlLabel,
  Chip
} from '@mui/material';
import {
  PhotoCamera,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
  Public as PublicIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { backgroundStyles, componentStyles } from '../theme/fojournTheme';
import { authAPI } from '../services/api';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for editing profile
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || ''
  });

  // State for editing public profile
  const [isEditingPublicProfile, setIsEditingPublicProfile] = useState(false);
  const [publicProfileData, setPublicProfileData] = useState({
    profileBio: user?.profileBio || '',
    profilePublic: user?.profilePublic || false
  });

  // State for password change
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // State for notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // State for loading
  const [isLoading, setIsLoading] = useState(false);

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showSnackbar('File size must be less than 5MB', 'error');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showSnackbar('Only image files are allowed (JPEG, PNG, GIF, WebP)', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await authAPI.uploadAvatar(formData);
      
      // Update user context with new avatar path and filename
      if (user) {
        const updatedUser = {
          ...user,
          avatarPath: response.data.avatarPath,
          avatarFilename: response.data.avatarFilename
        };
        updateUser(updatedUser);
      }

      showSnackbar('Avatar updated successfully!');
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Failed to upload avatar', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setIsLoading(true);
    try {
      await authAPI.updateProfile(profileData);
      
      // Update user context
      if (user) {
        const updatedUser = {
          ...user,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email
        };
        updateUser(updatedUser);
      }

      setIsEditingProfile(false);
      showSnackbar('Profile updated successfully!');
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showSnackbar('New passwords do not match', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showSnackbar('New password must be at least 6 characters', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordDialogOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSnackbar('Password changed successfully!');
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublicProfileSave = async () => {
    setIsLoading(true);
    try {
      await authAPI.updateProfile(publicProfileData);
      
      // Update user context
      if (user) {
        const updatedUser = {
          ...user,
          profileBio: publicProfileData.profileBio,
          profilePublic: publicProfileData.profilePublic
        };
        updateUser(updatedUser);
      }

      setIsEditingPublicProfile(false);
      showSnackbar('Public profile settings updated successfully!');
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Failed to update public profile settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyProfileLink = () => {
    const profileUrl = `${window.location.origin}/u/${user?.username}`;
    navigator.clipboard.writeText(profileUrl);
    showSnackbar('Profile link copied to clipboard!');
  };

  const handleOpenPublicProfile = () => {
    const profileUrl = `${window.location.origin}/u/${user?.username}`;
    window.open(profileUrl, '_blank');
  };

  const getAvatarUrl = () => {
    if (user?.avatarPath && user?.avatarFilename) {
      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      // Use the API base URL for consistent environment handling
      return `${apiBaseUrl}/auth/avatar/${user.avatarFilename}${token ? `?token=${token}` : ''}`;
    }
    return undefined;
  };

  const getUserInitials = () => {
    const firstName = user?.firstName || '';
    const lastName = user?.lastName || '';
    const username = user?.username || '';
    
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  };

  const cardStyle = {
    ...componentStyles.contentCard,
    padding: 3,
    margin: 0,
    maxWidth: 'none',
    width: '100%',
  };

  return (
    <Box sx={backgroundStyles.secondary}>
      <Fade in timeout={800}>
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            User Profile
          </Typography>

          <Stack spacing={3}>
            {/* Avatar Section */}
            <Card sx={cardStyle}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                  <Avatar
                    src={getAvatarUrl()}
                    imgProps={{ crossOrigin: 'anonymous' }}
                    sx={{ 
                      width: 120, 
                      height: 120, 
                      fontSize: '2rem',
                      margin: '0 auto',
                      cursor: 'pointer'
                    }}
                    onClick={handleAvatarClick}
                  >
                    {getUserInitials()}
                  </Avatar>
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    }}
                    onClick={handleAvatarClick}
                    disabled={isLoading}
                  >
                    <PhotoCamera />
                  </IconButton>
                </Box>
                <Typography variant="h6">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user?.username
                  }
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  @{user?.username}
                </Typography>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleAvatarUpload}
                />
              </CardContent>
            </Card>

            {/* Profile Information */}
            <Card sx={cardStyle}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Profile Information</Typography>
                  {!isEditingProfile && (
                    <Button
                      startIcon={<EditIcon />}
                      onClick={() => setIsEditingProfile(true)}
                      variant="outlined"
                    >
                      Edit
                    </Button>
                  )}
                </Box>

                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                      disabled={!isEditingProfile || isLoading}
                      variant="outlined"
                    />
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                      disabled={!isEditingProfile || isLoading}
                      variant="outlined"
                    />
                  </Stack>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditingProfile || isLoading}
                    variant="outlined"
                  />
                  <TextField
                    fullWidth
                    label="Username"
                    value={user?.username || ''}
                    disabled
                    variant="outlined"
                    helperText="Username cannot be changed"
                  />
                </Stack>

                {/* Action Buttons - Only show when editing */}
                {isEditingProfile && (
                  <Stack 
                    spacing={2}
                    sx={{ 
                      mt: 3, 
                      width: '100%'
                    }}
                  >
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleProfileSave}
                      disabled={isLoading}
                      fullWidth
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={() => {
                        setIsEditingProfile(false);
                        setProfileData({
                          firstName: user?.firstName || '',
                          lastName: user?.lastName || '',
                          email: user?.email || ''
                        });
                      }}
                      fullWidth
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<LockIcon />}
                      onClick={() => setPasswordDialogOpen(true)}
                      fullWidth
                    >
                      Change Password
                    </Button>
                  </Stack>
                )}

                {/* Security section - Only show when not editing */}
                {!isEditingProfile && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Box>
                      <Typography variant="h6" gutterBottom>Security</Typography>
                      <Button
                        startIcon={<LockIcon />}
                        onClick={() => setPasswordDialogOpen(true)}
                        variant="outlined"
                        color="secondary"
                      >
                        Change Password
                      </Button>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Public Profile Settings */}
            <Card sx={cardStyle}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PublicIcon color="primary" />
                    <Typography variant="h6">Public Profile</Typography>
                    {publicProfileData.profilePublic && (
                      <Chip
                        label="Public"
                        color="success"
                        size="small"
                      />
                    )}
                  </Stack>
                  {!isEditingPublicProfile && (
                    <Button
                      startIcon={<EditIcon />}
                      onClick={() => setIsEditingPublicProfile(true)}
                      variant="outlined"
                    >
                      Edit
                    </Button>
                  )}
                </Box>

                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={publicProfileData.profilePublic}
                        onChange={(e) => setPublicProfileData(prev => ({ ...prev, profilePublic: e.target.checked }))}
                        disabled={!isEditingPublicProfile || isLoading}
                      />
                    }
                    label="Make my profile public"
                  />
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {publicProfileData.profilePublic 
                      ? 'Your profile is publicly visible. Others can view your shared travel memories.'
                      : 'Your profile is private. Only you can see your travel memories.'
                    }
                  </Typography>

                  <TextField
                    fullWidth
                    label="Bio"
                    multiline
                    rows={4}
                    placeholder="Tell others about your travel adventures..."
                    value={publicProfileData.profileBio}
                    onChange={(e) => setPublicProfileData(prev => ({ ...prev, profileBio: e.target.value }))}
                    disabled={!isEditingPublicProfile || isLoading}
                    variant="outlined"
                    helperText={`${publicProfileData.profileBio.length}/500 characters`}
                    inputProps={{ maxLength: 500 }}
                  />

                  {publicProfileData.profilePublic && user?.username && (
                    <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" gutterBottom>
                        Your public profile URL:
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all' }}>
                          {window.location.origin}/u/{user.username}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={handleCopyProfileLink}
                          title="Copy link"
                        >
                          <CopyIcon />
                        </IconButton>
                        <Button
                          size="small"
                          startIcon={<ShareIcon />}
                          onClick={handleOpenPublicProfile}
                          variant="outlined"
                        >
                          View
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </Stack>

                {/* Action Buttons - Only show when editing */}
                {isEditingPublicProfile && (
                  <Stack 
                    spacing={2}
                    sx={{ 
                      mt: 3, 
                      width: '100%'
                    }}
                  >
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handlePublicProfileSave}
                      disabled={isLoading}
                      fullWidth
                    >
                      {isLoading ? 'Saving...' : 'Save Public Profile Settings'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={() => {
                        setIsEditingPublicProfile(false);
                        setPublicProfileData({
                          profileBio: user?.profileBio || '',
                          profilePublic: user?.profilePublic || false
                        });
                      }}
                      fullWidth
                    >
                      Cancel
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>

          {/* Password Change Dialog */}
          <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Change Password</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  fullWidth
                  label="Current Password"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                />
                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  helperText="Minimum 6 characters"
                />
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handlePasswordChange}
                variant="contained"
                disabled={isLoading || !passwordData.currentPassword || !passwordData.newPassword}
              >
                Change Password
              </Button>
            </DialogActions>
          </Dialog>

          {/* Snackbar for notifications */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          >
            <Alert
              onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
              severity={snackbar.severity}
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>
      </Fade>
    </Box>
  );
};

export default Profile;
