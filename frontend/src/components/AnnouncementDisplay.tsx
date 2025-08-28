import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Collapse,
  Alert,
  Paper,
  Stack,
} from '@mui/material';
import {
  Announcement as AnnouncementIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  NewReleases as FeatureIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { communicationsAPI, Announcement } from '../services/communicationsAPI';

interface AnnouncementDisplayProps {
  maxAnnouncements?: number;
  showFeaturedOnly?: boolean;
  onViewTracked?: boolean;
}

const AnnouncementDisplay: React.FC<AnnouncementDisplayProps> = ({
  maxAnnouncements = 5,
  showFeaturedOnly = false,
  onViewTracked = true,
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAnnouncements, setExpandedAnnouncements] = useState<Set<number>>(new Set());
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await communicationsAPI.getActiveAnnouncements();
      let filteredAnnouncements = response.data.announcements;
      
      // Client-side filtering
      if (showFeaturedOnly) {
        filteredAnnouncements = filteredAnnouncements.filter(a => a.is_featured);
      }
      
      // Sort by priority (highest first), then by created date (newest first)
      filteredAnnouncements.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      // Limit results
      if (maxAnnouncements > 0) {
        filteredAnnouncements = filteredAnnouncements.slice(0, maxAnnouncements);
      }
      
      setAnnouncements(filteredAnnouncements);
    } catch (error: any) {
      console.error('Failed to load announcements:', error);
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const trackAnnouncementView = async (announcementId: number) => {
    if (!onViewTracked) return;
    
    try {
      await communicationsAPI.markAnnouncementAsViewed(announcementId);
    } catch (error) {
      console.error('Failed to track announcement view:', error);
    }
  };

  const handleToggleExpanded = (announcementId: number) => {
    const newExpanded = new Set(expandedAnnouncements);
    if (newExpanded.has(announcementId)) {
      newExpanded.delete(announcementId);
    } else {
      newExpanded.add(announcementId);
      // Track view when expanding
      trackAnnouncementView(announcementId);
    }
    setExpandedAnnouncements(newExpanded);
  };

  const handleDismissAnnouncement = (announcementId: number) => {
    const newDismissed = new Set(dismissedAnnouncements);
    newDismissed.add(announcementId);
    setDismissedAnnouncements(newDismissed);
    
    // Track view when dismissing
    trackAnnouncementView(announcementId);
  };

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <SuccessIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'feature':
        return <FeatureIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getAnnouncementColor = (type: string): 'success' | 'warning' | 'error' | 'info' => {
    switch (type) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return null; // Don't show loading spinner for announcements
  }

  if (error) {
    return null; // Don't show error for announcements
  }

  const visibleAnnouncements = announcements.filter(
    announcement => !dismissedAnnouncements.has(announcement.id)
  );

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AnnouncementIcon />
        Announcements
      </Typography>
      
      <Stack spacing={2}>
        {visibleAnnouncements.map((announcement) => {
          const isExpanded = expandedAnnouncements.has(announcement.id);
          const shouldTruncate = announcement.content.length > 200;
          
          return (
            <Paper
              key={announcement.id}
              elevation={announcement.is_featured ? 3 : 1}
              sx={{
                border: announcement.is_featured ? 2 : 0,
                borderColor: announcement.is_featured ? 'primary.main' : 'transparent',
              }}
            >
              <Alert
                severity={getAnnouncementColor(announcement.announcement_type)}
                icon={getAnnouncementIcon(announcement.announcement_type)}
                action={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {shouldTruncate && (
                      <IconButton
                        size="small"
                        onClick={() => handleToggleExpanded(announcement.id)}
                        aria-label={isExpanded ? 'Show less' : 'Show more'}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleDismissAnnouncement(announcement.id)}
                      aria-label="Dismiss announcement"
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>
                }
                sx={{ alignItems: 'flex-start' }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6" component="div">
                      {announcement.title}
                    </Typography>
                    {announcement.is_featured && (
                      <Chip label="Featured" color="secondary" size="small" />
                    )}
                  </Box>
                  
                  <Box>
                    {shouldTruncate && !isExpanded ? (
                      <>
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: announcement.content.substring(0, 200) + '...' 
                          }} 
                        />
                        <Typography 
                          variant="body2" 
                          color="primary" 
                          sx={{ cursor: 'pointer', mt: 1 }}
                          onClick={() => handleToggleExpanded(announcement.id)}
                        >
                          Read more
                        </Typography>
                      </>
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: announcement.content }} />
                    )}
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {formatDate(announcement.created_at)}
                    {announcement.priority > 0 && (
                      <Chip 
                        label={`Priority: ${announcement.priority}`} 
                        size="small" 
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                </Box>
              </Alert>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
};

export default AnnouncementDisplay;
