import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Stack,
  InputAdornment,
  IconButton,
  CircularProgress,
  Fade,
} from '@mui/material';
import { 
  Save as SaveIcon, 
  Search as SearchIcon,
  Clear as ClearIcon,
  MyLocation as MyLocationIcon,
} from '@mui/icons-material';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { entriesAPI } from '../services/api';
import { CreateEntryData, TravelEntry } from '../types';
import CreateEntryDialog from '../components/CreateEntryDialog';
import { format, parseISO, isValid } from 'date-fns';
import { backgroundStyles, componentStyles } from '../theme/fojournTheme';

// Helper function to get today's date in YYYY-MM-DD format
const getTodayString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface MapComponentProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  onMapClick: (location: google.maps.LatLngLiteral) => void;
  onLocationSearch: (location: google.maps.LatLngLiteral, locationName: string) => void;
  markers: Array<{ position: google.maps.LatLngLiteral; title: string }>;
  entries: TravelEntry[];
  onMarkerClick: (entry: TravelEntry) => void;
}

// Helper function to safely format dates (moved outside component to prevent re-creation)
const safeFormatDate = (dateString: string | Date, formatString: string = 'MMM dd, yyyy'): string => {
  try {
    if (!dateString) return 'Unknown date';
    
    let date: Date;
    if (typeof dateString === 'string') {
      date = parseISO(dateString);
      if (!isValid(date)) {
        date = new Date(dateString);
      }
    } else {
      date = dateString;
    }
    
    if (!isValid(date)) {
      return 'Invalid date';
    }
    
    return format(date, formatString);
  } catch (error) {
    return 'Date error';
  }
};

const MapComponent: React.FC<MapComponentProps> = ({ center, zoom, onMapClick, onLocationSearch, markers, entries, onMarkerClick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete>();
  const [searchValue, setSearchValue] = useState('');
  const [entryMarkers, setEntryMarkers] = useState<google.maps.Marker[]>([]);

  React.useEffect(() => {
    if (ref.current && !map) {
      const mapId = process.env.REACT_APP_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom,
        clickableIcons: false,
        mapId, // Use Map ID from environment or fallback
        styles: [
          {
            featureType: 'administrative',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#c0c0c0' }, { weight: 1 }]
          },
          {
            featureType: 'administrative.country',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#808080' }, { weight: 2 }]
          },
          {
            featureType: 'administrative.province',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#a0a0a0' }, { weight: 1 }]
          },
          {
            featureType: 'administrative.locality',
            stylers: [{ visibility: 'simplified' }]
          },
          {
            featureType: 'landscape',
            stylers: [{ color: '#f8f8f8' }]
          },
          {
            featureType: 'water',
            stylers: [{ color: '#c6e2ff' }]
          },
          {
            featureType: 'road',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'poi',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'transit',
            stylers: [{ visibility: 'off' }]
          }
        ],
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false,
      });
      
      // Add click listener to map
      newMap.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          onMapClick({
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          });
        }
      });
      
      setMap(newMap);
    }
  }, [center, zoom]); // Remove onMapClick from dependencies to prevent infinite re-renders

  // Initialize Places Autocomplete
  React.useEffect(() => {
    if (searchContainerRef.current && map && !autocomplete) {
      // Get the actual HTML input element from the Material-UI TextField
      const inputElement = searchContainerRef.current.querySelector('input');
      if (!inputElement) return;

      try {
        const newAutocomplete = new google.maps.places.Autocomplete(inputElement, {
          fields: ['place_id', 'geometry', 'name', 'formatted_address'],
        });

        newAutocomplete.addListener('place_changed', () => {
          const place = newAutocomplete.getPlace();
          if (place.geometry?.location) {
            const location = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };
            const locationName = place.formatted_address || place.name || '';
            
            // Move map to the selected location
            map.setCenter(location);
            map.setZoom(15);
            
            // Call the search callback
            onLocationSearch(location, locationName);
          }
        });

        setAutocomplete(newAutocomplete);
      } catch (error) {
        console.warn('Failed to initialize Places Autocomplete:', error);
        // Autocomplete will not work, but manual search should still function
      }
    }
  }, [map]); // Remove onLocationSearch from dependencies

  const handleSearchClear = useCallback(() => {
    setSearchValue('');
    if (searchContainerRef.current) {
      const inputElement = searchContainerRef.current.querySelector('input');
      if (inputElement) {
        inputElement.value = '';
      }
    }
  }, []);

  const handleManualSearch = useCallback(() => {
    if (!searchValue.trim() || !map) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode(
      { 
        address: searchValue.trim()
      },
      (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const result = results[0];
          const location = {
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
          };
          const locationName = result.formatted_address;
          
          // Move map to the found location
          map.setCenter(location);
          map.setZoom(15);
          
          // Call the search callback
          onLocationSearch(location, locationName);
        } else if (status === 'REQUEST_DENIED') {
          alert('Search failed: Geocoding API is not enabled for this project. Please enable the Geocoding API in Google Cloud Console.');
        } else {
          alert(`Search failed: ${status}. Please try a different search term.`);
        }
      }
    );
  }, [searchValue, map, onLocationSearch]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleManualSearch();
    }
  }, [handleManualSearch]);

  const handleCurrentLocation = useCallback(() => {
    if (navigator.geolocation && map) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          map.setCenter(location);
          map.setZoom(15);
          onLocationSearch(location, 'Current Location');
        },
        (error) => {
          console.error('Error getting current location:', error);
          alert('Unable to get your current location. Please check location permissions.');
        }
      );
    }
  }, [map, onLocationSearch]);

  // Add markers to map
  React.useEffect(() => {
    if (map) {
      // Clear existing entry markers
      entryMarkers.forEach(marker => {
        marker.setMap(null);
      });

      const newMarkers: google.maps.Marker[] = [];

      // Add markers for temporary selection (from clicking map or searching)
      markers.forEach((markerInfo) => {
        const marker = new google.maps.Marker({
          position: markerInfo.position,
          map,
          title: markerInfo.title,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 2C11.03 2 7 6.03 7 11c0 7.5 9 17 9 17s9-9.5 9-17c0-4.97-4.03-9-9-9z" fill="#FF5722" stroke="#fff" stroke-width="2"/>
                <circle cx="16" cy="11" r="3" fill="#fff"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 32),
          },
        });
        newMarkers.push(marker);
      });

      // Add markers for travel entries
      entries.forEach((entry) => {
        if (entry.latitude && entry.longitude) {
          const marker = new google.maps.Marker({
            position: { lat: Number(entry.latitude), lng: Number(entry.longitude) },
            map,
            title: entry.title,
            icon: {
              url: '/map_pin.png',
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(16, 32), // Bottom center of the pin
            },
          });

          // Add info window for entry
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; max-width: 250px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">
                  ${entry.title}
                  ${entry.featured ? ' <span style="color: #ff6b35;">★</span>' : ''}
                </h3>
                ${entry.description ? `<p style="margin: 4px 0; font-size: 14px; color: #666;">${entry.description.substring(0, 100)}${entry.description.length > 100 ? '...' : ''}</p>` : ''}
                ${entry.locationName ? `<p style="margin: 4px 0; font-size: 12px; color: #888;"><strong>📍 ${entry.locationName}</strong></p>` : ''}
                <p style="margin: 4px 0; font-size: 12px; color: #888;">📅 ${safeFormatDate(entry.entryDate)}</p>
                ${entry.isDogFriendly ? '<p style="margin: 4px 0; font-size: 12px; color: #4caf50;">🐕 Dog-friendly</p>' : ''}
                <p style="margin: 8px 0 0 0; font-size: 10px; color: #999; text-align: center;">Click to view details</p>
              </div>
            `,
          });

          // Add click listener to marker
          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });

          // Add click listener to info window content
          infoWindow.addListener('domready', () => {
            const infoWindowContent = document.querySelector('.gm-style-iw-c');
            if (infoWindowContent) {
              infoWindowContent.addEventListener('click', () => {
                onMarkerClick(entry);
              });
              (infoWindowContent as HTMLElement).style.cursor = 'pointer';
            }
          });

          newMarkers.push(marker);
        }
      });

      setEntryMarkers(newMarkers);
    }
  }, [map, markers, entries]); // Remove onMarkerClick and safeFormatDate from dependencies

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '400px' }}>
      {/* Search Box */}
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          right: 10,
          zIndex: 1000,
        }}
      >
        <TextField
          ref={searchContainerRef}
          fullWidth
          placeholder="Search for a location... (Press Enter to search)"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyPress={handleKeyPress}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {searchValue && (
                  <IconButton
                    onClick={handleManualSearch}
                    size="small"
                    title="Search for this location"
                    color="primary"
                  >
                    <SearchIcon />
                  </IconButton>
                )}
                <IconButton
                  onClick={handleCurrentLocation}
                  size="small"
                  title="Use current location"
                >
                  <MyLocationIcon />
                </IconButton>
                {searchValue && (
                  <IconButton
                    onClick={handleSearchClear}
                    size="small"
                    title="Clear search"
                  >
                    <ClearIcon />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
          sx={{
            backgroundColor: 'background.paper',
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'primary.main',
              },
            },
          }}
        />
      </Box>
      
      {/* Map Container */}
      <div ref={ref} style={{ width: '100%', height: '100%' }} />
    </Box>
  );
};

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return <Typography>Loading map...</Typography>;
    case Status.FAILURE:
      return (
        <Alert severity="error">
          Failed to load Google Maps. Please check your API key in the .env file.
        </Alert>
      );
    case Status.SUCCESS:
      return <MapViewComponent />;
  }
};

const MapViewComponent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedLocation, setSelectedLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryData, setEntryData] = useState({
    locationName: '',
    entryDate: getTodayString(),
  });

  // Check if we're coming from journey planner with memory data
  const locationState = location.state as any;
  const shouldCreateMemory = locationState?.createMemory;
  const memoryData = locationState?.memoryData;

  // Fetch all travel entries
  const { data: entriesResponse, isLoading, error } = useQuery({
    queryKey: ['entries'],
    queryFn: () => entriesAPI.getEntries(),
  });

  // Create entry mutation that navigates to the entry detail page after creation
  const createEntryMutation = useMutation({
    mutationFn: (data: CreateEntryData) => entriesAPI.createEntry(data),
    onSuccess: (response) => {
      // Navigate to the entry detail page and open edit dialog
      navigate(`/entry/${response.data.entry.id}`, { 
        state: { 
          openEditDialog: true,
          from: 'map'
        } 
      });
    },
    onError: (error: any) => {
      console.error('Failed to create memory entry:', error);
    },
  });

  // Handle memory creation from journey planner
  React.useEffect(() => {
    if (shouldCreateMemory && memoryData) {
      // Create the memory entry directly
      const entryData: CreateEntryData = {
        title: memoryData.title,
        description: memoryData.description,
        latitude: memoryData.latitude,
        longitude: memoryData.longitude,
        locationName: memoryData.locationName,
        memoryType: memoryData.memoryType || 'other',
        restaurantRating: memoryData.restaurantRating,
        isDogFriendly: memoryData.isDogFriendly || false,
        entryDate: memoryData.entryDate instanceof Date 
          ? format(memoryData.entryDate, 'yyyy-MM-dd')
          : format(new Date(memoryData.entryDate), 'yyyy-MM-dd'),
        tags: memoryData.tags || []
      };
      
      createEntryMutation.mutate(entryData);
    }
  }, [shouldCreateMemory, memoryData]);

  // World center and zoom level for global travel
  const center = { lat: 20, lng: 0 }; // World center showing all continents
  const zoom = 2; // Global zoom level

  const handleMapClick = useCallback((location: google.maps.LatLngLiteral) => {
    setSelectedLocation(location);
    setDialogOpen(true);
  }, []);

  const handleLocationSearch = useCallback((location: google.maps.LatLngLiteral, locationName: string) => {
    setSelectedLocation(location);
    setEntryData(prev => ({
      ...prev,
      locationName: locationName,
    }));
    setDialogOpen(true);
  }, []);

  const handleMarkerClick = useCallback((entry: TravelEntry) => {
    navigate(`/entry/${entry.id}`, {
      state: {
        from: 'map'
      }
    });
  }, [navigate]);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedLocation(null);
    setEntryData({
      locationName: '',
      entryDate: getTodayString(),
    });
  }, []);

  const markers = useMemo(
    () => selectedLocation
      ? [{ position: selectedLocation, title: 'New Entry Location' }]
      : [],
    [selectedLocation]
  );

  const entries = useMemo(
    () => entriesResponse?.data?.entries || [],
    [entriesResponse?.data?.entries]
  );

  if (isLoading) {
    return (
      <Box sx={backgroundStyles.secondary}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={backgroundStyles.secondary}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load travel entries. Please try refreshing the page.
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={backgroundStyles.secondary}>
      <Fade in timeout={800}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Travel Map
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
              View all your travel entries on the map. Click on pins to view entry details, or click anywhere to add a new entry.
              {entries.length > 0 && (
                <Typography component="span" sx={{ ml: 1, fontWeight: 'medium' }}>
                  Showing {entries.length} travel {entries.length === 1 ? 'entry' : 'entries'}.
                </Typography>
              )}
            </Typography>

            <Card sx={componentStyles.glassCard}>
          <CardContent>
            <MapComponent
              center={center}
              zoom={zoom}
              onMapClick={handleMapClick}
              onLocationSearch={handleLocationSearch}
              markers={markers}
              entries={entries}
              onMarkerClick={handleMarkerClick}
            />
          </CardContent>
        </Card>

        {/* Entry Creation Dialog */}
        <CreateEntryDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          initialLocation={
            selectedLocation
              ? {
                  latitude: selectedLocation.lat,
                  longitude: selectedLocation.lng,
                  locationName: entryData.locationName,
                }
              : undefined
          }
          initialDate={entryData.entryDate}
        />
          </Box>
        </Container>
      </Fade>
    </Box>
  );
};

// Main component that wraps the map with the Google Maps API
const MapViewWithWrapper: React.FC = () => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
    return (
      <Box sx={backgroundStyles.secondary}>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Google Maps API Key Required
            </Typography>
            <Typography variant="body2">
              To use the map functionality, you need to:
            </Typography>
            <ol>
              <li>Get a Google Maps API key from the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
              <li>Enable the Maps JavaScript API</li>
              <li>Create a Map ID in the Google Cloud Console (optional - defaults to DEMO_MAP_ID)</li>
              <li>Update the <code>REACT_APP_GOOGLE_MAPS_API_KEY</code> in your <code>.env</code> file</li>
              <li>Optionally update <code>REACT_APP_GOOGLE_MAPS_MAP_ID</code> in your <code>.env</code> file</li>
            </ol>
          </Alert>
          <Card sx={componentStyles.glassCard}>
            <CardContent>
              <Box sx={{ height: 400, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h6" color="textSecondary">
                  Map Placeholder - API Key Required
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Wrapper 
      apiKey={apiKey} 
      render={render} 
      libraries={['places', 'geometry']}
    >
      <MapViewComponent />
    </Wrapper>
  );
};

export default MapViewWithWrapper;
