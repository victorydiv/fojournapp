import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Autocomplete,
  Chip,
  CircularProgress
} from '@mui/material';
import { 
  LocationOn as LocationIcon,
  Search as SearchIcon,
  MyLocation as MyLocationIcon
} from '@mui/icons-material';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { useMemoryTypes } from '../hooks/useMemoryTypes';

interface ExperienceData {
  title: string;
  description: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
    placeId?: string;
  };
  time?: string;
  type: string;
  tags: string[];
  notes: string;
}

interface AddExperienceDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (experience: ExperienceData & { day: number }) => void;
  selectedDay: number;
  dayDate: Date;
  initialExperience?: ExperienceData & { id: string; day: number };
}

const AddExperienceDialog: React.FC<AddExperienceDialogProps> = ({
  open,
  onClose,
  onSave,
  selectedDay,
  dayDate,
  initialExperience
}) => {
  const { memoryTypes, loading: memoryTypesLoading } = useMemoryTypes();
  const [experienceData, setExperienceData] = useState<ExperienceData>({
    title: '',
    description: '',
    type: 'attraction',
    tags: [],
    notes: ''
  });
  
  const [searchValue, setSearchValue] = useState('');
  const [tagInput, setTagInput] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with existing experience data when editing
  useEffect(() => {
    if (initialExperience) {
      setExperienceData({
        title: initialExperience.title,
        description: initialExperience.description,
        location: initialExperience.location,
        time: initialExperience.time,
        type: initialExperience.type,
        tags: initialExperience.tags || [],
        notes: initialExperience.notes
      });
      
      // Set search value to location address if available
      if (initialExperience.location?.address) {
        setSearchValue(initialExperience.location.address);
      }
    } else {
      // Reset form for new experience
      setExperienceData({
        title: '',
        description: '',
        type: 'attraction',
        tags: [],
        notes: ''
      });
      setSearchValue('');
    }
  }, [initialExperience, open]);

  const handleLocationSelect = (
    location: { lat: number; lng: number }, 
    address?: string, 
    placeId?: string
  ) => {
    // Update experience data with location
    setExperienceData(prev => ({
      ...prev,
      location: {
        lat: location.lat,
        lng: location.lng,
        address: address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
        placeId
      }
    }));

    // If no address provided, reverse geocode to get address
    if (!address) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          setExperienceData(prev => ({
            ...prev,
            location: prev.location ? {
              ...prev.location,
              address: results[0].formatted_address
            } : undefined
          }));
        }
      });
    }
  };

  const handleCurrentLocation = () => {
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
          console.error('Error getting current location:', error);
          alert('Unable to get your current location. Please check location permissions.');
        }
      );
    }
  };

  const handleManualSearch = () => {
    if (!searchValue.trim()) return;

    // Use Google Geocoding API to search for the entered address
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode(
      { 
        address: searchValue.trim(),
      },
      (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const result = results[0];
          const location = {
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
          };
          
          handleLocationSelect(location, result.formatted_address);
          console.log('Manual search successful:', result);
        } else {
          console.error('Geocoding failed:', status);
          alert(`Could not find location: ${searchValue}. Please try a different search term or select a location on the map.`);
        }
      }
    );
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !experienceData.tags.includes(tagInput.trim())) {
      setExperienceData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setExperienceData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSave = () => {
    if (!experienceData.title.trim()) {
      alert('Please enter a title for the experience');
      return;
    }

    // Prepare data for saving, stripping seconds from time if present
    const saveData = {
      ...experienceData,
      day: selectedDay,
      // Convert time from HH:MM:SS to HH:MM format
      time: experienceData.time ? experienceData.time.substring(0, 5) : undefined
    };

    onSave(saveData);

    // Reset form
    setExperienceData({
      title: '',
      description: '',
      type: 'attraction',
      tags: [],
      notes: ''
    });
    setSearchValue('');
    setTagInput('');
    
    onClose();
  };

  const handleCancel = () => {
    // Reset form
    setExperienceData({
      title: '',
      description: '',
      type: 'attraction',
      tags: [],
      notes: ''
    });
    setSearchValue('');
    setTagInput('');
    
    onClose();
  };

  const renderMap = (status: Status) => {
    if (status === Status.LOADING) {
      return (
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd' }}>
          <Typography variant="body2" color="textSecondary">
            Loading Google Maps...
          </Typography>
        </Box>
      );
    }
    if (status === Status.FAILURE) {
      return (
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', backgroundColor: '#ffebee' }}>
          <Typography variant="body2" color="error">
            Failed to load Google Maps. Please check your API key.
          </Typography>
        </Box>
      );
    }
    
    return (
      <MapComponent 
        onLocationSelect={handleLocationSelect}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
      />
    );
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box>
          <Typography variant="h6" component="div">
            {initialExperience ? 'Edit Experience' : 'Add Experience'} - Day {selectedDay}
          </Typography>
          <Typography variant="subtitle2" color="textSecondary" component="div">
            {dayDate ? dayDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            }) : 'Select a date'}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Basic Information */}
          <TextField
            fullWidth
            label="Experience Title"
            value={experienceData.title}
            onChange={(e) => setExperienceData(prev => ({ ...prev, title: e.target.value }))}
            required
          />
          
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Description"
            value={experienceData.description}
            onChange={(e) => setExperienceData(prev => ({ ...prev, description: e.target.value }))}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={experienceData.type}
                label="Type"
                onChange={(e) => setExperienceData(prev => ({ 
                  ...prev, 
                  type: e.target.value as ExperienceData['type']
                }))}
                disabled={memoryTypesLoading}
              >
                {memoryTypesLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Loading...
                  </MenuItem>
                ) : (
                  memoryTypes.map((memoryType) => (
                    <MenuItem key={memoryType.id} value={memoryType.name}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {memoryType.icon && (
                          <Typography component="span" sx={{ fontSize: '1.1em' }}>
                            {memoryType.icon}
                          </Typography>
                        )}
                        {memoryType.display_name}
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            
            <TextField
              type="time"
              label="Time (Optional)"
              value={experienceData.time || ''}
              onChange={(e) => setExperienceData(prev => ({ ...prev, time: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* Location Search and Map */}
          <Box>
            <Typography variant="h6" gutterBottom>Location</Typography>
            
            {/* Map */}
            <Card>
              <CardContent sx={{ p: 0 }}>
                <Wrapper 
                  apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''} 
                  libraries={['places', 'geometry']}
                  render={renderMap}
                />
              </CardContent>
            </Card>
            
            {experienceData.location && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                <LocationIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                {experienceData.location.address}
              </Typography>
            )}
          </Box>

          {/* Tags */}
          <Box>
            <Typography variant="h6" gutterBottom>Tags</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              {experienceData.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                  size="small"
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button size="small" onClick={handleAddTag}>Add</Button>
            </Box>
          </Box>

          {/* Notes */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Additional Notes"
            value={experienceData.notes}
            onChange={(e) => setExperienceData(prev => ({ ...prev, notes: e.target.value }))}
          />
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Add Experience
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Separate Map Component to handle initialization properly
const MapComponent: React.FC<{
  onLocationSelect: (location: { lat: number; lng: number }, address?: string, placeId?: string) => void;
  searchValue: string;
  setSearchValue: (value: string) => void;
}> = ({ onLocationSelect, searchValue, setSearchValue }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    console.log('Initializing map in AddExperience dialog');
    
    const mapInstance = new google.maps.Map(mapRef.current, {
      center: { lat: 39.8283, lng: -98.5795 },
      zoom: 4,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      gestureHandling: 'cooperative',
    });

    // Add click listener to map
    mapInstance.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const location = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        console.log('Map clicked at:', location);
        handleLocationClick(location);
      }
    });

    setMap(mapInstance);
  }, []);

  // Initialize autocomplete when map and input are ready
  useEffect(() => {
    if (!map || !searchInputRef.current || autocomplete || !window.google?.maps?.places?.Autocomplete) return;

    console.log('Initializing Places Autocomplete');
    
    try {
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
          
          handleLocationClick(location, place.formatted_address || place.name, place.place_id);
          
          // Center map on selected location
          map.setCenter(location);
          map.setZoom(15);
        } else if (place.place_id) {
          // If no geometry but we have place_id, try to get details
          console.log('No geometry found, trying PlacesService for details...');
          const service = new google.maps.places.PlacesService(map);
          service.getDetails({
            placeId: place.place_id,
            fields: ['geometry', 'formatted_address', 'name']
          }, (result, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && result?.geometry?.location) {
              const location = {
                lat: result.geometry.location.lat(),
                lng: result.geometry.location.lng()
              };
              
              handleLocationClick(location, result.formatted_address || result.name, place.place_id);
              map.setCenter(location);
              map.setZoom(15);
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
    } catch (error) {
      console.error('Failed to initialize autocomplete:', error);
    }
  }, [map]);

  const handleLocationClick = (
    location: { lat: number; lng: number }, 
    address?: string, 
    placeId?: string
  ) => {
    if (!map) return;

    console.log('Location clicked:', location, address);

    // Remove existing marker
    if (marker) {
      marker.setMap(null);
    }

    // Add new marker
    const newMarker = new google.maps.Marker({
      position: location,
      map: map,
      draggable: true,
      animation: google.maps.Animation.DROP,
    });

    // Handle marker drag
    newMarker.addListener('dragend', () => {
      const newPosition = newMarker.getPosition();
      if (newPosition) {
        const newLocation = {
          lat: newPosition.lat(),
          lng: newPosition.lng()
        };
        
        // Reverse geocode the new position
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: newLocation }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            onLocationSelect(newLocation, results[0].formatted_address);
          } else {
            onLocationSelect(newLocation);
          }
        });
      }
    });

    setMarker(newMarker);

    // Call the parent component's handler
    onLocationSelect(location, address, placeId);

    // If no address provided, reverse geocode to get address
    if (!address) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          onLocationSelect(location, results[0].formatted_address, placeId);
        }
      });
    }
  };

  const handleManualSearch = () => {
    if (!searchValue.trim() || !map) return;

    console.log('Manual search for:', searchValue);
    
    // Use Google Geocoding API to search for the entered address
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode(
      { 
        address: searchValue.trim(),
      },
      (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const result = results[0];
          const location = {
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
          };
          
          handleLocationClick(location, result.formatted_address);
          map.setCenter(location);
          map.setZoom(15);
          console.log('Manual search successful:', result);
        } else {
          console.error('Geocoding failed:', status);
          alert(`Could not find location: ${searchValue}. Please try a different search term or click on the map.`);
        }
      }
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search for a location..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleManualSearch();
            }
          }}
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
        <Button
          variant="outlined"
          onClick={handleManualSearch}
          disabled={!searchValue.trim()}
        >
          Search
        </Button>
      </Box>
      <div ref={mapRef} style={{ width: '100%', height: '300px', border: '1px solid #ddd' }} />
    </Box>
  );
};

export default AddExperienceDialog;