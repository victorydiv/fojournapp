import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Fab,
  TextField,
  Autocomplete
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  List as ListIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import ChecklistItems from './ChecklistItems';
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://fojournapp.com' 
  : 'http://localhost:3001';

interface Checklist {
  id: number;
  title: string;
  description?: string;
  category: string;
  color: string;
  total_items: number;
  completed_items: number;
  attached_at: string;
  attached_by_username: string;
}

interface DreamChecklistsProps {
  dreamId: number;
  open: boolean;
  onClose: () => void;
}

const DreamChecklists: React.FC<DreamChecklistsProps> = ({ dreamId, open, onClose }) => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [checklistDetailOpen, setChecklistDetailOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [availableChecklists, setAvailableChecklists] = useState<Checklist[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open && dreamId) {
      fetchDreamChecklists();
    }
  }, [dreamId, open]);

  const fetchDreamChecklists = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/dream-checklists/${dreamId}/checklists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChecklists(response.data);
      
      // Update selectedChecklist if it's currently open to reflect new progress
      if (selectedChecklist) {
        const updatedSelectedChecklist = response.data.find((c: Checklist) => c.id === selectedChecklist.id);
        if (updatedSelectedChecklist) {
          setSelectedChecklist(updatedSelectedChecklist);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching dream checklists:', err);
      setError('Failed to load checklists');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableChecklists = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/checklists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter out already attached checklists
      const attachedIds = checklists.map(c => c.id);
      const available = response.data.filter((cl: Checklist) => !attachedIds.includes(cl.id));
      setAvailableChecklists(available);
    } catch (err) {
      console.error('Error fetching available checklists:', err);
    }
  };

  const handleAttachClick = () => {
    fetchAvailableChecklists();
    setAttachDialogOpen(true);
  };

  const handleAttachChecklist = async (checklist: Checklist) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/dream-checklists/${dreamId}/checklists`,
        { checklist_id: checklist.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchDreamChecklists();
      setAttachDialogOpen(false);
    } catch (err) {
      console.error('Error attaching checklist:', err);
      alert('Failed to attach checklist');
    }
  };

  const handleDetachChecklist = async (checklistId: number) => {
    if (!window.confirm('Remove this checklist from the dream?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/dream-checklists/${dreamId}/checklists/${checklistId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setChecklists(checklists.filter(c => c.id !== checklistId));
    } catch (err) {
      console.error('Error detaching checklist:', err);
      alert('Failed to remove checklist');
    }
  };

  const handleOpenChecklist = (checklist: Checklist) => {
    setSelectedChecklist(checklist);
    setChecklistDetailOpen(true);
  };

  const getCompletionPercentage = (checklist: Checklist) => {
    if (!checklist.total_items || checklist.total_items === 0) return 0;
    return Math.round((checklist.completed_items! / checklist.total_items) * 100);
  };

  const getProgressColor = (completed: number, total: number) => {
    if (total === 0) return 'primary';
    const percentage = (completed / total) * 100;
    if (percentage === 100) return 'success';
    if (percentage >= 50) return 'primary';
    return 'warning';
  };

  const filteredAvailableChecklists = availableChecklists.filter(checklist =>
    checklist.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    checklist.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <ListIcon />
            <Typography variant="h6">Dream Checklists</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {loading && <CircularProgress />}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && checklists.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No checklists attached to this dream yet.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Click the + button to attach existing checklists or create new ones.
              </Typography>
            </Box>
          )}

          <List>
            {checklists.map((checklist) => (
              <ListItem key={checklist.id} divider>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {checklist.title}
                      </Typography>
                      <Chip 
                        label={checklist.category} 
                        size="small" 
                        style={{ backgroundColor: checklist.color, color: 'white' }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      {checklist.description && (
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          {checklist.description}
                        </Typography>
                      )}
                      
                      <Box display="flex" alignItems="center" gap={2} mb={1}>
                        <Box flex={1}>
                          <LinearProgress
                            variant="determinate"
                            value={checklist.total_items > 0 ? (checklist.completed_items / checklist.total_items) * 100 : 0}
                            color={getProgressColor(checklist.completed_items, checklist.total_items)}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" minWidth="fit-content">
                          {checklist.completed_items} / {checklist.total_items}
                        </Typography>
                        {checklist.completed_items === checklist.total_items && checklist.total_items > 0 && (
                          <CheckCircleIcon color="success" fontSize="small" />
                        )}
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary">
                        Attached by {checklist.attached_by_username} on {new Date(checklist.attached_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  }
                />
                
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    onClick={() => handleOpenChecklist(checklist)}
                    color="primary"
                  >
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDetachChecklist(checklist.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleAttachClick} startIcon={<AddIcon />} variant="outlined">
            Attach Checklist
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Attach Checklist Dialog */}
      <Dialog open={attachDialogOpen} onClose={() => setAttachDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Attach Checklist to Dream</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={filteredAvailableChecklists}
            getOptionLabel={(option) => option.title}
            onChange={(_, value) => value && handleAttachChecklist(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search Checklists"
                variant="outlined"
                fullWidth
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Box>
                  <Typography variant="subtitle2">{option.title}</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={option.category} 
                      size="small" 
                      style={{ backgroundColor: option.color, color: 'white' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {option.total_items} items
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          />
          
          {filteredAvailableChecklists.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              {searchTerm ? 'No checklists match your search.' : 'No available checklists to attach.'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttachDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Checklist Detail Dialog */}
      <Dialog
        open={checklistDetailOpen}
        onClose={() => {
          setChecklistDetailOpen(false);
          setSelectedChecklist(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedChecklist?.title}
          <Box component="span" sx={{ ml: 1 }}>
            <Chip
              label={selectedChecklist?.category}
              size="small"
              style={{ 
                backgroundColor: selectedChecklist?.color || '#1976d2', 
                color: 'white' 
              }}
            />
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedChecklist?.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selectedChecklist.description}
            </Typography>
          )}
          
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="body1">
              Progress: {selectedChecklist?.completed_items || 0} / {selectedChecklist?.total_items || 0} items completed
            </Typography>
            
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress
                variant="determinate"
                value={selectedChecklist ? getCompletionPercentage(selectedChecklist) : 0}
                size={24}
                color={getCompletionPercentage(selectedChecklist || {} as Checklist) === 100 ? 'success' : 'primary'}
              />
              <Typography variant="body2">
                {selectedChecklist ? getCompletionPercentage(selectedChecklist) : 0}%
              </Typography>
            </Box>
          </Box>

          {selectedChecklist && (
            <ChecklistItems 
              checklistId={selectedChecklist.id} 
              onItemsUpdated={fetchDreamChecklists}
            />
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setChecklistDetailOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DreamChecklists;
