import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Launch as LaunchIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Checklist as ChecklistIcon
} from '@mui/icons-material';
import ChecklistManager from './ChecklistManager';
import ChecklistItems from './ChecklistItems';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

interface ChecklistItem {
  id: number;
  text: string;
  is_completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
}

interface Checklist {
  id: number;
  title: string;
  description?: string;
  category: string;
  color: string;
  total_items?: number;
  completed_items?: number;
  attached_at?: string;
  attached_by_username?: string;
  items?: ChecklistItem[];
}

interface JourneyChecklistsProps {
  journeyId: number;
  isOwner?: boolean;
  canEdit?: boolean;
  hideHeader?: boolean;
}

const JourneyChecklists: React.FC<JourneyChecklistsProps> = ({
  journeyId,
  isOwner = false,
  canEdit = false,
  hideHeader = false
}) => {
  console.log('DEBUG: JourneyChecklists component mounting with journeyId:', journeyId);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [checklistDetailOpen, setChecklistDetailOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);

  useEffect(() => {
    fetchJourneyChecklists();
  }, [journeyId]);

  const fetchJourneyChecklists = async () => {
    try {
      setLoading(true);
      console.log('DEBUG: Fetching journey checklists for journey ID:', journeyId);
      const token = localStorage.getItem('token');
      console.log('DEBUG: Token exists:', !!token);
      const response = await axios.get(`${API_BASE_URL}/journey-checklists/${journeyId}/checklists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('DEBUG: Journey checklists response status:', response.status);
      console.log('DEBUG: Journey checklists response data:', response.data);
      console.log('DEBUG: Is response.data an array?', Array.isArray(response.data));
      // Ensure we have an array
      const checklistsData = Array.isArray(response.data) ? response.data : [];
      console.log('DEBUG: Setting checklists to:', checklistsData);
      setChecklists(checklistsData);
      setError(null);
    } catch (err) {
      console.error('DEBUG: Error fetching journey checklists:', err);
      if (axios.isAxiosError(err)) {
        console.error('DEBUG: Axios error response:', err.response?.data);
        console.error('DEBUG: Axios error status:', err.response?.status);
      }
      setError('Failed to load checklists');
      setChecklists([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistItemsUpdated = async () => {
    try {
      if (!selectedChecklist) return;
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/journey-checklists/${journeyId}/checklists`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update both the checklists array and the selectedChecklist
      // Ensure we have an array
      const updatedChecklists = Array.isArray(response.data) ? response.data : [];
      const updatedSelectedChecklist = updatedChecklists.find((c: Checklist) => c.id === selectedChecklist.id);
      
      setChecklists(updatedChecklists);
      if (updatedSelectedChecklist) {
        setSelectedChecklist(updatedSelectedChecklist);
      }
    } catch (err) {
      console.error('Error updating checklist completion data:', err);
    }
  };

  const handleAttachChecklist = async (checklist: Checklist) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/journey-checklists/${journeyId}/checklists`,
        { checklist_id: checklist.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchJourneyChecklists();
      setAttachDialogOpen(false);
    } catch (err) {
      console.error('Error attaching checklist:', err);
      alert('Failed to attach checklist');
    }
  };

  const handleDetachChecklist = async (checklistId: number) => {
    if (!window.confirm('Remove this checklist from the journey?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/journey-checklists/${journeyId}/checklists/${checklistId}`, {
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      {/* Header */}
      {!hideHeader && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" component="h3">
            Journey Checklists
          </Typography>
        </Box>
      )}

      {/* Attach Checklist Button - Always visible when canEdit is true */}
      {canEdit && (
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setAttachDialogOpen(true)}
          >
            Attach Checklist
          </Button>
        </Box>
      )}

      {/* Checklists */}
      {checklists.length === 0 ? (
        <Box textAlign="center" py={4}>
          <ChecklistIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No checklists attached
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Attach checklists to help organize and track items for this journey.
          </Typography>
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAttachDialogOpen(true)}
            >
              Attach First Checklist
            </Button>
          )}
        </Box>
      ) : (
        <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={2}>
          {checklists.map((checklist) => {
            const completionPercentage = getCompletionPercentage(checklist);
            
            return (
              <Card key={checklist.id} sx={{ height: 'fit-content' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="h4" noWrap>
                      {checklist.title}
                    </Typography>
                    
                    <Chip
                      label={checklist.category}
                      size="small"
                      style={{ backgroundColor: checklist.color, color: 'white' }}
                    />
                  </Box>

                  {checklist.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {checklist.description}
                    </Typography>
                  )}

                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="body2">
                      {checklist.completed_items || 0} / {checklist.total_items || 0} items
                    </Typography>
                    
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress
                        variant="determinate"
                        value={completionPercentage}
                        size={20}
                        color={completionPercentage === 100 ? 'success' : 'primary'}
                      />
                      <Typography variant="caption">
                        {completionPercentage}%
                      </Typography>
                    </Box>
                  </Box>

                  {checklist.attached_at && (
                    <Typography variant="caption" color="text.secondary">
                      Attached {new Date(checklist.attached_at).toLocaleDateString()}
                      {checklist.attached_by_username && ` by ${checklist.attached_by_username}`}
                    </Typography>
                  )}
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<LaunchIcon />}
                    onClick={() => handleOpenChecklist(checklist)}
                  >
                    Open
                  </Button>
                  
                  {canEdit && (
                    <IconButton
                      size="small"
                      onClick={() => handleDetachChecklist(checklist.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Attach Checklist Dialog */}
      <Dialog
        open={attachDialogOpen}
        onClose={() => setAttachDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Attach Checklist to Journey</DialogTitle>
        
        <DialogContent>
          <ChecklistManager
            mode="select"
            onChecklistSelect={handleAttachChecklist}
            selectedChecklistIds={checklists.map(c => c.id)}
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setAttachDialogOpen(false)}>
            Cancel
          </Button>
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
              onItemsUpdated={handleChecklistItemsUpdated}
            />
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setChecklistDetailOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JourneyChecklists;
