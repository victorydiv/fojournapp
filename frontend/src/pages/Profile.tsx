
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
  Chip,
  Tabs,
  Tab,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel
} from '@mui/material';
import {
  PhotoCamera,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
  Public as PublicIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  EmojiEvents as BadgeIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  CardTravel as TravelIcon,
  Image as ImageIcon,
  Group as GroupIcon,
  History as HistoryIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as DeclineIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { backgroundStyles, componentStyles } from '../theme/fojournTheme';
import { authAPI, emailPreferencesAPI, mergeAPI } from '../services/api';
import BadgeDisplay from '../components/BadgeDisplay';
import TravelInformation from '../components/TravelInformation';

// Types for merge functionality
interface MergeInvitation {
  id: number;
  inviter_username?: string; // For received invitations
  invited_username?: string; // For sent invitations
  created_at: string;
}

interface MergeStatus {
  isMerged: boolean;
  partnerUsername?: string;
  mergeSlug?: string;
  receivedInvitations?: MergeInvitation[];
}

interface MergeHistoryEntry {
  action: string;
  partner_username: string;
  action_at: string;
  merge_slug?: string;
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroImageInputRef = useRef<HTMLInputElement>(null);

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
    profilePublic: user?.profilePublic || false,
    publicUsername: user?.publicUsername || ''
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

  // State for tabs
  const [activeTab, setActiveTab] = useState(0);

  // State for email preferences
  const [emailPreferences, setEmailPreferences] = useState({
    notifications: true,
    marketing: true,
    announcements: true,
    lastUpdated: null as string | null
  });
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);

  // State for merge functionality
  const [mergeInviteUsername, setMergeInviteUsername] = useState('');
  const [mergeStatus, setMergeStatus] = useState<MergeStatus | null>(null);
  const [mergeHistory, setMergeHistory] = useState<MergeHistoryEntry[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<MergeInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<MergeInvitation[]>([]);
  const [isLoadingMerge, setIsLoadingMerge] = useState(false);

  // State for merge display settings
  const [mergeDisplaySettings, setMergeDisplaySettings] = useState<{
    avatar_display: 'user1' | 'user2';
    hero_image_display: 'user1' | 'user2';
    bio_display: 'user1' | 'user2' | 'combine';
  }>({
    avatar_display: 'user1',
    hero_image_display: 'user1',
    bio_display: 'combine'
  });
  const [isLoadingDisplaySettings, setIsLoadingDisplaySettings] = useState(false);

  // Sync publicProfileData when user data changes
  useEffect(() => {
    if (user) {
      setPublicProfileData({
        profileBio: user.profileBio || '',
        profilePublic: user.profilePublic || false,
        publicUsername: user.publicUsername || ''
      });
    }
  }, [user]);

  // Fetch fresh profile data on component mount to ensure we have latest data
  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        const response = await authAPI.getProfile();
        const latestUser = response.data.user;
        updateUser(latestUser);
      } catch (error) {
        console.error('Failed to fetch latest profile:', error);
      }
    };

    if (user) {
      fetchLatestProfile();
    }
  }, []); // Only run on mount

  // Load email preferences on component mount
  useEffect(() => {
    const loadEmailPreferences = async () => {
      try {
        const response = await emailPreferencesAPI.getPreferences();
        
        // Convert numeric values (0/1) to proper booleans
        const preferences = response.data.preferences;
        setEmailPreferences({
          notifications: Boolean(preferences.notifications),
          marketing: Boolean(preferences.marketing),
          announcements: Boolean(preferences.announcements),
          lastUpdated: preferences.lastUpdated
        });
      } catch (error) {
        console.error('Failed to load email preferences:', error);
        showSnackbar('Failed to load email preferences', 'error');
      }
    };

    if (user) {
      loadEmailPreferences();
    }
  }, [user]);

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

  const handleHeroImageClick = () => {
    heroImageInputRef.current?.click();
  };

  const handleHeroImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit for hero images)
    if (file.size > 10 * 1024 * 1024) {
      showSnackbar('File size must be less than 10MB', 'error');
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
      formData.append('heroImage', file);

      const response = await authAPI.uploadHeroImage(formData);
      
      // Update user context with new hero image
      if (user) {
        const updatedUser = {
          ...user,
          heroImageUrl: response.data.heroImageUrl,
          heroImageFilename: response.data.heroImageFilename
        };
        updateUser(updatedUser);
      }

      showSnackbar('Hero image updated successfully!');
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Failed to upload hero image', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getHeroImageUrl = () => {
    if (user?.heroImageFilename) {
      // Use the same pattern as getAvatarUrl for consistency
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      return `${apiBaseUrl}/auth/hero-image/${user.heroImageFilename}`;
    }
    return null;
  };

  const handleProfileSave = async () => {
    setIsLoading(true);
    try {
      await authAPI.updateProfile(profileData);
      
      // Fetch fresh user data from server to ensure complete sync
      const response = await authAPI.getProfile();
      const freshUser = response.data.user;
      
      // Update user context with fresh data from server
      updateUser(freshUser);

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
      
      // Fetch fresh user data from server to ensure complete sync
      const response = await authAPI.getProfile();
      const freshUser = response.data.user;
      
      // Update user context with fresh data from server
      updateUser(freshUser);

      setIsEditingPublicProfile(false);
      showSnackbar('Public profile settings updated successfully!');
    } catch (error: any) {
      showSnackbar(error.response?.data?.error || 'Failed to update public profile settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyProfileLink = () => {
    const profileUrl = `${window.location.origin}/u/${publicProfileData.publicUsername || user?.username}`;
    navigator.clipboard.writeText(profileUrl);
    showSnackbar('Profile link copied to clipboard!');
  };

  const handleOpenPublicProfile = () => {
    const profileUrl = `${window.location.origin}/u/${publicProfileData.publicUsername || user?.username}`;
    window.open(profileUrl, '_blank');
  };

  // Merge functionality handlers
  const handleSendMergeInvite = async () => {
    if (!mergeInviteUsername.trim()) {
      showSnackbar('Please enter a username', 'error');
      return;
    }

    setIsLoadingMerge(true);
    try {
      const response = await mergeAPI.sendInvitation(mergeInviteUsername.trim());
      showSnackbar(response.data.message, 'success');
      setMergeInviteUsername('');
      loadMergeData(); // Refresh merge data
    } catch (error: any) {
      console.error('Failed to send merge invitation:', error);
      const errorMessage = error.response?.data?.error || 'Failed to send invitation';
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsLoadingMerge(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: number) => {
    setIsLoadingMerge(true);
    try {
      const response = await mergeAPI.acceptInvitation(invitationId);
      showSnackbar(response.data.message, 'success');
      loadMergeData(); // Refresh merge data
    } catch (error: any) {
      console.error('Failed to accept invitation:', error);
      console.error('Error response data:', error.response?.data);
      const errorMessage = error.response?.data?.error || 'Failed to accept invitation';
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsLoadingMerge(false);
    }
  };

  const handleDeclineInvitation = async (invitationId: number) => {
    setIsLoadingMerge(true);
    try {
      const response = await mergeAPI.declineInvitation(invitationId);
      showSnackbar(response.data.message, 'success');
      loadMergeData(); // Refresh merge data
    } catch (error: any) {
      console.error('Failed to decline invitation:', error);
      const errorMessage = error.response?.data?.error || 'Failed to decline invitation';
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsLoadingMerge(false);
    }
  };

  const handleCancelInvitation = async (invitationId: number) => {
    setIsLoadingMerge(true);
    try {
      const response = await mergeAPI.cancelInvitation(invitationId);
      showSnackbar(response.data.message, 'success');
      loadMergeData(); // Refresh merge data
    } catch (error: any) {
      console.error('Failed to cancel invitation:', error);
      const errorMessage = error.response?.data?.error || 'Failed to cancel invitation';
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsLoadingMerge(false);
    }
  };

  const handleUnmergeAccounts = async () => {
    if (!window.confirm('Are you sure you want to unmerge your account? This will end the shared access to private memories.')) {
      return;
    }

    setIsLoadingMerge(true);
    try {
      const response = await mergeAPI.unmergeAccounts();
      showSnackbar(response.data.message, 'success');
      loadMergeData(); // Refresh merge data
    } catch (error: any) {
      console.error('Failed to unmerge accounts:', error);
      const errorMessage = error.response?.data?.error || 'Failed to unmerge accounts';
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsLoadingMerge(false);
    }
  };

  const loadMergeData = async () => {
    try {
      const [statusResponse, historyResponse] = await Promise.all([
        mergeAPI.getMergeStatus(),
        mergeAPI.getMergeHistory()
      ]);

      if (statusResponse.data) {
        // Backend returns data directly, not wrapped in 'data' property
        const statusData = statusResponse.data;
        
        // Set merge status based on mergeInfo
        if (statusData.mergeInfo && statusData.mergeInfo.is_merged) {
          setMergeStatus({
            isMerged: true,
            partnerUsername: statusData.mergeInfo.partner_username,
            mergeSlug: statusData.mergeInfo.merge_slug,
            receivedInvitations: statusData.receivedInvitations || []
          });

          // Load display settings if user is merged
          try {
            const displayResponse = await mergeAPI.getDisplaySettings();
            if (displayResponse.data) {
              setMergeDisplaySettings({
                avatar_display: displayResponse.data.avatar_display || 'user1',
                hero_image_display: displayResponse.data.hero_image_display || 'user1',
                bio_display: displayResponse.data.bio_display || 'combine'
              });
            }
          } catch (displayError) {
            console.error('Failed to load display settings:', displayError);
          }
        } else {
          setMergeStatus({
            isMerged: false,
            receivedInvitations: statusData.receivedInvitations || []
          });
        }
        
        setReceivedInvitations(statusData.receivedInvitations || []);
        setSentInvitations(statusData.sentInvitations || []);
      }

      if (historyResponse.data) {
        // Backend returns history array directly in 'history' property
        setMergeHistory(historyResponse.data.history || []);
      }
    } catch (error) {
      console.error('Failed to load merge data:', error);
    }
  };

  // Load merge data when tab changes to merge tab
  useEffect(() => {
    if (activeTab === 6) {
      loadMergeData();
    }
  }, [activeTab]);

  const handleEmailPreferenceChange = async (type: 'notifications' | 'marketing' | 'announcements', value: boolean) => {
    setIsLoadingPreferences(true);
    try {
      const updatedPreferences = {
        ...emailPreferences,
        [type]: value
      };
      
      // Extract only the boolean preferences for the API call
      // Ensure all values are proper booleans (convert 0/1 to false/true)
      const preferencesToUpdate = {
        notifications: Boolean(updatedPreferences.notifications),
        marketing: Boolean(updatedPreferences.marketing),
        announcements: Boolean(updatedPreferences.announcements)
      };
      
      await emailPreferencesAPI.updatePreferences(preferencesToUpdate);
      setEmailPreferences(updatedPreferences);
      showSnackbar(`Email ${type} preference updated successfully`);
    } catch (error: any) {
      console.error('Failed to update email preference:', error);
      showSnackbar('Failed to update email preference', 'error');
    } finally {
      setIsLoadingPreferences(false);
    }
  };

  // Handle display settings updates for merged profiles
  const handleDisplaySettingChange = async (setting: 'avatar_display' | 'hero_image_display' | 'bio_display', value: 'user1' | 'user2' | 'combine') => {
    setIsLoadingDisplaySettings(true);
    try {
      const updateData = { [setting]: value };
      await mergeAPI.updateDisplaySettings(updateData);
      
      setMergeDisplaySettings(prev => ({
        ...prev,
        [setting]: value
      }));
      
      const settingNames = {
        'avatar_display': 'Avatar',
        'hero_image_display': 'Hero image',
        'bio_display': 'Bio'
      };
      
      showSnackbar(`${settingNames[setting]} display setting updated successfully`);
    } catch (error: any) {
      console.error('Failed to update display setting:', error);
      showSnackbar('Failed to update display setting', 'error');
    } finally {
      setIsLoadingDisplaySettings(false);
    }
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

  // Tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
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

          {/* Tab Navigation */}
          <Card sx={{ mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                '& .MuiTab-root': {
                  minHeight: 64,
                  fontSize: '0.9rem'
                }
              }}
            >
              <Tab 
                icon={<PersonIcon />} 
                label="Profile & Avatar" 
                id="profile-tab-0"
              />
              <Tab 
                icon={<ImageIcon />} 
                label="Hero Image" 
                id="profile-tab-1"
              />
              <Tab 
                icon={<SettingsIcon />} 
                label="Email Settings" 
                id="profile-tab-2"
              />
              <Tab 
                icon={<PublicIcon />} 
                label="Public Profile" 
                id="profile-tab-3"
              />
              <Tab 
                icon={<TravelIcon />} 
                label="Travel Info" 
                id="profile-tab-4"
              />
              <Tab 
                icon={<BadgeIcon />} 
                label="Badges" 
                id="profile-tab-5"
              />
              <Tab 
                icon={<GroupIcon />} 
                label="Account Merging" 
                id="profile-tab-6"
              />
            </Tabs>
          </Card>

          {/* Conditional Content Based on Active Tab */}
          {activeTab === 0 && (
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
            </Stack>
          )}

          {/* Tab 1: Hero Image */}
          {activeTab === 1 && (
            <Stack spacing={3}>
              {/* Hero Image Section */}
              <Card sx={cardStyle}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Hero Image
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Choose a cover image for your public profile
                  </Typography>

                  {getHeroImageUrl() ? (
                    <Box sx={{ mb: 2 }}>
                      <img
                        src={getHeroImageUrl() || undefined}
                        alt="Hero"
                        style={{
                          width: '100%',
                          height: 200,
                          objectFit: 'cover',
                          borderRadius: 8,
                          cursor: 'pointer'
                        }}
                        onClick={handleHeroImageClick}
                      />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        width: '100%',
                        height: 200,
                        borderRadius: 2,
                        backgroundColor: 'grey.100',
                        border: '2px dashed',
                        borderColor: 'grey.300',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        mb: 2,
                        '&:hover': {
                          backgroundColor: 'grey.200',
                          borderColor: 'primary.main'
                        }
                      }}
                      onClick={handleHeroImageClick}
                    >
                      <Stack alignItems="center" spacing={1}>
                        <PhotoCamera sx={{ fontSize: 48, color: 'grey.400' }} />
                        <Typography variant="body1" color="text.secondary">
                          Click to upload hero image
                        </Typography>
                      </Stack>
                    </Box>
                  )}

                  <Button
                    variant="outlined"
                    startIcon={<PhotoCamera />}
                    onClick={handleHeroImageClick}
                    disabled={isLoading}
                    fullWidth
                  >
                    {getHeroImageUrl() ? 'Change Hero Image' : 'Upload Hero Image'}
                  </Button>

                  <input
                    type="file"
                    ref={heroImageInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleHeroImageUpload}
                  />
                </CardContent>
              </Card>
            </Stack>
          )}

          {/* Tab 2: Email Settings */}
          {activeTab === 2 && (
            <Stack spacing={3}>
              {/* Email Preferences */}
              <Card sx={cardStyle}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <EmailIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Email Preferences</Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Choose which emails you'd like to receive from us
                  </Typography>

                  <Stack spacing={1}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={emailPreferences.notifications}
                          onChange={(e) => handleEmailPreferenceChange('notifications', e.target.checked)}
                          disabled={isLoadingPreferences}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            Notifications
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Important updates about your account and activity
                          </Typography>
                        </Box>
                      }
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={emailPreferences.marketing}
                          onChange={(e) => handleEmailPreferenceChange('marketing', e.target.checked)}
                          disabled={isLoadingPreferences}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            Marketing
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Product updates, tips, and special offers
                          </Typography>
                        </Box>
                      }
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={emailPreferences.announcements}
                          onChange={(e) => handleEmailPreferenceChange('announcements', e.target.checked)}
                          disabled={isLoadingPreferences}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            Announcements
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            New features and platform announcements
                          </Typography>
                        </Box>
                      }
                    />
                  </Stack>

                  {emailPreferences.lastUpdated && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                      Last updated: {new Date(emailPreferences.lastUpdated).toLocaleDateString()}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Stack>
          )}

          {/* Tab 3: Public Profile */}
          {activeTab === 3 && (
            <Stack spacing={3}>
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
                      label="Custom Public Username (Optional)"
                      placeholder="e.g. victorydiv, traveler123, etc."
                      value={publicProfileData.publicUsername}
                      onChange={(e) => setPublicProfileData(prev => ({ ...prev, publicUsername: e.target.value }))}
                      disabled={!isEditingPublicProfile || isLoading}
                      variant="outlined"
                      helperText="Leave empty to use your email as username. Only letters, numbers, dots, underscores, and hyphens allowed."
                      inputProps={{ maxLength: 50 }}
                      sx={{ mb: 2 }}
                    />

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
                            {window.location.origin}/u/{publicProfileData.publicUsername || user.username}
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
                            profilePublic: user?.profilePublic || false,
                            publicUsername: user?.publicUsername || ''
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
          )}

          {/* Tab 4: Travel Information */}
          {activeTab === 4 && (
            <Stack spacing={3}>
              <TravelInformation 
                onSaveSuccess={(message) => showSnackbar(message, 'success')}
                onSaveError={(message) => showSnackbar(message, 'error')}
              />
            </Stack>
          )}

          {/* Tab 5: Badges */}
          {activeTab === 5 && (
            <Stack spacing={3}>
              {/* Badge Collection */}
              <Card sx={cardStyle}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <BadgeIcon color="warning" />
                    <Typography variant="h6">Badge Collection</Typography>
                  </Stack>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Track your achievements and milestones in your travel journey
                  </Typography>
                  
                  {user?.id && (
                    <BadgeDisplay 
                      userId={user.id}
                      showProgress={true}
                      variant="grid"
                      size="medium"
                      maxDisplay={6}
                    />
                  )}
                </CardContent>
              </Card>
            </Stack>
          )}

          {/* Tab 6: Account Merging */}
          {activeTab === 6 && (
            <Stack spacing={3}>
              {/* Current Merge Status */}
              <Card sx={cardStyle}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <GroupIcon color="primary" />
                    <Typography variant="h6">Account Merging Status</Typography>
                  </Stack>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Merge your account with another user to share private memories while maintaining individual ownership
                  </Typography>
                  
                  {mergeStatus?.isMerged ? (
                    <Stack spacing={2}>
                      <Alert severity="success">
                        <Typography variant="body2">
                          Your account is merged with <strong>{mergeStatus.partnerUsername}</strong>
                        </Typography>
                      </Alert>
                      
                      <Typography variant="body2">
                        Merge URL: <strong>{mergeStatus.mergeSlug}</strong>
                      </Typography>
                      
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleUnmergeAccounts}
                        disabled={isLoadingMerge}
                        startIcon={<DeclineIcon />}
                      >
                        Unmerge Accounts
                      </Button>
                    </Stack>
                  ) : (
                    <Alert severity="info">
                      <Typography variant="body2">
                        Your account is not currently merged with another user.
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Merged Profile Display Settings */}
              {mergeStatus?.isMerged && (
                <Card sx={cardStyle}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <ImageIcon color="primary" />
                      <Typography variant="h6">Profile Display Settings</Typography>
                    </Stack>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Choose which profile's avatar, hero image, and bio to display on your merged public profile
                    </Typography>

                    <Stack spacing={3}>
                      {/* Avatar Display Setting */}
                      <FormControl component="fieldset">
                        <FormLabel component="legend" sx={{ mb: 1 }}>
                          Avatar Display
                        </FormLabel>
                        <RadioGroup
                          value={mergeDisplaySettings.avatar_display}
                          onChange={(e) => handleDisplaySettingChange('avatar_display', e.target.value as 'user1' | 'user2')}
                          row
                        >
                          <FormControlLabel
                            value="user1"
                            control={<Radio />}
                            label="My Avatar"
                            disabled={isLoadingDisplaySettings}
                          />
                          <FormControlLabel
                            value="user2"
                            control={<Radio />}
                            label={`${mergeStatus.partnerUsername}'s Avatar`}
                            disabled={isLoadingDisplaySettings}
                          />
                        </RadioGroup>
                      </FormControl>

                      {/* Hero Image Display Setting */}
                      <FormControl component="fieldset">
                        <FormLabel component="legend" sx={{ mb: 1 }}>
                          Hero Image Display
                        </FormLabel>
                        <RadioGroup
                          value={mergeDisplaySettings.hero_image_display}
                          onChange={(e) => handleDisplaySettingChange('hero_image_display', e.target.value as 'user1' | 'user2')}
                          row
                        >
                          <FormControlLabel
                            value="user1"
                            control={<Radio />}
                            label="My Hero Image"
                            disabled={isLoadingDisplaySettings}
                          />
                          <FormControlLabel
                            value="user2"
                            control={<Radio />}
                            label={`${mergeStatus.partnerUsername}'s Hero Image`}
                            disabled={isLoadingDisplaySettings}
                          />
                        </RadioGroup>
                      </FormControl>

                      {/* Bio Display Setting */}
                      <FormControl component="fieldset">
                        <FormLabel component="legend" sx={{ mb: 1 }}>
                          Bio Display
                        </FormLabel>
                        <RadioGroup
                          value={mergeDisplaySettings.bio_display}
                          onChange={(e) => handleDisplaySettingChange('bio_display', e.target.value as 'user1' | 'user2' | 'combine')}
                        >
                          <FormControlLabel
                            value="user1"
                            control={<Radio />}
                            label="My Bio"
                            disabled={isLoadingDisplaySettings}
                          />
                          <FormControlLabel
                            value="user2"
                            control={<Radio />}
                            label={`${mergeStatus.partnerUsername}'s Bio`}
                            disabled={isLoadingDisplaySettings}
                          />
                          <FormControlLabel
                            value="combine"
                            control={<Radio />}
                            label="Combined Bios"
                            disabled={isLoadingDisplaySettings}
                          />
                        </RadioGroup>
                      </FormControl>

                      {isLoadingDisplaySettings && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Updating display settings...
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* Send Merge Invitation */}
              {!mergeStatus?.isMerged && (
                <Card sx={cardStyle}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <SendIcon color="primary" />
                      <Typography variant="h6">Send Merge Invitation</Typography>
                    </Stack>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Invite another user to merge accounts with you
                    </Typography>
                    
                    <Stack direction="row" spacing={2} alignItems="end">
                      <TextField
                        fullWidth
                        label="Username"
                        value={mergeInviteUsername}
                        onChange={(e) => setMergeInviteUsername(e.target.value)}
                        placeholder="Enter username to invite"
                        disabled={isLoadingMerge}
                      />
                      <Button
                        variant="contained"
                        onClick={handleSendMergeInvite}
                        disabled={isLoadingMerge || !mergeInviteUsername.trim()}
                        startIcon={<SendIcon />}
                      >
                        Send Invite
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* Received Invitations */}
              {receivedInvitations.length > 0 && (
                <Card sx={cardStyle}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <EmailIcon color="primary" />
                      <Typography variant="h6">Received Invitations</Typography>
                    </Stack>
                    
                    <Stack spacing={2}>
                      {receivedInvitations.map((invitation: any) => (
                        <Card key={invitation.id} variant="outlined">
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Box>
                                <Typography variant="body1" fontWeight="medium">
                                  Invitation from {invitation.inviter_username}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Sent {new Date(invitation.created_at).toLocaleDateString()}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  onClick={() => handleAcceptInvitation(invitation.id)}
                                  disabled={isLoadingMerge}
                                  startIcon={<CheckCircleIcon />}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  onClick={() => handleDeclineInvitation(invitation.id)}
                                  disabled={isLoadingMerge}
                                  startIcon={<DeclineIcon />}
                                >
                                  Decline
                                </Button>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* Sent Invitations */}
              {sentInvitations.length > 0 && (
                <Card sx={cardStyle}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <SendIcon color="primary" />
                      <Typography variant="h6">Sent Invitations</Typography>
                    </Stack>
                    
                    <Stack spacing={2}>
                      {sentInvitations.map((invitation: any) => (
                        <Card key={invitation.id} variant="outlined">
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Box>
                                <Typography variant="body1" fontWeight="medium">
                                  Invitation to {invitation.invited_username}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Sent {new Date(invitation.created_at).toLocaleDateString()}
                                </Typography>
                              </Box>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => handleCancelInvitation(invitation.id)}
                                disabled={isLoadingMerge}
                                startIcon={<DeclineIcon />}
                              >
                                Cancel
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* Merge History */}
              {mergeHistory.length > 0 && (
                <Card sx={cardStyle}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <HistoryIcon color="primary" />
                      <Typography variant="h6">Merge History</Typography>
                    </Stack>
                    
                    <Stack spacing={2}>
                      {mergeHistory.map((entry: any, index: number) => (
                        <Card key={index} variant="outlined">
                          <CardContent>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Box>
                                <Typography variant="body2">
                                  <strong>{entry.action}</strong> with {entry.partner_username}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(entry.action_at).toLocaleDateString()} at {new Date(entry.action_at).toLocaleTimeString()}
                                </Typography>
                              </Box>
                              {entry.merge_slug && (
                                <Chip 
                                  label={entry.merge_slug} 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined" 
                                />
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          )}

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
