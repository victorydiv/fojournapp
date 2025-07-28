import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

interface RouteMapProps {
  startDestination?: string;
  endDestination?: string;
  height?: number;
}

const RouteMap: React.FC<RouteMapProps> = ({ 
  startDestination, 
  endDestination, 
  height = 400 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    const mapInstance = new google.maps.Map(mapRef.current, {
      center: { lat: 39.8283, lng: -98.5795 }, // Center of US
      zoom: 4,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapId: process.env.REACT_APP_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      mapTypeControl: true,
      gestureHandling: 'cooperative',
    });

    const dirService = new google.maps.DirectionsService();
    const dirRenderer = new google.maps.DirectionsRenderer({
      draggable: false,
      map: mapInstance,
      panel: null, // We handle route display ourselves
      polylineOptions: {
        strokeColor: '#1976d2',
        strokeWeight: 5,
        strokeOpacity: 0.8,
      },
      markerOptions: {
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#1976d2" stroke="#fff" stroke-width="3"/>
              <circle cx="16" cy="16" r="4" fill="#fff"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        },
      },
    });

    setMap(mapInstance);
    setDirectionsService(dirService);
    setDirectionsRenderer(dirRenderer);
  }, []);

  // Calculate and display route when destinations change
  useEffect(() => {
    if (!map || !directionsService || !directionsRenderer) return;
    if (!startDestination || !endDestination) {
      // Clear any existing route
      directionsRenderer.setDirections({ routes: [] } as any);
      return;
    }

    // Calculate route between start and end destinations
    directionsService.route(
      {
        origin: startDestination,
        destination: endDestination,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
        avoidHighways: false,
        avoidTolls: false,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result);
          
          // Fit map to show the entire route
          const bounds = new google.maps.LatLngBounds();
          if (result.routes[0]?.overview_path) {
            result.routes[0].overview_path.forEach(point => {
              bounds.extend(point);
            });
            map.fitBounds(bounds);
          }
        } else {
          console.warn('Route calculation failed:', status);
          directionsRenderer.setDirections({ routes: [] } as any);
        }
      }
    );
  }, [map, directionsService, directionsRenderer, startDestination, endDestination]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: height }}>
      {!startDestination || !endDestination ? (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <Typography variant="body2" color="textSecondary" align="center">
            {!startDestination && !endDestination
              ? 'Enter start and end destinations to see the route'
              : !startDestination
              ? 'Enter a start destination to see the route'
              : 'Enter an end destination to see the route'
            }
          </Typography>
        </Box>
      ) : null}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </Box>
  );
};

export default RouteMap;
