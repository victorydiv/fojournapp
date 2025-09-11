import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Button,
  Divider,
  Alert
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  GroupAdd as GroupAddIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import { collaborationAPI } from '../services/api';
import { useNotifications } from '../hooks/useNotifications';

interface PendingInvitation {
  id: number;
  journey_id: number;
  journey_title: string;
  journey_description?: string;
  role: string;
  invited_at: string;
  invited_by_username: string;
  invited_by_first_name?: string;
}

interface NotificationCounts {
  pendingInvitations: number;
  pendingSuggestions: number;
  recentApprovals: number;
  recentRejections: number;
  total: number;
}

interface PendingSuggestion {
  id: number;
  title: string;
  journey_id: number;
  journey_title: string;
  suggested_by_username: string;
  suggested_by_first_name?: string;
  suggested_at: string;
}

interface RecentResponse {
  id: number;
  title: string;
  journey_id: number;
  journey_title: string;
  approval_status: 'approved' | 'rejected';
  responded_at: string;
}

const InvitationNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the centralized notifications hook
  const {
    notifications,
    pendingSuggestions,
    recentResponses,
    invitations,
    triggerRefresh
  } = useNotifications();

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setError(null);
  };

  const handleResponse = async (invitationId: number, response: 'accept' | 'decline') => {
    try {
      setLoading(true);
      setError(null);
      
      await collaborationAPI.respondToInvitation(invitationId, response);
      
      // Trigger refresh to update all notification data
      triggerRefresh();
      
      // Refresh the journeys list to show newly shared journeys
      window.location.reload(); // Simple refresh - you could use better state management
      
    } catch (error: any) {
      setError(error.response?.data?.error || `Failed to ${response} invitation`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-label="collaboration notifications"
      >
        <Badge badgeContent={notifications.total} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 400, maxHeight: 500 }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsIcon />
            Notifications
          </Typography>
          {notifications.pendingSuggestions > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PendingIcon fontSize="small" />
              {notifications.pendingSuggestions} pending suggestion{notifications.pendingSuggestions > 1 ? 's' : ''}
            </Typography>
          )}
          {notifications.pendingInvitations > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <GroupAddIcon fontSize="small" />
              {notifications.pendingInvitations} pending invitation{notifications.pendingInvitations > 1 ? 's' : ''}
            </Typography>
          )}
          {notifications.recentApprovals > 0 && (
            <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              ✓ {notifications.recentApprovals} suggestion{notifications.recentApprovals > 1 ? 's' : ''} approved
            </Typography>
          )}
          {notifications.recentRejections > 0 && (
            <Typography variant="body2" color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              ✗ {notifications.recentRejections} suggestion{notifications.recentRejections > 1 ? 's' : ''} rejected
            </Typography>
          )}
        </Box>
        
        <Divider />

        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error" sx={{ fontSize: '0.875rem' }}>
              {error}
            </Alert>
          </Box>
        )}

        {invitations.length === 0 && pendingSuggestions.length === 0 && recentResponses.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No pending notifications
            </Typography>
          </Box>
        ) : [
            // Pending Suggestions for Owners
            ...pendingSuggestions.map((suggestion) => (
              <MenuItem key={`suggestion-${suggestion.id}`} sx={{ flexDirection: 'column', alignItems: 'stretch', p: 2 }}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PendingIcon />
                    New Suggestion: {suggestion.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Suggested by {suggestion.suggested_by_name} for "{suggestion.journey_title}"
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(suggestion.created_at)}
                  </Typography>
                </Box>
                
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    handleClose();
                    navigate(`/journeys/${suggestion.journey_id}?openCollaboration=true`);
                  }}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Review Suggestion
                </Button>
              </MenuItem>
            )),

            // Recent Approvals/Rejections for Contributors
            ...recentResponses.map((response) => (
              <MenuItem key={`response-${response.id}`} sx={{ flexDirection: 'column', alignItems: 'stretch', p: 2 }}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ 
                    fontWeight: 'bold', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    color: response.status === 'approved' ? 'success.main' : 'error.main'
                  }}>
                    {response.status === 'approved' ? '✓' : '✗'}
                    Suggestion {response.status === 'approved' ? 'Approved' : 'Rejected'}: {response.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Journey: "{response.journey_title}"
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(response.responded_at)}
                  </Typography>
                </Box>
                
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    handleClose();
                    navigate(`/journeys/${response.journey_id}`);
                  }}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  View Journey
                </Button>
              </MenuItem>
            )),

            // Collaboration Invitations            
            ...invitations.map((invitation) => (
              <MenuItem key={invitation.id} sx={{ flexDirection: 'column', alignItems: 'stretch', p: 2 }}>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {invitation.journey_title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {invitation.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Invited by {invitation.invited_by_name} • {formatDate(invitation.created_at)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={() => handleResponse(invitation.id, 'accept')}
                    disabled={loading}
                    sx={{ flex: 1 }}
                  >
                    Accept
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    onClick={() => handleResponse(invitation.id, 'decline')}
                    disabled={loading}
                    sx={{ flex: 1 }}
                  >
                    Decline
                  </Button>
                </Box>
              </MenuItem>
            ))
        ]}
      </Menu>
    </>
  );
};

export default InvitationNotifications;
