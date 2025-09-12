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
  Tab
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
  Image as ImageIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { backgroundStyles, componentStyles } from '../theme/fojournTheme';
import { authAPI, emailPreferencesAPI } from '../services/api';
import BadgeDisplay from '../components/BadgeDisplay';
import TravelInformation from '../components/TravelInformation';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroImageInputRef = useRef<HTMLInputElement>(null);

  // State for tabs
  const [activeTab, setActiveTab] = useState(0);

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

  // State for email preferences
  const [emailPreferences, setEmailPreferences] = useState({
    notifications: true,
    marketing: true,
    announcements: true,
    lastUpdated: null as string | null
  });
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);

  // Tab change handler
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Tab panel component
  interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
  }

  function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`profile-tabpanel-${index}`}
        aria-labelledby={`profile-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ py: 3 }}>
            {children}
          </Box>
        )}
      </div>
    );
  }

  // All the existing handlers and functions here (I'll copy them from the original)
  // ... [handlers will be copied]

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
                label="Profile" 
                id="profile-tab-0"
                aria-controls="profile-tabpanel-0"
              />
              <Tab 
                icon={<ImageIcon />} 
                label="Hero Image" 
                id="profile-tab-1"
                aria-controls="profile-tabpanel-1"
              />
              <Tab 
                icon={<SettingsIcon />} 
                label="Account" 
                id="profile-tab-2"
                aria-controls="profile-tabpanel-2"
              />
              <Tab 
                icon={<PublicIcon />} 
                label="Public Profile" 
                id="profile-tab-3"
                aria-controls="profile-tabpanel-3"
              />
              <Tab 
                icon={<TravelIcon />} 
                label="Travel Info" 
                id="profile-tab-4"
                aria-controls="profile-tabpanel-4"
              />
              <Tab 
                icon={<BadgeIcon />} 
                label="Badges" 
                id="profile-tab-5"
                aria-controls="profile-tabpanel-5"
              />
            </Tabs>
          </Card>

          {/* Tab Content Placeholder - Will implement each tab */}
          <TabPanel value={activeTab} index={0}>
            <Typography>Profile & Avatar content will go here</Typography>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Typography>Hero Image content will go here</Typography>
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Typography>Account Settings content will go here</Typography>
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <Typography>Public Profile content will go here</Typography>
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            <Typography>Travel Information content will go here</Typography>
          </TabPanel>

          <TabPanel value={activeTab} index={5}>
            <Typography>Badges content will go here</Typography>
          </TabPanel>

          {/* Dialogs and Snackbars remain at component level */}
          {/* Password Change Dialog */}
          <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Change Password</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {/* Password form content */}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
              <Button variant="contained" disabled={isLoading}>
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
