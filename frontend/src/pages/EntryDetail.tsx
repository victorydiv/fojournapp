import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  Link,
  Divider,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Fab,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Checkbox,
  Fade,
  Stack,
  Switch,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Link as LinkIcon,
  Photo as PhotoIcon,
  VideoLibrary as VideoIcon,
  Description as DocumentIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PlayArrow as PlayArrowIcon,
  Public as PublicIcon,
  Star as StarIcon,
  VisibilityOff as PrivateIcon,
  Share as ShareIcon,
  Link as LinkIcon2
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import SocialShare from '../components/SocialShare';
import { entriesAPI, mediaAPI, collaborationAPI } from '../services/api';
import api from '../services/api';
import MediaUpload from '../components/MediaUpload';
import { TravelEntry, MediaFile } from '../types';
import { backgroundStyles, componentStyles } from '../theme/fojournTheme';
import { useAuth } from '../context/AuthContext';

// Helper function to safely convert to number and format
const safeToFixed = (value: any, decimals: number = 6): string => {
  const num = Number(value);
  return isNaN(num) ? 'Invalid' : num.toFixed(decimals);
};

// Helper function to safely get coordinates for maps
const safeCoordinate = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// Helper function to safely format dates
const safeFormatDate = (dateString: string | Date, formatString: string = 'MMM dd, yyyy'): string => {
  try {
    if (!dateString) return 'Unknown date';
    
    let date: Date;
    if (typeof dateString === 'string') {
      // Try parsing as ISO string first
      date = parseISO(dateString);
      
      // If that fails, try creating a new Date
      if (!isValid(date)) {
        date = new Date(dateString);
      }
    } else {
      date = dateString;
    }
    
    // Check if the date is valid
    if (!isValid(date)) {
      console.warn('Invalid date:', dateString);
      return 'Invalid date';
    }
    
    return format(date, formatString);
  } catch (error) {
    console.error('Date formatting error:', error, dateString);
    return 'Date error';
  }
};

// Google Maps component for showing location
const MapComponent: React.FC<{ entry: TravelEntry }> = ({ entry }) => {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    try {
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: { lat: safeCoordinate(entry.latitude), lng: safeCoordinate(entry.longitude) },
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapId: process.env.REACT_APP_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID', // Use Map ID from environment or fallback
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        mapTypeControl: true,
        gestureHandling: 'cooperative',
      });

      // Add marker for the entry location
      let marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement;
      if (window.google?.maps?.marker?.AdvancedMarkerElement) {
        // Use the new AdvancedMarkerElement
        try {
          marker = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: safeCoordinate(entry.latitude), lng: safeCoordinate(entry.longitude) },
            map: mapInstance,
            title: entry.title,
          });
        } catch (error) {
          console.warn('Advanced Marker failed, falling back to standard marker:', error);
          // Fallback to standard marker if Advanced Marker fails
          marker = new google.maps.Marker({
            position: { lat: safeCoordinate(entry.latitude), lng: safeCoordinate(entry.longitude) },
            map: mapInstance,
            title: entry.title,
            animation: google.maps.Animation.DROP,
          });
        }
      } else {
        // Fallback to legacy Marker
        marker = new google.maps.Marker({
          position: { lat: safeCoordinate(entry.latitude), lng: safeCoordinate(entry.longitude) },
          map: mapInstance,
          title: entry.title,
          animation: google.maps.Animation.DROP,
        });
      }

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${entry.title}</h3>
            ${entry.locationName ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${entry.locationName}</p>` : ''}
            <p style="margin: 0; font-size: 11px; color: #999;">
              ${safeToFixed(entry.latitude, 6)}, ${safeToFixed(entry.longitude, 6)}
            </p>
          </div>
        `,
      });

      // Open info window on marker click
      if (marker instanceof google.maps.Marker) {
        // Standard Marker
        marker.addListener('click', () => {
          infoWindow.open(mapInstance, marker);
        });
      } else {
        // AdvancedMarkerElement
        (marker as any).addEventListener('click', () => {
          infoWindow.open({
            anchor: marker,
            map: mapInstance,
          });
        });
      }

      setMap(mapInstance);

      // Auto-open info window after a short delay for better UX
      setTimeout(() => {
        if (marker instanceof google.maps.Marker) {
          // Standard Marker
          infoWindow.open(mapInstance, marker);
        } else {
          // AdvancedMarkerElement
          infoWindow.open({
            anchor: marker,
            map: mapInstance,
          });
        }
      }, 1000);

    } catch (error) {
      console.error('Error initializing Google Maps:', error);
    }
  }, [entry]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
};

// Render function for different Google Maps loading states
const renderMap = (status: Status, entry: TravelEntry): React.ReactElement => {
  switch (status) {
    case Status.LOADING:
      return (
        <Box
          sx={{
            height: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: 2,
          }}
        >
          <CircularProgress />
        </Box>
      );
    case Status.FAILURE:
      return (
        <Paper elevation={2} sx={{ height: 300, overflow: 'hidden', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
          <Box textAlign="center">
            <LocationIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Failed to load Google Maps
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {entry.locationName || 'Location not specified'}
            </Typography>
          </Box>
        </Paper>
      );
    case Status.SUCCESS:
      return (
        <Paper elevation={2} sx={{ height: 300, overflow: 'hidden', borderRadius: 2 }}>
          <MapComponent entry={entry} />
        </Paper>
      );
    default:
      return (
        <Paper elevation={2} sx={{ height: 300, overflow: 'hidden', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
          <Box textAlign="center">
            <LocationIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Loading Google Maps...
            </Typography>
          </Box>
        </Paper>
      );
  }
};

// Wrapper component for Google Maps
const EntryMap: React.FC<{ entry: TravelEntry }> = ({ entry }) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  
  return (
    <Wrapper 
      apiKey={apiKey} 
      libraries={['places', 'geometry']} 
      render={(status: Status) => renderMap(status, entry)} 
    />
  );
};

// Media gallery component
const MediaGallery: React.FC<{ media: MediaFile[]; entryId: number }> = ({ media, entryId }) => {
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);

  const getMediaIcon = (fileType: string) => {
    switch (fileType) {
      case 'image': return <PhotoIcon />;
      case 'video': return <VideoIcon />;
      default: return <DocumentIcon />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!media || media.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <PhotoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          No media files uploaded
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <ImageList variant="masonry" cols={3} gap={8}>
        {media.map((file) => (
          <ImageListItem key={file.id}>
            {file.fileType === 'image' ? (
              <img
                src={file.url}
                alt={file.originalName}
                loading="lazy"
                style={{ 
                  cursor: 'pointer', 
                  borderRadius: 8,
                  width: '100%',
                  height: 'auto',
                  display: 'block'
                }}
                onClick={() => setSelectedMedia(file)}
                onError={(e) => {
                  console.error('Image failed to load:', file.url);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : file.fileType === 'video' && file.thumbnailUrl ? (
              <Box
                sx={{ 
                  cursor: 'pointer', 
                  borderRadius: 1,
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => setSelectedMedia(file)}
              >
                <img
                  src={file.thumbnailUrl}
                  alt={file.originalName}
                  loading="lazy"
                  style={{ 
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    borderRadius: 8
                  }}
                  onError={(e) => {
                    console.error('Video thumbnail failed to load:', file.thumbnailUrl);
                    // Fallback to card view if thumbnail fails
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {/* Play button overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    borderRadius: '50%',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PlayArrowIcon sx={{ color: 'white', fontSize: '2rem' }} />
                </Box>
              </Box>
            ) : (
              <Card sx={{ cursor: 'pointer' }} onClick={() => setSelectedMedia(file)}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  {getMediaIcon(file.fileType)}
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {file.originalName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.fileSize)}
                  </Typography>
                </CardContent>
              </Card>
            )}
            <ImageListItemBar
              title={file.originalName}
              subtitle={formatFileSize(file.fileSize)}
            />
          </ImageListItem>
        ))}
      </ImageList>

      {/* Media preview dialog */}
      <Dialog
        open={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {selectedMedia?.originalName}
            <IconButton onClick={() => setSelectedMedia(null)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedMedia && (
            <>
              {selectedMedia.fileType === 'image' ? (
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.originalName}
                  style={{ width: '100%', height: 'auto' }}
                />
              ) : selectedMedia.fileType === 'video' ? (
                <video
                  src={selectedMedia.url}
                  controls
                  style={{ width: '100%', height: 'auto' }}
                />
              ) : (
                <Box textAlign="center" py={4}>
                  <DocumentIcon sx={{ fontSize: 64, mb: 2 }} />
                  <Typography variant="h6">{selectedMedia.originalName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatFileSize(selectedMedia.fileSize)}
                  </Typography>
                  <Button
                    variant="contained"
                    href={selectedMedia.url}
                    target="_blank"
                    sx={{ mt: 2 }}
                  >
                    Download File
                  </Button>
                </Box>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const EntryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [visibilityDialogOpen, setVisibilityDialogOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [visibilityData, setVisibilityData] = useState({
    isPublic: false,
    featured: false
  });
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    entryDate: '',
    locationName: '',
    latitude: 0,
    longitude: 0,
    memoryType: 'other' as 'attraction' | 'restaurant' | 'accommodation' | 'activity' | 'brewery' | 'other',
    restaurantRating: undefined as 'happy' | 'sad' | 'neutral' | undefined,
    isDogFriendly: false,
    tags: [] as string[],
  });

  // Check if we should open edit dialog from navigation state
  const locationState = location.state as any;
  const shouldOpenEditDialog = locationState?.openEditDialog;

  // Fetch available tags when component mounts
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await api.get('/search/tags');
        // Extract just the tag names from the {tag, count} objects
        const tagNames = response.data.tags?.map((tagObj: any) => tagObj.tag) || [];
        setAvailableTags(tagNames);
      } catch (err) {
        console.error('Failed to fetch tags:', err);
      }
    };

    fetchTags();
  }, []);

  // Fetch entry data
  const { data: entryResponse, isLoading, error } = useQuery({
    queryKey: ['entry', id],
    queryFn: () => entriesAPI.getEntry(Number(id)),
    enabled: !!id,
  });

  // Delete entry mutation
  const deleteMutation = useMutation({
    mutationFn: () => entriesAPI.deleteEntry(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      navigate('/dashboard');
    },
  });

  // Update entry mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => entriesAPI.updateEntry(Number(id), data),
    onSuccess: (response) => {
      // Force refresh the entry data
      queryClient.invalidateQueries({ queryKey: ['entry', id] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      // Add a small delay to ensure cache refresh, then close dialog
      setTimeout(() => {
        setEditMode(false);
      }, 100);
    },
    onError: (error) => {
      console.error('Update failed:', error);
    },
  });

  // Update memory visibility mutation
  const visibilityMutation = useMutation({
    mutationFn: (data: { isPublic: boolean; featured?: boolean }) => 
      collaborationAPI.updateMemoryVisibility(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entry', id] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      setVisibilityDialogOpen(false);
    },
    onError: (error) => {
      console.error('Visibility update failed:', error);
    },
  });

  // Initialize edit data when entry loads
  useEffect(() => {
    if (entryResponse?.data?.entry) {
      const entry = entryResponse.data.entry;
      setEditData({
        title: entry.title || '',
        description: entry.description || '',
        entryDate: entry.entryDate || '',
        locationName: entry.locationName || '',
        latitude: entry.latitude || 0,
        longitude: entry.longitude || 0,
        memoryType: entry.memoryType || 'other',
        restaurantRating: entry.restaurantRating,
        isDogFriendly: entry.isDogFriendly || false,
        tags: entry.tags || [],
      });
      
      // Initialize visibility data
      setVisibilityData({
        isPublic: entry.isPublic || false,
        featured: entry.featured || false
      });
    }
  }, [entryResponse?.data?.entry]);

  // Open edit dialog if requested from navigation state
  useEffect(() => {
    if (shouldOpenEditDialog && entryResponse?.data?.entry) {
      setEditMode(true);
      // Clear the navigation state to prevent reopening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [shouldOpenEditDialog, entryResponse?.data?.entry, navigate, location.pathname]);

  if (isLoading) {
    return (
      <Box sx={backgroundStyles.secondary}>
        <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  if (error || !entryResponse?.data?.entry) {
    return (
      <Box sx={backgroundStyles.secondary}>
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Alert severity="error">
            Failed to load entry details. The entry may not exist or you may not have permission to view it.
          </Alert>
          <Button onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
            Back to Dashboard
          </Button>
        </Container>
      </Box>
    );
  }

  const entry = entryResponse.data.entry;

  const handleDelete = () => {
    deleteMutation.mutate();
    setDeleteDialogOpen(false);
  };

  const handleEdit = () => {
    if (entryResponse?.data?.entry) {
      const entry = entryResponse.data.entry;
      setEditData({
        title: entry.title || '',
        description: entry.description || '',
        entryDate: entry.entryDate || '',
        locationName: entry.locationName || '',
        latitude: entry.latitude || 0,
        longitude: entry.longitude || 0,
        memoryType: entry.memoryType || 'other',
        restaurantRating: entry.restaurantRating,
        isDogFriendly: entry.isDogFriendly || false,
        tags: entry.tags || [],
      });
      setEditMode(true);
    }
  };

  const handleSaveEdit = () => {
    const updateData = {
      ...editData,
      tags: editData.tags.filter(tag => tag.trim() !== ''), // Remove empty tags
      // Ensure entryDate is in proper date format (YYYY-MM-DD only, no time)
      entryDate: editData.entryDate ? new Date(editData.entryDate).toISOString().split('T')[0] : undefined,
      // Ensure isDogFriendly is a boolean
      isDogFriendly: Boolean(editData.isDogFriendly),
    };
    
    // Remove undefined values to avoid validation issues
    const cleanedData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );
    
    console.log('Sending update data:', cleanedData);
    updateMutation.mutate(cleanedData);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    // Reset edit data to original values
    if (entryResponse?.data?.entry) {
      const entry = entryResponse.data.entry;
      setEditData({
        title: entry.title || '',
        description: entry.description || '',
        entryDate: entry.entryDate || '',
        locationName: entry.locationName || '',
        latitude: entry.latitude || 0,
        longitude: entry.longitude || 0,
        memoryType: entry.memoryType || 'other',
        restaurantRating: entry.restaurantRating,
        isDogFriendly: entry.isDogFriendly || false,
        tags: entry.tags || [],
      });
    }
  };

  const handleVisibilityClick = () => {
    setVisibilityDialogOpen(true);
  };

  const handleSaveVisibility = () => {
    // Generate a public slug if making public and don't have one
    const dataToSend = {
      ...visibilityData,
      publicSlug: visibilityData.isPublic ? `memory-${id}` : null
    };
    
    console.log('Sending visibility data:', dataToSend);
    visibilityMutation.mutate(dataToSend);
  };

  const handleCancelVisibility = () => {
    // Reset visibility data to original values
    if (entryResponse?.data?.entry) {
      const entry = entryResponse.data.entry;
      setVisibilityData({
        isPublic: entry.isPublic || false,
        featured: entry.featured || false
      });
    }
    setVisibilityDialogOpen(false);
  };

  const handleCopyMemoryLink = () => {
    if (entryResponse?.data?.entry?.publicSlug && user?.username) {
      const memoryUrl = `${window.location.origin}/u/${user.username}/memory/${entryResponse.data.entry.publicSlug}`;
      navigator.clipboard.writeText(memoryUrl);
      // Add a snackbar or toast notification here if available
    }
  };

  return (
    <Box sx={backgroundStyles.secondary}>
      <Fade in timeout={800}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        gap={{ xs: 2, sm: 0 }}
        mb={3}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {entry.title}
          </Typography>
          <Box 
            display="flex" 
            alignItems="center" 
            gap={1}
            mb={2}
            flexWrap="wrap"
          >
            <Chip
              icon={<CalendarIcon />}
              label={safeFormatDate(entry.entryDate)}
              variant="outlined"
            />
            {entry.locationName && (
              <Chip
                icon={<LocationIcon />}
                label={entry.locationName}
                variant="outlined"
                color="primary"
                sx={{
                  maxWidth: { xs: '100%', sm: 'none' },
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: { xs: '200px', sm: 'none' },
                  }
                }}
              />
            )}
          </Box>
        </Box>
        <Box 
          display="flex" 
          flexDirection={{ xs: 'column', sm: 'row' }}
          gap={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          width={{ xs: '100%', sm: 'auto' }}
        >
          <SocialShare entry={entry} variant="button" />
          <Button
            variant="outlined"
            startIcon={visibilityData.isPublic ? <PublicIcon /> : <PrivateIcon />}
            onClick={handleVisibilityClick}
            size="small"
            color={visibilityData.isPublic ? "success" : "primary"}
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minWidth: { xs: 'auto', sm: '64px' },
              padding: { xs: '6px 12px', sm: '8px 16px' },
            }}
          >
            {visibilityData.isPublic ? 'Public' : 'Private'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            size="small"
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minWidth: { xs: 'auto', sm: '64px' },
              padding: { xs: '6px 12px', sm: '8px 16px' },
            }}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            size="small"
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              minWidth: { xs: 'auto', sm: '64px' },
              padding: { xs: '6px 12px', sm: '8px 16px' },
            }}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
        {/* Main Content */}
        <Box flex={2}>
          {/* Description */}
          {entry.description && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                  {entry.description}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Memory Type and Restaurant Rating */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Memory Details
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                {entry.memoryType && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color="textSecondary">
                      Type:
                    </Typography>
                    <Chip 
                      label={entry.memoryType.charAt(0).toUpperCase() + entry.memoryType.slice(1)} 
                      size="small" 
                      variant="outlined" 
                    />
                  </Box>
                )}
                
                {(entry.memoryType === 'restaurant' || entry.memoryType === 'brewery') && (
                  <Box display="flex" flexDirection="column" gap={1}>
                    {entry.restaurantRating && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" color="textSecondary">
                          Rating:
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          {entry.restaurantRating === 'happy' && (
                            <>
                              <span style={{ fontSize: '1.5rem' }}>😊</span>
                              <Typography variant="body2">Great!</Typography>
                            </>
                          )}
                          {entry.restaurantRating === 'neutral' && (
                            <>
                              <span style={{ fontSize: '1.5rem' }}>😐</span>
                              <Typography variant="body2">Meh!</Typography>
                            </>
                          )}
                          {entry.restaurantRating === 'sad' && (
                            <>
                              <span style={{ fontSize: '1.5rem' }}>😞</span>
                              <Typography variant="body2">Ugh!</Typography>
                            </>
                          )}
                        </Box>
                      </Box>
                    )}
                    
                    {entry.isDogFriendly === true && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <span style={{ fontSize: '1.5rem' }}>🐶</span>
                        <Typography variant="body2" color="success.main">
                          Dog Friendly
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Media Gallery */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Media Gallery
              </Typography>
              <MediaGallery media={entry.media || []} entryId={entry.id} />
            </CardContent>
          </Card>

          {/* Links */}
          {entry.links && entry.links.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Related Links
                </Typography>
                <List>
                  {entry.links.map((link) => (
                    <ListItem key={link.id} divider>
                      <ListItemIcon>
                        <LinkIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Link href={link.url} target="_blank" rel="noopener">
                            {link.title}
                          </Link>
                        }
                        secondary={
                          <>
                            {link.description && (
                              <Typography variant="body2" color="text.secondary">
                                {link.description}
                              </Typography>
                            )}
                            <Chip
                              label={link.linkType}
                              size="small"
                              variant="outlined"
                              sx={{ mt: 1 }}
                            />
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Sidebar */}
        <Box flex={1} minWidth={{ md: 300 }}>
          {/* Location Map */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Location
                </Typography>
                <Box display="flex" gap={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<LocationIcon />}
                    onClick={() => {
                      const url = `https://maps.google.com/maps?q=${safeCoordinate(entry.latitude)},${safeCoordinate(entry.longitude)}`;
                      window.open(url, '_blank');
                    }}
                  >
                    Maps
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      const url = `https://maps.google.com/maps?q=${safeCoordinate(entry.latitude)},${safeCoordinate(entry.longitude)}&t=k`;
                      window.open(url, '_blank');
                    }}
                  >
                    Satellite
                  </Button>
                </Box>
              </Box>
              <EntryMap entry={entry} />
              <Box mt={2}>
                <Typography variant="body2" color="text.secondary">
                  Coordinates: {safeToFixed(entry.latitude, 6)}, {safeToFixed(entry.longitude, 6)}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Tags
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {entry.tags.map((tag, index) => (
                    <Chip key={index} label={tag} variant="filled" size="small" />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Entry Info */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Entry Info
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Created: {safeFormatDate(entry.createdAt, 'MMM dd, yyyy HH:mm')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Updated: {safeFormatDate(entry.updatedAt, 'MMM dd, yyyy HH:mm')}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Entry</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{entry.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Memory Visibility Dialog */}
      <Dialog open={visibilityDialogOpen} onClose={handleCancelVisibility} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PublicIcon />
            <Typography variant="h6">Memory Sharing Settings</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={visibilityData.isPublic}
                  onChange={(e) => setVisibilityData(prev => ({ ...prev, isPublic: e.target.checked }))}
                />
              }
              label="Make this memory public"
            />
            
            <Typography variant="body2" color="text.secondary">
              {visibilityData.isPublic 
                ? 'This memory will be visible on your public profile and can be shared with others.'
                : 'This memory will remain private and only visible to you.'
              }
            </Typography>

            {visibilityData.isPublic && (
              <FormControlLabel
                control={
                  <Switch
                    checked={visibilityData.featured}
                    onChange={(e) => setVisibilityData(prev => ({ ...prev, featured: e.target.checked }))}
                  />
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <StarIcon fontSize="small" />
                    <Typography>Feature this memory</Typography>
                  </Stack>
                }
              />
            )}

            {visibilityData.featured && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Featured memories appear prominently on your public profile and help showcase your best travel experiences.
              </Alert>
            )}

            {visibilityData.isPublic && entry.publicSlug && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" gutterBottom>
                  Public link for this memory:
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all', fontSize: '0.75rem' }}>
                    {window.location.origin}/u/{user?.username}/memory/{entry.publicSlug}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={handleCopyMemoryLink}
                    title="Copy link"
                  >
                    <LinkIcon2 />
                  </IconButton>
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelVisibility}>Cancel</Button>
          <Button
            onClick={handleSaveVisibility}
            variant="contained"
            disabled={visibilityMutation.isPending}
            startIcon={visibilityData.isPublic ? <PublicIcon /> : <PrivateIcon />}
          >
            {visibilityMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editMode}
        onClose={handleCancelEdit}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Memory</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Title"
              value={editData?.title || ''}
              onChange={(e) => setEditData(prev => ({ ...prev!, title: e.target.value }))}
            />
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={editData?.description || ''}
              onChange={(e) => setEditData(prev => ({ ...prev!, description: e.target.value }))}
            />
            
            <DatePicker
              label="Date"
              value={editData?.entryDate ? (() => {
                try {
                  // Handle different date formats
                  const dateStr = editData.entryDate;
                  if (dateStr.includes('T')) {
                    // Already has time component
                    return new Date(dateStr);
                  } else {
                    // Add time component to ensure local date
                    return new Date(dateStr + 'T00:00:00');
                  }
                } catch (error) {
                  console.warn('Invalid date format:', editData.entryDate);
                  return null;
                }
              })() : null}
              onChange={(newDate: Date | null) => {
                if (newDate) {
                  // Use local date components to avoid timezone issues
                  const year = newDate.getFullYear();
                  const month = String(newDate.getMonth() + 1).padStart(2, '0');
                  const day = String(newDate.getDate()).padStart(2, '0');
                  const dateString = `${year}-${month}-${day}`;
                  
                  setEditData(prev => ({ 
                    ...prev!, 
                    entryDate: dateString
                  }));
                }
              }}
            />
            
            <TextField
              fullWidth
              label="Location"
              value={editData?.locationName || ''}
              onChange={(e) => setEditData(prev => ({ ...prev!, locationName: e.target.value }))}
            />
            
            <TextField
              fullWidth
              label="Latitude"
              type="number"
              value={editData?.latitude || ''}
              onChange={(e) => setEditData(prev => ({ ...prev!, latitude: parseFloat(e.target.value) }))}
              inputProps={{ step: "any" }}
            />
            
            <TextField
              fullWidth
              label="Longitude"
              type="number"
              value={editData?.longitude || ''}
              onChange={(e) => setEditData(prev => ({ ...prev!, longitude: parseFloat(e.target.value) }))}
              inputProps={{ step: "any" }}
            />

            <FormControl fullWidth>
              <InputLabel>Memory Type</InputLabel>
              <Select
                value={editData?.memoryType || 'other'}
                label="Memory Type"
                onChange={(e) => setEditData(prev => ({ ...prev!, memoryType: e.target.value as any }))}
              >
                <MenuItem value="attraction">Attraction</MenuItem>
                <MenuItem value="restaurant">Restaurant</MenuItem>
                <MenuItem value="accommodation">Accommodation</MenuItem>
                <MenuItem value="activity">Activity</MenuItem>
                <MenuItem value="brewery">Brewery</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            {(editData?.memoryType === 'restaurant' || editData?.memoryType === 'brewery') && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  {editData?.memoryType === 'brewery' ? 'Brewery Rating' : 'Restaurant Rating'}
                </Typography>
                <ToggleButtonGroup
                  value={editData?.restaurantRating}
                  exclusive
                  onChange={(e, newValue) => {
                    setEditData(prev => ({ ...prev!, restaurantRating: newValue }));
                  }}
                  aria-label="restaurant rating"
                  sx={{ mb: 2 }}
                >
                  <ToggleButton value="happy" aria-label="happy">
                    😊 Great!
                  </ToggleButton>
                  <ToggleButton value="neutral" aria-label="neutral">
                    😐 Meh!
                  </ToggleButton>
                  <ToggleButton value="sad" aria-label="sad">
                    😞 Ugh!
                  </ToggleButton>
                </ToggleButtonGroup>
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editData?.isDogFriendly || false}
                      onChange={(e) => setEditData(prev => ({ ...prev!, isDogFriendly: e.target.checked }))}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      🐶 Dog Friendly
                    </Box>
                  }
                />
              </Box>
            )}
            
            <Autocomplete
              multiple
              freeSolo
              options={availableTags}
              value={editData?.tags || []}
              onChange={(event: any, value: string[]) => {
                setEditData(prev => ({ ...prev!, tags: value }));
              }}
              renderTags={(value: string[], getTagProps: any) =>
                value.map((option: string, index: number) => {
                  const { key, ...otherProps } = getTagProps({ index });
                  return (
                    <Chip key={key} variant="outlined" label={option} {...otherProps} />
                  );
                })
              }
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Add tags..."
                />
              )}
            />

            {/* Media Upload Section */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Media Files
              </Typography>
              <MediaUpload
                entryId={entry.id}
                existingMedia={entry.media || []}
                maxFiles={10}
                maxFileSize={50}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit}>Cancel</Button>
          <Button 
            onClick={handleSaveEdit} 
            variant="contained"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
        </Container>
      </Fade>
    </Box>
  );
};

export default EntryDetail;
