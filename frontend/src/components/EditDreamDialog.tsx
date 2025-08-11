import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Wrapper } from '@googlemaps/react-wrapper';
import { Dream, DreamType, DreamPriority, UpdateDreamData } from '../types';
import { dreamsService } from '../services/dreamsService';

interface EditDreamDialogProps {
  open: boolean;
  dream: Dream | null;
  onClose: () => void;
  onDreamUpdated: (dream: Dream) => void;
}

interface GoogleMapsAutocompleteProps {
  onLocationSelect: (place: google.maps.places.PlaceResult) => void;
  defaultValue?: string;
}

const GoogleMapsAutocomplete: React.FC<GoogleMapsAutocompleteProps> = ({ 
  onLocationSelect, 
  defaultValue 
}) => {
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!inputRef || !window.google?.maps?.places?.Autocomplete) return;

    const autocompleteInstance = new window.google.maps.places.Autocomplete(inputRef, {
      types: ['establishment', 'geocode'],
      fields: ['place_id', 'name', 'geometry', 'formatted_address', 'address_components'],
    });

    autocompleteInstance.addListener('place_changed', () => {
      const place = autocompleteInstance.getPlace();
      if (place && place.geometry) {
        onLocationSelect(place);
      }
    });

    return () => {
      if (autocompleteInstance && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteInstance);
      }
    };
  }, [inputRef, onLocationSelect]);

  return (
    <TextField
      inputRef={setInputRef}
      fullWidth
      label="Search Location"
      defaultValue={defaultValue}
      helperText="Search for a place, restaurant, attraction, etc."
      margin="dense"
    />
  );
};

const EditDreamDialog: React.FC<EditDreamDialogProps> = ({
  open,
  dream,
  onClose,
  onDreamUpdated,
}) => {
  const [formData, setFormData] = useState<UpdateDreamData>({
    title: '',
    description: '',
    dream_type: 'destination',
    priority: 'medium',
    notes: '',
    estimated_budget: undefined,
    best_time_to_visit: '',
  });
  const [selectedLocation, setSelectedLocation] = useState<google.maps.places.PlaceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dream) {
      setFormData({
        title: dream.title,
        description: dream.description || '',
        dream_type: dream.dream_type,
        priority: dream.priority,
        notes: dream.notes || '',
        estimated_budget: dream.estimated_budget || undefined,
        best_time_to_visit: dream.best_time_to_visit || '',
      });
    }
  }, [dream]);

  const handleLocationSelect = (place: google.maps.places.PlaceResult) => {
    setSelectedLocation(place);
    if (place.name && !formData.title) {
      setFormData(prev => ({
        ...prev,
        title: place.name || '',
      }));
    }
  };

  const handleSubmit = async () => {
    if (!dream) return;

    try {
      setLoading(true);
      setError(null);

      const updateData: UpdateDreamData = {
        ...formData,
      };

      // Include location data if a new location was selected
      if (selectedLocation?.geometry?.location) {
        const lat = selectedLocation.geometry.location.lat();
        const lng = selectedLocation.geometry.location.lng();
        
        updateData.latitude = lat;
        updateData.longitude = lng;
        updateData.location_name = selectedLocation.formatted_address || selectedLocation.name;
        updateData.place_id = selectedLocation.place_id;

        // Extract country and region from address components
        if (selectedLocation.address_components) {
          for (const component of selectedLocation.address_components) {
            if (component.types.includes('country')) {
              updateData.country = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
              updateData.region = component.long_name;
            }
          }
        }
      }

      await dreamsService.updateDream(dream.id, updateData);
      
      // Create updated dream object for callback
      const updatedDream: Dream = {
        ...dream,
        ...updateData,
        updated_at: new Date().toISOString(),
      };
      
      onDreamUpdated(updatedDream);
      onClose();
    } catch (error) {
      console.error('Failed to update dream:', error);
      setError(error instanceof Error ? error.message : 'Failed to update dream');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      dream_type: 'destination',
      priority: 'medium',
      notes: '',
      estimated_budget: undefined,
      best_time_to_visit: '',
    });
    setSelectedLocation(null);
    setError(null);
    onClose();
  };

  if (!dream) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Dream</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 1 }}>
          <Wrapper apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}>
            <GoogleMapsAutocomplete 
              onLocationSelect={handleLocationSelect}
              defaultValue={dream.location_name}
            />
          </Wrapper>

          <TextField
            fullWidth
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            margin="dense"
            required
          />

          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            margin="dense"
            multiline
            rows={3}
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <FormControl fullWidth margin="dense">
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.dream_type}
                label="Type"
                onChange={(e) => setFormData(prev => ({ ...prev, dream_type: e.target.value as DreamType }))}
              >
                <MenuItem value="destination">Destination</MenuItem>
                <MenuItem value="attraction">Attraction</MenuItem>
                <MenuItem value="restaurant">Restaurant</MenuItem>
                <MenuItem value="accommodation">Accommodation</MenuItem>
                <MenuItem value="activity">Activity</MenuItem>
                <MenuItem value="brewery">Brewery</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                label="Priority"
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as DreamPriority }))}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TextField
            fullWidth
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            margin="dense"
            multiline
            rows={3}
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Estimated Budget"
              type="number"
              value={formData.estimated_budget || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                estimated_budget: e.target.value ? parseFloat(e.target.value) : undefined 
              }))}
              margin="dense"
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
            />

            <TextField
              fullWidth
              label="Best Time to Visit"
              value={formData.best_time_to_visit}
              onChange={(e) => setFormData(prev => ({ ...prev, best_time_to_visit: e.target.value }))}
              margin="dense"
              placeholder="e.g., Spring, Summer 2025"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.title?.trim()}
        >
          {loading ? <CircularProgress size={20} /> : 'Update Dream'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDreamDialog;
