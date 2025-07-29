import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Chip
} from '@mui/material';
import { 
  Add as AddIcon, 
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Map as MapIcon,
  Group as GroupIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { journeysAPI } from '../services/api';
import JourneyPlanner from '../components/JourneyPlanner';

interface Journey {
  id: number;
  title: string;
  description: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: string;
  userRole?: string;
  isOwner?: boolean;
  canEdit?: boolean;
  canSuggest?: boolean;
}

const Journeys: React.FC = () => {
  // Helper function to format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
  };

  // Helper function to handle date change and avoid timezone issues
  const handleDateChange = (field: 'start_date' | 'end_date', value: string, isEditing: boolean = false) => {
    if (!value) return;
    // Create date in local timezone to avoid UTC conversion issues
    const [year, month, day] = value.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    const formattedDate = localDate.getFullYear() + '-' + 
                         String(localDate.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(localDate.getDate()).padStart(2, '0');
    
    if (isEditing) {
      setEditingJourney(prev => prev ? ({...prev, [field]: formattedDate}) : null);
    } else {
      setNewJourney(prev => ({...prev, [field]: formattedDate}));
    }
  };
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [newJourney, setNewJourney] = useState({
    title: '',
    description: '',
    destination: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    const fetchJourneys = async () => {
    console.log('Fetching journeys...');
      try {
        const response = await journeysAPI.getJourneys();
        console.log('Received journeys from backend:', response.data);
    setJourneys(response.data);
      } catch (error) {
        console.error('Error fetching journeys:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJourneys();
  }, []);

  const handleCreateJourney = async () => {
    try {
      const response = await journeysAPI.createJourney(newJourney);
      setJourneys(prev => [...prev, response.data]);
      setCreateDialogOpen(false);
      setNewJourney({
        title: '',
        description: '',
        destination: '',
        start_date: '',
        end_date: ''
      });
    } catch (error) {
      console.error('Error creating journey:', error);
    }
  };

  const handleEditJourney = async () => {
    if (!editingJourney) return;
    
    try {
      const response = await journeysAPI.updateJourney(editingJourney.id, editingJourney);
      setJourneys(prev => prev.map(j => j.id === editingJourney.id ? response.data : j));
      setEditDialogOpen(false);
      setEditingJourney(null);
    } catch (error) {
      console.error('Error updating journey:', error);
    }
  };

  const handleDeleteJourney = async (journeyId: number) => {
    try {
      await journeysAPI.deleteJourney(journeyId);
      setJourneys(prev => prev.filter(j => j.id !== journeyId));
      setAnchorEl(null);
    } catch (error) {
      console.error('Error deleting journey:', error);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, journey: Journey) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedJourney(journey);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedJourney(null);
  };

  const handleEditClick = () => {
    if (selectedJourney) {
      setEditingJourney({ ...selectedJourney });
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (selectedJourney) {
      handleDeleteJourney(selectedJourney.id);
    }
    handleMenuClose();
  };

  const handlePlanClick = (journey: Journey) => {
    setSelectedJourney(journey);
    setPlannerOpen(true);
  };

  const handlePlannerClose = async (updatedJourney: Journey) => {
    console.log('Saving updated journey from planner:', updatedJourney);
    
    try {
      // Save the journey to the backend
      if (updatedJourney.id) {
        const response = await journeysAPI.updateJourney(updatedJourney.id, updatedJourney);
        console.log('Journey saved successfully:', response.data);
        
        // Update the journey in the local state
        setJourneys(prev => prev.map(j => j.id === updatedJourney.id ? updatedJourney : j));
      }
    } catch (error) {
      console.error('Error saving journey:', error);
      alert('Failed to save journey changes');
    }
    
    setPlannerOpen(false);
    setSelectedJourney(null);
  };

  if (plannerOpen && selectedJourney) {
    return (
      <JourneyPlanner
        journey={selectedJourney}
        onUpdateJourney={handlePlannerClose}
      />
    );
  }

  if (loading) {
    return (
      <Container>
        <Typography>Loading journeys...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          My Journeys
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Plan New Journey
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
        {journeys.map((journey) => (
          <Card key={journey.id} sx={{ cursor: 'pointer' }} onClick={() => handlePlanClick(journey)}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <Typography variant="h6" component="h2">
                    {journey.title}
                  </Typography>
                  {journey.userRole && journey.userRole !== 'owner' && (
                    <Chip
                      size="small"
                      icon={<GroupIcon />}
                      label={journey.userRole}
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {journey.isOwner === false && (
                    <Chip
                      size="small"
                      icon={<PersonIcon />}
                      label="Shared"
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuClick(e, journey)}
                >
                  <MoreVertIcon />
                </IconButton>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {journey.description}
              </Typography>
              {journey.destination && (
                <Typography variant="body2" color="primary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <MapIcon fontSize="small" />
                  {journey.destination}
                </Typography>
              )}
              <Typography variant="caption" display="block">
                {journey.start_date} - {journey.end_date}
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" startIcon={<MapIcon />} onClick={(e) => {
                e.stopPropagation();
                handlePlanClick(journey);
              }}>
                Plan Trip
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>

      {/* Menu for edit/delete */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditClick}>
          <EditIcon sx={{ mr: 1 }} />
          Edit Journey
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete Journey
        </MenuItem>
      </Menu>

      {/* Create Journey Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Plan New Journey</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Journey Title"
              value={newJourney.title}
              onChange={(e) => setNewJourney(prev => ({ ...prev, title: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newJourney.description}
              onChange={(e) => setNewJourney(prev => ({ ...prev, description: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Destination"
              value={newJourney.destination}
              onChange={(e) => setNewJourney(prev => ({ ...prev, destination: e.target.value }))}
            />
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={newJourney.start_date}
              onChange={(e) => handleDateChange('start_date', e.target.value, false)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={newJourney.end_date}
              onChange={(e) => handleDateChange('end_date', e.target.value, false)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateJourney} 
            variant="contained"
            disabled={!newJourney.title || !newJourney.start_date || !newJourney.end_date}
          >
            Create Journey
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Journey Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Journey</DialogTitle>
        <DialogContent>
          {editingJourney && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                fullWidth
                label="Journey Title"
                value={editingJourney.title}
                onChange={(e) => setEditingJourney(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
              />
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={editingJourney.description}
                onChange={(e) => setEditingJourney(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
              />
              <TextField
                fullWidth
                label="Destination"
                value={editingJourney.destination}
                onChange={(e) => setEditingJourney(prev => prev ? ({ ...prev, destination: e.target.value }) : null)}
              />
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={editingJourney.start_date}
                onChange={(e) => handleDateChange('start_date', e.target.value, true)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={editingJourney.end_date}
                onChange={(e) => handleDateChange('end_date', e.target.value, true)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleEditJourney} 
            variant="contained"
            disabled={!editingJourney?.title || !editingJourney?.start_date || !editingJourney?.end_date}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Journeys;














