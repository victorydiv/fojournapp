import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Switch,
  FormControlLabel,
  Pagination,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  CardMedia,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  styled,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Storage as StorageIcon,
  Assessment as AssessmentIcon,
  Build as BuildIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  PhotoLibrary as PhotoIcon,
  EmojiEvents as BadgeIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Flag as FlagIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material';
import { adminAPI, DashboardData, SystemHealth, DatabaseStats, OrphanedMediaResponse } from '../services/adminAPI';
import { badgeAPI } from '../services/api';
import CommunicationsPanel from '../components/CommunicationsPanel';
import AuthenticatedImage from '../components/AuthenticatedImage';

// Styled upload button
const UploadButton = styled(Button)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  '& input': {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
}));

// Badge image display component with fallback
const BadgeImageDisplay: React.FC<{ badge: any }> = ({ badge }) => {
  const [imageError, setImageError] = useState(false);

  if (!badge.icon_url || imageError) {
    return (
      <BadgeIcon 
        sx={{ 
          mr: 2, 
          fontSize: 40, 
          color: 'warning.main' 
        }} 
      />
    );
  }

  return (
    <AuthenticatedImage
      src={badgeAPI.getBadgeIconUrl(badge.icon_url) || ''}
      alt={badge.name}
      style={{ 
        width: 40, 
        height: 40, 
        objectFit: 'cover', 
        borderRadius: '50%',
        marginRight: 16 
      }}
      onError={() => {
        console.log('Badge icon failed to load for:', badge.name, 'URL:', badge.icon_url);
        setImageError(true);
      }}
    />
  );
};

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
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminPanel: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);

  // Content state
  const [contentData, setContentData] = useState<any>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentType, setContentType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Entry details modal state
  const [entryDetailsOpen, setEntryDetailsOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [entryDetailsLoading, setEntryDetailsLoading] = useState(false);

  // Maintenance state
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [orphanedMedia, setOrphanedMedia] = useState<OrphanedMediaResponse | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (tabValue === 2) {
      loadContent(contentType as 'entries' | 'public_profiles' | 'all');
    }
  }, [tabValue, contentType]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboard();
      setDashboardData(response.data);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
      setError(error.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (page: number = 1) => {
    try {
      setUsersLoading(true);
      const response = await adminAPI.getUsers({ page, limit: 10 });
      setUsers(response.data.users);
      setUsersTotalPages(response.data.pagination.totalPages);
      setUsersPage(page);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      setError(error.response?.data?.error || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Load data for specific tabs when they are accessed
    if (newValue === 1 && users.length === 0) {
      loadUsers();
    }
  };

  const toggleAdminStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await adminAPI.updateUserAdminStatus(userId, !currentStatus);
      // Reload users to reflect changes
      loadUsers(usersPage);
    } catch (error: any) {
      console.error('Failed to update admin status:', error);
      setError(error.response?.data?.error || 'Failed to update admin status');
    }
  };

  const handleUsersPageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    loadUsers(page);
  };

  const loadContent = async (type: 'entries' | 'public_profiles' | 'all' = 'all') => {
    try {
      setContentLoading(true);
      const response = await adminAPI.getContent({ type });
      setContentData(response.data);
    } catch (error: any) {
      console.error('Failed to load content:', error);
      setError(error.response?.data?.error || 'Failed to load content');
    } finally {
      setContentLoading(false);
    }
  };

  const handleViewUserDetails = async (userId: number) => {
    try {
      setUserDetailsLoading(true);
      setUserDetailsOpen(true);
      const response = await adminAPI.getUserDetails(userId);
      // Set the complete user data including entries
      setSelectedUser({
        ...response.data.user,
        entries: response.data.entries,
        mediaStats: response.data.mediaStats
      });
    } catch (error: any) {
      console.error('Failed to load user details:', error);
      setError(error.response?.data?.error || 'Failed to load user details');
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const handleCloseUserDetails = () => {
    setUserDetailsOpen(false);
    setSelectedUser(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Content moderation handlers
  const handleToggleEntryVisibility = async (entryId: number, currentlyPublic: boolean) => {
    try {
      await adminAPI.toggleEntryVisibility(entryId, !currentlyPublic);
      // Reload content to reflect changes
      loadContent(contentType as 'entries' | 'public_profiles' | 'all');
    } catch (error: any) {
      console.error('Failed to toggle entry visibility:', error);
      setError(error.response?.data?.error || 'Failed to update entry visibility');
    }
  };

  const handleFlagUser = async (userId: number, username: string) => {
    const reason = prompt(`Enter reason for flagging user "${username}":`);
    if (reason === null) return; // User cancelled

    try {
      await adminAPI.flagUser(userId, true, reason);
      // Reload content to reflect changes
      loadContent(contentType as 'entries' | 'public_profiles' | 'all');
    } catch (error: any) {
      console.error('Failed to flag user:', error);
      setError(error.response?.data?.error || 'Failed to flag user');
    }
  };

  const handleViewEntry = async (entryId: number) => {
    try {
      setEntryDetailsLoading(true);
      setEntryDetailsOpen(true);
      const response = await adminAPI.getEntryDetails(entryId);
      setSelectedEntry(response.data);
    } catch (error: any) {
      console.error('Failed to load entry details:', error);
      setError(error.response?.data?.error || 'Failed to load entry details');
      setEntryDetailsOpen(false);
    } finally {
      setEntryDetailsLoading(false);
    }
  };

  const handleCloseEntryDetails = () => {
    setEntryDetailsOpen(false);
    setSelectedEntry(null);
  };

  // Maintenance functions
  const loadSystemHealth = async () => {
    try {
      setMaintenanceLoading(true);
      const response = await adminAPI.getSystemHealth();
      setSystemHealth(response.data);
    } catch (error: any) {
      console.error('Failed to load system health:', error);
      setError(error.response?.data?.error || 'Failed to load system health');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const loadDatabaseStats = async () => {
    try {
      setMaintenanceLoading(true);
      const response = await adminAPI.getDatabaseStats();
      setDatabaseStats(response.data);
    } catch (error: any) {
      console.error('Failed to load database stats:', error);
      setError(error.response?.data?.error || 'Failed to load database stats');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const loadOrphanedMedia = async () => {
    try {
      setMaintenanceLoading(true);
      const response = await adminAPI.getOrphanedMedia();
      setOrphanedMedia(response.data);
    } catch (error: any) {
      console.error('Failed to load orphaned media:', error);
      setError(error.response?.data?.error || 'Failed to load orphaned media');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const cleanupOrphanedFiles = async (orphanedFiles: any[]) => {
    if (!window.confirm(`Are you sure you want to delete ${orphanedFiles.length} orphaned files? This action cannot be undone.`)) {
      return;
    }

    try {
      setMaintenanceLoading(true);
      const response = await adminAPI.cleanupOrphanedFiles(orphanedFiles);
      alert(response.data.message);
      // Reload orphaned media data
      await loadOrphanedMedia();
    } catch (error: any) {
      console.error('Failed to cleanup orphaned files:', error);
      setError(error.response?.data?.error || 'Failed to cleanup orphaned files');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const generateThumbnails = async () => {
    try {
      setMaintenanceLoading(true);
      const response = await adminAPI.generateThumbnails();
      
      // Show detailed results
      let message = response.data.message;
      if (response.data.errorDetails && response.data.errorDetails.length > 0) {
        message += '\n\nErrors:\n' + response.data.errorDetails.join('\n');
      }
      
      alert(message);
      
      // Reload orphaned media data to reflect changes
      if (response.data.processed > 0) {
        await loadOrphanedMedia();
      }
    } catch (error: any) {
      console.error('Failed to generate thumbnails:', error);
      setError(error.response?.data?.error || 'Failed to generate thumbnails');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const fixAvatars = async () => {
    try {
      setMaintenanceLoading(true);
      const response = await adminAPI.fixAvatars();
      
      // Show detailed results
      let message = response.data.message;
      if (response.data.errorDetails && response.data.errorDetails.length > 0) {
        message += '\n\nErrors:\n' + response.data.errorDetails.join('\n');
      }
      
      alert(message);
    } catch (error: any) {
      console.error('Failed to fix avatars:', error);
      setError(error.response?.data?.error || 'Failed to fix avatars');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  // Load maintenance data when maintenance tab is selected
  useEffect(() => {
    if (tabValue === 3) {
      loadSystemHealth();
      loadDatabaseStats();
    }
  }, [tabValue]);

  if (loading && !dashboardData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Panel
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin tabs">
          <Tab
            icon={<DashboardIcon />}
            label="Dashboard"
            id="admin-tab-0"
            aria-controls="admin-tabpanel-0"
          />
          <Tab
            icon={<PeopleIcon />}
            label="Users"
            id="admin-tab-1"
            aria-controls="admin-tabpanel-1"
          />
          <Tab
            icon={<AssessmentIcon />}
            label="Content"
            id="admin-tab-2"
            aria-controls="admin-tabpanel-2"
          />
          <Tab
            icon={<CampaignIcon />}
            label="Communications"
            id="admin-tab-3"
            aria-controls="admin-tabpanel-3"
          />
          <Tab
            icon={<BadgeIcon />}
            label="Badges"
            id="admin-tab-4"
            aria-controls="admin-tabpanel-4"
          />
          <Tab
            icon={<BuildIcon />}
            label="Maintenance"
            id="admin-tab-5"
            aria-controls="admin-tabpanel-5"
          />
        </Tabs>
      </Box>

      {/* Dashboard Tab */}
      <TabPanel value={tabValue} index={0}>
        {dashboardData && (
          <Box>
            {/* Stats Cards */}
            <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
              <Card sx={{ flex: 1, minWidth: 300 }}>
                <CardContent>
                  <Typography variant="h6" component="div" gutterBottom>
                    <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Users
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {dashboardData.stats.users.total_users}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboardData.stats.users.new_users_30d} new this month
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboardData.stats.users.public_profiles} public profiles
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1, minWidth: 300 }}>
                <CardContent>
                  <Typography variant="h6" component="div" gutterBottom>
                    <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Travel Entries
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {dashboardData.stats.entries.total_entries}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboardData.stats.entries.new_entries_30d} new this month
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboardData.stats.entries.public_entries} public entries
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1, minWidth: 300 }}>
                <CardContent>
                  <Typography variant="h6" component="div" gutterBottom>
                    <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Media Files
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {dashboardData.stats.media.total_files}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatBytes(dashboardData.stats.media.total_size || 0)} total size
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Recent Activity */}
            <Card>
              <CardContent>
                <Typography variant="h6" component="div" gutterBottom>
                  Recent Activity
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Visibility</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboardData.recentActivity.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell>{activity.title}</TableCell>
                          <TableCell>{activity.username}</TableCell>
                          <TableCell>{formatDate(activity.created_at)}</TableCell>
                          <TableCell>
                            <Chip
                              label={activity.is_public ? 'Public' : 'Private'}
                              color={activity.is_public ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}
      </TabPanel>

      {/* Users Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Manage user accounts and admin privileges
          </Typography>
        </Box>

        {usersLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Card>
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Entries</TableCell>
                        <TableCell>Joined</TableCell>
                        <TableCell>Public Profile</TableCell>
                        <TableCell>Admin</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 32, height: 32 }}>
                                {user.avatar_filename ? (
                                  <img 
                                    src={`/api/auth/avatar/${user.avatar_filename}`} 
                                    alt={user.username}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <PersonIcon />
                                )}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {user.username}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {user.first_name} {user.last_name}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              {user.email}
                            </Box>
                          </TableCell>
                          <TableCell>
                              {user.entry_count > 0 ? (
                                <Chip 
                                  label={user.entry_count}
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                />
                              ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  No entries
                                </Typography>
                              )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(user.created_at)}
                            </Typography>
                            {user.last_entry && (
                              <Typography variant="caption" color="text.secondary">
                                Last entry: {formatDate(user.last_entry)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.profile_public ? 'Public' : 'Private'}
                              color={user.profile_public ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={user.is_admin}
                                  onChange={() => toggleAdminStatus(user.id, user.is_admin)}
                                  size="small"
                                />
                              }
                              label=""
                            />
                            <AdminIcon 
                              sx={{ 
                                ml: 1, 
                                fontSize: 16, 
                                color: user.is_admin ? 'primary.main' : 'text.disabled' 
                              }} 
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleViewUserDetails(user.id)}
                              title="View user details"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {usersTotalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={usersTotalPages}
                      page={usersPage}
                      onChange={handleUsersPageChange}
                      color="primary"
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </TabPanel>

      {/* Content Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h5" gutterBottom>Content Moderation</Typography>
        
        {/* Content Type Filter */}
        <Box sx={{ mb: 3 }}>
          <Tabs
            value={contentType}
            onChange={(e, newValue) => setContentType(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="All Content" value="all" />
            <Tab label="Public Entries" value="entries" />
            <Tab label="Public Profiles" value="public_profiles" />
          </Tabs>
        </Box>

        {contentLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : contentData ? (
          <Box>
            {/* Public Entries */}
            {(contentType === 'all' || contentType === 'entries') && contentData.publicEntries && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Public Travel Entries ({contentData.publicEntries.length})
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Title</TableCell>
                          <TableCell>User</TableCell>
                          <TableCell>Location</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Media Files</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {contentData.publicEntries.map((entry: any) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {entry.title}
                              </Typography>
                              {entry.description && (
                                <Typography variant="caption" color="text.secondary">
                                  {entry.description.substring(0, 50)}
                                  {entry.description.length > 50 && '...'}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{entry.username}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {entry.email}
                              </Typography>
                            </TableCell>
                            <TableCell>{entry.location_name || 'Unknown'}</TableCell>
                            <TableCell>{formatDate(entry.created_at)}</TableCell>
                            <TableCell>
                              <Chip 
                                label={`${entry.media_count} files`}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton 
                                size="small" 
                                color="primary" 
                                title="View Entry"
                                onClick={() => handleViewEntry(entry.id)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                color="error" 
                                title={entry.is_public ? "Hide Entry" : "Make Public"}
                                onClick={() => handleToggleEntryVisibility(entry.id, entry.is_public)}
                              >
                                {entry.is_public ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Public Profiles */}
            {(contentType === 'all' || contentType === 'public_profiles') && contentData.publicProfiles && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Public User Profiles ({contentData.publicProfiles.length})
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>User</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Bio</TableCell>
                          <TableCell>Public Username</TableCell>
                          <TableCell>Joined</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {contentData.publicProfiles.map((profile: any) => (
                          <TableRow key={profile.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ width: 32, height: 32 }}>
                                  <PersonIcon />
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {profile.username}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {profile.first_name} {profile.last_name}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>{profile.email}</TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                No bio available
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            </TableCell>
                            <TableCell>{formatDate(profile.created_at)}</TableCell>
                            <TableCell>
                              <IconButton 
                                size="small" 
                                color="primary" 
                                title="View Profile"
                                onClick={() => handleViewUserDetails(profile.id)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                color="warning" 
                                title="Flag Profile"
                                onClick={() => handleFlagUser(profile.id, profile.username)}
                              >
                                <FlagIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No content data available
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* Communications Tab */}
      <TabPanel value={tabValue} index={3}>
        <CommunicationsPanel />
      </TabPanel>

      {/* Badges Tab */}
      <TabPanel value={tabValue} index={4}>
        <BadgeManagementPanel />
      </TabPanel>

      {/* Maintenance Tab */}
      <TabPanel value={tabValue} index={5}>
        <Typography variant="h5" gutterBottom>System Maintenance</Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* System Health */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>🔍</span>
                  System Health
                </Box>
              </Typography>
              {systemHealth ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {Object.entries(systemHealth).map(([key, value]) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip 
                        label={value.status} 
                        color={value.status === 'healthy' ? 'success' : 'error'} 
                        size="small"
                      />
                      <Typography variant="body2">
                        <strong>{key}:</strong> {value.details}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button 
                    variant="outlined" 
                    onClick={loadSystemHealth}
                    disabled={maintenanceLoading}
                  >
                    {maintenanceLoading ? <CircularProgress size={20} /> : 'Check System Health'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Database Statistics */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>📊</span>
                  Database Statistics
                </Box>
              </Typography>
              {databaseStats ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Users</Typography>
                    <Typography variant="h6">{databaseStats.users}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Travel Entries</Typography>
                    <Typography variant="h6">{databaseStats.travel_entries}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Media Files</Typography>
                    <Typography variant="h6">{databaseStats.media_files}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Database Size</Typography>
                    <Typography variant="h6">{databaseStats.database_size_mb} MB</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Recent Entries (7d)</Typography>
                    <Typography variant="h6">{databaseStats.recent_entries_7d}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Recent Users (7d)</Typography>
                    <Typography variant="h6">{databaseStats.recent_users_7d}</Typography>
                  </Box>
                </Box>
              ) : (
                <Button 
                  variant="outlined" 
                  onClick={loadDatabaseStats}
                  disabled={maintenanceLoading}
                >
                  {maintenanceLoading ? <CircularProgress size={20} /> : 'Load Database Stats'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Media Management */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>📁</span>
                  Media Management
                </Box>
              </Typography>
              {orphanedMedia ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Orphaned Files</Typography>
                      <Typography variant="h6">{orphanedMedia?.summary?.orphanedCount || 0}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Missing Files</Typography>
                      <Typography variant="h6">{orphanedMedia?.summary?.missingCount || 0}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Total Issues</Typography>
                      <Typography variant="h6">{orphanedMedia?.summary?.totalIssues || 0}</Typography>
                    </Box>
                  </Box>
                  {(orphanedMedia?.summary?.totalIssues || 0) > 0 && (
                    <Alert severity="warning">
                      Found {orphanedMedia?.summary?.totalIssues || 0} media file issues that may need attention.
                    </Alert>
                  )}
                  {(orphanedMedia?.summary?.orphanedCount || 0) > 0 && (
                    <Button 
                      variant="contained" 
                      color="warning"
                      onClick={() => cleanupOrphanedFiles(orphanedMedia?.orphanedFiles || [])}
                    >
                      Cleanup {orphanedMedia?.summary?.orphanedCount || 0} Orphaned Files
                    </Button>
                  )}
                </Box>
              ) : (
                <Button 
                  variant="outlined" 
                  onClick={loadOrphanedMedia}
                  disabled={maintenanceLoading}
                >
                  {maintenanceLoading ? <CircularProgress size={20} /> : 'Scan for Orphaned Media'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Avatar Management */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>🖼️</span>
                  Avatar Management
                </Box>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Fix missing avatar files in production public directory. This copies avatar files from the uploads directory to the Apache public directory for users with public profiles.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button 
                  variant="contained" 
                  color="warning"
                  onClick={fixAvatars}
                  disabled={maintenanceLoading}
                >
                  {maintenanceLoading ? <CircularProgress size={20} /> : 'Fix Missing Avatars'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>⚡</span>
                  Quick Actions
                </Box>
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button 
                  variant="outlined" 
                  onClick={loadSystemHealth}
                  disabled={maintenanceLoading}
                >
                  Refresh Health Check
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={loadDatabaseStats}
                  disabled={maintenanceLoading}
                >
                  Refresh Database Stats
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={loadOrphanedMedia}
                  disabled={maintenanceLoading}
                >
                  Scan Media Files
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={generateThumbnails}
                  disabled={maintenanceLoading}
                >
                  Generate Missing Thumbnails
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={fixAvatars}
                  disabled={maintenanceLoading}
                  color="warning"
                >
                  Fix Missing Avatars
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </TabPanel>
      
      {/* User Details Dialog */}
      <Dialog
        open={userDetailsOpen}
        onClose={handleCloseUserDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">User Details</Typography>
            <IconButton onClick={handleCloseUserDetails} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {userDetailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedUser ? (
            <Box>
              {/* User Basic Info */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ width: 64, height: 64 }}>
                      {selectedUser.avatar_filename ? (
                        <img 
                          src={`/api/auth/avatar/${selectedUser.avatar_filename}`} 
                          alt={selectedUser.username}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <PersonIcon sx={{ fontSize: 32 }} />
                      )}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{selectedUser.username}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedUser.first_name} {selectedUser.last_name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip
                          icon={selectedUser.is_admin ? <AdminIcon /> : <PersonIcon />}
                          label={selectedUser.is_admin ? 'Admin' : 'User'}
                          color={selectedUser.is_admin ? 'primary' : 'default'}
                          size="small"
                        />
                        <Chip
                          icon={selectedUser.profile_public ? <PublicIcon /> : <LockIcon />}
                          label={selectedUser.profile_public ? 'Public Profile' : 'Private Profile'}
                          color={selectedUser.profile_public ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 250 }}>
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            <EmailIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary="Email"
                            secondary={selectedUser.email}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CalendarIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary="Joined"
                            secondary={formatDate(selectedUser.created_at)}
                          />
                        </ListItem>
                      </List>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 250 }}>
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            <PhotoIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary="Travel Entries"
                            secondary={`${selectedUser.entries?.length || 0} entries`}
                          />
                        </ListItem>
                        {selectedUser.last_entry && (
                          <ListItem>
                            <ListItemIcon>
                              <CalendarIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary="Last Entry"
                              secondary={formatDate(selectedUser.last_entry)}
                            />
                          </ListItem>
                        )}
                      </List>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* User Statistics */}
              {selectedUser.mediaStats && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Media Statistics</Typography>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Total Files
                        </Typography>
                        <Typography variant="h6">
                          {selectedUser.mediaStats.count}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Storage Used
                        </Typography>
                        <Typography variant="h6">
                          {formatBytes(selectedUser.mediaStats.total_size)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* Recent Entries */}
              {selectedUser.entries && selectedUser.entries.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Recent Travel Entries</Typography>
                    <List>
                      {selectedUser.entries.slice(0, 5).map((entry: any) => (
                        <ListItem key={entry.id} divider>
                          <ListItemText
                            primary={entry.title}
                            secondary={`${entry.location_name || 'Unknown location'} • ${formatDate(entry.created_at)}`}
                          />
                          <Chip
                            label={entry.is_public ? 'Public' : 'Private'}
                            color={entry.is_public ? 'success' : 'default'}
                            size="small"
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}
            </Box>
          ) : (
            <Typography>No user details available</Typography>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseUserDetails}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Entry Details Dialog */}
      <Dialog
        open={entryDetailsOpen}
        onClose={handleCloseEntryDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Entry Details</Typography>
            <IconButton onClick={handleCloseEntryDetails} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {entryDetailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedEntry ? (
            <Box>
              {/* Entry Information */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {selectedEntry.entry.title}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Chip
                      icon={<PersonIcon />}
                      label={selectedEntry.entry.username}
                      variant="outlined"
                    />
                    <Chip
                      icon={<EmailIcon />}
                      label={selectedEntry.entry.email}
                      variant="outlined"
                    />
                    <Chip
                      icon={<CalendarIcon />}
                      label={formatDate(selectedEntry.entry.created_at)}
                      variant="outlined"
                    />
                    <Chip
                      icon={selectedEntry.entry.is_public ? <PublicIcon /> : <LockIcon />}
                      label={selectedEntry.entry.is_public ? 'Public' : 'Private'}
                      color={selectedEntry.entry.is_public ? 'success' : 'default'}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Location:</strong> {selectedEntry.entry.location_name || 'Unknown'}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Coordinates:</strong> {selectedEntry.entry.latitude}, {selectedEntry.entry.longitude}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Entry Date:</strong> {formatDate(selectedEntry.entry.entry_date)}
                  </Typography>

                  {selectedEntry.entry.description && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        <strong>Description:</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedEntry.entry.description}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Media Files */}
              {selectedEntry.media && selectedEntry.media.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <PhotoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Media Files ({selectedEntry.media.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                      {selectedEntry.media.map((media: any) => {
                        console.log('Media item:', media.originalName, 'thumbnailUrl:', media.thumbnailUrl);
                        return (
                        <Box key={media.id} sx={{ width: { xs: '100%', sm: '45%', md: '30%' } }}>
                          <Card variant="outlined">
                            {/* Thumbnail or file icon */}
                            {media.thumbnailUrl ? (
                              <CardMedia
                                component="img"
                                height="120"
                                image={media.thumbnailUrl}
                                alt={media.originalName}
                                sx={{ 
                                  objectFit: 'cover',
                                  cursor: 'pointer',
                                  '&:hover': { opacity: 0.8 }
                                }}
                                onClick={() => window.open(media.url, '_blank')}
                                onError={(e) => {
                                  console.error('Thumbnail failed to load:', media.thumbnailUrl);
                                  console.error('Original file:', media.originalName);
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  height: 120,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: 'grey.100',
                                  cursor: 'pointer',
                                  '&:hover': { backgroundColor: 'grey.200' }
                                }}
                                onClick={() => window.open(media.url, '_blank')}
                              >
                                <PhotoIcon sx={{ fontSize: 48, color: 'grey.400' }} />
                              </Box>
                            )}
                            <CardContent sx={{ p: 1.5 }}>
                              <Typography variant="body2" fontWeight="medium" noWrap>
                                {media.originalName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {media.fileType} • {formatBytes(media.fileSize)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Uploaded {formatDate(media.uploadedAt)}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          ) : (
            <Typography>No entry details available</Typography>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseEntryDetails}>Close</Button>
          {selectedEntry && (
            <Button
              variant="contained"
              color={selectedEntry.entry.is_public ? "error" : "primary"}
              onClick={() => {
                handleToggleEntryVisibility(selectedEntry.entry.id, selectedEntry.entry.is_public);
                handleCloseEntryDetails();
              }}
            >
              {selectedEntry.entry.is_public ? "Hide Entry" : "Make Public"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Badge Management Panel Component
const BadgeManagementPanel: React.FC = () => {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [editJsonError, setEditJsonError] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingEditIcon, setUploadingEditIcon] = useState(false);
  const [newBadge, setNewBadge] = useState({
    name: '',
    description: '',
    badge_type: 'achievement',
    criteria_type: 'count',
    criteria_value: 1,
    icon_name: '',
    logic_json: ''
  });
  const [editBadge, setEditBadge] = useState({
    name: '',
    description: '',
    badge_type: 'achievement',
    criteria_type: 'count',
    criteria_value: 1,
    icon_name: '',
    logic_json: ''
  });

  // Fetch badges
  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const response = await badgeAPI.getAvailableBadges();
      setBadges(response.data.badges);
    } catch (err) {
      setError('Failed to load badges');
    } finally {
      setLoading(false);
    }
  };

  const handleIconUpload = async (file: File, isEdit: boolean = false) => {
    console.log('handleIconUpload called with file:', file);
    console.log('File name:', file?.name);
    console.log('File size:', file?.size);
    console.log('File type:', file?.type);
    
    try {
      if (isEdit) {
        setUploadingEditIcon(true);
      } else {
        setUploadingIcon(true);
      }
      
      console.log('Calling badgeAPI.uploadBadgeIcon...');
      const response = await badgeAPI.uploadBadgeIcon(file);
      console.log('Upload response:', response.data);
      
      if (isEdit) {
        setEditBadge(prev => ({ ...prev, icon_name: response.data.iconPath }));
      } else {
        setNewBadge(prev => ({ ...prev, icon_name: response.data.iconPath }));
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Upload error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to upload icon');
    } finally {
      if (isEdit) {
        setUploadingEditIcon(false);
      } else {
        setUploadingIcon(false);
      }
    }
  };

  const handleCreateBadge = async () => {
    try {
      // Validate JSON if provided
      if (newBadge.logic_json && newBadge.logic_json.trim()) {
        try {
          JSON.parse(newBadge.logic_json);
          setJsonError(null);
        } catch (err) {
          setJsonError('Invalid JSON format');
          return;
        }
      }
      
      setLoading(true);
      await badgeAPI.createBadge(newBadge);
      setDialogOpen(false);
      setNewBadge({
        name: '',
        description: '',
        badge_type: 'achievement',
        criteria_type: 'count',
        criteria_value: 1,
        icon_name: '',
        logic_json: ''
      });
      setJsonError(null);
      setUploadingIcon(false);
      fetchBadges();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create badge');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBadge = async () => {
    try {
      // Validate JSON if provided
      if (editBadge.logic_json && editBadge.logic_json.trim()) {
        try {
          JSON.parse(editBadge.logic_json);
          setEditJsonError(null);
        } catch (err) {
          setEditJsonError('Invalid JSON format');
          return;
        }
      }
      
      setLoading(true);
      await badgeAPI.updateBadge(selectedBadge.id, editBadge);
      closeEditDialog();
      fetchBadges();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update badge');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (badge: any) => {
    setSelectedBadge(badge);
    
    // Parse the criteria_value to separate logic_json from simple criteria_value
    let logicJson = '';
    let criteriaValue = badge.criteria_value || 1;
    
    // Check if criteria_value is JSON
    if (badge.criteria_value && typeof badge.criteria_value === 'string') {
      try {
        JSON.parse(badge.criteria_value);
        logicJson = badge.criteria_value;
        criteriaValue = 1; // Default for count type
      } catch (e) {
        // Not JSON, use as simple criteria_value
        criteriaValue = badge.criteria_value;
      }
    }
    
    setEditBadge({
      name: badge.name || '',
      description: badge.description || '',
      badge_type: badge.badge_type || 'achievement',
      criteria_type: badge.criteria_type || 'count',
      criteria_value: typeof criteriaValue === 'number' ? criteriaValue : 1,
      icon_name: badge.icon_url || '',
      logic_json: logicJson
    });
    setEditJsonError(null);
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedBadge(null);
    setEditJsonError(null);
    setUploadingEditIcon(false);
    setEditBadge({
      name: '',
      description: '',
      badge_type: 'achievement',
      criteria_type: 'count',
      criteria_value: 1,
      icon_name: '',
      logic_json: ''
    });
  };

  const handleDeleteBadge = async (badgeId: number) => {
    if (!window.confirm('Are you sure you want to delete this badge? This will remove it from all users.')) {
      return;
    }
    
    try {
      setLoading(true);
      await badgeAPI.deleteBadge(badgeId);
      fetchBadges();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete badge');
    } finally {
      setLoading(false);
    }
  };

  if (loading && badges.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Badge Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<BadgeIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Create New Badge
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Badge Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        {badges.map((badge) => (
          <Card key={badge.id}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BadgeImageDisplay badge={badge} />
                <Box>
                  <Typography variant="h6">{badge.name}</Typography>
                  <Chip 
                    label={badge.badge_type} 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                  />
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {badge.description}
              </Typography>
              <Typography variant="caption" display="block">
                Criteria: {badge.criteria_type} {badge.criteria_value && `(${badge.criteria_value})`}
              </Typography>
              {badge.criteria_value && (() => {
                try {
                  JSON.parse(badge.criteria_value);
                  return (
                    <Typography variant="caption" display="block" sx={{ mt: 1, fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                      Logic: {badge.criteria_value}
                    </Typography>
                  );
                } catch (e) {
                  return null;
                }
              })()}
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => openEditDialog(badge)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleDeleteBadge(badge.id)}
                  disabled={loading}
                >
                  Delete
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Create Badge Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Badge</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Badge Name"
              value={newBadge.name}
              onChange={(e) => setNewBadge(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newBadge.description}
              onChange={(e) => setNewBadge(prev => ({ ...prev, description: e.target.value }))}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Badge Type</InputLabel>
              <Select
                value={newBadge.badge_type}
                label="Badge Type"
                onChange={(e) => setNewBadge(prev => ({ ...prev, badge_type: e.target.value }))}
              >
                <MenuItem value="achievement">Achievement</MenuItem>
                <MenuItem value="milestone">Milestone</MenuItem>
                <MenuItem value="social">Social</MenuItem>
                <MenuItem value="exploration">Exploration</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Criteria Type</InputLabel>
              <Select
                value={newBadge.criteria_type}
                label="Criteria Type"
                onChange={(e) => setNewBadge(prev => ({ ...prev, criteria_type: e.target.value }))}
              >
                <MenuItem value="count">Count</MenuItem>
                <MenuItem value="first_time">First Time</MenuItem>
                <MenuItem value="location">Location</MenuItem>
                <MenuItem value="tag">Tag</MenuItem>
                <MenuItem value="completion">Completion</MenuItem>
              </Select>
            </FormControl>
            {(newBadge.criteria_type === 'count') && (
              <TextField
                fullWidth
                label="Criteria Value"
                type="number"
                value={newBadge.criteria_value}
                onChange={(e) => setNewBadge(prev => ({ ...prev, criteria_value: parseInt(e.target.value) || 1 }))}
                inputProps={{ min: 1 }}
              />
            )}
            <Box>
              <Typography variant="body2" gutterBottom>
                Badge Icon
              </Typography>
              <UploadButton
                variant="outlined"
                disabled={uploadingIcon}
                startIcon={uploadingIcon ? <CircularProgress size={20} /> : undefined}
              >
                {uploadingIcon ? 'Uploading...' : 'Upload Icon'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleIconUpload(file, false);
                    }
                  }}
                />
              </UploadButton>
              {newBadge.icon_name && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={`Icon: ${newBadge.icon_name.split('/').pop()}`} 
                    size="small" 
                    color="success" 
                    variant="outlined"
                  />
                  <Button
                    size="small"
                    color="error"
                    onClick={() => setNewBadge(prev => ({ ...prev, icon_name: '' }))}
                  >
                    Remove
                  </Button>
                </Box>
              )}
            </Box>
            <TextField
              fullWidth
              label="Logic JSON"
              multiline
              rows={4}
              value={newBadge.logic_json}
              onChange={(e) => {
                const value = e.target.value;
                setNewBadge(prev => ({ ...prev, logic_json: value }));
                
                // Real-time JSON validation
                if (value.trim()) {
                  try {
                    JSON.parse(value);
                    setJsonError(null);
                  } catch (err) {
                    setJsonError('Invalid JSON format');
                  }
                } else {
                  setJsonError(null);
                }
              }}
              helperText={
                jsonError || 
                "JSON logic examples: {\"type\": \"entry_count\", \"value\": 10} or {\"type\": \"location_specific\", \"location_type\": \"restaurant\", \"count\": 5}"
              }
              error={!!jsonError}
              placeholder='{"type": "entry_count", "value": 10}'
            />
            {newBadge.logic_json && !jsonError && (
              <Box sx={{ mt: 1, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="caption" color="success.contrastText">
                  ✓ Valid JSON: The logic will be processed correctly
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateBadge} 
            variant="contained"
            disabled={!!jsonError || !newBadge.name.trim() || !newBadge.description.trim() || !newBadge.icon_name.trim()}
          >
            Create Badge
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Badge Dialog */}
      <Dialog open={editDialogOpen} onClose={closeEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Badge</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Badge Name"
              value={editBadge.name}
              onChange={(e) => setEditBadge(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={editBadge.description}
              onChange={(e) => setEditBadge(prev => ({ ...prev, description: e.target.value }))}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Badge Type</InputLabel>
              <Select
                value={editBadge.badge_type}
                label="Badge Type"
                onChange={(e) => setEditBadge(prev => ({ ...prev, badge_type: e.target.value }))}
              >
                <MenuItem value="achievement">Achievement</MenuItem>
                <MenuItem value="milestone">Milestone</MenuItem>
                <MenuItem value="social">Social</MenuItem>
                <MenuItem value="exploration">Exploration</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Criteria Type</InputLabel>
              <Select
                value={editBadge.criteria_type}
                label="Criteria Type"
                onChange={(e) => setEditBadge(prev => ({ ...prev, criteria_type: e.target.value }))}
              >
                <MenuItem value="count">Count</MenuItem>
                <MenuItem value="first_time">First Time</MenuItem>
                <MenuItem value="location">Location</MenuItem>
                <MenuItem value="tag">Tag</MenuItem>
                <MenuItem value="completion">Completion</MenuItem>
              </Select>
            </FormControl>
            {(editBadge.criteria_type === 'count') && (
              <TextField
                fullWidth
                label="Criteria Value"
                type="number"
                value={editBadge.criteria_value}
                onChange={(e) => setEditBadge(prev => ({ ...prev, criteria_value: parseInt(e.target.value) || 1 }))}
                inputProps={{ min: 1 }}
              />
            )}
            <Box>
              <Typography variant="body2" gutterBottom>
                Badge Icon
              </Typography>
              <UploadButton
                variant="outlined"
                disabled={uploadingEditIcon}
                startIcon={uploadingEditIcon ? <CircularProgress size={20} /> : undefined}
              >
                {uploadingEditIcon ? 'Uploading...' : 'Upload Icon'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleIconUpload(file, true);
                    }
                  }}
                />
              </UploadButton>
              {editBadge.icon_name && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={`Icon: ${editBadge.icon_name.split('/').pop()}`} 
                    size="small" 
                    color="success" 
                    variant="outlined"
                  />
                  <Button
                    size="small"
                    color="error"
                    onClick={() => setEditBadge(prev => ({ ...prev, icon_name: '' }))}
                  >
                    Remove
                  </Button>
                </Box>
              )}
            </Box>
            <TextField
              fullWidth
              label="Logic JSON"
              multiline
              rows={4}
              value={editBadge.logic_json}
              onChange={(e) => {
                const value = e.target.value;
                setEditBadge(prev => ({ ...prev, logic_json: value }));
                
                // Real-time JSON validation
                if (value.trim()) {
                  try {
                    JSON.parse(value);
                    setEditJsonError(null);
                  } catch (err) {
                    setEditJsonError('Invalid JSON format');
                  }
                } else {
                  setEditJsonError(null);
                }
              }}
              helperText={
                editJsonError || 
                "JSON logic examples: {\"type\": \"entry_count\", \"value\": 10} or {\"type\": \"location_specific\", \"location_type\": \"restaurant\", \"count\": 5}"
              }
              error={!!editJsonError}
              placeholder='{"type": "entry_count", "value": 10}'
            />
            {editBadge.logic_json && !editJsonError && (
              <Box sx={{ mt: 1, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                <Typography variant="caption" color="success.contrastText">
                  ✓ Valid JSON: The logic will be processed correctly
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog}>Cancel</Button>
          <Button 
            onClick={handleEditBadge} 
            variant="contained"
            disabled={!!editJsonError || !editBadge.name.trim() || !editBadge.description.trim() || !editBadge.icon_name.trim()}
          >
            Update Badge
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPanel;
