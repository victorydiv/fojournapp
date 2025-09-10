import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface PublicMemory {
  id: number;
  title: string;
  description?: string;
  public_slug: string;
  entry_date: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
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

  // US center coordinates
  const US_CENTER = { lat: 39.8283, lng: -98.5795 };
  const US_ZOOM = 4;

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;

    // Initialize map
    const map = new google.maps.Map(mapRef.current, {
      center: US_CENTER,
      zoom: US_ZOOM,
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

    memories.forEach(memory => {
      if (memory.latitude && memory.longitude) {
        const marker = new google.maps.Marker({
          position: { lat: memory.latitude, lng: memory.longitude },
          map,
          title: `${memory.title}${memory.location_name ? ` - ${memory.location_name}` : ''}`,
          icon: {
            url: 'data:image/svg+xml;base64,' + btoa(`
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
                <circle cx="16" cy="16" r="14" fill="${memory.featured ? '#ff6b35' : '#1976d2'}" stroke="#fff" stroke-width="2"/>
                <circle cx="16" cy="16" r="6" fill="#fff"/>
                ${memory.featured ? '<polygon points="16,8 18,14 24,14 19,18 21,24 16,20 11,24 13,18 8,14 14,14" fill="#ff6b35"/>' : ''}
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16)
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
