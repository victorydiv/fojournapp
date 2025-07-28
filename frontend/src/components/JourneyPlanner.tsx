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
  PhotoLibrary as PhotoLibraryIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { journeysAPI } from '../services/api';
import AddExperienceDialog from './AddExperienceDialog';
import RouteMap from './RouteMap';

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
  type: 'attraction' | 'restaurant' | 'accommodation' | 'activity' | 'other';
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch experiences for this journey
  const { data: experiencesResponse, isLoading: experiencesLoading, error: experiencesError } = useQuery({
    queryKey: ['experiences', journey.id],
    queryFn: () => journeysAPI.getExperiences(journey.id),
    enabled: !!journey.id,
  });

  // Extract experiences array from response
  const experiences = experiencesResponse?.data || [];

  // Create experience mutation
  const createExperienceMutation = useMutation({
    mutationFn: (experienceData: any) => journeysAPI.createExperience(journey.id, experienceData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences', journey.id] });
      setAddExperienceOpen(false);
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

  useEffect(() => {
    console.log('Journey prop changed:', journey);
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
    if (!startDateStr) return new Date();
    const parts = startDateStr.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    date.setDate(date.getDate() + (dayNumber - 1));
    return date;
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

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => onUpdateJourney(currentJourney)}>
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Planning: {currentJourney.title}
          </Typography>
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
            value={currentJourney.title}
            onChange={(e) => setCurrentJourney(prev => ({...prev, title: e.target.value}))}
            margin="normal"
          />
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={currentJourney.description}
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
              value={currentJourney.start_date}
              onChange={(e) => handleDateChange('start_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              type="date"
              label="End Date"
              value={currentJourney.end_date}
              onChange={(e) => handleDateChange('end_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Days</Typography>
          <List>
            {days.map(day => {
              const dayDate = getDayDate(currentJourney.start_date, day);
              const dayExperiences = experiences.filter(exp => exp.day === day);
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
                          {dayDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
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
              return dayDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              });
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
              const dayExperiences = experiences.filter(exp => exp.day === selectedDay);
              
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
                .sort((a, b) => {
                  // Sort by time if available, otherwise by creation order
                  if (a.time && b.time) {
                    return a.time.localeCompare(b.time);
                  }
                  if (a.time && !b.time) return -1;
                  if (!a.time && b.time) return 1;
                  return 0;
                })
                .map((experience) => (
                  <Card key={experience.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {experience.title}
                            {experience.time && (
                              <Chip 
                                label={experience.time} 
                                size="small" 
                                variant="outlined"
                                sx={{ fontSize: '0.75rem' }}
                              />
                            )}
                          </Typography>
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
                              Edit Experience
                            </MenuItem>
                            <MenuItem onClick={() => {
                              handleMenuClose(experience.id);
                              handleConvertToMemory(experience);
                            }}>
                              <PhotoLibraryIcon fontSize="small" sx={{ mr: 1 }} />
                              Convert to Memory
                            </MenuItem>
                            <MenuItem onClick={() => {
                              handleMenuClose(experience.id);
                              console.log('Deleting experience:', experience.id);
                              deleteExperienceMutation.mutate(Number(experience.id));
                            }} disabled={deleteExperienceMutation.isPending}>
                              <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                              {deleteExperienceMutation.isPending ? 'Removing...' : 'Remove'}
                            </MenuItem>
                          </Menu>
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
                        waypoints={experiences.filter(exp => exp.location)}
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
            // Update existing experience
            updateExperienceMutation.mutate({
              experienceId: Number(editingExperience.id),
              experienceData: experience
            });
            console.log('Updating experience:', experience);
          } else {
            // Create new experience
            createExperienceMutation.mutate(experience);
            console.log('Creating new experience:', experience);
          }
        }}
        selectedDay={editingExperience ? editingExperience.day : selectedDay}
        dayDate={editingExperience 
          ? getDayDate(currentJourney.start_date, editingExperience.day)
          : (currentJourney.start_date ? getDayDate(currentJourney.start_date, selectedDay) : new Date())
        }
        initialExperience={editingExperience || undefined}
      />
    </Box>
  );
};

export default JourneyPlanner;
