import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Box,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Send as SendIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import { collaborationAPI } from '../services/api';

interface CollaborationManagerProps {
  open: boolean;
  onClose: () => void;
  journeyId: number;
  journeyTitle: string;
  userRole: string;
}

interface Collaborator {
  id: number;
  user_id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  status: string;
  invited_at: string;
  invited_by_username: string;
}

interface Suggestion {
  id: number;
  title: string;
  description?: string;
  type: string;
  day: number;
  suggested_by_username: string;
  suggested_by_first_name?: string;
  created_at: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

const CollaborationManager: React.FC<CollaborationManagerProps> = ({
  open,
  onClose,
  journeyId,
  journeyTitle,
  userRole
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isOwner = userRole === 'owner';

  useEffect(() => {
    if (open) {
      loadCollaborators();
      if (isOwner) {
        loadSuggestions();
      }
    }
  }, [open, journeyId, isOwner]);

  const loadCollaborators = async () => {
    try {
      setLoading(true);
      const response = await collaborationAPI.getCollaborators(journeyId);
      setCollaborators(response.data.collaborators || []);
    } catch (error) {
      console.error('Failed to load collaborators:', error);
      setError('Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await collaborationAPI.getSuggestions(journeyId);
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    try {
      setLoading(true);
      setError(null);
      
      await collaborationAPI.inviteCollaborator(journeyId, {
        email: inviteEmail.trim(),
        message: inviteMessage.trim() || undefined
      });
      
      setSuccess('Invitation sent successfully!');
      setInviteEmail('');
      setInviteMessage('');
      loadCollaborators();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: number) => {
    if (!window.confirm('Are you sure you want to remove this collaborator?')) return;

    try {
      await collaborationAPI.removeCollaborator(journeyId, collaboratorId);
      setSuccess('Collaborator removed successfully');
      loadCollaborators();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to remove collaborator');
    }
  };

  const handleReviewSuggestion = async (experienceId: number, action: 'approve' | 'reject', notes?: string) => {
    try {
      await collaborationAPI.reviewSuggestion(journeyId, experienceId, { action, notes });
      setSuccess(`Suggestion ${action}ed successfully`);
      loadSuggestions();
      
      // Refresh the main journey experiences if approved
      if (action === 'approve') {
        // You might want to emit an event or use a context to refresh the main experience list
        window.dispatchEvent(new CustomEvent('experienceApproved'));
      }
    } catch (error: any) {
      setError(error.response?.data?.error || `Failed to ${action} suggestion`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'success';
      case 'pending': return 'warning';
      case 'declined': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircleIcon fontSize="small" />;
      case 'pending': return <PendingIcon fontSize="small" />;
      case 'declined': return <CancelIcon fontSize="small" />;
      default: return <PersonIcon fontSize="small" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Collaboration - {journeyTitle}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
          <Tab label="Collaborators" />
          {isOwner && (
            <Tab 
              label={
                <Badge badgeContent={suggestions.length} color="primary">
                  Suggestions
                </Badge>
              } 
            />
          )}
        </Tabs>

        {/* Collaborators Tab */}
        {tabValue === 0 && (
          <Box>
            {isOwner && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Invite Collaborator
                </Typography>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Message (Optional)"
                  multiline
                  rows={2}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={handleInvite}
                  disabled={loading || !inviteEmail.trim()}
                >
                  Send Invitation
                </Button>
              </Box>
            )}

            <Typography variant="h6" gutterBottom>
              Current Collaborators
            </Typography>
            {loading ? (
              <CircularProgress />
            ) : (
              <List>
                {collaborators.map((collaborator) => (
                  <ListItem key={collaborator.id}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {collaborator.first_name || collaborator.username}
                          <Chip
                            size="small"
                            icon={getStatusIcon(collaborator.status)}
                            label={collaborator.role}
                            color={getStatusColor(collaborator.status) as any}
                          />
                          <Chip
                            size="small"
                            label={collaborator.status}
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {collaborator.email}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Invited by {collaborator.invited_by_username} on {formatDate(collaborator.invited_at)}
                          </Typography>
                        </Box>
                      }
                    />
                    {isOwner && collaborator.status !== 'owner' && (
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveCollaborator(collaborator.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                ))}
                {collaborators.length === 0 && (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No collaborators yet
                  </Typography>
                )}
              </List>
            )}
          </Box>
        )}

        {/* Suggestions Tab */}
        {tabValue === 1 && isOwner && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Pending Experience Suggestions
            </Typography>
            <List>
              {suggestions.map((suggestion) => (
                <ListItem key={suggestion.id} sx={{ border: 1, borderColor: 'divider', mb: 1, borderRadius: 1 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {suggestion.title}
                        <Chip size="small" label={`Day ${suggestion.day}`} />
                        <Chip size="small" label={suggestion.type} variant="outlined" />
                      </Box>
                    }
                    secondary={
                      <Box>
                        {suggestion.description && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {suggestion.description}
                          </Typography>
                        )}
                        {suggestion.location && (
                          <Typography variant="caption" color="text.secondary">
                            📍 {suggestion.location.address}
                          </Typography>
                        )}
                        <Typography variant="caption" display="block" color="text.secondary">
                          Suggested by {suggestion.suggested_by_first_name || suggestion.suggested_by_username} on {formatDate(suggestion.created_at)}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => handleReviewSuggestion(suggestion.id, 'approve')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleReviewSuggestion(suggestion.id, 'reject')}
                      >
                        Reject
                      </Button>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {suggestions.length === 0 && (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No pending suggestions
                </Typography>
              )}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CollaborationManager;
