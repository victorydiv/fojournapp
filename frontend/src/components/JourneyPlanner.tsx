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
  CardContent
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon
} from '@mui/icons-material';

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
  const itinerary: ItineraryItem[] = [];
  const [selectedDay, setSelectedDay] = useState(1);

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
    console.log('Saving itinerary:', itinerary);
    onUpdateJourney(currentJourney);
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
              const dayItemCount = itinerary.filter(item => item.day === day).length;

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
                        <Chip label={`${dayItemCount} items`} size="small" sx={{ ml: 1 }} component="span" />
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
                onClick={() => {}}
              >
                Add Activity
              </Button>
            </Box>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary">
                  No activities planned for this day yet. Click "Add Activity" to get started.
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Map & Route Planning</Typography>
            <Card sx={{ height: 400 }}>
              <CardContent sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography variant="body2" color="textSecondary">
                  Interactive map will be displayed here for route planning and location selection
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default JourneyPlanner;
