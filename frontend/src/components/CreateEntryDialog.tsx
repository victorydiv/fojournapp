import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Tabs,
  Tab,
  Autocomplete,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  LocationOn as LocationIcon,
  Photo as PhotoIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import { entriesAPI, mediaAPI } from '../services/api';
import api from '../services/api';
import { CreateEntryData, MediaFile } from '../types';
import { generateVideoThumbnail, isVideoFile, getVideoDuration, formatDuration } from '../utils/videoUtils';
import { useNotification } from '../contexts/NotificationContext';

interface CreateEntryDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void; // Callback when entry is successfully created
  initialLocation?: {
    latitude: number;
    longitude: number;
    locationName?: string;
  };
  initialDate?: Date | string;
  dreamData?: {
    id: number;
    title: string;
    description?: string;
    tags: string[];
    research_links?: Array<{title?: string; url: string; description?: string}>;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>
    {value === index && children}
  </Box>
);

const CreateEntryDialog: React.FC<CreateEntryDialogProps> = ({
  open,
  onClose,
  onSave,
  initialLocation,
  initialDate,
  dreamData,
}) => {
  const queryClient = useQueryClient();
  const { showBadgeEarned } = useNotification();
  const [activeTab, setActiveTab] = useState(0);
  
  // Get today's date as YYYY-MM-DD string - SIMPLE AND DIRECT
  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    const result = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return result;
  };
  
  // Use today's date unless initialDate is explicitly provided
  const initialEntryDate = initialDate 
    ? (typeof initialDate === 'string' ? initialDate : format(initialDate, 'yyyy-MM-dd'))
    : getTodayString();
  
  const [entryData, setEntryData] = useState<CreateEntryData>({
    title: dreamData?.title || '',
    description: dreamData?.description || '',
    latitude: initialLocation?.latitude || 0,
    longitude: initialLocation?.longitude || 0,
    locationName: initialLocation?.locationName || '',
    memoryType: 'other',
    restaurantRating: undefined,
    isDogFriendly: false,
    entryDate: initialEntryDate,
    tags: dreamData?.tags || [],
    links: dreamData?.research_links?.map(link => ({
      title: link.title || 'Research Link',
      url: link.url,
      description: link.description,
      linkType: 'other'
    })) || [],
    dreamId: dreamData?.id,
  });
  const [pendingMedia, setPendingMedia] = useState<MediaFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]); // Store actual files for upload
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [processingFiles, setProcessingFiles] = useState<boolean>(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Fetch available tags when dialog opens
  useEffect(() => {
    if (open) {
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
    }
  }, [open]);

  // Update entry data when initialLocation changes
  useEffect(() => {
    if (initialLocation) {
      setEntryData(prev => ({
        ...prev,
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        locationName: initialLocation.locationName || '',
      }));
    }
  }, [initialLocation]);

  const createMutation = useMutation({
    mutationFn: (data: CreateEntryData) => entriesAPI.createEntry(data),
    onSuccess: async (response) => {
      // Show badge notifications if any badges were awarded
      if (response.data.awardedBadges && response.data.awardedBadges.length > 0) {
        response.data.awardedBadges.forEach((badge: any) => {
          showBadgeEarned(badge.name);
        });
      }
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      
      // If we have pending files and got an entry ID, upload them
      if (pendingFiles.length > 0 && response.data.entry?.id) {
        try {
          console.log('Entry created, uploading media files:', pendingFiles);
          const mediaResponse = await mediaAPI.uploadFiles(response.data.entry.id, pendingFiles);
          console.log('Media files uploaded successfully');
          
          // Show badge notifications for media uploads too
          if (mediaResponse.data.awardedBadges && mediaResponse.data.awardedBadges.length > 0) {
            mediaResponse.data.awardedBadges.forEach((badge: any) => {
              showBadgeEarned(badge.name);
            });
          }
        } catch (error) {
          console.error('Failed to upload media files:', error);
          // Note: Entry was created successfully, only media upload failed
          // We could show a warning here but won't block the success flow
        }
      }
      
      // Call onSave callback if provided
      if (onSave) {
        onSave();
      }
      
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      console.error('Failed to create entry:', error);
    },
  });

  const resetForm = () => {
    // Clean up object URLs to prevent memory leaks
    pendingMedia.forEach(media => {
      if (media.url) {
        URL.revokeObjectURL(media.url);
      }
    });
    
    setEntryData({
      title: '',
      description: '',
      latitude: initialLocation?.latitude || 0,
      longitude: initialLocation?.longitude || 0,
      locationName: initialLocation?.locationName || '',
      memoryType: 'other',
      restaurantRating: undefined,
      isDogFriendly: false,
      entryDate: initialDate 
        ? (typeof initialDate === 'string' ? initialDate : format(initialDate, 'yyyy-MM-dd'))
        : getTodayString(),
      tags: [],
    });
    setPendingMedia([]);
    setPendingFiles([]);
    setErrors({});
    setActiveTab(0);
    setProcessingFiles(false);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!entryData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!entryData.entryDate) {
      newErrors.entryDate = 'Date is required';
    }
    
    // Location validation - coordinates should be valid numbers
    if (isNaN(entryData.latitude) || isNaN(entryData.longitude)) {
      newErrors.location = 'Invalid location coordinates';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      setActiveTab(0); // Switch to info tab to show errors
      return;
    }
    
    createMutation.mutate(entryData);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleTagsChange = (event: any, value: string[]) => {
    setEntryData(prev => ({ ...prev, tags: value }));
  };

  const handleFileSelection = async (files: File[]) => {
    setProcessingFiles(true);
    setPendingFiles(files);
    
    try {
      const mediaPreview: MediaFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = isVideoFile(file);
        let thumbnailUrl = '';
        let duration: number | undefined;
        
        if (isVideo) {
          try {
            // Generate thumbnail for video
            const thumbnail = await generateVideoThumbnail(file);
            thumbnailUrl = thumbnail.url;
            
            // Get video duration
            duration = await getVideoDuration(file);
          } catch (error) {
            console.warn('Failed to generate video thumbnail:', error);
            // Use a default video icon or placeholder
          }
        } else {
          // For images, create object URL for preview
          thumbnailUrl = URL.createObjectURL(file);
        }
        
        mediaPreview.push({
          id: -i - 1, // Temporary negative IDs
          fileName: file.name,
          originalName: file.name,
          fileType: isVideo ? 'video' : 'image',
          fileSize: file.size,
          mimeType: file.type,
          url: thumbnailUrl,
          uploadedAt: new Date().toISOString(), // Temporary timestamp for preview
          duration: duration,
        } as MediaFile & { duration?: number });
      }
      
      setPendingMedia(mediaPreview);
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setProcessingFiles(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: '600px' } }}
    >
      <DialogTitle>
        Create New Travel Entry
      </DialogTitle>
      
      <DialogContent>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab
            icon={<InfoIcon />}
            label="Entry Details"
            iconPosition="start"
          />
          <Tab
            icon={<LocationIcon />}
            label="Location"
            iconPosition="start"
          />
          <Tab
            icon={<PhotoIcon />}
            label="Media"
            iconPosition="start"
          />
        </Tabs>

        {/* Entry Details Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              fullWidth
              label="Title"
              value={entryData.title}
              onChange={(e) => setEntryData(prev => ({ ...prev, title: e.target.value }))}
              error={!!errors.title}
              helperText={errors.title}
              required
            />
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={entryData.description}
              onChange={(e) => setEntryData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your travel experience..."
            />

            <FormControl fullWidth>
              <InputLabel>Memory Type</InputLabel>
              <Select
                value={entryData.memoryType}
                label="Memory Type"
                onChange={(e) => setEntryData(prev => ({ ...prev, memoryType: e.target.value as any }))}
              >
                <MenuItem value="attraction">Attraction</MenuItem>
                <MenuItem value="restaurant">Restaurant</MenuItem>
                <MenuItem value="accommodation">Accommodation</MenuItem>
                <MenuItem value="activity">Activity</MenuItem>
                <MenuItem value="brewery">Brewery</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            {(entryData.memoryType === 'restaurant' || entryData.memoryType === 'brewery') && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  {entryData.memoryType === 'brewery' ? 'Brewery Rating' : 'Restaurant Rating'}
                </Typography>
                <ToggleButtonGroup
                  value={entryData.restaurantRating}
                  exclusive
                  onChange={(e, newValue) => {
                    setEntryData(prev => ({ ...prev, restaurantRating: newValue }));
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
              </Box>
            )}
            
            {/* Dog Friendly - Available for all memory types */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={entryData.isDogFriendly}
                  onChange={(e) => setEntryData(prev => ({ ...prev, isDogFriendly: e.target.checked }))}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  🐶 Dog Friendly
                </Box>
              }
              sx={{ mb: 2 }}
            />
            
            <DatePicker
              label="Entry Date"
              value={(() => {
                if (!entryData.entryDate) return new Date();
                
                // Simple date parsing - assume YYYY-MM-DD format
                if (typeof entryData.entryDate === 'string' && entryData.entryDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  const [year, month, day] = entryData.entryDate.split('-').map(Number);
                  return new Date(year, month - 1, day); // month is 0-indexed
                }
                
                return new Date(); // fallback to today
              })()}
              onChange={(newDate: Date | null) => {
                if (newDate) {
                  console.log('DatePicker onChange - newDate object:', newDate);
                  console.log('DatePicker onChange - newDate.toString():', newDate.toString());
                  console.log('DatePicker onChange - getFullYear():', newDate.getFullYear());
                  console.log('DatePicker onChange - getMonth():', newDate.getMonth());
                  console.log('DatePicker onChange - getDate():', newDate.getDate());
                  
                  // Simple date formatting without timezone conversion
                  const year = newDate.getFullYear();
                  const month = String(newDate.getMonth() + 1).padStart(2, '0');
                  const day = String(newDate.getDate()).padStart(2, '0');
                  const dateString = `${year}-${month}-${day}`;
                  
                  console.log('DatePicker onChange - final dateString:', dateString);
                  
                  setEntryData(prev => ({
                    ...prev,
                    entryDate: dateString
                  }));
                }
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.entryDate,
                  helperText: errors.entryDate,
                  required: true,
                }
              }}
            />
            
            <Autocomplete
              multiple
              freeSolo
              options={availableTags}
              value={entryData.tags}
              onChange={handleTagsChange}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...otherProps } = getTagProps({ index });
                  return (
                    <Chip
                      variant="outlined"
                      label={option}
                      key={key}
                      {...otherProps}
                    />
                  );
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Select or type tags to add..."
                />
              )}
            />
          </Box>
        </TabPanel>

        {/* Location Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              fullWidth
              label="Location Name"
              value={entryData.locationName}
              onChange={(e) => setEntryData(prev => ({ ...prev, locationName: e.target.value }))}
              placeholder="e.g., Central Park, New York City"
            />
            
            <Box display="flex" gap={2}>
              <TextField
                fullWidth
                label="Latitude"
                type="number"
                value={entryData.latitude}
                onChange={(e) => setEntryData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                inputProps={{ step: "any" }}
                required
              />
              <TextField
                fullWidth
                label="Longitude"
                type="number"
                value={entryData.longitude}
                onChange={(e) => setEntryData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                inputProps={{ step: "any" }}
                required
              />
            </Box>
            
            {errors.location && (
              <Alert severity="error">{errors.location}</Alert>
            )}
            
            {entryData.latitude !== 0 && entryData.longitude !== 0 && (
              <Alert severity="info">
                Location: {entryData.latitude.toFixed(6)}, {entryData.longitude.toFixed(6)}
                {entryData.locationName && ` (${entryData.locationName})`}
              </Alert>
            )}
          </Box>
        </TabPanel>

        {/* Media Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box display="flex" flexDirection="column" gap={2}>
            <Typography variant="body2" color="textSecondary">
              Select images and videos to upload with your travel entry. Files will be uploaded after the entry is created.
            </Typography>
            
            <Box>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    await handleFileSelection(files);
                  }
                }}
                style={{ display: 'none' }}
                id="media-upload-input"
                disabled={processingFiles}
              />
              <label htmlFor="media-upload-input">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={processingFiles ? <CircularProgress size={16} /> : <PhotoIcon />}
                  fullWidth
                  disabled={processingFiles}
                >
                  {processingFiles ? 'Processing Files...' : 'Select Files'}
                </Button>
              </label>
            </Box>
            
            {(pendingFiles.length > 0 || pendingMedia.length > 0) && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Files ({pendingFiles.length}):
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  {pendingMedia.map((media, index) => (
                    <Box
                      key={index}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        p: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={2}>
                        {/* Thumbnail preview */}
                        <Box
                          sx={{
                            width: 60,
                            height: 40,
                            borderRadius: 1,
                            overflow: 'hidden',
                            backgroundColor: 'grey.100',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {media.url ? (
                            <img
                              src={media.url}
                              alt={media.originalName}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            media.fileType === 'video' ? <VideoIcon /> : <ImageIcon />
                          )}
                          {media.fileType === 'video' && (media as any).duration && (
                            <Box
                              sx={{
                                position: 'absolute',
                                bottom: 2,
                                right: 2,
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                fontSize: '10px',
                                padding: '1px 3px',
                                borderRadius: '2px',
                              }}
                            >
                              {formatDuration((media as any).duration)}
                            </Box>
                          )}
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {media.originalName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {media.fileType} • {(media.fileSize / 1024 / 1024).toFixed(1)} MB
                            {media.fileType === 'video' && (media as any).duration &&
                              ` • ${formatDuration((media as any).duration)}`
                            }
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => {
                          const newFiles = pendingFiles.filter((_, i) => i !== index);
                          setPendingFiles(newFiles);
                          const newMedia = pendingMedia.filter((_, i) => i !== index);
                          // Clean up object URLs
                          if (media.url) {
                            URL.revokeObjectURL(media.url);
                          }
                          setPendingMedia(newMedia);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* General Error */}
        {createMutation.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Failed to create entry: {createMutation.error.message}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={handleCancel}
          startIcon={<CancelIcon />}
          disabled={createMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={createMutation.isPending ? <CircularProgress size={16} /> : <SaveIcon />}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Creating...' : 'Create Entry'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateEntryDialog;
