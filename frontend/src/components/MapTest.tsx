import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { loadGoogleMaps } from '../utils/googleMapsLoader';

const MapTest: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initMap = async () => {
      try {
        console.log('=== MAP TEST: Starting Google Maps initialization ===');
        console.log('Map ref current:', mapRef.current);
        console.log('Environment API Key (first 10 chars):', process.env.REACT_APP_GOOGLE_MAPS_API_KEY?.substring(0, 10));
        
        await loadGoogleMaps();
        
        console.log('Google Maps loaded successfully');
        console.log('window.google:', window.google);
        console.log('window.google.maps:', window.google?.maps);
        
        if (!mapRef.current) {
          console.error('Map ref not available');
          return;
        }
        
        if (!window.google?.maps) {
          console.error('Google Maps not available');
          return;
        }
        
        console.log('Creating map instance...');
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 40.7128, lng: -74.0060 }, // NYC
          zoom: 10,
        });
        
        console.log('Map created successfully:', map);
        
        // Add a marker to test
        new google.maps.Marker({
          position: { lat: 40.7128, lng: -74.0060 },
          map: map,
          title: 'Test Marker'
        });
        
        console.log('Test marker added');
        
      } catch (error) {
        console.error('=== MAP TEST: Error ===', error);
      }
    };
    
    initMap();
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">Google Maps Test</Typography>
      <Box 
        ref={mapRef}
        sx={{ 
          height: 400, 
          width: '100%', 
          border: '2px solid red',
          backgroundColor: '#f0f0f0',
          mt: 2
        }}
      />
      <Typography variant="body2" sx={{ mt: 1 }}>
        Check browser console for detailed logs
      </Typography>
    </Box>
  );
};

export default MapTest;
