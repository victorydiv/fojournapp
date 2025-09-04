import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Alert,
  CircularProgress,
  Pagination,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  LocationOn as LocationIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  CheckCircle as CheckCircleIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Map as MapIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  List as ListIcon,
} from '@mui/icons-material';
import { Dream, DreamType, DreamPriority, DreamsStats } from '../types';
import { dreamsService } from '../services/dreamsService';
import CreateEntryDialog from './CreateEntryDialog';
import DreamChecklists from './DreamChecklists';

interface DreamsPageProps {
  onCreateDream?: () => void;
  onEditDream?: (dream: Dream) => void;
}

const DreamsPage: React.FC<DreamsPageProps> = ({ onCreateDream, onEditDream }) => {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [stats, setStats] = useState<DreamsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<DreamType | ''>('');
  const [filterPriority, setFilterPriority] = useState<DreamPriority | ''>('');
  const [filterAchieved, setFilterAchieved] = useState<'achieved' | 'not-achieved' | ''>('');
  const [sortBy, setSortBy] = useState<'created_at' | 'title' | 'priority' | 'dream_type'>('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [achievingDreamId, setAchievingDreamId] = useState<number | null>(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [entryDialogLocation, setEntryDialogLocation] = useState<{latitude: number; longitude: number; locationName?: string} | undefined>(undefined);

  const loadDreams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: 12,
        sortBy,
        sortOrder,
        ...(filterType && { dreamType: filterType }),
        ...(filterPriority && { priority: filterPriority }),
        ...(filterAchieved === 'achieved' && { achieved: true }),
        ...(filterAchieved === 'not-achieved' && { achieved: false }),
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
      };

      const response = await dreamsService.getDreams(params);
      setDreams(response.dreams);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load dreams:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dreams');
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, filterType, filterPriority, filterAchieved, searchQuery]);

  const loadStats = useCallback(async () => {
    try {
      const response = await dreamsService.getDreamsStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to load dreams stats:', error);
    }
  }, []);

  useEffect(() => {
    loadDreams();
  }, [loadDreams]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, dream: Dream) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('Menu opening for dream:', dream.title);
    setAnchorEl(event.currentTarget);
    setSelectedDream(dream);
  };

  const handleMenuClose = () => {
    console.log('Menu closing');
    setAnchorEl(null);
    setSelectedDream(null);
  };

  const handleEdit = () => {
    console.log('Edit clicked for dream:', selectedDream?.title);
    if (selectedDream && onEditDream) {
      onEditDream(selectedDream);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    console.log('Delete clicked for dream:', selectedDream?.title);
    setDeleteDialogOpen(true);
    // Don't call handleMenuClose() here - keep selectedDream for the confirmation dialog
    setAnchorEl(null); // Just close the menu, but keep selectedDream
  };

  const handleChecklistClick = () => {
    console.log('Checklist clicked for dream:', selectedDream?.title);
    setChecklistDialogOpen(true);
    setAnchorEl(null); // Close the menu but keep selectedDream
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDream) {
      console.log('No selected dream to delete');
      return;
    }

    console.log('Confirming delete for dream:', selectedDream.title, 'ID:', selectedDream.id);

    try {
      await dreamsService.deleteDream(selectedDream.id);
      console.log('Dream deleted successfully');
      setDreams(dreams.filter(dream => dream.id !== selectedDream.id));
      setDeleteDialogOpen(false);
      setSelectedDream(null);
      await loadStats(); // Refresh stats
    } catch (error) {
      console.error('Failed to delete dream:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete dream');
    }
  };

  const handleAchieve = async (dream: Dream) => {
    if (achievingDreamId === dream.id) return; // Prevent double-clicking
    
    // Open entry dialog with dream data - don't mark as achieved yet
    setEntryDialogLocation({
      latitude: dream.latitude,
      longitude: dream.longitude,
      locationName: dream.location_name || undefined
    });
    setSelectedDream(dream); // Store the dream to achieve later
    setEntryDialogOpen(true);
  };

  const handleEntryCreated = async () => {
    // Called when entry is successfully created
    if (selectedDream) {
      try {
        setAchievingDreamId(selectedDream.id);
        await dreamsService.achieveDream(selectedDream.id);
        
        // Update dreams list
        setDreams(dreams.map(d => 
          d.id === selectedDream.id 
            ? { ...d, is_achieved: true, achieved_at: new Date().toISOString() }
            : d
        ));
        
        await loadStats(); // Refresh stats
      } catch (error) {
        console.error('Failed to mark dream as achieved:', error);
        setError(error instanceof Error ? error.message : 'Failed to mark dream as achieved');
      } finally {
        setAchievingDreamId(null);
      }
    }
    
    // Clean up
    setEntryDialogOpen(false);
    setEntryDialogLocation(undefined);
    setSelectedDream(null);
  };

  const handleEntryDialogClose = () => {
    // Called when dialog is closed/cancelled
    setEntryDialogOpen(false);
    setEntryDialogLocation(undefined);
    setSelectedDream(null);
  };

  const getPriorityColor = (priority: DreamPriority) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getDreamTypeIcon = (type: DreamType) => {
    switch (type) {
      case 'destination': return '🌍';
      case 'restaurant': return '🍽️';
      case 'attraction': return '🎯';
      case 'accommodation': return '🏨';
      case 'activity': return '🎪';
      case 'brewery': return '🍺';
      default: return '📍';
    }
  };

  const clearFilters = () => {
    setFilterType('');
    setFilterPriority('');
    setFilterAchieved('');
    setSearchQuery('');
    setPage(1);
  };

  if (loading && dreams.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Dreams
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateDream}
          size="large"
        >
          Add Dream
        </Button>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          <Card>
            <CardContent sx={{ pb: 1 }}>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Dreams
              </Typography>
              <Typography variant="h4">{stats.total_dreams}</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ pb: 1 }}>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Achieved
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.achieved_dreams}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ pb: 1 }}>
              <Typography color="text.secondary" gutterBottom variant="body2">
                High Priority
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.high_priority_dreams}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ pb: 1 }}>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Avg Budget
              </Typography>
              <Typography variant="h4">
                {stats.avg_budget ? `$${Math.round(stats.avg_budget)}` : '-'}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr 0.5fr 1fr' }, gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              label="Search dreams"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              size="small"
            />
            
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                label="Type"
                onChange={(e) => setFilterType(e.target.value as DreamType | '')}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="destination">Destination</MenuItem>
                <MenuItem value="restaurant">Restaurant</MenuItem>
                <MenuItem value="attraction">Attraction</MenuItem>
                <MenuItem value="accommodation">Accommodation</MenuItem>
                <MenuItem value="activity">Activity</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Priority</InputLabel>
              <Select
                value={filterPriority}
                label="Priority"
                onChange={(e) => setFilterPriority(e.target.value as DreamPriority | '')}
              >
                <MenuItem value="">All Priorities</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filterAchieved}
                label="Status"
                onChange={(e) => setFilterAchieved(e.target.value as 'achieved' | 'not-achieved' | '')}
              >
                <MenuItem value="">All Dreams</MenuItem>
                <MenuItem value="not-achieved">Not Achieved</MenuItem>
                <MenuItem value="achieved">Achieved</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              onClick={clearFilters}
              size="small"
              fullWidth
            >
              Clear
            </Button>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
              size="small"
              fullWidth
            >
              <ToggleButton value="grid">Grid</ToggleButton>
              <ToggleButton value="list">List</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Dreams Grid/List */}
      {dreams.length > 0 ? (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(350px, 1fr))' : '1fr', gap: 3 }}>
            {dreams.map((dream) => (
              <Card key={dream.id} sx={{ height: 'fit-content', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="between" alignItems="flex-start" mb={1}>
                    <Box display="flex" alignItems="center" gap={1} flexGrow={1}>
                      <Typography variant="h6" component="h3" noWrap>
                        {getDreamTypeIcon(dream.dream_type)} {dream.title}
                      </Typography>
                      {Boolean(dream.is_achieved) && (
                        <CheckCircleIcon color="success" fontSize="small" />
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, dream)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>

                  <Box display="flex" gap={1} mb={2}>
                    <Chip
                      label={dream.priority}
                      color={getPriorityColor(dream.priority)}
                      size="small"
                    />
                    <Chip
                      label={dream.dream_type}
                      variant="outlined"
                      size="small"
                    />
                  </Box>

                  {dream.location_name && (
                    <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                      <LocationIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {dream.location_name}
                      </Typography>
                    </Box>
                  )}

                  {dream.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {dream.description}
                    </Typography>
                  )}

                  {dream.estimated_budget && (
                    <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                      Estimated Budget: ${dream.estimated_budget}
                    </Typography>
                  )}

                  {dream.tags && dream.tags.length > 0 && (
                    <Box mt={1}>
                      {dream.tags.slice(0, 3).map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                      {dream.tags.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{dream.tags.length - 3} more
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">
                    Added {new Date(dream.created_at).toLocaleDateString()}
                  </Typography>
                  {!Boolean(dream.is_achieved) && (
                    <Button
                      size="small"
                      startIcon={achievingDreamId === dream.id ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                      onClick={() => handleAchieve(dream)}
                      disabled={achievingDreamId === dream.id}
                    >
                      {achievingDreamId === dream.id ? 'Achieving...' : 'Achieve'}
                    </Button>
                  )}
                </CardActions>
              </Card>
            ))}
          </Box>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </>
      ) : (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No dreams found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Start adding places to your dream wishlist!
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateDream}>
            Add Your First Dream
          </Button>
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleChecklistClick}>
          <ListIcon fontSize="small" sx={{ mr: 1 }} />
          Checklists
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => {
        setDeleteDialogOpen(false);
        setSelectedDream(null);
      }}>
        <DialogTitle>Delete Dream</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDream?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setSelectedDream(null);
          }}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Entry Dialog for achieved dreams */}
      <CreateEntryDialog
        open={entryDialogOpen}
        onClose={handleEntryDialogClose}
        onSave={handleEntryCreated}
        initialLocation={entryDialogLocation}
        initialDate={new Date()}
        dreamData={selectedDream ? {
          id: selectedDream.id,
          title: selectedDream.title,
          description: selectedDream.description || selectedDream.notes,
          tags: selectedDream.tags || [],
          research_links: (selectedDream.research_links || []).map(link => 
            typeof link === 'string' ? { url: link, title: 'Research Link' } : link
          )
        } : undefined}
      />

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', sm: 'none' }
        }}
        onClick={onCreateDream}
      >
        <AddIcon />
      </Fab>

      {/* Dream Checklists Dialog */}
      {selectedDream && (
        <DreamChecklists
          dreamId={selectedDream.id}
          open={checklistDialogOpen}
          onClose={() => {
            setChecklistDialogOpen(false);
            setSelectedDream(null);
          }}
        />
      )}
    </Box>
  );
};

export default DreamsPage;
