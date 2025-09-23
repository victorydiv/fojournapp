import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface PublicMemory {
  id: number;
  title: string;
  description?: string;
  public_slug: string;
  entry_date: string;
  location_name?: string;
  latitude?: number | string;
  longitude?: number | string;
  thumbnail_url?: string;
  featured: boolean;
  isDogFriendly?: boolean;
}

interface PublicProfileMapProps {
  memories: PublicMemory[];
  onMemoryClick?: (memory: PublicMemory) => void;
}

const PublicProfileMap: React.FC<PublicProfileMapProps> = ({ memories, onMemoryClick }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // World center coordinates for global travel
  const WORLD_CENTER = { lat: 20, lng: 0 };
  const WORLD_ZOOM = 2;

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    // Initialize map
    const map = new google.maps.Map(mapRef.current, {
      center: WORLD_CENTER,
      zoom: WORLD_ZOOM,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
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

    mapInstanceRef.current = map;

    // Create info window
    const infoWindow = new google.maps.InfoWindow();
    infoWindowRef.current = infoWindow;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add markers for memories with valid coordinates
    const eventListeners: (() => void)[] = [];
    
    memories.forEach((memory, index) => {
      if (memory.latitude && memory.longitude) {
        // Convert string coordinates to numbers
        const lat = typeof memory.latitude === 'string' ? parseFloat(memory.latitude) : memory.latitude;
        const lng = typeof memory.longitude === 'string' ? parseFloat(memory.longitude) : memory.longitude;
        
        // Validate the coordinates are valid numbers
        if (isNaN(lat) || isNaN(lng)) {
          console.warn('Invalid coordinates for memory:', memory.title, lat, lng);
          return;
        }
        
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: `${memory.title}${memory.location_name ? ` - ${memory.location_name}` : ''}`,
          icon: {
            url: '/map_pin.png',
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 32) // Bottom center of the pin
          }
        });

        // Add click listener for marker
        const clickListener = marker.addListener('click', () => {
          // Show info window
          const formatDate = (dateString: string) => {
            return new Date(dateString).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
          };

          const content = `
            <div style="padding: 8px; max-width: 250px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">
                ${memory.title}
                ${memory.featured ? ' <span style="color: #ff6b35;">★</span>' : ''}
              </h3>
              ${memory.description ? `<p style="margin: 4px 0; font-size: 14px; color: #666;">${memory.description.substring(0, 100)}${memory.description.length > 100 ? '...' : ''}</p>` : ''}
              ${memory.location_name ? `<p style="margin: 4px 0; font-size: 12px; color: #888;"><strong>📍 ${memory.location_name}</strong></p>` : ''}
              <p style="margin: 4px 0; font-size: 12px; color: #888;">📅 ${formatDate(memory.entry_date)}</p>
              ${memory.isDogFriendly ? '<p style="margin: 4px 0; font-size: 12px; color: #4caf50;">🐕 Dog-friendly</p>' : ''}
            </div>
          `;

          infoWindow.setContent(content);
          infoWindow.open(map, marker);

          // Call the click handler if provided
          if (onMemoryClick) {
            onMemoryClick(memory);
          }
        });

        markersRef.current.push(marker);
        eventListeners.push(() => google.maps.event.removeListener(clickListener));
      }
    });

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      eventListeners.forEach(cleanup => cleanup());
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };
  }, [memories, onMemoryClick]);

  return (
    <Paper elevation={2} sx={{ overflow: 'hidden' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" component="h3">
          Travel Map
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {memories.filter(m => m.latitude && m.longitude).length} locations plotted
        </Typography>
      </Box>
      <Box
        ref={mapRef}
        sx={{
          width: '100%',
          height: 400,
          '& .gm-style-iw': {
            color: '#333'
          }
        }}
      />
    </Paper>
  );
};

export default PublicProfileMap;
