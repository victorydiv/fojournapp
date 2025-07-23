import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  LocationOn as LocationIcon,
  Photo as PhotoIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { entriesAPI } from '../services/api';
import { CreateEntryData, MediaFile } from '../types';
import MediaUpload from './MediaUpload';

interface CreateEntryDialogProps {
  open: boolean;
  onClose: () => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
    locationName?: string;
  };
  initialDate?: Date;
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
  initialLocation,
  initialDate,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [entryData, setEntryData] = useState<CreateEntryData>({
    title: '',
    description: '',
    latitude: initialLocation?.latitude || 0,
    longitude: initialLocation?.longitude || 0,
    locationName: initialLocation?.locationName || '',
    entryDate: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    tags: [],
  });
  const [pendingMedia, setPendingMedia] = useState<MediaFile[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const createMutation = useMutation({
    mutationFn: (data: CreateEntryData) => entriesAPI.createEntry(data),
    onSuccess: (response) => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      
      // If we have pending media files and got an entry ID, upload them
      if (pendingMedia.length > 0 && response.data.entry?.id) {
        // Note: We'll handle media upload after entry creation
        console.log('Entry created, would upload media files:', pendingMedia);
      }
      
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      console.error('Failed to create entry:', error);
    },
  });

  const resetForm = () => {
    setEntryData({
      title: '',
      description: '',
      latitude: initialLocation?.latitude || 0,
      longitude: initialLocation?.longitude || 0,
      locationName: initialLocation?.locationName || '',
      entryDate: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      tags: [],
    });
    setPendingMedia([]);
    setErrors({});
    setActiveTab(0);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!entryData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!entryData.entryDate) {
      newErrors.entryDate = 'Date is required';
    }
    
    if (entryData.latitude === 0 && entryData.longitude === 0) {
      newErrors.location = 'Location coordinates are required';
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

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: '600px' } }}
    >
      <DialogTitle>
        <Typography variant="h5">Create New Travel Entry</Typography>
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
            
            <DatePicker
              label="Entry Date"
              value={entryData.entryDate ? new Date(entryData.entryDate) : new Date()}
              onChange={(newDate: Date | null) => {
                if (newDate) {
                  setEntryData(prev => ({ 
                    ...prev, 
                    entryDate: format(newDate, 'yyyy-MM-dd') 
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
              options={[]}
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
                  placeholder="Add tags (press Enter to add)..."
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
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add photos, videos, and documents to your travel entry. 
              Media files will be uploaded after the entry is created.
            </Typography>
            
            <MediaUpload
              existingMedia={pendingMedia}
              onMediaChange={setPendingMedia}
              maxFiles={10}
              maxFileSize={50}
            />
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
