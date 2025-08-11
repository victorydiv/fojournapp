import React, { useState, useRef, useEffect } from 'react';
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
  Chip,
  Alert,
  CircularProgress,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  MyLocation as MyLocationIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { CreateDreamData, DreamType, DreamPriority } from '../types';
import { dreamsService } from '../services/dreamsService';

interface CreateDreamDialogProps {
  open: boolean;
  onClose: () => void;
  onDreamCreated: (dream: any) => void;
  initialData?: Partial<CreateDreamData>;
}

interface MapComponentProps {
  onLocationSelect: (location: { lat: number; lng: number }, address?: string, placeId?: string, place?: google.maps.places.PlaceResult) => void;
  locationSearchValue: string;
  setLocationSearchValue: (value: string) => void;
  onManualSearch: () => void;
  onUseCurrentLocation: () => void;
  mapError?: string;
}

const MapComponent: React.FC<MapComponentProps> = ({
  onLocationSelect,
  locationSearchValue,
  setLocationSearchValue,
  onManualSearch,
  onUseCurrentLocation,
  mapError
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current || map) return;

    console.log('Initializing map in CreateDream dialog');
    
    const mapInstance = new google.maps.Map(mapRef.current, {
      center: { lat: 39.8283, lng: -98.5795 }, // Center of US
      zoom: 4,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      gestureHandling: 'cooperative',
    });

    console.log('Map instance created:', mapInstance);

    // Add click listener to map
    mapInstance.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const location = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        console.log('Map clicked at:', location);
        onLocationSelect(location);
        
        // Update marker
        if (marker) {
          marker.setMap(null);
        }
        
        const newMarker = new google.maps.Marker({
          position: location,
          map: mapInstance,
          title: 'Selected Location',
          animation: google.maps.Animation.DROP,
        });
        
        setMarker(newMarker);
      }
    });

    setMap(mapInstance);
    console.log('Map initialization completed successfully');
  }, [onLocationSelect, marker]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!map || !searchInputRef.current || autocomplete) return;

    console.log('Initializing Places Autocomplete');
    
    const autocompleteInstance = new google.maps.places.Autocomplete(
      searchInputRef.current,
      {
        fields: ['place_id', 'geometry', 'name', 'formatted_address', 'types', 'address_components'],
        types: ['establishment', 'geocode'],
      }
    );

    autocompleteInstance.addListener('place_changed', () => {
      console.log('Place changed event triggered');
      const place = autocompleteInstance.getPlace();
      console.log('Selected place:', place);
      
      if (place.geometry?.location) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        
        onLocationSelect(location, place.formatted_address || place.name, place.place_id, place);
        
        // Center map on selected location
        map.setCenter(location);
        map.setZoom(15);
        
        // Update marker
        if (marker) {
          marker.setMap(null);
        }
        
        const newMarker = new google.maps.Marker({
          position: location,
          map: map,
          title: place.name || 'Selected Location',
          animation: google.maps.Animation.DROP,
        });
        
        setMarker(newMarker);
      } else if (place.place_id) {
        // If no geometry but we have place_id, try to get details
        console.log('No geometry found, trying PlacesService for details...');
        const service = new google.maps.places.PlacesService(map);
        service.getDetails({
          placeId: place.place_id,
          fields: ['geometry', 'formatted_address', 'name', 'types', 'address_components']
        }, (result, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
            const location = {
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng()
            };
            
            onLocationSelect(location, result.formatted_address || result.name, place.place_id, result);
            map.setCenter(location);
            map.setZoom(15);
            
            // Update marker
            if (marker) {
              marker.setMap(null);
            }
            
            const newMarker = new google.maps.Marker({
              position: location,
              map: map,
              title: result.name || 'Selected Location',
              animation: google.maps.Animation.DROP,
            });
            
            setMarker(newMarker);
          } else {
            console.warn('PlacesService getDetails failed:', status);
          }
        });
      } else {
        console.warn('Place has no geometry or place_id:', place);
      }
    });
    
    setAutocomplete(autocompleteInstance);
    console.log('Autocomplete initialized successfully');
  }, [map, onLocationSelect, marker]);

  return (
    <Box>
      {/* Location Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          inputRef={searchInputRef}
          fullWidth
          label="Search for a location"
          placeholder="Enter a city, landmark, or address"
          value={locationSearchValue}
          onChange={(e) => setLocationSearchValue(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onManualSearch();
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Stack direction="row" spacing={1}>
                  <IconButton
                    size="small"
                    onClick={onUseCurrentLocation}
                    title="Use current location"
                  >
                    <MyLocationIcon />
                  </IconButton>
                  {locationSearchValue && (
                    <IconButton
                      size="small"
                      onClick={() => setLocationSearchValue('')}
                      title="Clear search"
                    >
                      <ClearIcon />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={onManualSearch}
                    title="Search"
                  >
                    <SearchIcon />
                  </IconButton>
                </Stack>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Map Container */}
      <Box
        ref={mapRef}
        sx={{
          width: '100%',
          height: 400,
          border: '1px solid #ddd',
          borderRadius: 1,
          bgcolor: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />

      {mapError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {mapError}
        </Alert>
      )}
    </Box>
  );
};

const CreateDreamDialog: React.FC<CreateDreamDialogProps> = ({
  open,
  onClose,
  onDreamCreated,
  initialData
}) => {
  const [formData, setFormData] = useState<CreateDreamData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    latitude: initialData?.latitude || 0,
    longitude: initialData?.longitude || 0,
    location_name: initialData?.location_name || '',
    dream_type: initialData?.dream_type || 'destination',
    priority: initialData?.priority || 'medium',
    tags: initialData?.tags || [],
    best_time_to_visit: initialData?.best_time_to_visit || '',
    estimated_budget: initialData?.estimated_budget || 0,
    notes: initialData?.notes || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [locationSearchValue, setLocationSearchValue] = useState('');

  // Handle location selection
  const handleLocationSelect = (
    location: { lat: number; lng: number },
    address?: string,
    placeId?: string,
    place?: google.maps.places.PlaceResult
  ) => {
    console.log('Location selected:', { location, address, placeId });
    
    // Update form data with location
    setFormData(prev => ({
      ...prev,
      latitude: location.lat,
      longitude: location.lng,
      location_name: address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
    }));

    // If we have place data, extract additional information
    if (place) {
      const dreamData = dreamsService.convertPlacesToDreamData(place, formData.dream_type);
      setFormData(prev => ({
        ...prev,
        ...dreamData,
        latitude: location.lat,
        longitude: location.lng,
      }));
    }

    // Update search value with the address
    if (address) {
      setLocationSearchValue(address);
    }

    setError(null);
  };

  // Handle manual geocoding search
  const handleManualSearch = async () => {
    if (!locationSearchValue.trim()) return;

    console.log('Manual search for:', locationSearchValue);

    const geocoder = new google.maps.Geocoder();
    
    geocoder.geocode(
      {
        address: locationSearchValue.trim(),
      },
      (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
          const result = results[0];
          const location = {
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
          };
          
          const formattedAddress = result.formatted_address;
          handleLocationSelect(location, formattedAddress);
          setLocationSearchValue(formattedAddress);
        } else {
          console.error('Geocoding failed:', status);
          setError(`Could not find location: ${locationSearchValue}. Please try a different search term or click on the map.`);
        }
      }
    );
  };

  // Handle current location
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          handleLocationSelect(location, 'Current Location');
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Unable to get your current location. Please check location permissions.');
        }
      );
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Creating dream with data:', formData);
      console.log('Form data JSON:', JSON.stringify(formData, null, 2));
      const newDream = await dreamsService.createDream(formData);
      console.log('Dream created successfully:', newDream);
      onDreamCreated(newDream);
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        latitude: 0,
        longitude: 0,
        location_name: '',
        dream_type: 'destination',
        priority: 'medium',
        tags: [],
        best_time_to_visit: '',
        estimated_budget: 0,
        notes: '',
      });
      setLocationSearchValue('');
    } catch (error) {
      console.error('Failed to create dream:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', errorMessage);
      setError(`Failed to create dream: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle tag operations
  const handleAddTag = () => {
    if (newTag.trim() && formData.tags && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
    }));
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setLocationSearchValue('');
    }
  }, [open]);

  // Render function for Google Maps wrapper
  const render = (status: Status) => {
    if (status === Status.LOADING) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading Google Maps...</Typography>
        </Box>
      );
    }

    if (status === Status.FAILURE) {
      return (
        <Alert severity="error">
          Failed to load Google Maps. Please check your API key and internet connection.
        </Alert>
      );
    }

    return (
      <MapComponent
        onLocationSelect={handleLocationSelect}
        locationSearchValue={locationSearchValue}
        setLocationSearchValue={setLocationSearchValue}
        onManualSearch={handleManualSearch}
        onUseCurrentLocation={handleUseCurrentLocation}
        mapError={error || undefined}
      />
    );
  };

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Alert severity="error">
            Google Maps API key not found. Please check your environment variables.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New Dream</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Basic Information */}
          <TextField
            fullWidth
            label="Dream Title"
            placeholder="What's your dream destination or experience?"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
          />

          <TextField
            fullWidth
            label="Description"
            placeholder="Describe your dream..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            multiline
            rows={3}
          />

          {/* Dream Type and Priority */}
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Dream Type</InputLabel>
              <Select
                value={formData.dream_type}
                label="Dream Type"
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

            <FormControl fullWidth>
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
          </Stack>

          {/* Location Selection with Google Maps */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Location
            </Typography>
            <Wrapper 
              apiKey={apiKey} 
              render={render} 
              libraries={['places', 'geometry']}
            >
              <MapComponent
                onLocationSelect={handleLocationSelect}
                locationSearchValue={locationSearchValue}
                setLocationSearchValue={setLocationSearchValue}
                onManualSearch={handleManualSearch}
                onUseCurrentLocation={handleUseCurrentLocation}
                mapError={error || undefined}
              />
            </Wrapper>
            
            {formData.latitude !== 0 && formData.longitude !== 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Selected: {formData.location_name} ({formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)})
              </Typography>
            )}
          </Box>

          {/* Tags */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Tags
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <TextField
                size="small"
                label="Add tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <IconButton onClick={handleAddTag} disabled={!newTag.trim()}>
                <AddIcon />
              </IconButton>
            </Stack>
            
            {formData.tags && formData.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {formData.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    deleteIcon={<DeleteIcon />}
                    size="small"
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Additional Details */}
          <Stack direction="row" spacing={2}>
            <TextField
              type="date"
              label="Best Time to Visit"
              InputLabelProps={{ shrink: true }}
              value={formData.best_time_to_visit}
              onChange={(e) => setFormData(prev => ({ ...prev, best_time_to_visit: e.target.value }))}
              fullWidth
            />
            
            <TextField
              type="number"
              label="Estimated Budget ($)"
              value={formData.estimated_budget || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                estimated_budget: e.target.value ? parseFloat(e.target.value) : 0 
              }))}
              fullWidth
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Stack>

          <TextField
            fullWidth
            label="Notes"
            placeholder="Any additional notes or details..."
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            multiline
            rows={3}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.title.trim() || !formData.latitude || !formData.longitude}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? 'Creating...' : 'Create Dream'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateDreamDialog;