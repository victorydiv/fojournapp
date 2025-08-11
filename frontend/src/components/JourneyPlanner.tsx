import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  TextField,
  Chip,
  Card,
  CardContent,
  Grid,
  Fab,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Schedule as ScheduleIcon,
  MoreVert as MoreVertIcon,
  PhotoLibrary as PhotoLibraryIcon,
  Restaurant as RestaurantIcon,
  OpenInNew as OpenInNewIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { journeysAPI, collaborationAPI } from '../services/api';
import AddExperienceDialog from './AddExperienceDialog';
import RouteMap from './RouteMap';
import CollaborationManager from './CollaborationManager';
import { generateYelpSearchUrl, generateYelpBusinessUrl } from '../utils/yelpUtils';

interface Journey {
  id: number;
  title: string;
  description: string;
  destination: string;
  start_destination?: string;
  end_destination?: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Experience {
  id: string;
  day: number;
  title: string;
  description: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
    placeId?: string;
  };
  time?: string;
  type: 'attraction' | 'restaurant' | 'accommodation' | 'activity' | 'brewery' | 'other';
  tags: string[];
  notes: string;
}

interface ItineraryItem {
  id: string;
  day: number;
  type: string;
  title: string;
  description: string;
  time?: string;
  location?: string;
  address?: string;
  phone?: string;
  cost?: number;
  url?: string;
}

interface JourneyPlannerProps {
  journey: Journey;
  onUpdateJourney: (journey: Journey) => void;
}

const JourneyPlanner: React.FC<JourneyPlannerProps> = ({ journey, onUpdateJourney }) => {
  const [currentJourney, setCurrentJourney] = useState<Journey>(journey);
  const [selectedDay, setSelectedDay] = useState(1);
  const [addExperienceOpen, setAddExperienceOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [convertToMemoryOpen, setConvertToMemoryOpen] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState<{ [key: string]: { distance: string; duration: string } }>({});
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [showPendingExperiences, setShowPendingExperiences] = useState(false);
  const [showMySuggestions, setShowMySuggestions] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Listen for experience approval events
  useEffect(() => {
    const handleExperienceApproved = () => {
      queryClient.invalidateQueries({ queryKey: ['experiences', journey.id] });
    };

    window.addEventListener('experienceApproved', handleExperienceApproved);
    return () => window.removeEventListener('experienceApproved', handleExperienceApproved);
  }, [journey.id, queryClient]);

  // Fetch experiences for this journey
  const { data: experiencesResponse, isLoading: experiencesLoading, error: experiencesError } = useQuery({
    queryKey: ['experiences', journey.id],
    queryFn: () => journeysAPI.getExperiences(journey.id),
    enabled: !!journey.id,
  });

  // Fetch pending experiences (suggestions) for owners
  const { data: pendingExperiencesResponse, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-experiences', journey.id],
    queryFn: () => collaborationAPI.getSuggestions(journey.id),
    enabled: !!journey.id && showPendingExperiences,
  });

  // Fetch user's own pending suggestions for contributors
  const { data: mySuggestionsResponse, isLoading: mySuggestionsLoading } = useQuery({
    queryKey: ['my-suggestions', journey.id],
    queryFn: () => {
      console.log('Fetching my suggestions for journey:', journey.id, 'userRole:', (currentJourney as any).userRole);
      return collaborationAPI.getMySuggestions(journey.id);
    },
    enabled: !!journey.id && (currentJourney as any).userRole === 'contributor',
  });

  // Log the response when it changes
  useEffect(() => {
    if (mySuggestionsResponse) {
      console.log('My suggestions response:', mySuggestionsResponse);
    }
  }, [mySuggestionsResponse]);

  // Extract experiences array from response
  const experiences = experiencesResponse?.data || [];
  const pendingExperiences = pendingExperiencesResponse?.data?.suggestions || [];
  const mySuggestions = mySuggestionsResponse?.data?.suggestions || [];
  
  // Switch between approved, pending experiences, and my suggestions based on toggle
  const displayExperiences = showPendingExperiences ? pendingExperiences : 
                             showMySuggestions ? mySuggestions : 
                             experiences;

  // Create experience mutation
  const createExperienceMutation = useMutation({
    mutationFn: (experienceData: any) => journeysAPI.createExperience(journey.id, experienceData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['experiences', journey.id] });
      setAddExperienceOpen(false);
      
      // Trigger notification refresh for owners when new suggestions are made
      window.dispatchEvent(new CustomEvent('refreshNotifications'));
      
      // Show appropriate message based on response
      if (response.data.message) {
        alert(response.data.message);
      }
    },
    onError: (error) => {
      console.error('Error creating experience:', error);
      alert('Failed to save experience. Please try again.');
    }
  });

  // Update experience mutation
  const updateExperienceMutation = useMutation({
    mutationFn: ({ experienceId, experienceData }: { experienceId: number; experienceData: any }) => 
      journeysAPI.updateExperience(journey.id, experienceId, experienceData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences', journey.id] });
      setEditingExperience(null);
    },
    onError: (error) => {
      console.error('Error updating experience:', error);
      alert('Failed to update experience. Please try again.');
    }
  });

  // Delete experience mutation
  const deleteExperienceMutation = useMutation({
    mutationFn: (experienceId: number) => journeysAPI.deleteExperience(journey.id, experienceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences', journey.id] });
    },
    onError: (error) => {
      console.error('Error deleting experience:', error);
      alert('Failed to delete experience. Please try again.');
    }
  });

  // Update my suggestion mutation (for contributors)
  const updateMySuggestionMutation = useMutation({
    mutationFn: ({ suggestionId, suggestionData }: { suggestionId: number; suggestionData: any }) => 
      collaborationAPI.updateMySuggestion(suggestionId, suggestionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-suggestions', journey.id] });
      setEditingExperience(null);
      // Trigger notification refresh
      window.dispatchEvent(new CustomEvent('refreshNotifications'));
    },
    onError: (error) => {
      console.error('Error updating suggestion:', error);
      alert('Failed to update suggestion. Please try again.');
    }
  });

  // Delete my suggestion mutation (for contributors)
  const deleteMySuggestionMutation = useMutation({
    mutationFn: (suggestionId: number) => collaborationAPI.deleteMySuggestion(suggestionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-suggestions', journey.id] });
      // Trigger notification refresh
      window.dispatchEvent(new CustomEvent('refreshNotifications'));
    },
    onError: (error) => {
      console.error('Error deleting suggestion:', error);
      alert('Failed to delete suggestion. Please try again.');
    }
  });

  useEffect(() => {
    console.log('Journey prop changed:', journey);
    console.log('Current journey userRole:', (journey as any).userRole);
    const formattedJourney = {
      ...journey,
      start_date: journey.start_date ? 
        (typeof journey.start_date === 'string' ? 
          journey.start_date.split('T')[0] : 
          new Date(journey.start_date).toISOString().split('T')[0]
        ) : '',
      end_date: journey.end_date ? 
        (typeof journey.end_date === 'string' ? 
          journey.end_date.split('T')[0] : 
          new Date(journey.end_date).toISOString().split('T')[0]
        ) : ''
    };
    console.log('Setting formatted journey:', formattedJourney);
    setCurrentJourney(formattedJourney);
  }, [journey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target instanceof HTMLInputElement === false && e.target instanceof HTMLTextAreaElement === false) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Calculate distances for experiences when they change
  useEffect(() => {
    const calculateDistances = async () => {
      if (!experiences || experiences.length === 0 || !window.google?.maps) {
        return;
      }

      const newDistanceInfo: { [key: string]: { distance: string; duration: string } } = {};

      for (const experience of experiences) {
        if (!experience.location) continue;

        const dayExperiences = displayExperiences.filter((exp: any) => exp.day === experience.day);
        const startingPoint = getStartingPointForExperience(experience, dayExperiences);

        if (startingPoint) {
          try {
            const result = await calculateDistanceAndTime(startingPoint, {
              lat: experience.location.lat,
              lng: experience.location.lng
            });

            if (result) {
              newDistanceInfo[experience.id] = result;
            }
          } catch (error) {
            console.error('Error calculating distance for experience:', experience.id, error);
          }
        }
      }

      setDistanceInfo(newDistanceInfo);
    };

    // Delay calculation to ensure Google Maps is loaded
    const timer = setTimeout(calculateDistances, 1000);
    return () => clearTimeout(timer);
  }, [experiences, currentJourney.start_destination]);

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    console.log(`Date change - Field: ${field}, Input value: ${value}`);
    console.log(`Setting ${field} to:`, value);
    setCurrentJourney(prev => ({...prev, [field]: value}));
  };

  const calculateDaysBetween = (start: string, end: string) => {
    if (!start || !end) return [1];
    const startParts = start.split('-').map(Number);
    const endParts = end.split('-').map(Number);
    const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);
    const dayCount = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    return Array.from({ length: dayCount }, (_, i) => i + 1);
  };
  
  const days = calculateDaysBetween(currentJourney.start_date, currentJourney.end_date);
  
  const getDayDate = (startDateStr: string, dayNumber: number) => {
    if (!startDateStr) return format(new Date(), 'yyyy-MM-dd');
    const parts = startDateStr.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    date.setDate(date.getDate() + (dayNumber - 1));
    return format(date, 'yyyy-MM-dd');
  };

  const handleSave = () => {
    console.log('Saving journey:', currentJourney);
    onUpdateJourney(currentJourney);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, experienceId: string) => {
    setMenuAnchorEl(prev => ({ ...prev, [experienceId]: event.currentTarget }));
  };

  const handleMenuClose = (experienceId: string) => {
    setMenuAnchorEl(prev => ({ ...prev, [experienceId]: null }));
  };

  const handleConvertToMemory = (experience: Experience) => {
    // Convert experience data to memory entry format
    const memoryData = {
      title: experience.title,
      description: experience.description || '',
      latitude: experience.location?.lat || 0,
      longitude: experience.location?.lng || 0,
      locationName: experience.location?.address || '',
      memoryType: experience.type, // Pass the experience type as memory type
      // Use the day date for the memory entry
      entryDate: getDayDate(currentJourney.start_date, experience.day),
      tags: experience.tags || []
    };

    // Navigate to map with pre-filled memory data
    navigate('/map', { 
      state: { 
        createMemory: true,
        memoryData: memoryData
      }
    });
  };

  // Calculate distance and travel time between two locations using Routes API
  const calculateDistanceAndTime = async (
    origin: { lat: number; lng: number } | string,
    destination: { lat: number; lng: number }
  ): Promise<{ distance: string; duration: string } | null> => {
    try {
      if (!window.google?.maps) {
        return null;
      }

      // Use DirectionsService instead of Distance Matrix for better compatibility
      const directionsService = new google.maps.DirectionsService();
      
      const request: google.maps.DirectionsRequest = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.IMPERIAL,
        avoidHighways: false,
        avoidTolls: false
      };

      return new Promise((resolve) => {
        directionsService.route(request, (result, status) => {
          if (status === 'OK' && result) {
            const route = result.routes[0];
            const leg = route.legs[0];
            
            if (leg) {
              resolve({
                distance: leg.distance?.text || '',
                duration: leg.duration?.text || ''
              });
            } else {
              resolve(null);
            }
          } else {
            console.warn('Directions request failed:', status);
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Error calculating distance:', error);
      return null;
    }
  };

  // Get the starting point for distance calculation for a given experience
  const getStartingPointForExperience = (experience: Experience, dayExperiences: Experience[]) => {
    // Get ALL experiences from ALL days up to the current experience's day
    const allPreviousExperiences = displayExperiences.filter((exp: any) => {
      // Include experiences from previous days
      if (exp.day < experience.day) return true;
      // Include experiences from the same day that come before this one (by time)
      if (exp.day === experience.day && exp.id !== experience.id) {
        // If both have times, compare them
        if (exp.time && experience.time) {
          return exp.time < experience.time;
        }
        // If only the previous experience has a time, include it
        if (exp.time && !experience.time) return true;
        // If neither has a time, we can't determine order reliably
        return false;
      }
      return false;
    }).filter((exp: any) => exp.location); // Only include experiences with locations

    // Sort all previous experiences by day, then by time
    const sortedPreviousExperiences = allPreviousExperiences.sort((a: any, b: any) => {
      // First sort by day
      if (a.day !== b.day) {
        return b.day - a.day; // Descending order to get most recent day first
      }
      // Then sort by time within the same day
      if (a.time && b.time) {
        return b.time.localeCompare(a.time); // Descending order to get latest time first
      }
      if (a.time && !b.time) return -1; // Experiences with time come first
      if (!a.time && b.time) return 1;
      return 0;
    });

    // Find the most recent accommodation from all previous experiences
    const lastAccommodation = sortedPreviousExperiences.find((exp: any) => exp.type === 'accommodation');

    if (lastAccommodation?.location) {
      return {
        lat: lastAccommodation.location.lat,
        lng: lastAccommodation.location.lng
      };
    }

    // If no accommodation found, use start destination
    if (currentJourney.start_destination) {
      return currentJourney.start_destination;
    }

    return null;
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => onUpdateJourney(currentJourney)}>
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Planning: {currentJourney.title}
            {showPendingExperiences && (
              <Chip 
                label="VIEWING PENDING SUGGESTIONS" 
                size="small" 
                color="warning" 
                sx={{ ml: 1, fontSize: '0.7rem' }}
              />
            )}
            {showMySuggestions && (
              <Chip 
                label="VIEWING MY SUGGESTIONS" 
                size="small" 
                color="info" 
                sx={{ ml: 1, fontSize: '0.7rem' }}
              />
            )}
          </Typography>
          {(currentJourney as any).userRole === 'owner' && (
            <Button 
              color="inherit" 
              variant={showPendingExperiences ? 'outlined' : 'text'}
              onClick={() => {
                setShowPendingExperiences(!showPendingExperiences);
                setShowMySuggestions(false);
              }}
              sx={{ mr: 1 }}
            >
              {showPendingExperiences ? 'Show Approved' : 'Show Pending'} ({pendingExperiences.length})
            </Button>
          )}
          {(currentJourney as any).userRole === 'contributor' && (
            <Button 
              color="inherit" 
              variant={showMySuggestions ? 'outlined' : 'text'}
              onClick={() => {
                setShowMySuggestions(!showMySuggestions);
                setShowPendingExperiences(false);
              }}
              sx={{ mr: 1 }}
            >
              {showMySuggestions ? 'Show Approved' : 'My Suggestions'} ({mySuggestions.length})
            </Button>
          )}
          <Button 
            color="inherit" 
            startIcon={<GroupIcon />} 
            onClick={() => setCollaborationOpen(true)}
            sx={{ mr: 1 }}
          >
            Collaborate
          </Button>
          <Button color="inherit" startIcon={<SaveIcon />} onClick={handleSave}>
            Save
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', p: 2, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>Journey Overview</Typography>
          
          <TextField
            fullWidth
            label="Title"
            value={currentJourney.title || ''}
            onChange={(e) => setCurrentJourney(prev => ({...prev, title: e.target.value}))}
            margin="normal"
          />
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={currentJourney.description || ''}
            onChange={(e) => setCurrentJourney(prev => ({...prev, description: e.target.value}))}
            margin="normal"
          />
          
          <TextField
            fullWidth
            label="Start Destination"
            value={currentJourney.start_destination || ""}
            onChange={(e) => setCurrentJourney(prev => ({...prev, start_destination: e.target.value}))}
            margin="normal"
            placeholder="Where does your journey begin?"
          />
          
          <TextField
            fullWidth
            label="End Destination"
            value={currentJourney.end_destination || ""}
            onChange={(e) => setCurrentJourney(prev => ({...prev, end_destination: e.target.value}))}
            margin="normal"
            placeholder="Where does your journey end?"
          />
          

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              type="date"
              label="Start Date"
              value={currentJourney.start_date || ''}
              onChange={(e) => handleDateChange('start_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              type="date"
              label="End Date"
              value={currentJourney.end_date || ''}
              onChange={(e) => handleDateChange('end_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Days</Typography>
          <List>
            {days.map(day => {
              const dayDate = getDayDate(currentJourney.start_date, day);
              const dayExperiences = displayExperiences.filter((exp: any) => exp.day === day);
              const dayItemCount = dayExperiences.length;

              return (
                <ListItem
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    cursor: 'pointer',
                    bgcolor: selectedDay === day ? 'primary.light' : 'background.paper',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <ListItemText
                    primary={`Day ${day}`}
                    secondary={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="caption" color="textSecondary" component="span">
                          {format(new Date(dayDate), 'E, MMM d')}
                        </Typography>
                        <Chip label={`${dayItemCount} experiences`} size="small" sx={{ ml: 1 }} component="span" />
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>

        <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
          <Typography variant="h5">
            Day {selectedDay} - {(() => {
              const dayDate = getDayDate(currentJourney.start_date, selectedDay);
              return format(new Date(dayDate), 'EEEE, MMMM d, yyyy');
            })()}
          </Typography>

          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Plan activities, accommodations, and transportation for this day
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6">Activities & Plans</Typography>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => setAddExperienceOpen(true)}
              >
                Add Experience
              </Button>
            </Box>
            
            {(() => {
              const dayExperiences = displayExperiences.filter((exp: any) => exp.day === selectedDay);
              
              if (dayExperiences.length === 0) {
                return (
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="body2" color="textSecondary">
                        No experiences planned for this day yet. Click "Add Experience" to get started.
                      </Typography>
                    </CardContent>
                  </Card>
                );
              }
              
              return dayExperiences
                .sort((a: any, b: any) => {
                  // Sort by time if available, otherwise by creation order
                  if (a.time && b.time) {
                    return a.time.localeCompare(b.time);
                  }
                  if (a.time && !b.time) return -1;
                  if (!a.time && b.time) return 1;
                  return 0;
                })
                .map((experience: any) => (
                  <Card key={experience.id} sx={{ 
                    mb: 2, 
                    border: showPendingExperiences ? 2 : 0,
                    borderColor: showPendingExperiences ? 'warning.main' : 'transparent',
                    bgcolor: showPendingExperiences ? 'warning.light' : 'background.paper'
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {experience.title}
                            {showPendingExperiences && (
                              <Chip 
                                label="PENDING APPROVAL" 
                                size="small" 
                                color="warning"
                                sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}
                              />
                            )}
                            {experience.time && (
                              <Chip 
                                label={experience.time} 
                                size="small" 
                                variant="outlined"
                                sx={{ fontSize: '0.75rem' }}
                              />
                            )}
                          </Typography>
                          {showPendingExperiences && experience.suggested_by_username && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                              Suggested by {experience.suggested_by_first_name || experience.suggested_by_username}
                            </Typography>
                          )}
                          <Typography variant="body2" color="textSecondary" sx={{ textTransform: 'capitalize', mb: 1 }}>
                            {experience.type}
                          </Typography>
                          {experience.description && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              {experience.description}
                            </Typography>
                          )}
                          {experience.location && (
                            <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                              <LocationIcon fontSize="small" />
                              {experience.location.address}
                            </Typography>
                          )}
                          {(experience.type === 'restaurant' || experience.type === 'brewery') && experience.location && (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 0.5, 
                                mb: 1,
                                cursor: 'pointer',
                                color: 'primary.main',
                                '&:hover': { textDecoration: 'underline' }
                              }}
                              onClick={() => {
                                const yelpUrl = generateYelpBusinessUrl({
                                  businessName: experience.title,
                                  businessType: experience.type,
                                  location: experience.location
                                });
                                window.open(yelpUrl, '_blank');
                              }}
                            >
                              <RestaurantIcon fontSize="small" />
                              View on Yelp
                              <OpenInNewIcon fontSize="small" sx={{ ml: 0.5, fontSize: '0.875rem' }} />
                            </Typography>
                          )}
                          {distanceInfo[experience.id] && (
                            <Typography variant="body2" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                              <TimeIcon fontSize="small" />
                              {distanceInfo[experience.id].distance} • {distanceInfo[experience.id].duration} drive
                            </Typography>
                          )}
                          {experience.tags && experience.tags.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                              {experience.tags.map((tag: string, index: number) => (
                                <Chip key={index} label={tag} size="small" />
                              ))}
                            </Box>
                          )}
                          {experience.notes && (
                            <Typography variant="body2" color="textSecondary">
                              <strong>Notes:</strong> {experience.notes}
                            </Typography>
                          )}
                        </Box>
                        <Box>
                          {showPendingExperiences && (currentJourney as any).userRole === 'owner' ? (
                            // Show approve/reject buttons for pending experiences (owner view)
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={async () => {
                                  try {
                                    await collaborationAPI.reviewSuggestion(journey.id, experience.id, { action: 'approve' });
                                    queryClient.invalidateQueries({ queryKey: ['pending-experiences', journey.id] });
                                    queryClient.invalidateQueries({ queryKey: ['experiences', journey.id] });
                                    // Trigger notification refresh for global state
                                    window.dispatchEvent(new CustomEvent('refreshNotifications'));
                                    alert('Experience approved successfully');
                                  } catch (error) {
                                    console.error('Failed to approve experience:', error);
                                    alert('Failed to approve experience');
                                  }
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={async () => {
                                  try {
                                    await collaborationAPI.reviewSuggestion(journey.id, experience.id, { action: 'reject' });
                                    queryClient.invalidateQueries({ queryKey: ['pending-experiences', journey.id] });
                                    // Trigger notification refresh for global state
                                    window.dispatchEvent(new CustomEvent('refreshNotifications'));
                                    alert('Experience rejected');
                                  } catch (error) {
                                    console.error('Failed to reject experience:', error);
                                    alert('Failed to reject experience');
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            </Box>
                          ) : (
                            // Show normal menu for approved experiences or my suggestions
                            <>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  handleMenuOpen(e, experience.id);
                                  setSelectedExperience(experience);
                                }}
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                              <Menu
                                anchorEl={menuAnchorEl[experience.id]}
                                open={Boolean(menuAnchorEl[experience.id])}
                                onClose={() => handleMenuClose(experience.id)}
                                PaperProps={{
                                  elevation: 0,
                                  sx: {
                                    width: '200px',
                                    '& .MuiMenuItem-root': {
                                      typography: 'body2',
                                      py: 1,
                                  px: 2.5,
                                },
                              },
                            }}
                          >
                            <MenuItem onClick={() => {
                              handleMenuClose(experience.id);
                              setEditingExperience(experience);
                            }}>
                              <EditIcon fontSize="small" sx={{ mr: 1 }} />
                              {showMySuggestions ? 'Edit Suggestion' : 'Edit Experience'}
                            </MenuItem>
                            {!showMySuggestions && (
                              <MenuItem onClick={() => {
                                handleMenuClose(experience.id);
                                handleConvertToMemory(experience);
                              }}>
                                <PhotoLibraryIcon fontSize="small" sx={{ mr: 1 }} />
                                Convert to Memory
                              </MenuItem>
                            )}
                            <MenuItem onClick={() => {
                              handleMenuClose(experience.id);
                              console.log('Deleting experience:', experience.id);
                              // Check if we're deleting a suggestion from my suggestions view
                              if (showMySuggestions) {
                                deleteMySuggestionMutation.mutate(Number(experience.id));
                              } else {
                                deleteExperienceMutation.mutate(Number(experience.id));
                              }
                            }} disabled={deleteExperienceMutation.isPending || deleteMySuggestionMutation.isPending}>
                              <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                              {(deleteExperienceMutation.isPending || deleteMySuggestionMutation.isPending) ? 'Removing...' : 
                               (showMySuggestions ? 'Delete Suggestion' : 'Remove')}
                            </MenuItem>
                          </Menu>
                            </>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ));
            })()}
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Map & Route Planning</Typography>
            <Card sx={{ height: 400 }}>
              <CardContent sx={{ height: "100%", p: 0 }}>
                <Wrapper 
                  apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''} 
                  libraries={['places', 'geometry']}
                  render={(status: Status) => {
                    if (status === Status.LOADING) {
                      return (
                        <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Typography variant="body2" color="textSecondary">
                            Loading Google Maps...
                          </Typography>
                        </Box>
                      );
                    }
                    if (status === Status.FAILURE) {
                      return (
                        <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Typography variant="body2" color="error">
                            Failed to load Google Maps. Please check your API key.
                          </Typography>
                        </Box>
                      );
                    }
                    return (
                      <RouteMap
                        startDestination={currentJourney.start_destination}
                        endDestination={currentJourney.end_destination}
                        waypoints={experiences.filter((exp: any) => exp.location)}
                        height={368} // Adjust for card padding
                      />
                    );
                  }}
                />
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

      <AddExperienceDialog 
        open={addExperienceOpen || !!editingExperience} 
        onClose={() => {
          setAddExperienceOpen(false);
          setEditingExperience(null);
        }} 
        onSave={(experience) => {
          if (editingExperience) {
            // Check if we're editing a suggestion from my suggestions view
            if (showMySuggestions) {
              updateMySuggestionMutation.mutate({
                suggestionId: Number(editingExperience.id),
                suggestionData: experience
              });
              console.log('Updating my suggestion:', experience);
            } else {
              // Update regular experience
              updateExperienceMutation.mutate({
                experienceId: Number(editingExperience.id),
                experienceData: experience
              });
              console.log('Updating experience:', experience);
            }
          } else {
            // Create new experience
            createExperienceMutation.mutate(experience);
            console.log('Creating new experience:', experience);
          }
        }}
        selectedDay={editingExperience ? editingExperience.day : selectedDay}
        dayDate={editingExperience 
          ? new Date(getDayDate(currentJourney.start_date, editingExperience.day))
          : (currentJourney.start_date ? new Date(getDayDate(currentJourney.start_date, selectedDay)) : new Date())
        }
        initialExperience={editingExperience || undefined}
      />

      <CollaborationManager
        open={collaborationOpen}
        onClose={() => setCollaborationOpen(false)}
        journeyId={currentJourney.id}
        journeyTitle={currentJourney.title}
        userRole={(currentJourney as any).userRole || 'owner'}
      />
    </Box>
  );
};

export default JourneyPlanner;
