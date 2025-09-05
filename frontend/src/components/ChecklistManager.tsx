import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  CardActions,
  Fab,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  MoreVert as MoreVertIcon,
  Print as PrintIcon,
  FileCopy as FileCopyIcon,
  Launch as LaunchIcon,
  Checklist as ChecklistIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

interface ChecklistItem {
  id: number;
  text: string;
  description?: string;
  is_completed: boolean;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  notes?: string;
  sort_order: number;
}

interface Checklist {
  id: number;
  title: string;
  description?: string;
  category: string;
  is_template: boolean;
  is_public: boolean;
  color: string;
  total_items?: number;
  completed_items?: number;
  created_at: string;
  updated_at: string;
  items?: ChecklistItem[];
}

interface ChecklistManagerProps {
  onChecklistSelect?: (checklist: Checklist) => void;
  mode?: 'list' | 'select';
  selectedChecklistIds?: number[];
}

const categories = [
  { value: 'general', label: 'General', color: '#2196F3' },
  { value: 'packing', label: 'Packing', color: '#FF9800' },
  { value: 'planning', label: 'Planning', color: '#9C27B0' },
  { value: 'activities', label: 'Activities', color: '#4CAF50' },
  { value: 'documents', label: 'Documents', color: '#F44336' },
  { value: 'food', label: 'Food', color: '#E91E63' },
  { value: 'other', label: 'Other', color: '#607D8B' }
];

const ChecklistManager: React.FC<ChecklistManagerProps> = ({
  onChecklistSelect,
  mode = 'list',
  selectedChecklistIds = []
}) => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; checklist: Checklist } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const navigate = useNavigate();

  useEffect(() => {
    fetchChecklists();
  }, [categoryFilter]);

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const response = await axios.get(`${API_BASE_URL}/checklists?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('DEBUG: Checklists response:', response.data);
      // Ensure we have an array
      const checklistsData = Array.isArray(response.data) ? response.data : [];
      setChecklists(checklistsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching checklists:', err);
      setError('Failed to load checklists');
      setChecklists([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChecklist = () => {
    setCreateDialogOpen(true);
  };

  const handleEditChecklist = (checklist: Checklist) => {
    setEditingChecklist(checklist);
    setMenuAnchor(null);
  };

  const handleDeleteChecklist = async (checklistId: number) => {
    if (!window.confirm('Are you sure you want to delete this checklist?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/checklists/${checklistId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setChecklists(checklists.filter(c => c.id !== checklistId));
      setMenuAnchor(null);
    } catch (err: any) {
      console.error('Error deleting checklist:', err);
      const errorMessage = err.response?.data?.error || 'Failed to delete checklist';
      alert(errorMessage);
    }
  };

  const handleDuplicateChecklist = async (checklistId: number) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/checklists/${checklistId}/duplicate`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchChecklists();
      setMenuAnchor(null);
    } catch (err) {
      console.error('Error duplicating checklist:', err);
      alert('Failed to duplicate checklist');
    }
  };

  const handleShareChecklist = async (checklistId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/checklists/${checklistId}/share`, 
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const shareUrl = `${window.location.origin}/checklists/shared/${response.data.share_token}`;
      navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
      setMenuAnchor(null);
    } catch (err) {
      console.error('Error creating share link:', err);
      alert('Failed to create share link');
    }
  };

  const handlePrintChecklist = (checklist: Checklist) => {
    window.open(`/checklists/${checklist.id}/print`, '_blank');
    setMenuAnchor(null);
  };

  const handleChecklistClick = (checklist: Checklist) => {
    if (mode === 'select') {
      onChecklistSelect?.(checklist);
    } else {
      navigate(`/checklists/${checklist.id}`);
    }
  };

  const getCompletionPercentage = (checklist: Checklist) => {
    if (!checklist.total_items || checklist.total_items === 0) return 0;
    return Math.round((checklist.completed_items! / checklist.total_items) * 100);
  };

  const getCategoryInfo = (category: string) => {
    return categories.find(c => c.value === category) || categories[0];
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
      {/* Header and Controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Checklists
        </Typography>
        
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" style={{ minWidth: 120 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              label="Category"
            >
              <MenuItem value="all">All Categories</MenuItem>
              {categories.map(cat => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateChecklist}
            disabled={mode === 'select'}
          >
            New Checklist
          </Button>
        </Box>
      </Box>

      {/* Checklists Grid */}
      <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={3}>
        {checklists.map((checklist) => {
          const categoryInfo = getCategoryInfo(checklist.category);
          const completionPercentage = getCompletionPercentage(checklist);
          const isSelected = selectedChecklistIds.includes(checklist.id);

          return (
            <Card 
              key={checklist.id}
              sx={{
                cursor: 'pointer',
                border: isSelected ? '2px solid #1976d2' : 'none',
                '&:hover': { boxShadow: 6 }
              }}
              onClick={() => handleChecklistClick(checklist)}
            >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="h3" noWrap>
                      {checklist.title}
                    </Typography>
                    
                    <Box display="flex" alignItems="center">
                      {checklist.is_public === true && (
                        <Tooltip title="Public">
                          <PublicIcon fontSize="small" color="primary" />
                        </Tooltip>
                      )}
                      {checklist.is_template === true && (
                        <Chip label="Template" size="small" color="secondary" />
                      )}
                    </Box>
                  </Box>

                  <Chip
                    label={categoryInfo.label}
                    size="small"
                    style={{ backgroundColor: categoryInfo.color, color: 'white' }}
                    sx={{ mb: 2 }}
                  />

                  {checklist.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {checklist.description}
                    </Typography>
                  )}

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">
                      {checklist.completed_items || 0} / {checklist.total_items || 0} items
                    </Typography>
                    
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress
                        variant="determinate"
                        value={completionPercentage}
                        size={24}
                        color={completionPercentage === 100 ? 'success' : 'primary'}
                      />
                      <Typography variant="caption">
                        {completionPercentage}%
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<LaunchIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChecklistClick(checklist);
                    }}
                  >
                    Open
                  </Button>
                  
                  {mode !== 'select' && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuAnchor({ element: e.currentTarget, checklist });
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  )}
                </CardActions>
              </Card>
          );
        })}
      </Box>

      {checklists.length === 0 && (
        <Box textAlign="center" py={6}>
          <ChecklistIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No checklists found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Create your first checklist to get started organizing your travel plans!
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateChecklist}
            disabled={mode === 'select'}
          >
            Create Checklist
          </Button>
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleEditChecklist(menuAnchor!.checklist)}>
          <EditIcon sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => handleDuplicateChecklist(menuAnchor!.checklist.id)}>
          <FileCopyIcon sx={{ mr: 1 }} /> Duplicate
        </MenuItem>
        <MenuItem onClick={() => handleShareChecklist(menuAnchor!.checklist.id)}>
          <ShareIcon sx={{ mr: 1 }} /> Share
        </MenuItem>
        <MenuItem onClick={() => handlePrintChecklist(menuAnchor!.checklist)}>
          <PrintIcon sx={{ mr: 1 }} /> Print
        </MenuItem>
        <MenuItem 
          onClick={() => handleDeleteChecklist(menuAnchor!.checklist.id)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Create/Edit Dialog */}
      <ChecklistDialog
        open={createDialogOpen || !!editingChecklist}
        checklist={editingChecklist}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditingChecklist(null);
        }}
        onSave={(checklist) => {
          fetchChecklists();
          setCreateDialogOpen(false);
          setEditingChecklist(null);
        }}
      />
    </Box>
  );
};

// Create/Edit Checklist Dialog Component
interface ChecklistDialogProps {
  open: boolean;
  checklist?: Checklist | null;
  onClose: () => void;
  onSave: (checklist: Checklist) => void;
}

const ChecklistDialog: React.FC<ChecklistDialogProps> = ({
  open,
  checklist,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    is_template: false,
    is_public: false,
    color: '#1976d2'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (checklist) {
      setFormData({
        title: checklist.title,
        description: checklist.description || '',
        category: checklist.category,
        is_template: checklist.is_template,
        is_public: checklist.is_public,
        color: checklist.color
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'general',
        is_template: false,
        is_public: false,
        color: '#1976d2'
      });
    }
  }, [checklist, open]);

  const handleSave = async () => {
    if (!formData.title.trim()) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      let response;
      if (checklist) {
        response = await axios.put(
          `${API_BASE_URL}/checklists/${checklist.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create the checklist first
        response = await axios.post(
          `${API_BASE_URL}/checklists`,
          { ...formData, is_template: false, is_public: false }, // Keep checklist separate from template
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // If user wants to create a template, create it separately
        if (formData.is_template) {
          try {
            await axios.post(
              `${API_BASE_URL}/templates/from-checklist/${response.data.id}`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
            // Note: Template creation is separate, so we don't need to handle its response here
          } catch (templateError) {
            console.error('Error creating template:', templateError);
            // Continue with checklist creation even if template creation fails
          }
        }
      }

      onSave(response.data);
    } catch (err: any) {
      console.error('Error saving checklist:', err);
      const errorMessage = err.response?.data?.error || 'Failed to save checklist';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {checklist ? 'Edit Checklist' : 'Create New Checklist'}
      </DialogTitle>
      
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} pt={1}>
          <TextField
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            fullWidth
            required
          />
          
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            multiline
            rows={3}
          />
          
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              label="Category"
            >
              {categories.map(cat => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            label="Color"
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            fullWidth
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_template}
                onChange={(e) => {
                  const isTemplate = e.target.checked;
                  setFormData({ 
                    ...formData, 
                    is_template: isTemplate,
                    // Note: Templates are now managed separately
                    // This flag is kept for backward compatibility
                    is_public: isTemplate || formData.is_public
                  });
                }}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Create as template</Typography>
                <Typography variant="caption" color="text.secondary">
                  Creates a separate public template that others can use
                </Typography>
              </Box>
            }
          />
          
          {!formData.is_template && (
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_public}
                  onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                />
              }
              label="Make this public (shareable)"
            />
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={!formData.title.trim() || saving}
        >
          {saving ? 'Saving...' : checklist ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChecklistManager;
