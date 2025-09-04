import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Checkbox,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Tooltip,
  AppBar,
  Toolbar,
  Divider,
  Menu,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIndicatorIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  ArrowBack as ArrowBackIcon,
  MoreVert as MoreVertIcon,
  Check as CheckIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  CheckBox as CheckBoxIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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
  created_at: string;
  updated_at: string;
  items: ChecklistItem[];
}

interface ChecklistViewProps {
  embedded?: boolean;
  onBack?: () => void;
  checklistId?: number;
}

const ChecklistView: React.FC<ChecklistViewProps> = ({ 
  embedded = false, 
  onBack,
  checklistId: propChecklistId 
}) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const checklistId = propChecklistId || parseInt(paramId || '0');

  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string>('all');

  useEffect(() => {
    if (checklistId) {
      fetchChecklist();
    }
  }, [checklistId]);

  const fetchChecklist = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/checklists/${checklistId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChecklist(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching checklist:', err);
      setError('Failed to load checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleItemToggle = async (itemId: number, completed: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/api/checklists/${checklistId}/items/${itemId}`,
        { is_completed: completed },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setChecklist(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(item =>
            item.id === itemId ? { ...item, is_completed: completed } : item
          )
        };
      });
    } catch (err) {
      console.error('Error updating item:', err);
      alert('Failed to update item');
    }
  };

  const handleAddItem = async (itemData: Partial<ChecklistItem>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/checklists/${checklistId}/items`,
        {
          checklist_id: checklistId,
          ...itemData
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Add to local state
      setChecklist(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: [...prev.items, response.data]
        };
      });

      setNewItemDialogOpen(false);
    } catch (err) {
      console.error('Error adding item:', err);
      alert('Failed to add item');
    }
  };

  const handleUpdateItem = async (itemId: number, updates: Partial<ChecklistItem>) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/api/checklists/${checklistId}/items/${itemId}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setChecklist(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          )
        };
      });

      setEditingItem(null);
    } catch (err) {
      console.error('Error updating item:', err);
      alert('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/checklists/${checklistId}/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove from local state
      setChecklist(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter(item => item.id !== itemId)
        };
      });
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item');
    }
  };

  const handleDragEnd = async (fromIndex: number, toIndex: number) => {
    if (!checklist || fromIndex === toIndex) return;

    const items = Array.from(checklist.items);
    const [reorderedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, reorderedItem);

    // Update sort orders
    const updatedItems = items.map((item, index) => ({
      ...item,
      sort_order: index
    }));

    // Update local state immediately
    setChecklist({
      ...checklist,
      items: updatedItems
    });

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/api/checklists/${checklistId}/items/reorder`,
        {
          checklist_id: checklistId,
          items: updatedItems.map(item => ({ id: item.id, sort_order: item.sort_order }))
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Error reordering items:', err);
      // Revert on error
      fetchChecklist();
      alert('Failed to reorder items');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/checklists/${checklistId}/share`,
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

  const filteredItems = checklist?.items.filter(item => {
    if (!showCompleted && item.is_completed) return false;
    if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
    return true;
  }) || [];

  const completedCount = checklist?.items.filter(item => item.is_completed).length || 0;
  const totalCount = checklist?.items.length || 0;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !checklist) {
    return <Alert severity="error">{error || 'Checklist not found'}</Alert>;
  }

  return (
    <Box sx={{ height: embedded ? 'auto' : '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      {!embedded && (
        <AppBar position="static" sx={{ backgroundColor: checklist.color }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => onBack ? onBack() : navigate('/checklists')}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {checklist.title}
            </Typography>

            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2">
                {completedCount}/{totalCount} completed ({completionPercentage}%)
              </Typography>
              
              <CircularProgress
                variant="determinate"
                value={completionPercentage}
                size={24}
                sx={{ color: 'white' }}
              />

              <IconButton
                color="inherit"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
              >
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {/* Filters and Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                />
              }
              label="Show completed"
            />
            
            <FormControl size="small" style={{ minWidth: 120 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                label="Priority"
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNewItemDialogOpen(true)}
            sx={{ backgroundColor: checklist.color }}
          >
            Add Item
          </Button>
        </Box>
      </Paper>

      {/* Checklist Items */}
      <Paper sx={{ flexGrow: 1, overflow: 'auto' }}>
        {filteredItems.length === 0 ? (
          <Box textAlign="center" py={6}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {checklist.items.length === 0 ? 'No items yet' : 'No items match your filters'}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {checklist.items.length === 0 
                ? 'Start adding items to your checklist!'
                : 'Try adjusting your filters to see more items.'
              }
            </Typography>
            {checklist.items.length === 0 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setNewItemDialogOpen(true)}
                sx={{ backgroundColor: checklist.color }}
              >
                Add First Item
              </Button>
            )}
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {filteredItems.map((item, index) => (
              <ListItem
                key={item.id}
                sx={{
                  borderBottom: '1px solid #e0e0e0',
                  opacity: item.is_completed ? 0.6 : 1
                }}
              >
                <ListItemIcon>
                  <Checkbox
                    checked={item.is_completed}
                    onChange={(e) => handleItemToggle(item.id, e.target.checked)}
                    sx={{ color: checklist.color }}
                  />
                </ListItemIcon>

                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography
                        sx={{
                          textDecoration: item.is_completed ? 'line-through' : 'none'
                        }}
                      >
                        {item.text}
                      </Typography>
                      
                      <Chip
                        label={item.priority}
                        size="small"
                        color={
                          item.priority === 'high' ? 'error' :
                          item.priority === 'medium' ? 'warning' : 'default'
                        }
                      />
                      
                      {item.due_date && (
                        <Chip
                          icon={<ScheduleIcon />}
                          label={new Date(item.due_date).toLocaleDateString()}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={item.description || item.notes}
                />

                <ListItemSecondaryAction>
                  <IconButton
                    onClick={() => setEditingItem(item)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDeleteItem(item.id)}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Floating Action Button */}
      {!embedded && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            backgroundColor: checklist.color
          }}
          onClick={() => setNewItemDialogOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={handlePrint}>
          <PrintIcon sx={{ mr: 1 }} /> Print
        </MenuItem>
        <MenuItem onClick={handleShare}>
          <ShareIcon sx={{ mr: 1 }} /> Share
        </MenuItem>
      </Menu>

      {/* Add/Edit Item Dialog */}
      <ChecklistItemDialog
        open={newItemDialogOpen || !!editingItem}
        item={editingItem}
        onClose={() => {
          setNewItemDialogOpen(false);
          setEditingItem(null);
        }}
        onSave={(itemData) => {
          if (editingItem) {
            handleUpdateItem(editingItem.id, itemData);
          } else {
            handleAddItem(itemData);
          }
        }}
      />
    </Box>
  );
};

// Add/Edit Item Dialog Component
interface ChecklistItemDialogProps {
  open: boolean;
  item?: ChecklistItem | null;
  onClose: () => void;
  onSave: (itemData: Partial<ChecklistItem>) => void;
}

const ChecklistItemDialog: React.FC<ChecklistItemDialogProps> = ({
  open,
  item,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    text: '',
    description: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    if (item) {
      setFormData({
        text: item.text,
        description: item.description || '',
        category: item.category || '',
        priority: item.priority,
        due_date: item.due_date || '',
        notes: item.notes || ''
      });
    } else {
      setFormData({
        text: '',
        description: '',
        category: '',
        priority: 'medium',
        due_date: '',
        notes: ''
      });
    }
  }, [item, open]);

  const handleSave = () => {
    if (!formData.text.trim()) return;
    
    onSave({
      ...formData,
      due_date: formData.due_date || undefined
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {item ? 'Edit Item' : 'Add New Item'}
      </DialogTitle>
      
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} pt={1}>
          <TextField
            label="Item Text"
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            fullWidth
            required
            autoFocus
          />
          
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
          
          <TextField
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            fullWidth
          />
          
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
              label="Priority"
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Due Date"
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          
          <TextField
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            fullWidth
            multiline
            rows={3}
          />
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={!formData.text.trim()}
        >
          {item ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChecklistView;
