import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Checkbox,
  Chip,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface ChecklistItem {
  id: number;
  checklist_id: number;
  text: string;
  description?: string;
  is_completed: boolean;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  notes?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ChecklistItemsProps {
  checklistId: number;
  readOnly?: boolean;
  onItemsUpdated?: () => void;
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  marginBottom: theme.spacing(1),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const ChecklistItems: React.FC<ChecklistItemsProps> = ({ checklistId, readOnly = false, onItemsUpdated }) => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    text: '',
    description: '',
    category: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchItems();
  }, [checklistId]);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/checklists/${checklistId}/items`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(response.data);
    } catch (error: any) {
      console.error('Error fetching checklist items:', error);
      setError('Failed to load checklist items');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      text: '',
      description: '',
      category: '',
      priority: 'medium',
      due_date: '',
      notes: ''
    });
  };

  const handleAddItem = async () => {
    if (!formData.text.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Clean the form data - convert empty strings to null/undefined
      const cleanedData = {
        text: formData.text.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category.trim() || undefined,
        priority: formData.priority,
        due_date: formData.due_date || undefined,
        notes: formData.notes.trim() || undefined
      };
      
      console.log('Adding item with data:', cleanedData);
      const response = await axios.post(`${API_BASE_URL}/api/checklists/${checklistId}/items`, cleanedData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems([...items, response.data]);
      setAddDialogOpen(false);
      resetForm();
      onItemsUpdated?.(); // Notify parent of update
    } catch (error: any) {
      console.error('Error adding item:', error);
      console.error('Error response:', error.response?.data);
      setError('Failed to add item');
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !formData.text.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/api/checklists/${checklistId}/items/${editingItem.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(items.map(item => item.id === editingItem.id ? response.data : item));
      setEditingItem(null);
      resetForm();
      onItemsUpdated?.(); // Notify parent of update
    } catch (error: any) {
      console.error('Error updating item:', error);
      setError('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/checklists/${checklistId}/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(items.filter(item => item.id !== itemId));
      onItemsUpdated?.(); // Notify parent of update
    } catch (error: any) {
      console.error('Error deleting item:', error);
      setError('Failed to delete item');
    }
  };

  const handleToggleComplete = async (item: ChecklistItem) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/api/checklists/${checklistId}/items/${item.id}`, {
        is_completed: !item.is_completed
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(items.map(i => i.id === item.id ? response.data : i));
      onItemsUpdated?.(); // Notify parent of update
    } catch (error: any) {
      console.error('Error toggling completion:', error);
      setError('Failed to update item');
    }
  };

  const openEditDialog = (item: ChecklistItem) => {
    setEditingItem(item);
    setFormData({
      text: item.text,
      description: item.description || '',
      category: item.category || '',
      priority: item.priority,
      due_date: item.due_date ? item.due_date.split('T')[0] : '',
      notes: item.notes || ''
    });
  };

  const toggleItemExpanded = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography>Loading items...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!readOnly && (
        <Box mb={2}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            fullWidth
          >
            Add Item
          </Button>
        </Box>
      )}

      {items.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="body2" color="text.secondary">
            No items in this checklist yet.
          </Typography>
        </Box>
      ) : (
        <List dense>
          {items.map((item) => (
            <Box key={item.id}>
              <StyledPaper variant="outlined">
                <ListItem
                  disablePadding
                  secondaryAction={
                    !readOnly && (
                      <Box>
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => openEditDialog(item)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleDeleteItem(item.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )
                  }
                >
                  <ListItemButton
                    onClick={() => readOnly && toggleItemExpanded(item.id)}
                    sx={{ flex: 1 }}
                  >
                    <ListItemIcon>
                      <Checkbox
                        checked={item.is_completed}
                        onChange={() => !readOnly && handleToggleComplete(item)}
                        disabled={readOnly}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography
                            variant="body1"
                            sx={{
                              textDecoration: item.is_completed ? 'line-through' : 'none',
                              color: item.is_completed ? 'text.secondary' : 'text.primary'
                            }}
                          >
                            {item.text}
                          </Typography>
                          <Chip
                            label={item.priority}
                            size="small"
                            color={getPriorityColor(item.priority) as any}
                            variant="outlined"
                          />
                          {item.category && (
                            <Chip
                              label={item.category}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={item.due_date && new Date(item.due_date).toLocaleDateString()}
                    />
                    {(item.description || item.notes) && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItemExpanded(item.id);
                        }}
                      >
                        {expandedItems.has(item.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    )}
                  </ListItemButton>
                </ListItem>
                
                {expandedItems.has(item.id) && (item.description || item.notes) && (
                  <Box px={2} pb={1}>
                    <Divider sx={{ mb: 1 }} />
                    {item.description && (
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Description:</strong> {item.description}
                      </Typography>
                    )}
                    {item.notes && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Notes:</strong> {item.notes}
                      </Typography>
                    )}
                  </Box>
                )}
              </StyledPaper>
            </Box>
          ))}
        </List>
      )}

      {/* Add/Edit Item Dialog */}
      <Dialog
        open={addDialogOpen || editingItem !== null}
        onClose={() => {
          setAddDialogOpen(false);
          setEditingItem(null);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
        disableAutoFocus
        disableEnforceFocus
      >
        <DialogTitle>
          {editingItem ? 'Edit Item' : 'Add New Item'}
        </DialogTitle>
        
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Item Text"
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              required
              fullWidth
            />
            
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            
            <Box display="flex" gap={2}>
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
            </Box>
            
            <TextField
              label="Due Date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button
            onClick={() => {
              setAddDialogOpen(false);
              setEditingItem(null);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={editingItem ? handleUpdateItem : handleAddItem}
            variant="contained"
            disabled={!formData.text.trim()}
          >
            {editingItem ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChecklistItems;
