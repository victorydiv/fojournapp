import React, { useState } from 'react';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Paper,
  TextField,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Flight as FlightIcon,
  Hotel as HotelIcon,
  Restaurant as RestaurantIcon,
  LocalActivity as ActivityIcon,
  DirectionsCar as CarIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Map as MapIcon,
  Place as PlaceIcon
} from '@mui/icons-material';

interface Journey {
  id: number;
  title: string;
  description: string;
  destination: string;
  start_date: string;
  end_date: string;
}

interface ItineraryItem {
  id: string;
  day: number;
  type: 'flight' | 'hotel' | 'restaurant' | 'activity' | 'transport';
  title: string;
  description: string;
  time?: string;
  location?: string;
  notes?: string;
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
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [newItem, setNewItem] = useState({
    type: 'activity' as ItineraryItem['type'],
    title: '',
    description: '',
    time: '',
    location: '',
    notes: ''
  });

  // Route planning state
  const [routePoints, setRoutePoints] = useState({
    start: '',
    end: '',
    waypoints: [] as string[]
  });
  const [newWaypoint, setNewWaypoint] = useState('');
  const [showMapDialog, setShowMapDialog] = useState(false);

  // Calculate days array
  const startDate = new Date(journey.start_date);
  const endDate = new Date(journey.end_date);
  const dayCount = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);

  const getTypeIcon = (type: ItineraryItem['type']) => {
    switch (type) {
      case 'flight': return <FlightIcon />;
      case 'hotel': return <HotelIcon />;
      case 'restaurant': return <RestaurantIcon />;
      case 'activity': return <ActivityIcon />;
      case 'transport': return <CarIcon />;
      default: return <ActivityIcon />;
    }
  };

  const getTypeColor = (type: ItineraryItem['type']) => {
    switch (type) {
      case 'flight': return '#2196F3';
      case 'hotel': return '#FF9800';
      case 'restaurant': return '#4CAF50';
      case 'activity': return '#9C27B0';
      case 'transport': return '#607D8B';
      default: return '#9E9E9E';
    }
  };

  const handleAddItem = () => {
    if (newItem.title && newItem.type) {
      const item: ItineraryItem = {
        id: Date.now().toString(),
        day: selectedDay,
        type: newItem.type,
        title: newItem.title,
        description: newItem.description || '',
        time: newItem.time,
        location: newItem.location,
        notes: newItem.notes
      };

      setItinerary(prev => [...prev, item]);
      setAddItemDialogOpen(false);
      setNewItem({
        type: 'activity',
        title: '',
        description: '',
        time: '',
        location: '',
        notes: ''
      });
    }
  };

  const handleEditItem = (item: ItineraryItem) => {
    setEditingItem(item);
    setNewItem({
      type: item.type,
      title: item.title,
      description: item.description,
      time: item.time || '',
      location: item.location || '',
      notes: item.notes || ''
    });
    setAddItemDialogOpen(true);
  };

  const handleUpdateItem = () => {
    if (editingItem && newItem.title && newItem.type) {
      const updatedItem: ItineraryItem = {
        ...editingItem,
        ...newItem
      };

      setItinerary(prev => prev.map(item => 
        item.id === editingItem.id ? updatedItem : item
      ));
      setAddItemDialogOpen(false);
      setEditingItem(null);
      setNewItem({
        type: 'activity',
        title: '',
        description: '',
        time: '',
        location: '',
        notes: ''
      });
    }
  };

  const handleDeleteItem = (itemId: string) => {
    setItinerary(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSave = () => {
    console.log('Saving itinerary:', itinerary);
    onUpdateJourney(journey);
  };

  const dayItems = itinerary.filter(item => item.day === selectedDay)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => onUpdateJourney(journey)}>
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Planning: {journey.title}
          </Typography>
          <Button color="inherit" startIcon={<SaveIcon />} onClick={handleSave}>
            Save
          </Button>
        </Toolbar>
      </AppBar>

      {/* Overview Section */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2 }}>
        <Paper sx={{ flex: '1 1 300px', p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Journey Overview
          </Typography>
          
          <TextField
            fullWidth
            label="Journey Title"
            value={journey.title}
            onChange={(e) => onUpdateJourney({...journey, title: e.target.value})}
            margin="normal"
          />
          
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={journey.description}
            onChange={(e) => onUpdateJourney({...journey, description: e.target.value})}
            margin="normal"
          />
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              type="date"
              label="Start Date"
              value={journey.start_date}
              onChange={(e) => onUpdateJourney({...journey, start_date: e.target.value})}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              type="date"
              label="End Date"
              value={journey.end_date}
              onChange={(e) => onUpdateJourney({...journey, end_date: e.target.value})}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
          
          <TextField
            fullWidth
            label="Destination"
            value={journey.destination}
            onChange={(e) => onUpdateJourney({...journey, destination: e.target.value})}
            margin="normal"
          />
        </Paper>

        <Paper sx={{ flex: '1 1 300px', p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Route Planning
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Starting Point"
              value={routePoints.start}
              onChange={(e) => setRoutePoints({...routePoints, start: e.target.value})}
              margin="normal"
            />
            <TextField
              fullWidth
              label="End Point"
              value={routePoints.end}
              onChange={(e) => setRoutePoints({...routePoints, end: e.target.value})}
              margin="normal"
            />
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<MapIcon />}
            fullWidth
            onClick={() => setShowMapDialog(true)}
            sx={{ mb: 2 }}
          >
            Open Map View
          </Button>
          
          <Typography variant="subtitle2" gutterBottom>
            Waypoints:
          </Typography>
          {routePoints.waypoints.map((waypoint, index) => (
            <Chip
              key={index}
              label={waypoint}
              onDelete={() => {
                const newWaypoints = routePoints.waypoints.filter((_, i) => i !== index);
                setRoutePoints({...routePoints, waypoints: newWaypoints});
              }}
              sx={{ mr: 1, mb: 1 }}
            />
          ))}
          
          <TextField
            fullWidth
            label="Add Waypoint"
            value={newWaypoint}
            onChange={(e) => setNewWaypoint(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newWaypoint.trim()) {
                setRoutePoints({
                  ...routePoints,
                  waypoints: [...routePoints.waypoints, newWaypoint.trim()]
                });
                setNewWaypoint('');
              }
            }}
            margin="normal"
          />
        </Paper>
      </Box>

      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {/* Left Sidebar - Days */}
        <Paper sx={{ width: 250, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Days
          </Typography>
          <List>
            {days.map(day => {
              const dayDate = new Date(startDate);
              dayDate.setDate(startDate.getDate() + (day - 1));
              const dayItemCount = itinerary.filter(item => item.day === day).length;
              
              return (
                <ListItem
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: selectedDay === day ? 'primary.light' : 'transparent',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <ListItemText
                    primary={`Day ${day}`}
                    secondary={
                      <Box>
                        <Typography variant="caption">
                          {dayDate.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </Typography>
                        <Chip 
                          label={`${dayItemCount} item${dayItemCount !== 1 ? 's' : ''}`} 
                          size="small" 
                          sx={{ ml: 1 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Paper>

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">
              Day {selectedDay} - {(() => {
                const dayDate = new Date(startDate);
                dayDate.setDate(startDate.getDate() + (selectedDay - 1));
                return dayDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                });
              })()}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddItemDialogOpen(true)}
            >
              Add Activity
            </Button>
          </Box>

          {/* Map Placeholder */}
          <Paper sx={{ height: 200, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
            <Box sx={{ textAlign: 'center' }}>
              <MapIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
              <Typography variant="h6" color="grey.600">
                Google Maps Integration
              </Typography>
              <Typography variant="body2" color="grey.500">
                Interactive map with route planning coming soon
              </Typography>
            </Box>
          </Paper>

          {/* Itinerary Items */}
          {dayItems.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No activities planned for this day
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddItemDialogOpen(true)}
              >
                Add First Activity
              </Button>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {dayItems.map(item => (
                <Box key={item.id} sx={{ width: { xs: '100%', md: '48%' } }}>
                  <Card sx={{ borderLeft: 4, borderLeftColor: getTypeColor(item.type) }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {getTypeIcon(item.type)}
                        <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                          {item.title}
                        </Typography>
                        {item.time && (
                          <Chip label={item.time} size="small" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {item.description}
                      </Typography>
                      {item.location && (
                        <Typography variant="caption" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                          <PlaceIcon fontSize="small" sx={{ mr: 0.5 }} />
                          {item.location}
                        </Typography>
                      )}
                      {item.notes && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          💡 {item.notes}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => handleEditItem(item)}>
                        <EditIcon sx={{ mr: 0.5 }} fontSize="small" />
                        Edit
                      </Button>
                      <Button size="small" color="error" onClick={() => handleDeleteItem(item.id)}>
                        <DeleteIcon sx={{ mr: 0.5 }} fontSize="small" />
                        Delete
                      </Button>
                    </CardActions>
                  </Card>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Add/Edit Item Dialog */}
      <Dialog open={addItemDialogOpen} onClose={() => setAddItemDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingItem ? 'Edit Activity' : 'Add New Activity'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newItem.type || 'activity'}
                  onChange={(e) => setNewItem(prev => ({ ...prev, type: e.target.value as ItineraryItem['type'] }))}
                >
                  <MenuItem value="flight">✈️ Flight</MenuItem>
                  <MenuItem value="hotel">🏨 Hotel</MenuItem>
                  <MenuItem value="restaurant">🍽️ Restaurant</MenuItem>
                  <MenuItem value="activity">🎯 Activity</MenuItem>
                  <MenuItem value="transport">🚗 Transport</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                type="time"
                label="Time"
                value={newItem.time || ''}
                onChange={(e) => setNewItem(prev => ({ ...prev, time: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <TextField
              fullWidth
              label="Title"
              value={newItem.title || ''}
              onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Visit Eiffel Tower, Dinner at Le Bernardin"
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={newItem.description || ''}
              onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe this activity..."
            />
            <TextField
              fullWidth
              label="Location"
              value={newItem.location || ''}
              onChange={(e) => setNewItem(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Location or venue name"
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Notes"
              value={newItem.notes || ''}
              onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes, reservations, reminders..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddItemDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={editingItem ? handleUpdateItem : handleAddItem}
            variant="contained"
            disabled={!newItem.title || !newItem.type}
          >
            {editingItem ? 'Update' : 'Add'} Activity
          </Button>
        </DialogActions>
      </Dialog>

      {/* Map Dialog */}
      <Dialog open={showMapDialog} onClose={() => setShowMapDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Route Planning Map</DialogTitle>
        <DialogContent>
          <Paper sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
            <Box sx={{ textAlign: 'center' }}>
              <MapIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
              <Typography variant="h6" color="grey.600">
                Google Maps Integration
              </Typography>
              <Typography variant="body2" color="grey.500">
                Interactive map with route planning and waypoint selection
              </Typography>
              <Typography variant="body2" color="grey.500">
                Start: {routePoints.start || 'Not set'}
              </Typography>
              <Typography variant="body2" color="grey.500">
                End: {routePoints.end || 'Not set'}
              </Typography>
            </Box>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMapDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JourneyPlanner;



