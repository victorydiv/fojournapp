import React, { useState, useCallback, useRef } from 'react';
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
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { entriesAPI } from '../services/api';
import { CreateEntryData } from '../types';
import CreateEntryDialog from '../components/CreateEntryDialog';

interface MapComponentProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  onMapClick: (location: google.maps.LatLngLiteral) => void;
  markers: Array<{ position: google.maps.LatLngLiteral; title: string }>;
}

const MapComponent: React.FC<MapComponentProps> = ({ center, zoom, onMapClick, markers }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();

  React.useEffect(() => {
    if (ref.current && !map) {
      const mapId = process.env.REACT_APP_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
      const newMap = new google.maps.Map(ref.current, {
        center,
        zoom,
        clickableIcons: false,
        mapId, // Use Map ID from environment or fallback
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
  }, [ref, map, center, zoom, onMapClick]);

  // Add markers to map
  React.useEffect(() => {
    if (map) {
      // Clear existing markers first (if needed)
      
      // Check if Advanced Markers are available
      if (window.google?.maps?.marker?.AdvancedMarkerElement) {
        // Use the new AdvancedMarkerElement
        markers.forEach((markerInfo) => {
          try {
            new google.maps.marker.AdvancedMarkerElement({
              position: markerInfo.position,
              map,
              title: markerInfo.title,
            });
          } catch (error) {
            console.warn('Advanced Marker failed, falling back to standard marker:', error);
            // Fallback to standard marker if Advanced Marker fails
            new google.maps.Marker({
              position: markerInfo.position,
              map,
              title: markerInfo.title,
            });
          }
        });
      } else {
        // Fallback to legacy Marker
        markers.forEach((markerInfo) => {
          new google.maps.Marker({
            position: markerInfo.position,
            map,
            title: markerInfo.title,
          });
        });
      }
    }
  }, [map, markers]);

  return <div ref={ref} style={{ width: '100%', height: '400px' }} />;
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
  const [selectedLocation, setSelectedLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryData, setEntryData] = useState({
    locationName: '',
    entryDate: new Date(),
  });

  const center = { lat: 40.7128, lng: -74.0060 }; // Default to NYC
  const zoom = 10;

  const handleMapClick = useCallback((location: google.maps.LatLngLiteral) => {
    setSelectedLocation(location);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedLocation(null);
    setEntryData({
      locationName: '',
      entryDate: new Date(),
    });
  };

  const markers = selectedLocation
    ? [{ position: selectedLocation, title: 'New Entry Location' }]
    : [];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Add Travel Entry
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
          Click on the map to add a new travel entry location
        </Typography>

        <Card>
          <CardContent>
            <MapComponent
              center={center}
              zoom={zoom}
              onMapClick={handleMapClick}
              markers={markers}
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
          initialDate={entryData.entryDate instanceof Date ? entryData.entryDate : new Date()}
        />
      </Box>
    </Container>
  );
};

// Main component that wraps the map with the Google Maps API
const MapViewWithWrapper: React.FC = () => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
    return (
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
        <Card>
          <CardContent>
            <Box sx={{ height: 400, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h6" color="textSecondary">
                Map Placeholder - API Key Required
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Wrapper 
      apiKey={apiKey} 
      render={render} 
      libraries={['places', 'marker']}
      version="beta" // Use beta version for Advanced Markers
    >
      <MapViewComponent />
    </Wrapper>
  );
};

export default MapViewWithWrapper;
