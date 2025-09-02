import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Fab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  DragHandle as DragIcon
} from '@mui/icons-material';

interface HeroImage {
  id: number;
  filename: string;
  original_name: string;
  image_url: string;
  title: string;
  subtitle: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  uploaded_by_name: string;
}

interface HeroImageManagementPanelProps {
  onClose?: () => void;
}

const HeroImageManagementPanel: React.FC<HeroImageManagementPanelProps> = ({ onClose }) => {
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HeroImage | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    title: '',
    subtitle: '',
    displayOrder: 0
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    subtitle: '',
    displayOrder: 0,
    isActive: true
  });

  useEffect(() => {
    fetchHeroImages();
  }, []);

  const fetchHeroImages = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/hero-images/admin`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHeroImages(data);
      } else {
        showAlert('error', 'Failed to fetch hero images');
      }
    } catch (error) {
      showAlert('error', 'Error fetching hero images');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file) {
      showAlert('error', 'Please select an image file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('heroImage', uploadForm.file);
      formData.append('title', uploadForm.title);
      formData.append('subtitle', uploadForm.subtitle);
      formData.append('displayOrder', uploadForm.displayOrder.toString());

      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/hero-images/admin/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        showAlert('success', 'Hero image uploaded successfully');
        setUploadDialogOpen(false);
        setUploadForm({ file: null, title: '', subtitle: '', displayOrder: 0 });
        fetchHeroImages();
      } else {
        const error = await response.json();
        showAlert('error', error.error || 'Failed to upload hero image');
      }
    } catch (error) {
      showAlert('error', 'Error uploading hero image');
      console.error('Error:', error);
    }
  };

  const handleEdit = (image: HeroImage) => {
    setSelectedImage(image);
    setEditForm({
      title: image.title,
      subtitle: image.subtitle,
      displayOrder: image.display_order,
      isActive: image.is_active
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedImage) return;

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/hero-images/admin/${selectedImage.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editForm.title,
          subtitle: editForm.subtitle,
          displayOrder: editForm.displayOrder,
          isActive: editForm.isActive
        })
      });

      if (response.ok) {
        showAlert('success', 'Hero image updated successfully');
        setEditDialogOpen(false);
        setSelectedImage(null);
        fetchHeroImages();
      } else {
        const error = await response.json();
        showAlert('error', error.error || 'Failed to update hero image');
      }
    } catch (error) {
      showAlert('error', 'Error updating hero image');
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this hero image?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/hero-images/admin/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showAlert('success', 'Hero image deleted successfully');
        fetchHeroImages();
      } else {
        const error = await response.json();
        showAlert('error', error.error || 'Failed to delete hero image');
      }
    } catch (error) {
      showAlert('error', 'Error deleting hero image');
      console.error('Error:', error);
    }
  };

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
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
      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Hero Image Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setUploadDialogOpen(true)}
          sx={{ 
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
          }}
        >
          Add Hero Image
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          gap: 3
        }}
      >
        {heroImages.map((image) => (
          <Box key={image.id}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                opacity: image.is_active ? 1 : 0.6,
                border: image.filename === 'gradient-fallback' ? '2px dashed #ccc' : 'none'
              }}
            >
              {image.filename !== 'gradient-fallback' ? (
                <CardMedia
                  component="img"
                  height="200"
                  image={image.image_url}
                  alt={image.title || image.original_name}
                  sx={{ objectFit: 'cover' }}
                />
              ) : (
                <Box
                  sx={{
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}
                >
                  <Typography variant="h6">Default Gradient</Typography>
                </Box>
              )}
              
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Chip 
                    size="small" 
                    label={`Order: ${image.display_order}`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    icon={image.is_active ? <VisibilityIcon /> : <VisibilityOffIcon />}
                    label={image.is_active ? 'Active' : 'Inactive'}
                    color={image.is_active ? 'success' : 'default'}
                  />
                </Box>
                
                <Typography variant="h6" gutterBottom>
                  {image.title || 'No Title'}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {image.subtitle || 'No Subtitle'}
                </Typography>
                
                <Typography variant="caption" color="text.secondary">
                  Uploaded by: {image.uploaded_by_name}
                </Typography>
              </CardContent>

              <Box sx={{ p: 2, pt: 0 }}>
                <Box display="flex" gap={1}>
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(image)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  {image.id !== 1 && (
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(image.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </Box>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload New Hero Image</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
              style={{ marginBottom: '16px' }}
            />
            
            <TextField
              fullWidth
              label="Title"
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Subtitle"
              value={uploadForm.subtitle}
              onChange={(e) => setUploadForm({ ...uploadForm, subtitle: e.target.value })}
              margin="normal"
            />
            
            <TextField
              fullWidth
              type="number"
              label="Display Order"
              value={uploadForm.displayOrder}
              onChange={(e) => setUploadForm({ ...uploadForm, displayOrder: parseInt(e.target.value) || 0 })}
              margin="normal"
              helperText="Lower numbers appear first"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpload} variant="contained">Upload</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Hero Image</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Title"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Subtitle"
              value={editForm.subtitle}
              onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })}
              margin="normal"
            />
            
            <TextField
              fullWidth
              type="number"
              label="Display Order"
              value={editForm.displayOrder}
              onChange={(e) => setEditForm({ ...editForm, displayOrder: parseInt(e.target.value) || 0 })}
              margin="normal"
              helperText="Lower numbers appear first"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                />
              }
              label="Active"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HeroImageManagementPanel;
