import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
  Switch,
  FormControlLabel,
  CircularProgress,
  Grid,
  Paper,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { MemoryType } from '../../types';
import { useAdminMemoryTypes } from '../../hooks/useAdminMemoryTypes';
import { memoryTypesAPI } from '../../services/memoryTypes';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// Common emoji options for memory types
const EMOJI_OPTIONS = [
  '🏛️', '🍽️', '🏨', '🎯', '🍺', '📍', // Existing ones
  '🌍', '🗺️', '📸', '🎪', '🎭', '🎨', // Travel/Entertainment
  '🏖️', '🏔️', '🌲', '🌊', '🏞️', '🌆', // Nature/Locations
  '🚗', '✈️', '🚢', '🚂', '🚌', '🚲', // Transportation
  '🎵', '🎸', '🎤', '🎬', '🎮', '📚', // Entertainment/Culture
  '⛪', '🕌', '🏰', '🗿', '🎡', '🎢', // Landmarks/Attractions
  '🍕', '🍜', '🍣', '☕', '🍷', '🧁', // Food/Drink
  '🛍️', '💎', '🎁', '🌟', '❤️', '🔥'  // Shopping/Special
];

interface MemoryTypeFormData {
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
}

interface SortableMemoryTypeProps {
  memoryType: MemoryType;
  onEdit: (memoryType: MemoryType) => void;
  onDelete: (id: number) => void;
}

const SortableMemoryType: React.FC<SortableMemoryTypeProps> = ({
  memoryType,
  onEdit,
  onDelete
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: memoryType.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{ 
        mb: 2, 
        cursor: 'grab',
        '&:hover': { boxShadow: 3 }
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton
            {...attributes}
            {...listeners}
            size="small"
            sx={{ cursor: 'grab' }}
          >
            <DragIcon />
          </IconButton>
          <Box flex={1} display="flex" alignItems="center" gap={1}>
            {memoryType.icon && (
              <Typography variant="h6" component="span" sx={{ fontSize: '1.2em' }}>
                {memoryType.icon}
              </Typography>
            )}
            <Box>
              <Typography variant="h6" component="div">
                {memoryType.display_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {memoryType.name}
              </Typography>
              {memoryType.description && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {memoryType.description}
                </Typography>
              )}
            </Box>
          </Box>
          <Chip
            label={memoryType.is_active ? 'Active' : 'Inactive'}
            color={memoryType.is_active ? 'success' : 'default'}
            size="small"
          />
          <Box>
            <IconButton
              onClick={() => onEdit(memoryType)}
              size="small"
              color="primary"
            >
              <EditIcon />
            </IconButton>
            <IconButton
              onClick={() => onDelete(memoryType.id)}
              size="small"
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const AdminMemoryTypes: React.FC = () => {
  const { memoryTypes, loading, error, refreshMemoryTypes } = useAdminMemoryTypes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MemoryType | null>(null);
  const [formData, setFormData] = useState<MemoryTypeFormData>({
    name: '',
    display_name: '',
    description: '',
    icon: '',
    color: '',
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const refreshAllMemoryTypes = async () => {
    // Clear both admin and regular memory types caches
    memoryTypesAPI.clearCache();
    await refreshMemoryTypes();
  };

  useEffect(() => {
    if (editingType) {
      setFormData({
        name: editingType.name,
        display_name: editingType.display_name,
        description: editingType.description || '',
        icon: editingType.icon || '',
        color: editingType.color || '',
        is_active: editingType.is_active
      });
    } else {
      setFormData({
        name: '',
        display_name: '',
        description: '',
        icon: '',
        color: '',
        is_active: true
      });
    }
  }, [editingType]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = memoryTypes.findIndex((type: MemoryType) => type.id === active.id);
      const newIndex = memoryTypes.findIndex((type: MemoryType) => type.id === over.id);

      const newOrder = arrayMove(memoryTypes, oldIndex, newIndex);
      
      try {
        // Update sort orders in the backend
        const reorderData = newOrder.map((type: MemoryType, index: number) => ({
          id: type.id,
          sortOrder: index + 1
        }));

        const response = await fetch(`${API_BASE_URL}/admin/memory-types/reorder`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ memoryTypes: reorderData })
        });

        if (!response.ok) {
          throw new Error('Failed to update order');
        }

        await refreshAllMemoryTypes();
        setMessage({ type: 'success', text: 'Memory types reordered successfully!' });
      } catch (error) {
        console.error('Error reordering memory types:', error);
        setMessage({ type: 'error', text: 'Failed to reorder memory types' });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingType 
        ? `${API_BASE_URL}/admin/memory-types/${editingType.id}`
        : `${API_BASE_URL}/admin/memory-types`;
      
      const method = editingType ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Validation errors:', errorData);
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMessages = errorData.errors.map((err: any) => err.msg).join(', ');
          throw new Error(`Validation errors: ${errorMessages}`);
        }
        
        throw new Error(errorData.message || 'Failed to save memory type');
      }

      await refreshAllMemoryTypes();
      setDialogOpen(false);
      setEditingType(null);
      setMessage({ 
        type: 'success', 
        text: `Memory type ${editingType ? 'updated' : 'created'} successfully!` 
      });
    } catch (error: any) {
      console.error('Error saving memory type:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save memory type' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this memory type? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/memory-types/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete memory type');
      }

      await refreshAllMemoryTypes();
      setMessage({ type: 'success', text: 'Memory type deleted successfully!' });
    } catch (error: any) {
      console.error('Error deleting memory type:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to delete memory type' });
    }
  };

  const handleEdit = (memoryType: MemoryType) => {
    setEditingType(memoryType);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingType(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingType(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Memory Types Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add Memory Type
        </Button>
      </Box>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Drag and drop to reorder memory types. The order here determines the display order in the app.
      </Typography>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={memoryTypes.map((type: MemoryType) => type.id)}
          strategy={verticalListSortingStrategy}
        >
          {memoryTypes.map((memoryType: MemoryType) => (
            <SortableMemoryType
              key={memoryType.id}
              memoryType={memoryType}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingType ? 'Edit Memory Type' : 'Add New Memory Type'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Name (internal)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
              helperText="Internal name used in code (lowercase, no spaces)"
            />
            <TextField
              fullWidth
              label="Display Name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              margin="normal"
              required
              helperText="Name shown to users"
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
              helperText="Optional description"
            />
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                margin="normal"
                helperText="Enter an emoji or icon character"
                InputProps={{
                  startAdornment: formData.icon ? (
                    <Typography variant="h6" sx={{ mr: 1, fontSize: '1.2em' }}>
                      {formData.icon}
                    </Typography>
                  ) : null,
                }}
              />
              <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
                Common Icons:
              </Typography>
              <Paper sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {EMOJI_OPTIONS.map((emoji, index) => (
                    <Tooltip key={index} title={`Use ${emoji}`}>
                      <Button
                        variant={formData.icon === emoji ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setFormData({ ...formData, icon: emoji })}
                        sx={{ 
                          minWidth: '40px', 
                          height: '40px',
                          fontSize: '1.2em',
                          p: 0.5
                        }}
                      >
                        {emoji}
                      </Button>
                    </Tooltip>
                  ))}
                </Box>
              </Paper>
            </Box>
            <TextField
              fullWidth
              label="Color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              margin="normal"
              helperText="Optional color (hex code, e.g., #FF5722)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Active"
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {submitting ? 'Saving...' : (editingType ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default AdminMemoryTypes;