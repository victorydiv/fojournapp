import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

interface Experience {
  id: string;
  day: number;
  title: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  type: 'attraction' | 'restaurant' | 'accommodation' | 'activity' | 'other';
  time?: string;
}

interface RouteMapProps {
  startDestination?: string;
  endDestination?: string;
  height?: number;
  waypoints?: Experience[];
}

const RouteMap: React.FC<RouteMapProps> = ({ 
  startDestination, 
  endDestination, 
  height = 400,
  waypoints = []
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [waypointMarkers, setWaypointMarkers] = useState<google.maps.Marker[]>([]);

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

  // Calculate route with waypoints when destinations change
  useEffect(() => {
    if (!map || !directionsService || !directionsRenderer) return;
    if (!startDestination && !endDestination && waypoints.length === 0) return;

    console.log('Calculating route with waypoints:', waypoints);

    // Sort waypoints by day and time for proper route order
    const sortedWaypoints = [...waypoints].sort((a, b) => {
      // First sort by day
      if (a.day !== b.day) {
        return a.day - b.day;
      }
      // Then by time if both have time
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }
      // Put items with time before items without time
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;
      // If neither has time, maintain original order
      return 0;
    });

    // Determine origin and destination for the route
    const origin = startDestination || (sortedWaypoints.length > 0 && sortedWaypoints[0].location ? 
      new google.maps.LatLng(sortedWaypoints[0].location.lat, sortedWaypoints[0].location.lng) : 
      'Denver, CO');
    
    const lastWaypoint = sortedWaypoints[sortedWaypoints.length - 1];
    const destination = endDestination || (sortedWaypoints.length > 0 && lastWaypoint?.location ? 
      new google.maps.LatLng(lastWaypoint.location.lat, lastWaypoint.location.lng) : 
      'Las Vegas, NV');

    const request: google.maps.DirectionsRequest = {
      origin,
      destination,
      waypoints: sortedWaypoints
        .filter(wp => wp.location && wp.location.lat && wp.location.lng)
        .map(wp => ({
          location: new google.maps.LatLng(wp.location!.lat, wp.location!.lng),
          stopover: true
        })),
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false, // Keep user-defined order
    };

    console.log('Directions request:', request);

    directionsService.route(request, (result, status) => {
      if (status === 'OK' && result) {
        console.log('Route calculated successfully:', result);
        directionsRenderer.setDirections(result);
        
        // Add custom markers for waypoints with experience info
        addWaypointMarkers(sortedWaypoints);
      } else {
        console.error('Directions request failed:', status);
        // Fallback: just show waypoint markers without route
        addWaypointMarkers(sortedWaypoints);
      }
    });
  }, [map, directionsService, directionsRenderer, startDestination, endDestination, waypoints]);

  // Add custom markers for waypoints with experience information
  const addWaypointMarkers = (sortedWaypoints: Experience[]) => {
    // Clear existing waypoint markers
    waypointMarkers.forEach(marker => marker.setMap(null));
    
    const newMarkers = sortedWaypoints
      .filter(wp => wp.location && wp.location.lat && wp.location.lng)
      .map((waypoint, index) => {
        const position = new google.maps.LatLng(waypoint.location!.lat, waypoint.location!.lng);
        
        // Different colors for different experience types
        const getMarkerColor = (type: string) => {
          switch (type) {
            case 'attraction': return '#2196f3';
            case 'restaurant': return '#ff9800';
            case 'accommodation': return '#4caf50';
            case 'activity': return '#9c27b0';
            default: return '#607d8b';
          }
        };
        
        const marker = new google.maps.Marker({
          position,
          map: map!,
          title: waypoint.title,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="${getMarkerColor(waypoint.type)}" stroke="#fff" stroke-width="3"/>
                <text x="16" y="20" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">${index + 1}</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
          },
        });

        // Add info window for each waypoint
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; max-width: 250px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: ${getMarkerColor(waypoint.type)};">
                ${waypoint.title}
              </h3>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #666; text-transform: capitalize;">
                Day ${waypoint.day} • ${waypoint.type}
              </p>
              ${waypoint.location?.address ? `<p style="margin: 0; font-size: 11px; color: #999;">${waypoint.location.address}</p>` : ''}
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(map!, marker);
        });

        return marker;
      });
    
    setWaypointMarkers(newMarkers);
  };

  // Update waypoint markers when waypoints prop changes
  useEffect(() => {
    if (!map) return;
    addWaypointMarkers(waypoints);
  }, [map, waypoints]);

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
