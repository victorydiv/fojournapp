import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Switch,
  FormControlLabel,
  Pagination,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  CardMedia,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  styled,
  Autocomplete,
  Paper,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Storage as StorageIcon,
  Assessment as AssessmentIcon,
  Build as BuildIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  PhotoLibrary as PhotoIcon,
  PhotoLibrary as PhotoLibraryIcon,
  EmojiEvents as BadgeIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Flag as FlagIcon,
  Campaign as CampaignIcon,
  Article as ArticleIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { adminAPI, DashboardData, SystemHealth, DatabaseStats, OrphanedMediaResponse } from '../services/adminAPI';
import { badgeAPI } from '../services/api';
import CommunicationsPanel from '../components/CommunicationsPanel';
import AuthenticatedImage from '../components/AuthenticatedImage';
import BadgeCreator from '../components/BadgeCreator';
import HeroImageManagementPanel from '../components/HeroImageManagementPanel';
import { Editor } from '@tinymce/tinymce-react';

// Add CSS styles to fix TinyMCE dialog issues
const tinyMCEStyles = `
  .tox-dialog {
    z-index: 10000 !important;
  }
  .tox-dialog__backdrop {
    z-index: 9999 !important;
    pointer-events: none !important;
  }
  .tox-dialog__body {
    position: relative !important;
  }
  .tox-dialog input,
  .tox-dialog textarea {
    pointer-events: auto !important;
    user-select: text !important;
    background-color: white !important;
    color: black !important;
  }
  .tox-dialog .tox-textfield,
  .tox-dialog .tox-textarea {
    pointer-events: auto !important;
    user-select: text !important;
    background-color: white !important;
    color: black !important;
  }
  .tox-dialog textarea[data-alloy-id] {
    pointer-events: auto !important;
    user-select: text !important;
    background-color: white !important;
    color: black !important;
    border: 1px solid #ccc !important;
    padding: 8px !important;
    font-family: monospace !important;
    font-size: 13px !important;
    line-height: 1.4 !important;
    resize: vertical !important;
  }
  .tox-dialog__content-js {
    pointer-events: auto !important;
  }
  .tox-dialog__footer {
    pointer-events: auto !important;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.getElementById('tinymce-dialog-fix');
  if (!styleElement) {
    const style = document.createElement('style');
    style.id = 'tinymce-dialog-fix';
    style.textContent = tinyMCEStyles;
    document.head.appendChild(style);
  }
}

// Create a type-safe wrapper component for TinyMCE Editor
const TinyMCEEditor: React.FC<{
  apiKey?: string;
  value?: string;
  onEditorChange?: (content: string) => void;
  init?: any;
  id?: string;
}> = ({ id, ...props }) => {
  // Use useRef to ensure stable editor instance
  const editorRef = React.useRef<any>(null);
  
  // Enhanced init configuration to fix context issues
  const enhancedInit = {
    ...props.init,
    // Fix for dialog/modal context issues
    target: undefined,
    // Ensure proper initialization
    promotion: false,
    branding: false,
    // Fix skin loading issues in complex React trees
    skin_url: undefined,
    // Additional dialog fixes
    dialog_type: 'modal',
    // Prevent focus management conflicts
    auto_focus: false,
  };

  const EditorComponent = Editor as any;
  return (
    <EditorComponent
      key={id || 'tinymce-editor'}
      {...props}
      init={enhancedInit}
      onInit={(evt: any, editor: any) => {
        editorRef.current = editor;
      }}
    />
  );
};

// Blog Management Panel Component
const BlogManagementPanel: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);

  // Blog post form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    status: 'draft',
    featured: false,
    seo_title: '',
    seo_description: '',
    categories: [] as number[],
    tags: [] as string[]
  });
  const [heroImage, setHeroImage] = useState<File | null>(null);

  // Function to reset form data
  const resetFormData = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      status: 'draft',
      featured: false,
      seo_title: '',
      seo_description: '',
      categories: [] as number[],
      tags: [] as string[]
    });
    setHeroImage(null);
    setEditingPost(null);
  };

  useEffect(() => {
    fetchPosts();
    fetchCategories();
  }, [page, searchTerm, statusFilter]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/blog/admin?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
      } else {
        throw new Error('Failed to fetch posts');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/blog/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCreatePost = async () => {
    try {
      const form = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'categories' || key === 'tags') {
          form.append(key, JSON.stringify(value));
        } else {
          form.append(key, value.toString());
        }
      });

      if (heroImage) {
        form.append('hero_image', heroImage);
      }

      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/blog/admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: form
      });

      if (response.ok) {
        setCreateDialogOpen(false);
        fetchPosts();
        resetFormData();
      } else {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Failed to create blog post');
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) return;

    try {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/blog/admin/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchPosts();
      } else {
        throw new Error('Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      setError('Failed to delete blog post');
    }
  };

  const handleEditPost = async (post: any) => {
    try {
      // Fetch the full post data including content for editing
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/blog/admin/${post.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const fullPost = await response.json();
        setEditingPost(fullPost.post);
        
        // Populate form with existing data
        setFormData({
          title: fullPost.post.title || '',
          content: fullPost.post.content || '',
          excerpt: fullPost.post.excerpt || '',
          status: fullPost.post.status || 'draft',
          featured: Boolean(fullPost.post.featured),
          seo_title: fullPost.post.seo_title || '',
          seo_description: fullPost.post.seo_description || '',
          categories: fullPost.post.category_ids || [],
          tags: fullPost.post.tags || []
        });
        
        setEditDialogOpen(true);
      } else {
        throw new Error('Failed to fetch post details');
      }
    } catch (error) {
      console.error('Error fetching post for edit:', error);
      setError('Failed to load post for editing');
    }
  };

  const handleUpdatePost = async () => {
    if (!editingPost) return;

    try {
      const form = new FormData();
      
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'categories') {
          form.append(key, JSON.stringify(value));
        } else if (key === 'tags') {
          form.append(key, JSON.stringify(value));
        } else if (key === 'featured') {
          form.append(key, value.toString());
        } else {
          form.append(key, value as string);
        }
      });

      if (heroImage) {
        form.append('hero_image', heroImage);
      }

      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiBaseUrl}/blog/admin/${editingPost.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: form
      });

      if (response.ok) {
        setEditDialogOpen(false);
        fetchPosts();
        resetFormData();
      } else {
        throw new Error('Failed to update post');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      setError('Failed to update blog post');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Blog Management
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            resetFormData();
            setCreateDialogOpen(true);
          }}
          startIcon={<EditIcon />}
        >
          Create Post
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search posts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="published">Published</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Posts Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Categories</TableCell>
                <TableCell>Views</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">{post.title}</Typography>
                      {post.featured && (
                        <Chip label="Featured" size="small" color="primary" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={post.status}
                      size="small"
                      color={
                        post.status === 'published' ? 'success' :
                        post.status === 'draft' ? 'warning' : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>{post.author_display_name}</TableCell>
                  <TableCell>
                    {post.categories && post.categories.length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {post.categories.map((category: string) => (
                          <Chip key={category} label={category} size="small" />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No categories
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{post.view_count || 0}</TableCell>
                  <TableCell>{formatDate(post.created_at)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditPost(post)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeletePost(post.id)}
                        color="error"
                      >
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Post Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          resetFormData();
        }}
        maxWidth="md"
        fullWidth
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      >
        <DialogTitle>Create New Blog Post</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            
            <TextField
              fullWidth
              label="Excerpt"
              multiline
              rows={3}
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              helperText="Brief description for preview (leave empty to auto-generate)"
            />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>Content</Typography>
              <TinyMCEEditor
                id="blog-content-editor"
                apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                value={formData.content}
                onEditorChange={(content: string) => setFormData({ ...formData, content })}
                init={{
                  height: 400,
                  menubar: 'edit view insert format tools table',
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'help', 'wordcount', 'emoticons'
                  ],
                  toolbar: 'undo redo | blocks fontfamily fontsize | ' +
                    'bold italic underline strikethrough | forecolor backcolor | ' +
                    'alignleft aligncenter alignright alignjustify | ' +
                    'bullist numlist outdent indent | ' +
                    'table tabledelete | tableprops tablerowprops tablecellprops | ' +
                    'tableinsertrowbefore tableinsertrowafter tabledeleterow | ' +
                    'tableinsertcolbefore tableinsertcolafter tabledeletecol | ' +
                    'link unlink anchor | image media emoticons | ' +
                    'visualblocks code preview fullscreen | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; line-height: 1.6; }',
                  toolbar_mode: 'sliding',
                  elementpath: false,
                  // Allow relative URLs for blog content
                  relative_urls: true,
                  convert_urls: true,
                  // Blog-specific settings
                  block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6; Preformatted=pre',
                  font_family_formats: 'Arial=arial,helvetica,sans-serif; Georgia=georgia,palatino; Helvetica=helvetica; Times New Roman=times new roman,times; Verdana=verdana,geneva',
                  image_advtab: true,
                  image_caption: true,
                  image_title: true,
                  paste_data_images: true,
                  paste_as_text: false,
                  paste_webkit_styles: 'color font-size font-family background-color',
                  paste_retain_style_properties: 'color font-size font-family background-color',
                  // Enable spellcheck
                  browser_spellcheck: true,
                  contextmenu: 'link image table',
                  // Dialog and modal fixes
                  dialog_type: 'modal',
                  auto_focus: false,
                  // Ensure dialogs work properly with better event handling
                  setup: (editor: any) => {
                    // Handle dialog opening with more robust focus management
                    editor.on('OpenWindow', (e: any) => {
                      console.log('TinyMCE dialog opening:', e);
                      
                      // Use multiple attempts to ensure proper focus
                      const attempts = [50, 100, 200, 300];
                      attempts.forEach((delay) => {
                        setTimeout(() => {
                          const dialog = document.querySelector('.tox-dialog');
                          if (dialog) {
                            // Set high z-index
                            (dialog as HTMLElement).style.zIndex = '10000';
                            
                            // Try different selectors for input fields
                            const selectors = [
                              '.tox-textfield',
                              '.tox-textarea', 
                              'textarea[data-alloy-id]',
                              'input[type="text"]',
                              'textarea',
                              'input'
                            ];
                            
                            for (const selector of selectors) {
                              const field = dialog.querySelector(selector) as HTMLElement;
                              if (field && field.offsetParent !== null) { // Check if visible
                                console.log('Focusing field:', selector, field);
                                field.focus();
                                field.click();
                                
                                // For textareas, ensure they're editable
                                if (field.tagName === 'TEXTAREA') {
                                  (field as HTMLTextAreaElement).readOnly = false;
                                  (field as HTMLTextAreaElement).disabled = false;
                                  field.style.pointerEvents = 'auto';
                                  field.style.userSelect = 'text';
                                }
                                break;
                              }
                            }
                            
                            // Remove any potential blocking overlays
                            const backdrop = dialog.querySelector('.tox-dialog__backdrop');
                            if (backdrop) {
                              (backdrop as HTMLElement).style.pointerEvents = 'none';
                            }
                          }
                        }, delay);
                      });
                    });
                    
                    // Handle dialog after it's fully rendered
                    editor.on('WindowManager:AfterOpen', (e: any) => {
                      console.log('TinyMCE dialog after open:', e);
                      setTimeout(() => {
                        const dialog = document.querySelector('.tox-dialog');
                        if (dialog) {
                          const textarea = dialog.querySelector('textarea') as HTMLTextAreaElement;
                          if (textarea) {
                            textarea.focus();
                            textarea.select();
                            // Ensure it's editable
                            textarea.readOnly = false;
                            textarea.disabled = false;
                            textarea.style.pointerEvents = 'auto';
                            console.log('Textarea focused and made editable');
                          }
                        }
                      }, 100);
                    });
                  },
                }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  />
                }
                label="Featured"
              />
            </Box>
            
            <FormControl fullWidth>
              <InputLabel>Categories</InputLabel>
              <Select
                multiple
                value={formData.categories}
                onChange={(e) => setFormData({ ...formData, categories: e.target.value as number[] })}
                label="Categories"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as number[]).map((value) => {
                      const category = categories.find(cat => cat.id === value);
                      return (
                        <Chip key={value} label={category?.name || value} size="small" />
                      );
                    })}
                  </Box>
                )}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: category.color
                        }}
                      />
                      {category.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="SEO Title"
              value={formData.seo_title}
              onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
              helperText={`Leave empty to use post title (${formData.seo_title.length}/100 characters)`}
              inputProps={{ maxLength: 100 }}
              error={formData.seo_title.length > 100}
            />
            
            <TextField
              fullWidth
              label="SEO Description"
              value={formData.seo_description}
              onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
              helperText={`Leave empty to use excerpt (${formData.seo_description.length}/160 characters)`}
              inputProps={{ maxLength: 160 }}
              error={formData.seo_description.length > 160}
            />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Hero Image
              </Typography>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setHeroImage(e.target.files?.[0] || null)}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            resetFormData();
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreatePost}
            variant="contained"
            disabled={!formData.title || !formData.content}
          >
            Create Post
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          resetFormData();
        }}
        maxWidth="md"
        fullWidth
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      >
        <DialogTitle>Edit Blog Post</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Title */}
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />

            {/* Content with TinyMCE */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Content
              </Typography>
              <TinyMCEEditor
                id="edit-content-editor"
                apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                value={formData.content}
                onEditorChange={(content) => setFormData({ ...formData, content })}
                init={{
                  height: 400,
                  menubar: false,
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                    'anchor', 'searchreplace', 'visualblocks', 'codesample', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                  ],
                  toolbar: 'undo redo | blocks | ' +
                    'bold italic forecolor | alignleft aligncenter ' +
                    'alignright alignjustify | bullist numlist outdent indent | ' +
                    'removeformat | code | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                  // Dialog and modal fixes
                  dialog_type: 'modal',
                  auto_focus: false,
                  // Ensure dialogs work properly with better event handling
                  setup: (editor: any) => {
                    // Handle dialog opening with more robust focus management
                    editor.on('OpenWindow', (e: any) => {
                      console.log('Edit TinyMCE dialog opening:', e);
                      
                      // Use multiple attempts to ensure proper focus
                      const attempts = [50, 100, 200, 300];
                      attempts.forEach((delay) => {
                        setTimeout(() => {
                          const dialog = document.querySelector('.tox-dialog');
                          if (dialog) {
                            // Set high z-index
                            (dialog as HTMLElement).style.zIndex = '10000';
                            
                            // Try different selectors for input fields
                            const selectors = [
                              '.tox-textfield',
                              '.tox-textarea', 
                              'textarea[data-alloy-id]',
                              'input[type="text"]',
                              'textarea',
                              'input'
                            ];
                            
                            for (const selector of selectors) {
                              const field = dialog.querySelector(selector) as HTMLElement;
                              if (field && field.offsetParent !== null) { // Check if visible
                                console.log('Edit dialog focusing field:', selector, field);
                                field.focus();
                                field.click();
                                
                                // For textareas, ensure they're editable
                                if (field.tagName === 'TEXTAREA') {
                                  (field as HTMLTextAreaElement).readOnly = false;
                                  (field as HTMLTextAreaElement).disabled = false;
                                  field.style.pointerEvents = 'auto';
                                  field.style.userSelect = 'text';
                                }
                                break;
                              }
                            }
                            
                            // Remove any potential blocking overlays
                            const backdrop = dialog.querySelector('.tox-dialog__backdrop');
                            if (backdrop) {
                              (backdrop as HTMLElement).style.pointerEvents = 'none';
                            }
                          }
                        }, delay);
                      });
                    });
                    
                    // Handle dialog after it's fully rendered
                    editor.on('WindowManager:AfterOpen', (e: any) => {
                      console.log('Edit TinyMCE dialog after open:', e);
                      setTimeout(() => {
                        const dialog = document.querySelector('.tox-dialog');
                        if (dialog) {
                          const textarea = dialog.querySelector('textarea') as HTMLTextAreaElement;
                          if (textarea) {
                            textarea.focus();
                            textarea.select();
                            // Ensure it's editable
                            textarea.readOnly = false;
                            textarea.disabled = false;
                            textarea.style.pointerEvents = 'auto';
                            console.log('Edit dialog textarea focused and made editable');
                          }
                        }
                      }, 100);
                    });
                  },
                }}
              />
            </Box>

            {/* Excerpt */}
            <TextField
              fullWidth
              label="Excerpt"
              multiline
              rows={3}
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            />

            {/* Hero Image */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Hero Image
              </Typography>
              <UploadButton
                component="label"
                variant="outlined"
                startIcon={<PhotoLibraryIcon />}
                fullWidth
              >
                {heroImage ? heroImage.name : 'Choose Hero Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setHeroImage(file);
                  }}
                />
              </UploadButton>
              {editingPost?.hero_image_url && !heroImage && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Current image: {editingPost.hero_image_url.split('/').pop()}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Status and Featured */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  />
                }
                label="Featured"
              />
            </Box>

            {/* Categories */}
            <FormControl fullWidth>
              <InputLabel>Categories</InputLabel>
              <Select
                multiple
                value={formData.categories}
                onChange={(e) => setFormData({ ...formData, categories: e.target.value as number[] })}
                label="Categories"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((categoryId) => {
                      const category = categories.find(c => c.id === categoryId);
                      return (
                        <Chip key={categoryId} label={category?.name || 'Unknown'} size="small" />
                      );
                    })}
                  </Box>
                )}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Tags */}
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={formData.tags}
              onChange={(event, newValue) => {
                setFormData({ ...formData, tags: newValue });
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...rest } = getTagProps({ index });
                  return (
                    <Chip
                      key={key}
                      variant="outlined"
                      label={option}
                      {...rest}
                    />
                  );
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags"
                  placeholder="Add tags..."
                />
              )}
            />

            {/* SEO Fields */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                SEO Settings
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="SEO Title"
                  value={formData.seo_title}
                  onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                  helperText={`${formData.seo_title.length}/100 characters`}
                  inputProps={{ maxLength: 100 }}
                />
                <TextField
                  fullWidth
                  label="SEO Description"
                  multiline
                  rows={3}
                  value={formData.seo_description}
                  onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                  helperText={`${formData.seo_description.length}/160 characters`}
                  inputProps={{ maxLength: 160 }}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditDialogOpen(false);
            resetFormData();
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdatePost}
            variant="contained"
            disabled={!formData.title || !formData.content}
          >
            Update Post
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Styled upload button
const UploadButton = styled(Button)<{ component?: React.ElementType }>(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  '& input': {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
}));

// Badge image display component with fallback
const BadgeImageDisplay: React.FC<{ badge: any }> = ({ badge }) => {
  const [imageError, setImageError] = useState(false);

  if (!badge.icon_url || imageError) {
    return (
      <BadgeIcon 
        sx={{ 
          mr: 2, 
          fontSize: 40, 
          color: 'warning.main' 
        }} 
      />
    );
  }

  return (
    <Box 
      sx={{ 
        width: 40, 
        height: 40, 
        mr: 2,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <AuthenticatedImage
        src={badgeAPI.getBadgeIconUrl(badge.icon_url) || ''}
        alt={badge.name}
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          borderRadius: '50%'
        }}
        onError={() => {
          console.log('Badge icon failed to load for:', badge.name, 'URL:', badge.icon_url);
          setImageError(true);
        }}
      />
    </Box>
  );
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);

  // Content state
  const [contentData, setContentData] = useState<any>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentType, setContentType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Entry details modal state
  const [entryDetailsOpen, setEntryDetailsOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [entryDetailsLoading, setEntryDetailsLoading] = useState(false);

  // Maintenance state
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [orphanedMedia, setOrphanedMedia] = useState<OrphanedMediaResponse | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (tabValue === 2) {
      loadContent(contentType as 'entries' | 'public_profiles' | 'all');
    }
  }, [tabValue, contentType]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboard();
      setDashboardData(response.data);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
      setError(error.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (page: number = 1) => {
    try {
      setUsersLoading(true);
      const response = await adminAPI.getUsers({ page, limit: 10 });
      setUsers(response.data.users);
      setUsersTotalPages(response.data.pagination.totalPages);
      setUsersPage(page);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      setError(error.response?.data?.error || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Load data for specific tabs when they are accessed
    if (newValue === 1 && users.length === 0) {
      loadUsers();
    }
  };

  const toggleAdminStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await adminAPI.updateUserAdminStatus(userId, !currentStatus);
      // Reload users to reflect changes
      loadUsers(usersPage);
    } catch (error: any) {
      console.error('Failed to update admin status:', error);
      setError(error.response?.data?.error || 'Failed to update admin status');
    }
  };

  const handleUsersPageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    loadUsers(page);
  };

  const loadContent = async (type: 'entries' | 'public_profiles' | 'all' = 'all') => {
    try {
      setContentLoading(true);
      const response = await adminAPI.getContent({ type });
      setContentData(response.data);
    } catch (error: any) {
      console.error('Failed to load content:', error);
      setError(error.response?.data?.error || 'Failed to load content');
    } finally {
      setContentLoading(false);
    }
  };

  const handleViewUserDetails = async (userId: number) => {
    try {
      setUserDetailsLoading(true);
      setUserDetailsOpen(true);
      const response = await adminAPI.getUserDetails(userId);
      // Set the complete user data including entries
      setSelectedUser({
        ...response.data.user,
        entries: response.data.entries,
        mediaStats: response.data.mediaStats
      });
    } catch (error: any) {
      console.error('Failed to load user details:', error);
      setError(error.response?.data?.error || 'Failed to load user details');
    } finally {
      setUserDetailsLoading(false);
    }
  };

  const handleCloseUserDetails = () => {
    setUserDetailsOpen(false);
    setSelectedUser(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Content moderation handlers
  const handleToggleEntryVisibility = async (entryId: number, currentlyPublic: boolean) => {
    try {
      await adminAPI.toggleEntryVisibility(entryId, !currentlyPublic);
      // Reload content to reflect changes
      loadContent(contentType as 'entries' | 'public_profiles' | 'all');
    } catch (error: any) {
      console.error('Failed to toggle entry visibility:', error);
      setError(error.response?.data?.error || 'Failed to update entry visibility');
    }
  };

  const handleFlagUser = async (userId: number, username: string) => {
    const reason = prompt(`Enter reason for flagging user "${username}":`);
    if (reason === null) return; // User cancelled

    try {
      await adminAPI.flagUser(userId, true, reason);
      // Reload content to reflect changes
      loadContent(contentType as 'entries' | 'public_profiles' | 'all');
    } catch (error: any) {
      console.error('Failed to flag user:', error);
      setError(error.response?.data?.error || 'Failed to flag user');
    }
  };

  const handleViewEntry = async (entryId: number) => {
    try {
      setEntryDetailsLoading(true);
      setEntryDetailsOpen(true);
      const response = await adminAPI.getEntryDetails(entryId);
      setSelectedEntry(response.data);
    } catch (error: any) {
      console.error('Failed to load entry details:', error);
      setError(error.response?.data?.error || 'Failed to load entry details');
      setEntryDetailsOpen(false);
    } finally {
      setEntryDetailsLoading(false);
    }
  };

  const handleCloseEntryDetails = () => {
    setEntryDetailsOpen(false);
    setSelectedEntry(null);
  };

  // Maintenance functions
  const loadSystemHealth = async () => {
    try {
      setMaintenanceLoading(true);
      const response = await adminAPI.getSystemHealth();
      setSystemHealth(response.data);
    } catch (error: any) {
      console.error('Failed to load system health:', error);
      setError(error.response?.data?.error || 'Failed to load system health');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const loadDatabaseStats = async () => {
    try {
      setMaintenanceLoading(true);
      const response = await adminAPI.getDatabaseStats();
      setDatabaseStats(response.data);
    } catch (error: any) {
      console.error('Failed to load database stats:', error);
      setError(error.response?.data?.error || 'Failed to load database stats');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const loadOrphanedMedia = async () => {
    try {
      setMaintenanceLoading(true);
      const response = await adminAPI.getOrphanedMedia();
      setOrphanedMedia(response.data);
    } catch (error: any) {
      console.error('Failed to load orphaned media:', error);
      setError(error.response?.data?.error || 'Failed to load orphaned media');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const cleanupOrphanedFiles = async (orphanedFiles: any[]) => {
    if (!window.confirm(`Are you sure you want to delete ${orphanedFiles.length} orphaned files? This action cannot be undone.`)) {
      return;
    }

    try {
      setMaintenanceLoading(true);
      const response = await adminAPI.cleanupOrphanedFiles(orphanedFiles);
      
      // Show detailed results
      const { results, summary } = response.data;
      let resultMessage = `Cleanup Summary:\n`;
      resultMessage += `✅ ${summary.deletedCount} files deleted\n`;
      resultMessage += `❌ ${summary.errorCount} errors\n`;
      resultMessage += `⏭️ ${summary.skippedCount} skipped\n`;
      resultMessage += `💾 Space freed: ${summary.totalSpaceFreed}\n\n`;
      
      if (results.errors.length > 0) {
        resultMessage += `Errors encountered:\n`;
        results.errors.forEach((error: any) => {
          resultMessage += `• ${error.fileName}: ${error.errorDetail}\n`;
        });
      }
      
      if (results.skipped.length > 0) {
        resultMessage += `\nSkipped files:\n`;
        results.skipped.forEach((skip: any) => {
          resultMessage += `• ${skip.fileName}: ${skip.reason}\n`;
        });
      }
      
      alert(resultMessage);
      
      // Reload orphaned media data
      await loadOrphanedMedia();
    } catch (error: any) {
      console.error('Failed to cleanup orphaned files:', error);
      setError(error.response?.data?.error || 'Failed to cleanup orphaned files');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const generateThumbnails = async () => {
    try {
      setMaintenanceLoading(true);
      const response = await adminAPI.generateThumbnails();
      
      // Show detailed results
      let message = response.data.message;
      if (response.data.errorDetails && response.data.errorDetails.length > 0) {
        message += '\n\nErrors:\n' + response.data.errorDetails.join('\n');
      }
      
      alert(message);
      
      // Reload orphaned media data to reflect changes
      if (response.data.processed > 0) {
        await loadOrphanedMedia();
      }
    } catch (error: any) {
      console.error('Failed to generate thumbnails:', error);
      setError(error.response?.data?.error || 'Failed to generate thumbnails');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const fixAvatars = async () => {
    try {
      setMaintenanceLoading(true);
      const response = await adminAPI.fixAvatars();
      
      // Show detailed results
      let message = response.data.message;
      if (response.data.errorDetails && response.data.errorDetails.length > 0) {
        message += '\n\nErrors:\n' + response.data.errorDetails.join('\n');
      }
      
      alert(message);
    } catch (error: any) {
      console.error('Failed to fix avatars:', error);
      setError(error.response?.data?.error || 'Failed to fix avatars');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  // Load maintenance data when maintenance tab is selected
  useEffect(() => {
    if (tabValue === 3) {
      loadSystemHealth();
      loadDatabaseStats();
    }
  }, [tabValue]);

  if (loading && !dashboardData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Panel
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin tabs">
          <Tab
            icon={<DashboardIcon />}
            label="Dashboard"
            id="admin-tab-0"
            aria-controls="admin-tabpanel-0"
          />
          <Tab
            icon={<PeopleIcon />}
            label="Users"
            id="admin-tab-1"
            aria-controls="admin-tabpanel-1"
          />
          <Tab
            icon={<AssessmentIcon />}
            label="Content"
            id="admin-tab-2"
            aria-controls="admin-tabpanel-2"
          />
          <Tab
            icon={<CampaignIcon />}
            label="Communications"
            id="admin-tab-3"
            aria-controls="admin-tabpanel-3"
          />
          <Tab
            icon={<BadgeIcon />}
            label="Badges"
            id="admin-tab-4"
            aria-controls="admin-tabpanel-4"
          />
          <Tab
            icon={<ArticleIcon />}
            label="Blog"
            id="admin-tab-5"
            aria-controls="admin-tabpanel-5"
          />
          <Tab
            icon={<ImageIcon />}
            label="Hero Images"
            id="admin-tab-6"
            aria-controls="admin-tabpanel-6"
          />
          <Tab
            icon={<BuildIcon />}
            label="Maintenance"
            id="admin-tab-7"
            aria-controls="admin-tabpanel-7"
          />
        </Tabs>
      </Box>

      {/* Dashboard Tab */}
      <TabPanel value={tabValue} index={0}>
        {dashboardData && (
          <Box>
            {/* Stats Cards */}
            <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
              <Card sx={{ flex: 1, minWidth: 300 }}>
                <CardContent>
                  <Typography variant="h6" component="div" gutterBottom>
                    <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Users
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {dashboardData.stats.users.total_users}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboardData.stats.users.new_users_30d} new this month
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboardData.stats.users.public_profiles} public profiles
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1, minWidth: 300 }}>
                <CardContent>
                  <Typography variant="h6" component="div" gutterBottom>
                    <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Travel Entries
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {dashboardData.stats.entries.total_entries}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboardData.stats.entries.new_entries_30d} new this month
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboardData.stats.entries.public_entries} public entries
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1, minWidth: 300 }}>
                <CardContent>
                  <Typography variant="h6" component="div" gutterBottom>
                    <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Media Files
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {dashboardData.stats.media.total_files}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatBytes(dashboardData.stats.media.total_size || 0)} total size
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Recent Activity */}
            <Card>
              <CardContent>
                <Typography variant="h6" component="div" gutterBottom>
                  Recent Activity
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Visibility</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboardData.recentActivity.map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell>{activity.title}</TableCell>
                          <TableCell>{activity.username}</TableCell>
                          <TableCell>{formatDate(activity.created_at)}</TableCell>
                          <TableCell>
                            <Chip
                              label={activity.is_public ? 'Public' : 'Private'}
                              color={activity.is_public ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}
      </TabPanel>

      {/* Users Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Manage user accounts and admin privileges
          </Typography>
        </Box>

        {usersLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Card>
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Entries</TableCell>
                        <TableCell>Joined</TableCell>
                        <TableCell>Public Profile</TableCell>
                        <TableCell>Admin</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 32, height: 32 }}>
                                {user.avatar_filename ? (
                                  <img 
                                    src={`/api/auth/avatar/${user.avatar_filename}`} 
                                    alt={user.username}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <PersonIcon />
                                )}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {user.username}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {user.first_name} {user.last_name}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              {user.email}
                            </Box>
                          </TableCell>
                          <TableCell>
                              {user.entry_count > 0 ? (
                                <Chip 
                                  label={user.entry_count}
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                />
                              ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  No entries
                                </Typography>
                              )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(user.created_at)}
                            </Typography>
                            {user.last_entry && (
                              <Typography variant="caption" color="text.secondary">
                                Last entry: {formatDate(user.last_entry)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.profile_public ? 'Public' : 'Private'}
                              color={user.profile_public ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={user.is_admin}
                                  onChange={() => toggleAdminStatus(user.id, user.is_admin)}
                                  size="small"
                                />
                              }
                              label=""
                            />
                            <AdminIcon 
                              sx={{ 
                                ml: 1, 
                                fontSize: 16, 
                                color: user.is_admin ? 'primary.main' : 'text.disabled' 
                              }} 
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleViewUserDetails(user.id)}
                              title="View user details"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {usersTotalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={usersTotalPages}
                      page={usersPage}
                      onChange={handleUsersPageChange}
                      color="primary"
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </TabPanel>

      {/* Content Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h5" gutterBottom>Content Moderation</Typography>
        
        {/* Content Type Filter */}
        <Box sx={{ mb: 3 }}>
          <Tabs
            value={contentType}
            onChange={(e, newValue) => setContentType(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="All Content" value="all" />
            <Tab label="Public Entries" value="entries" />
            <Tab label="Public Profiles" value="public_profiles" />
          </Tabs>
        </Box>

        {contentLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : contentData ? (
          <Box>
            {/* Public Entries */}
            {(contentType === 'all' || contentType === 'entries') && contentData.publicEntries && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Public Travel Entries ({contentData.publicEntries.length})
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Title</TableCell>
                          <TableCell>User</TableCell>
                          <TableCell>Location</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Media Files</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {contentData.publicEntries.map((entry: any) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {entry.title}
                              </Typography>
                              {entry.description && (
                                <Typography variant="caption" color="text.secondary">
                                  {entry.description.substring(0, 50)}
                                  {entry.description.length > 50 && '...'}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{entry.username}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {entry.email}
                              </Typography>
                            </TableCell>
                            <TableCell>{entry.location_name || 'Unknown'}</TableCell>
                            <TableCell>{formatDate(entry.created_at)}</TableCell>
                            <TableCell>
                              <Chip 
                                label={`${entry.media_count} files`}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton 
                                size="small" 
                                color="primary" 
                                title="View Entry"
                                onClick={() => handleViewEntry(entry.id)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                color="error" 
                                title={entry.is_public ? "Hide Entry" : "Make Public"}
                                onClick={() => handleToggleEntryVisibility(entry.id, entry.is_public)}
                              >
                                {entry.is_public ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Public Profiles */}
            {(contentType === 'all' || contentType === 'public_profiles') && contentData.publicProfiles && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Public User Profiles ({contentData.publicProfiles.length})
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>User</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Bio</TableCell>
                          <TableCell>Public Username</TableCell>
                          <TableCell>Joined</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {contentData.publicProfiles.map((profile: any) => (
                          <TableRow key={profile.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ width: 32, height: 32 }}>
                                  <PersonIcon />
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {profile.username}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {profile.first_name} {profile.last_name}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>{profile.email}</TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                No bio available
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            </TableCell>
                            <TableCell>{formatDate(profile.created_at)}</TableCell>
                            <TableCell>
                              <IconButton 
                                size="small" 
                                color="primary" 
                                title="View Profile"
                                onClick={() => handleViewUserDetails(profile.id)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                color="warning" 
                                title="Flag Profile"
                                onClick={() => handleFlagUser(profile.id, profile.username)}
                              >
                                <FlagIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No content data available
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* Communications Tab */}
      <TabPanel value={tabValue} index={3}>
        <CommunicationsPanel />
      </TabPanel>

      {/* Badges Tab */}
      <TabPanel value={tabValue} index={4}>
        <BadgeManagementPanel />
      </TabPanel>

      {/* Blog Tab */}
      <TabPanel value={tabValue} index={5}>
        <BlogManagementPanel />
      </TabPanel>

      {/* Hero Images Tab */}
      <TabPanel value={tabValue} index={6}>
        <HeroImageManagementPanel />
      </TabPanel>

      {/* Maintenance Tab */}
      <TabPanel value={tabValue} index={7}>
        <Typography variant="h5" gutterBottom>System Maintenance</Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* System Health */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>🔍</span>
                  System Health
                </Box>
              </Typography>
              {systemHealth ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {Object.entries(systemHealth).map(([key, value]) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip 
                        label={value.status} 
                        color={value.status === 'healthy' ? 'success' : 'error'} 
                        size="small"
                      />
                      <Typography variant="body2">
                        <strong>{key}:</strong> {value.details}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button 
                    variant="outlined" 
                    onClick={loadSystemHealth}
                    disabled={maintenanceLoading}
                  >
                    {maintenanceLoading ? <CircularProgress size={20} /> : 'Check System Health'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Database Statistics */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>📊</span>
                  Database Statistics
                </Box>
              </Typography>
              {databaseStats ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Users</Typography>
                    <Typography variant="h6">{databaseStats.users}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Travel Entries</Typography>
                    <Typography variant="h6">{databaseStats.travel_entries}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Media Files</Typography>
                    <Typography variant="h6">{databaseStats.media_files}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Database Size</Typography>
                    <Typography variant="h6">{databaseStats.database_size_mb} MB</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Recent Entries (7d)</Typography>
                    <Typography variant="h6">{databaseStats.recent_entries_7d}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Recent Users (7d)</Typography>
                    <Typography variant="h6">{databaseStats.recent_users_7d}</Typography>
                  </Box>
                </Box>
              ) : (
                <Button 
                  variant="outlined" 
                  onClick={loadDatabaseStats}
                  disabled={maintenanceLoading}
                >
                  {maintenanceLoading ? <CircularProgress size={20} /> : 'Load Database Stats'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Media Management */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>📁</span>
                  Media Management
                </Box>
              </Typography>
              {orphanedMedia ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Summary Stats */}
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Orphaned Files</Typography>
                      <Typography variant="h6" color={orphanedMedia.summary.orphanedCount > 0 ? 'warning.main' : 'text.primary'}>
                        {orphanedMedia.summary.orphanedCount}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Missing Files</Typography>
                      <Typography variant="h6" color={orphanedMedia.summary.missingCount > 0 ? 'error.main' : 'text.primary'}>
                        {orphanedMedia.summary.missingCount}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Scan Errors</Typography>
                      <Typography variant="h6" color={orphanedMedia.summary.errorCount > 0 ? 'error.main' : 'text.primary'}>
                        {orphanedMedia.summary.errorCount}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Total Issues</Typography>
                      <Typography variant="h6" color={orphanedMedia.summary.totalIssues > 0 ? 'error.main' : 'success.main'}>
                        {orphanedMedia.summary.totalIssues}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Scan Information */}
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Last scanned: {new Date(orphanedMedia.scanInfo.scannedAt).toLocaleString()} • 
                      Database records: {orphanedMedia.scanInfo.totalDbRecords} • 
                      Uploads path: {orphanedMedia.scanInfo.uploadsPath}
                    </Typography>
                  </Box>

                  {/* Overall Status */}
                  {orphanedMedia.summary.totalIssues > 0 ? (
                    <Alert severity="warning">
                      Found {orphanedMedia.summary.totalIssues} media file issues that may need attention.
                    </Alert>
                  ) : (
                    <Alert severity="success">
                      No media file issues detected. All files are properly organized.
                    </Alert>
                  )}

                  {/* Orphaned Files Section */}
                  {orphanedMedia.orphanedFiles.length > 0 && (
                    <Box>
                      <Typography variant="h6" color="warning.main" gutterBottom>
                        📄 Orphaned Files ({orphanedMedia.orphanedFiles.length})
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Files that exist on disk but are not referenced in the database:
                      </Typography>
                      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>File Name</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Size</TableCell>
                              <TableCell>Age</TableCell>
                              <TableCell>Location</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {orphanedMedia.orphanedFiles.map((file, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium">
                                    {file.fileName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {file.extension}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={file.fileType} 
                                    size="small" 
                                    color={file.fileType === 'image' ? 'primary' : file.fileType === 'video' ? 'secondary' : 'default'}
                                  />
                                </TableCell>
                                <TableCell>{file.sizeFormatted}</TableCell>
                                <TableCell>{file.ageInDays} days</TableCell>
                                <TableCell>
                                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                    {file.relativePath}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box sx={{ mt: 2 }}>
                        <Button 
                          variant="contained" 
                          color="warning"
                          onClick={() => cleanupOrphanedFiles(orphanedMedia.orphanedFiles)}
                        >
                          Delete All {orphanedMedia.orphanedFiles.length} Orphaned Files
                        </Button>
                      </Box>
                    </Box>
                  )}

                  {/* Missing Files Section */}
                  {orphanedMedia.missingFiles.length > 0 && (
                    <Box>
                      <Typography variant="h6" color="error.main" gutterBottom>
                        🚫 Missing Files ({orphanedMedia.missingFiles.length})
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Database references to files that don't exist on disk:
                      </Typography>
                      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>File Name</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Entry ID</TableCell>
                              <TableCell>Error</TableCell>
                              <TableCell>DB Age</TableCell>
                              <TableCell>Expected Location</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {orphanedMedia.missingFiles.map((file, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium">
                                    {file.file_name}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={file.fileType} 
                                    size="small" 
                                    color="error"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => navigate(`/entry/${file.entryId}`)}
                                  >
                                    #{file.entryId}
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="error.main">
                                    {file.errorDetail}
                                  </Typography>
                                </TableCell>
                                <TableCell>{file.dbRecordAge} days</TableCell>
                                <TableCell>
                                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                    {file.relativePath}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {/* Scan Errors Section */}
                  {orphanedMedia.scanErrors.length > 0 && (
                    <Box>
                      <Typography variant="h6" color="error.main" gutterBottom>
                        ⚠️ Scan Errors ({orphanedMedia.scanErrors.length})
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Errors encountered during the media scan:
                      </Typography>
                      <TableContainer component={Paper}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>File/Item</TableCell>
                              <TableCell>Error Type</TableCell>
                              <TableCell>Error Message</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {orphanedMedia.scanErrors.map((error, index) => (
                              <TableRow key={index}>
                                <TableCell>{error.file}</TableCell>
                                <TableCell>
                                  <Chip label={error.type} size="small" color="error" />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="error.main">
                                    {error.error}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button 
                      variant="outlined" 
                      onClick={loadOrphanedMedia}
                      disabled={maintenanceLoading}
                    >
                      {maintenanceLoading ? <CircularProgress size={20} /> : 'Re-scan Media Files'}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Button 
                  variant="outlined" 
                  onClick={loadOrphanedMedia}
                  disabled={maintenanceLoading}
                >
                  {maintenanceLoading ? <CircularProgress size={20} /> : 'Scan for Orphaned Media'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Avatar Management */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>🖼️</span>
                  Avatar Management
                </Box>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Fix missing avatar files in production public directory. This copies avatar files from the uploads directory to the Apache public directory for users with public profiles.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button 
                  variant="contained" 
                  color="warning"
                  onClick={fixAvatars}
                  disabled={maintenanceLoading}
                >
                  {maintenanceLoading ? <CircularProgress size={20} /> : 'Fix Missing Avatars'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>⚡</span>
                  Quick Actions
                </Box>
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button 
                  variant="outlined" 
                  onClick={loadSystemHealth}
                  disabled={maintenanceLoading}
                >
                  Refresh Health Check
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={loadDatabaseStats}
                  disabled={maintenanceLoading}
                >
                  Refresh Database Stats
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={loadOrphanedMedia}
                  disabled={maintenanceLoading}
                >
                  Scan Media Files
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={generateThumbnails}
                  disabled={maintenanceLoading}
                >
                  Generate Missing Thumbnails
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={fixAvatars}
                  disabled={maintenanceLoading}
                  color="warning"
                >
                  Fix Missing Avatars
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </TabPanel>
      
      {/* User Details Dialog */}
      <Dialog
        open={userDetailsOpen}
        onClose={handleCloseUserDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">User Details</Typography>
            <IconButton onClick={handleCloseUserDetails} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {userDetailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedUser ? (
            <Box>
              {/* User Basic Info */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ width: 64, height: 64 }}>
                      {selectedUser.avatar_filename ? (
                        <img 
                          src={`/api/auth/avatar/${selectedUser.avatar_filename}`} 
                          alt={selectedUser.username}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <PersonIcon sx={{ fontSize: 32 }} />
                      )}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{selectedUser.username}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedUser.first_name} {selectedUser.last_name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip
                          icon={selectedUser.is_admin ? <AdminIcon /> : <PersonIcon />}
                          label={selectedUser.is_admin ? 'Admin' : 'User'}
                          color={selectedUser.is_admin ? 'primary' : 'default'}
                          size="small"
                        />
                        <Chip
                          icon={selectedUser.profile_public ? <PublicIcon /> : <LockIcon />}
                          label={selectedUser.profile_public ? 'Public Profile' : 'Private Profile'}
                          color={selectedUser.profile_public ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 250 }}>
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            <EmailIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary="Email"
                            secondary={selectedUser.email}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <CalendarIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary="Joined"
                            secondary={formatDate(selectedUser.created_at)}
                          />
                        </ListItem>
                      </List>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 250 }}>
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            <PhotoIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary="Travel Entries"
                            secondary={`${selectedUser.entries?.length || 0} entries`}
                          />
                        </ListItem>
                        {selectedUser.last_entry && (
                          <ListItem>
                            <ListItemIcon>
                              <CalendarIcon />
                            </ListItemIcon>
                            <ListItemText
                              primary="Last Entry"
                              secondary={formatDate(selectedUser.last_entry)}
                            />
                          </ListItem>
                        )}
                      </List>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* User Statistics */}
              {selectedUser.mediaStats && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Media Statistics</Typography>
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Total Files
                        </Typography>
                        <Typography variant="h6">
                          {selectedUser.mediaStats.count}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Storage Used
                        </Typography>
                        <Typography variant="h6">
                          {formatBytes(selectedUser.mediaStats.total_size)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* Recent Entries */}
              {selectedUser.entries && selectedUser.entries.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Recent Travel Entries</Typography>
                    <List>
                      {selectedUser.entries.slice(0, 5).map((entry: any) => (
                        <ListItem key={entry.id} divider>
                          <ListItemText
                            primary={entry.title}
                            secondary={`${entry.location_name || 'Unknown location'} • ${formatDate(entry.created_at)}`}
                          />
                          <Chip
                            label={entry.is_public ? 'Public' : 'Private'}
                            color={entry.is_public ? 'success' : 'default'}
                            size="small"
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}
            </Box>
          ) : (
            <Typography>No user details available</Typography>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseUserDetails}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Entry Details Dialog */}
      <Dialog
        open={entryDetailsOpen}
        onClose={handleCloseEntryDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Entry Details</Typography>
            <IconButton onClick={handleCloseEntryDetails} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {entryDetailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedEntry ? (
            <Box>
              {/* Entry Information */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {selectedEntry.entry.title}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Chip
                      icon={<PersonIcon />}
                      label={selectedEntry.entry.username}
                      variant="outlined"
                    />
                    <Chip
                      icon={<EmailIcon />}
                      label={selectedEntry.entry.email}
                      variant="outlined"
                    />
                    <Chip
                      icon={<CalendarIcon />}
                      label={formatDate(selectedEntry.entry.created_at)}
                      variant="outlined"
                    />
                    <Chip
                      icon={selectedEntry.entry.is_public ? <PublicIcon /> : <LockIcon />}
                      label={selectedEntry.entry.is_public ? 'Public' : 'Private'}
                      color={selectedEntry.entry.is_public ? 'success' : 'default'}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Location:</strong> {selectedEntry.entry.location_name || 'Unknown'}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Coordinates:</strong> {selectedEntry.entry.latitude}, {selectedEntry.entry.longitude}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Entry Date:</strong> {formatDate(selectedEntry.entry.entry_date)}
                  </Typography>

                  {selectedEntry.entry.description && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        <strong>Description:</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedEntry.entry.description}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Media Files */}
              {selectedEntry.media && selectedEntry.media.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <PhotoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Media Files ({selectedEntry.media.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                      {selectedEntry.media.map((media: any) => {
                        console.log('Media item:', media.originalName, 'thumbnailUrl:', media.thumbnailUrl);
                        return (
                        <Box key={media.id} sx={{ width: { xs: '100%', sm: '45%', md: '30%' } }}>
                          <Card variant="outlined">
                            {/* Thumbnail or file icon */}
                            {media.thumbnailUrl ? (
                              <CardMedia
                                component="img"
                                height="120"
                                image={media.thumbnailUrl}
                                alt={media.originalName}
                                sx={{ 
                                  objectFit: 'cover',
                                  cursor: 'pointer',
                                  '&:hover': { opacity: 0.8 }
                                }}
                                onClick={() => window.open(media.url, '_blank')}
                                onError={(e) => {
                                  console.error('Thumbnail failed to load:', media.thumbnailUrl);
                                  console.error('Original file:', media.originalName);
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  height: 120,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: 'grey.100',
                                  cursor: 'pointer',
                                  '&:hover': { backgroundColor: 'grey.200' }
                                }}
                                onClick={() => window.open(media.url, '_blank')}
                              >
                                <PhotoIcon sx={{ fontSize: 48, color: 'grey.400' }} />
                              </Box>
                            )}
                            <CardContent sx={{ p: 1.5 }}>
                              <Typography variant="body2" fontWeight="medium" noWrap>
                                {media.originalName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {media.fileType} • {formatBytes(media.fileSize)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Uploaded {formatDate(media.uploadedAt)}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          ) : (
            <Typography>No entry details available</Typography>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseEntryDetails}>Close</Button>
          {selectedEntry && (
            <Button
              variant="contained"
              color={selectedEntry.entry.is_public ? "error" : "primary"}
              onClick={() => {
                handleToggleEntryVisibility(selectedEntry.entry.id, selectedEntry.entry.is_public);
                handleCloseEntryDetails();
              }}
            >
              {selectedEntry.entry.is_public ? "Hide Entry" : "Make Public"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Badge Management Panel Component
const BadgeManagementPanel: React.FC = () => {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [editJsonError, setEditJsonError] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingEditIcon, setUploadingEditIcon] = useState(false);
  const [evaluatingBadges, setEvaluatingBadges] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<any | null>(null);
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
  const [newBadge, setNewBadge] = useState({
    name: '',
    description: '',
    badge_type: 'achievement',
    criteria_type: 'count',
    criteria_value: 1,
    icon_name: '',
    logic_json: ''
  });
  const [editBadge, setEditBadge] = useState({
    name: '',
    description: '',
    badge_type: 'achievement',
    criteria_type: 'count',
    criteria_value: 1,
    icon_name: '',
    logic_json: ''
  });

  // Fetch badges
  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const response = await badgeAPI.getAvailableBadges();
      setBadges(response.data.badges);
    } catch (err) {
      setError('Failed to load badges');
    } finally {
      setLoading(false);
    }
  };

  const handleIconUpload = async (file: File, isEdit: boolean = false) => {
    console.log('handleIconUpload called with file:', file);
    console.log('File name:', file?.name);
    console.log('File size:', file?.size);
    console.log('File type:', file?.type);
    
    try {
      if (isEdit) {
        setUploadingEditIcon(true);
      } else {
        setUploadingIcon(true);
      }
      
      console.log('Calling badgeAPI.uploadBadgeIcon...');
      const response = await badgeAPI.uploadBadgeIcon(file);
      console.log('Upload response:', response.data);
      
      if (isEdit) {
        setEditBadge(prev => ({ ...prev, icon_name: response.data.iconPath }));
      } else {
        setNewBadge(prev => ({ ...prev, icon_name: response.data.iconPath }));
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Upload error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to upload icon');
    } finally {
      if (isEdit) {
        setUploadingEditIcon(false);
      } else {
        setUploadingIcon(false);
      }
    }
  };

  const handleCreateBadge = async () => {
    try {
      // Validate JSON if provided
      if (newBadge.logic_json && newBadge.logic_json.trim()) {
        try {
          JSON.parse(newBadge.logic_json);
          setJsonError(null);
        } catch (err) {
          setJsonError('Invalid JSON format');
          return;
        }
      }
      
      setLoading(true);
      await badgeAPI.createBadge(newBadge);
      setDialogOpen(false);
      setNewBadge({
        name: '',
        description: '',
        badge_type: 'achievement',
        criteria_type: 'count',
        criteria_value: 1,
        icon_name: '',
        logic_json: ''
      });
      setJsonError(null);
      setUploadingIcon(false);
      fetchBadges();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create badge');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBadge = async () => {
    try {
      // Validate JSON if provided
      if (editBadge.logic_json && editBadge.logic_json.trim()) {
        try {
          JSON.parse(editBadge.logic_json);
          setEditJsonError(null);
        } catch (err) {
          setEditJsonError('Invalid JSON format');
          return;
        }
      }
      
      setLoading(true);
      await badgeAPI.updateBadge(selectedBadge.id, editBadge);
      closeEditDialog();
      fetchBadges();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update badge');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (badge: any) => {
    setSelectedBadge(badge);
    
    // Parse the criteria_value to separate logic_json from simple criteria_value
    let logicJson = '';
    let criteriaValue = badge.criteria_value || 1;
    
    // Check if criteria_value is JSON
    if (badge.criteria_value && typeof badge.criteria_value === 'string') {
      try {
        JSON.parse(badge.criteria_value);
        logicJson = badge.criteria_value;
        criteriaValue = 1; // Default for count type
      } catch (e) {
        // Not JSON, use as simple criteria_value
        criteriaValue = badge.criteria_value;
      }
    }
    
    setEditBadge({
      name: badge.name || '',
      description: badge.description || '',
      badge_type: badge.badge_type || 'achievement',
      criteria_type: badge.criteria_type || 'count',
      criteria_value: typeof criteriaValue === 'number' ? criteriaValue : 1,
      icon_name: badge.icon_url || '',
      logic_json: logicJson
    });
    setEditJsonError(null);
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedBadge(null);
    setEditJsonError(null);
    setUploadingEditIcon(false);
    setEditBadge({
      name: '',
      description: '',
      badge_type: 'achievement',
      criteria_type: 'count',
      criteria_value: 1,
      icon_name: '',
      logic_json: ''
    });
  };

  const handleDeleteBadge = async (badgeId: number) => {
    if (!window.confirm('Are you sure you want to delete this badge? This will remove it from all users.')) {
      return;
    }
    
    try {
      setLoading(true);
      await badgeAPI.deleteBadge(badgeId);
      fetchBadges();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete badge');
    } finally {
      setLoading(false);
    }
  };

  const handleRetroactiveBadgeEvaluation = async () => {
    if (!window.confirm('This will evaluate all existing user data against all badges and award any badges users are eligible for. This may take a while for large datasets. Continue?')) {
      return;
    }
    
    try {
      setEvaluatingBadges(true);
      setError(null);
      
      // Call the retroactive badge evaluation endpoint
      const response = await fetch('/api/admin/evaluate-badges', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to run badge evaluation');
      }
      
      const results = await response.json();
      setEvaluationResults(results);
      setEvaluationDialogOpen(true);
      
    } catch (err: any) {
      setError(err.message || 'Failed to run retroactive badge evaluation');
    } finally {
      setEvaluatingBadges(false);
    }
  };

  if (loading && badges.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Badge Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={evaluatingBadges ? <CircularProgress size={20} /> : <AssessmentIcon />}
            onClick={handleRetroactiveBadgeEvaluation}
            disabled={evaluatingBadges}
          >
            {evaluatingBadges ? 'Evaluating...' : 'Evaluate Existing Data'}
          </Button>
          <Button
            variant="contained"
            startIcon={<BadgeIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Create New Badge
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Badge Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        {badges.map((badge) => (
          <Card key={badge.id}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BadgeImageDisplay badge={badge} />
                <Box>
                  <Typography variant="h6">{badge.name}</Typography>
                  <Chip 
                    label={badge.badge_type} 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                  />
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {badge.description}
              </Typography>
              <Typography variant="caption" display="block">
                Criteria: {badge.criteria_type} {badge.criteria_value && `(${badge.criteria_value})`}
              </Typography>
              {badge.criteria_value && (() => {
                try {
                  JSON.parse(badge.criteria_value);
                  return (
                    <Typography variant="caption" display="block" sx={{ mt: 1, fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                      Logic: {badge.criteria_value}
                    </Typography>
                  );
                } catch (e) {
                  return null;
                }
              })()}
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => openEditDialog(badge)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleDeleteBadge(badge.id)}
                  disabled={loading}
                >
                  Delete
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Create Badge Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Badge</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Badge Name"
              value={newBadge.name}
              onChange={(e) => setNewBadge(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newBadge.description}
              onChange={(e) => setNewBadge(prev => ({ ...prev, description: e.target.value }))}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Badge Type</InputLabel>
              <Select
                value={newBadge.badge_type}
                label="Badge Type"
                onChange={(e) => setNewBadge(prev => ({ ...prev, badge_type: e.target.value }))}
              >
                <MenuItem value="achievement">Achievement</MenuItem>
                <MenuItem value="milestone">Milestone</MenuItem>
                <MenuItem value="social">Social</MenuItem>
                <MenuItem value="exploration">Exploration</MenuItem>
              </Select>
            </FormControl>
            <BadgeCreator
              value={{
                criteria_type: newBadge.criteria_type,
                criteria_value: newBadge.criteria_value,
                logic_json: newBadge.logic_json
              }}
              onChange={(value) => {
                setNewBadge(prev => ({
                  ...prev,
                  criteria_type: value.criteria_type,
                  criteria_value: value.criteria_value,
                  logic_json: value.logic_json
                }));
                setJsonError(null);
              }}
              error={jsonError || undefined}
            />
            <Box>
              <Typography variant="body2" gutterBottom>
                Badge Icon
              </Typography>
              <UploadButton
                variant="outlined"
                disabled={uploadingIcon}
                startIcon={uploadingIcon ? <CircularProgress size={20} /> : undefined}
              >
                {uploadingIcon ? 'Uploading...' : 'Upload Icon'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleIconUpload(file, false);
                    }
                  }}
                />
              </UploadButton>
              {newBadge.icon_name && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={`Icon: ${newBadge.icon_name.split('/').pop()}`} 
                    size="small" 
                    color="success" 
                    variant="outlined"
                  />
                  <Button
                    size="small"
                    color="error"
                    onClick={() => setNewBadge(prev => ({ ...prev, icon_name: '' }))}
                  >
                    Remove
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateBadge} 
            variant="contained"
            disabled={!!jsonError || !newBadge.name.trim() || !newBadge.description.trim() || !newBadge.icon_name.trim()}
          >
            Create Badge
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Badge Dialog */}
      <Dialog open={editDialogOpen} onClose={closeEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Badge</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Badge Name"
              value={editBadge.name}
              onChange={(e) => setEditBadge(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={editBadge.description}
              onChange={(e) => setEditBadge(prev => ({ ...prev, description: e.target.value }))}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Badge Type</InputLabel>
              <Select
                value={editBadge.badge_type}
                label="Badge Type"
                onChange={(e) => setEditBadge(prev => ({ ...prev, badge_type: e.target.value }))}
              >
                <MenuItem value="achievement">Achievement</MenuItem>
                <MenuItem value="milestone">Milestone</MenuItem>
                <MenuItem value="social">Social</MenuItem>
                <MenuItem value="exploration">Exploration</MenuItem>
              </Select>
            </FormControl>
            <BadgeCreator
              value={{
                criteria_type: editBadge.criteria_type,
                criteria_value: editBadge.criteria_value,
                logic_json: editBadge.logic_json
              }}
              onChange={(value) => {
                setEditBadge(prev => ({
                  ...prev,
                  criteria_type: value.criteria_type,
                  criteria_value: value.criteria_value,
                  logic_json: value.logic_json
                }));
                setEditJsonError(null);
              }}
              error={editJsonError || undefined}
            />
            <Box>
              <Typography variant="body2" gutterBottom>
                Badge Icon
              </Typography>
              <UploadButton
                variant="outlined"
                disabled={uploadingEditIcon}
                startIcon={uploadingEditIcon ? <CircularProgress size={20} /> : undefined}
              >
                {uploadingEditIcon ? 'Uploading...' : 'Upload Icon'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleIconUpload(file, true);
                    }
                  }}
                />
              </UploadButton>
              {editBadge.icon_name && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={`Icon: ${editBadge.icon_name.split('/').pop()}`} 
                    size="small" 
                    color="success" 
                    variant="outlined"
                  />
                  <Button
                    size="small"
                    color="error"
                    onClick={() => setEditBadge(prev => ({ ...prev, icon_name: '' }))}
                  >
                    Remove
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog}>Cancel</Button>
          <Button 
            onClick={handleEditBadge} 
            variant="contained"
            disabled={!!editJsonError || !editBadge.name.trim() || !editBadge.description.trim() || !editBadge.icon_name.trim()}
          >
            Update Badge
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Evaluation Results Dialog */}
      <Dialog 
        open={evaluationDialogOpen} 
        onClose={() => setEvaluationDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>🎉</span>
            Retroactive Badge Evaluation Results
          </Box>
        </DialogTitle>
        <DialogContent>
          {evaluationResults && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="success">
                <Typography variant="h6" gutterBottom>
                  Evaluation Complete!
                </Typography>
                <Typography>
                  <strong>{evaluationResults.totalBadgesAwarded}</strong> badges awarded to <strong>{evaluationResults.usersEvaluated}</strong> users
                </Typography>
              </Alert>
              
              {evaluationResults.userResults && evaluationResults.userResults.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    User Results:
                  </Typography>
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {evaluationResults.userResults
                      .filter((result: any) => result.badgesAwarded > 0)
                      .map((result: any) => (
                      <Card key={result.username} sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            <strong>{result.username}</strong> - {result.badgesAwarded} badges awarded
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {result.badgeNames.map((badgeName: string, index: number) => (
                              <Chip 
                                key={index}
                                label={badgeName}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              )}
              
              {evaluationResults.usersWithNoBadges > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {evaluationResults.usersWithNoBadges} users received no new badges
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEvaluationDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPanel;
