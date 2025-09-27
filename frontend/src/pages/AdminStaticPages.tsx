import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { Editor } from '@tinymce/tinymce-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

interface StaticPage {
  id: number;
  slug: string;
  title: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface PageFormData {
  slug: string;
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  is_published: boolean;
}

const AdminStaticPages: React.FC = () => {
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<PageFormData>({
    slug: '',
    title: '',
    content: '',
    meta_title: '',
    meta_description: '',
    is_published: true
  });

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/static-pages/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pages');
      }

      const data = await response.json();
      setPages(data.pages);
      setError(null);
    } catch (err: any) {
      console.error('Error loading pages:', err);
      setError(err.message || 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingPage(null);
    setFormData({
      slug: '',
      title: '',
      content: '',
      meta_title: '',
      meta_description: '',
      is_published: true
    });
    setValidationErrors({});
    setOpenDialog(true);
  };

  const openEditDialog = async (page: StaticPage) => {
    try {
      setFormLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/static-pages/${page.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch page details');
      }

      const data = await response.json();
      const pageData = data.page;
      
      setEditingPage(page);
      setFormData({
        slug: pageData.slug,
        title: pageData.title,
        content: pageData.content,
        meta_title: pageData.meta_title || '',
        meta_description: pageData.meta_description || '',
        is_published: pageData.is_published
      });
      setValidationErrors({});
      setOpenDialog(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load page details');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPage(null);
    setValidationErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }

    if (!formData.slug.trim()) {
      errors.slug = 'Slug is required';
    } else if (!/^[a-zA-Z0-9-_]+$/.test(formData.slug)) {
      errors.slug = 'Slug must only contain letters, numbers, hyphens, and underscores';
    }

    if (!formData.content.trim()) {
      errors.content = 'Content is required';
    }

    if (formData.meta_title.length > 100) {
      errors.meta_title = 'Meta title must be 100 characters or less';
    }

    if (formData.meta_description.length > 160) {
      errors.meta_description = 'Meta description must be 160 characters or less';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setFormLoading(true);
      const token = localStorage.getItem('token');
      const url = editingPage 
        ? `${API_BASE_URL}/admin/static-pages/${editingPage.id}`
        : `${API_BASE_URL}/admin/static-pages/`;
      
      const response = await fetch(url, {
        method: editingPage ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save page');
      }

      setSuccess(editingPage ? 'Page updated successfully' : 'Page created successfully');
      setOpenDialog(false);
      loadPages();
    } catch (err: any) {
      setError(err.message || 'Failed to save page');
    } finally {
      setFormLoading(false);
    }
  };

  const handleTogglePublish = async (page: StaticPage) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/static-pages/${page.id}/publish`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_published: !page.is_published })
      });

      if (!response.ok) {
        throw new Error('Failed to update page publication status');
      }

      setSuccess(`Page ${!page.is_published ? 'published' : 'unpublished'} successfully`);
      loadPages();
    } catch (err: any) {
      setError(err.message || 'Failed to update page publication status');
    }
  };

  const handleDelete = async (page: StaticPage) => {
    if (!window.confirm(`Are you sure you want to delete "${page.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/static-pages/${page.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete page');
      }

      setSuccess('Page deleted successfully');
      loadPages();
    } catch (err: any) {
      setError(err.message || 'Failed to delete page');
    }
  };

  const generateSlugFromTitle = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Static Pages Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Create Page
        </Button>
      </Box>

      {/* Success/Error Messages */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Pages Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pages.map((page) => (
              <TableRow key={page.id}>
                <TableCell>
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      {page.title}
                    </Typography>
                    {page.meta_title && (
                      <Typography variant="caption" color="text.secondary">
                        SEO: {page.meta_title}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    /{page.slug}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={page.is_published ? 'Published' : 'Draft'}
                    color={page.is_published ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(page.created_at)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(page.updated_at)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      onClick={() => openEditDialog(page)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={page.is_published ? 'Unpublish' : 'Publish'}>
                    <IconButton
                      onClick={() => handleTogglePublish(page)}
                      size="small"
                    >
                      {page.is_published ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      onClick={() => handleDelete(page)}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Create Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPage ? 'Edit Static Page' : 'Create Static Page'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* Title */}
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                // Auto-generate slug from title if creating new page
                if (!editingPage && e.target.value) {
                  setFormData(prev => ({ 
                    ...prev, 
                    title: e.target.value,
                    slug: generateSlugFromTitle(e.target.value)
                  }));
                }
              }}
              error={!!validationErrors.title}
              helperText={validationErrors.title}
              margin="normal"
            />

            {/* Slug */}
            <TextField
              fullWidth
              label="Slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              error={!!validationErrors.slug}
              helperText={validationErrors.slug || 'Used in URL: fojourn.site/slug'}
              margin="normal"
            />

            {/* Content */}
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Content
              </Typography>
              <Editor
                apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                value={formData.content}
                onEditorChange={(content) => setFormData({ ...formData, content })}
                init={{
                  height: 400,
                  menubar: false,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'preview', 'help', 'wordcount'
                  ],
                  toolbar: 'undo redo | blocks | ' +
                    'bold italic forecolor | alignleft aligncenter ' +
                    'alignright alignjustify | bullist numlist outdent indent | ' +
                    'removeformat | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                }}
              />
              {validationErrors.content && (
                <Typography variant="caption" color="error">
                  {validationErrors.content}
                </Typography>
              )}
            </Box>

            {/* Meta Title */}
            <TextField
              fullWidth
              label="Meta Title (SEO)"
              value={formData.meta_title}
              onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
              error={!!validationErrors.meta_title}
              helperText={validationErrors.meta_title || `${formData.meta_title.length}/100 characters`}
              margin="normal"
            />

            {/* Meta Description */}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Meta Description (SEO)"
              value={formData.meta_description}
              onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
              error={!!validationErrors.meta_description}
              helperText={validationErrors.meta_description || `${formData.meta_description.length}/160 characters`}
              margin="normal"
            />

            {/* Published */}
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                />
              }
              label="Published"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={formLoading}
          >
            {formLoading ? <CircularProgress size={20} /> : (editingPage ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminStaticPages;