import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  IconButton,
  Menu,
  Alert,
  Pagination,
  Skeleton,
  Stack,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Star as StarIcon,
  Person as PersonIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  LibraryBooks as LibraryIcon,
  Public as PublicIcon,
  Save as SaveIcon,
  Visibility as ViewIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

interface Template {
  id: number;
  title: string;
  description: string;
  category: string;
  color: string;
  usage_count: number;
  created_by: string;
  total_items: number;
  active_items: number;
  created_at: string;
  last_used_at?: string;
}

interface TemplateLibraryItem {
  library_id: number;
  template_id: number;
  custom_title?: string;
  custom_description?: string;
  custom_category?: string;
  saved_at: string;
  original_title: string;
  original_description: string;
  original_category: string;
  color: string;
  usage_count: number;
  created_by: string;
  total_items: number;
}

interface TemplateItem {
  id: number;
  text: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  sort_order: number;
}

interface TemplatePreview {
  template: Template;
  items: TemplateItem[];
}

const TemplateLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [publicTemplates, setPublicTemplates] = useState<Template[]>([]);
  const [myLibrary, setMyLibrary] = useState<TemplateLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; template: Template } | null>(null);
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    template: Template | null;
    items: TemplateItem[];
    loading: boolean;
  }>({
    open: false,
    template: null,
    items: [],
    loading: false
  });
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'general', label: 'General' },
    { value: 'packing', label: 'Packing' },
    { value: 'planning', label: 'Planning' },
    { value: 'activities', label: 'Activities' },
    { value: 'documents', label: 'Documents' },
    { value: 'food', label: 'Food' },
    { value: 'other', label: 'Other' }
  ];

  const sortOptions = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'alphabetical', label: 'Alphabetical' }
  ];

  useEffect(() => {
    if (activeTab === 0) {
      fetchPublicTemplates();
    } else {
      fetchMyLibrary();
    }
  }, [activeTab, searchTerm, categoryFilter, sortBy, page]);

  const fetchPublicTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/templates/catalog?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok) {
        setPublicTemplates(data.templates);
        setTotalPages(data.totalPages);
      } else {
        showSnackbar('Failed to fetch public templates', 'error');
      }
    } catch (error) {
      console.error('Error fetching public templates:', error);
      showSnackbar('Failed to fetch public templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyLibrary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/templates/library/my-templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMyLibrary(data);
      } else {
        showSnackbar('Failed to fetch template library', 'error');
      }
    } catch (error) {
      console.error('Error fetching template library:', error);
      showSnackbar('Failed to fetch template library', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplateToLibrary = async (templateId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/templates/${templateId}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showSnackbar('Template saved to your library!');
        if (activeTab === 1) {
          fetchMyLibrary();
        }
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Failed to save template', 'error');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      showSnackbar('Failed to save template', 'error');
    }
  };

  const removeFromLibrary = async (libraryId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/templates/library/${libraryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showSnackbar('Template removed from library');
        fetchMyLibrary();
      } else {
        showSnackbar('Failed to remove template', 'error');
      }
    } catch (error) {
      console.error('Error removing template:', error);
      showSnackbar('Failed to remove template', 'error');
    }
  };

  const createInstanceFromTemplate = async (templateId: number, instanceType: 'standalone' | 'journey' | 'dream') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/templates/${templateId}/create-checklist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: undefined // Will use template title
        })
      });

      if (response.ok) {
        const result = await response.json();
        showSnackbar('Checklist created from template!');
        // Navigate to the checklists page to see the new checklist
        setTimeout(() => {
          navigate('/checklists');
        }, 1000);
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Failed to create checklist from template', 'error');
      }
    } catch (error) {
      console.error('Error creating instance from template:', error);
      showSnackbar('Failed to create checklist from template', 'error');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setPage(1);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: Template) => {
    setMenuAnchor({ element: event.currentTarget, template });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handlePreviewTemplate = async (template: Template) => {
    setPreviewDialog({ open: true, template, items: [], loading: true });
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/templates/${template.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const templateData = await response.json();
        setPreviewDialog(prev => ({ ...prev, items: templateData.items, loading: false }));
      } else {
        showSnackbar('Failed to load template items', 'error');
        setPreviewDialog(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error loading template items:', error);
      showSnackbar('Failed to load template items', 'error');
      setPreviewDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleClosePreview = () => {
    setPreviewDialog({ open: false, template: null, items: [], loading: false });
  };

  const renderTemplateCard = (template: Template, isFromLibrary = false, libraryItem?: TemplateLibraryItem) => {
    const displayTitle = isFromLibrary && libraryItem?.custom_title 
      ? libraryItem.custom_title 
      : template.title;
    
    const displayDescription = isFromLibrary && libraryItem?.custom_description 
      ? libraryItem.custom_description 
      : template.description;

    return (
      <Card 
        key={isFromLibrary ? (libraryItem?.library_id || `library-${template.id}`) : template.id}
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          borderLeft: `4px solid ${template.color}`,
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 4
          }
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Typography variant="h6" component="h3" gutterBottom noWrap>
              {displayTitle}
            </Typography>
            <IconButton 
              size="small" 
              onClick={(e) => handleMenuOpen(e, template)}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
            {displayDescription || 'No description available'}
          </Typography>

          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
            <Chip 
              label={template.category} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              icon={<PersonIcon />}
              label={template.created_by} 
              size="small" 
              variant="outlined"
            />
          </Stack>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {template.total_items || 0} items
            </Typography>
            <Box display="flex" alignItems="center">
              <StarIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary" ml={0.5}>
                {template.usage_count}
              </Typography>
            </Box>
          </Box>
        </CardContent>

        <CardActions>
          {isFromLibrary ? (
            <>
              <Button 
                size="small" 
                onClick={() => createInstanceFromTemplate(template.id, 'standalone')}
                startIcon={<AddIcon />}
              >
                Use Template
              </Button>
              <Button 
                size="small" 
                color="error"
                onClick={() => removeFromLibrary(libraryItem!.library_id)}
              >
                Remove
              </Button>
            </>
          ) : (
            <>
              <Button 
                size="small" 
                onClick={() => saveTemplateToLibrary(template.id)}
                startIcon={<SaveIcon />}
              >
                Save to Library
              </Button>
              <Button 
                size="small" 
                startIcon={<ViewIcon />}
                onClick={() => handlePreviewTemplate(template)}
              >
                Preview
              </Button>
            </>
          )}
        </CardActions>
      </Card>
    );
  };

  const renderSkeletonCards = () => (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
      gap: 3
    }}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} sx={{ height: '100%' }}>
          <CardContent>
            <Skeleton variant="text" height={32} />
            <Skeleton variant="text" height={60} />
            <Skeleton variant="rectangular" height={24} width={80} />
          </CardContent>
          <CardActions>
            <Skeleton variant="rectangular" height={32} width={100} />
          </CardActions>
        </Card>
      ))}
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Checklist Library
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Discover and save checklist templates for your travel planning
        </Typography>
      </Box>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab 
          icon={<PublicIcon />} 
          label="Public Templates" 
          iconPosition="start"
        />
        <Tab 
          icon={<LibraryIcon />} 
          label="My Library" 
          iconPosition="start"
        />
      </Tabs>

      {/* Filters */}
      <Box mb={3}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          alignItems: 'center'
        }}>
          <TextField
            fullWidth
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              label="Category"
            >
              {categories.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {activeTab === 0 && (
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
              >
                {sortOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Box>

      {/* Templates Grid */}
      {loading ? (
        renderSkeletonCards()
      ) : activeTab === 0 ? (
        publicTemplates.length > 0 ? (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 3
          }}>
            {publicTemplates.map((template) => 
              renderTemplateCard(template)
            )}
          </Box>
        ) : (
          <Alert severity="info">
            No public templates found. Try adjusting your search or filter criteria.
          </Alert>
        )
      ) : (
        myLibrary.length > 0 ? (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 3
          }}>
            {myLibrary.map((libraryItem) => 
              renderTemplateCard({
                id: libraryItem.template_id,
                title: libraryItem.original_title,
                description: libraryItem.original_description,
                category: libraryItem.original_category,
                color: libraryItem.color,
                usage_count: libraryItem.usage_count,
                created_by: libraryItem.created_by,
                total_items: libraryItem.total_items,
                active_items: 0,
                created_at: libraryItem.saved_at
              }, true, libraryItem)
            )}
          </Box>
        ) : (
          <Alert severity="info">
            Your checklist library is empty. Save some public templates to get started!
          </Alert>
        )
      )}

      {/* Pagination */}
      {activeTab === 0 && totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* Template Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6">
                {previewDialog.template?.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {previewDialog.template?.description}
              </Typography>
            </Box>
            <IconButton onClick={handleClosePreview} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {previewDialog.loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box mb={2}>
                <Chip 
                  label={previewDialog.template?.category} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {previewDialog.items.length} items in this template
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List>
                {previewDialog.items.map((item, index) => (
                  <ListItem key={item.id} divider={index < previewDialog.items.length - 1}>
                    <ListItemIcon>
                      <Checkbox disabled />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      secondary={
                        <Box display="flex" gap={1} mt={0.5}>
                          <Chip 
                            label={item.category} 
                            size="small" 
                            variant="outlined"
                          />
                          <Chip 
                            label={item.priority} 
                            size="small" 
                            color={
                              item.priority === 'high' ? 'error' : 
                              item.priority === 'medium' ? 'warning' : 'default'
                            }
                            variant="outlined"
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>
            Close
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (previewDialog.template) {
                saveTemplateToLibrary(previewDialog.template.id);
                handleClosePreview();
              }
            }}
            startIcon={<SaveIcon />}
          >
            Save to Library
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (menuAnchor?.template) {
            createInstanceFromTemplate(menuAnchor.template.id, 'standalone');
          }
          handleMenuClose();
        }}>
          Create Checklist
        </MenuItem>
        <MenuItem onClick={() => {
          if (menuAnchor?.template) {
            saveTemplateToLibrary(menuAnchor.template.id);
          }
          handleMenuClose();
        }}>
          Save to Library
        </MenuItem>
      </Menu>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Container>
  );
};

export default TemplateLibraryPage;
