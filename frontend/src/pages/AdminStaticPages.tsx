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

// Add CSS styles to fix TinyMCE dialog issues - Enhanced with more aggressive overrides
const tinyMCEStyles = `
  /* Base dialog fixes */
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
  
  /* Aggressive input field fixes */
  .tox-dialog input,
  .tox-dialog textarea,
  .tox-dialog [contenteditable],
  .tox-dialog [data-alloy-id] {
    pointer-events: auto !important;
    user-select: text !important;
    -webkit-user-select: text !important;
    -moz-user-select: text !important;
    -ms-user-select: text !important;
    background-color: white !important;
    color: black !important;
    border: 1px solid #ccc !important;
    padding: 8px !important;
    font-family: inherit !important;
    font-size: 14px !important;
    cursor: text !important;
    outline: none !important;
    box-sizing: border-box !important;
    position: relative !important;
  }
  
  /* Specific fixes for TinyMCE form elements */
  .tox-dialog .tox-textfield,
  .tox-dialog .tox-textarea {
    pointer-events: auto !important;
    user-select: text !important;
    -webkit-user-select: text !important;
    -moz-user-select: text !important;
    -ms-user-select: text !important;
    background-color: white !important;
    color: black !important;
    border: 1px solid #ccc !important;
    padding: 8px !important;
    cursor: text !important;
  }
  
  /* HTML Source Editor specific fixes - most important */
  .tox-dialog textarea[data-alloy-id] {
    pointer-events: auto !important;
    user-select: text !important;
    -webkit-user-select: text !important;
    -moz-user-select: text !important;
    -ms-user-select: text !important;
    background-color: white !important;
    color: black !important;
    border: 1px solid #ccc !important;
    padding: 12px !important;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
    font-size: 13px !important;
    line-height: 1.4 !important;
    resize: vertical !important;
    min-height: 300px !important;
    width: 100% !important;
    box-sizing: border-box !important;
    cursor: text !important;
    -webkit-appearance: textfield !important;
    appearance: textfield !important;
    outline: none !important;
    tab-size: 2 !important;
    white-space: pre !important;
    word-wrap: normal !important;
    overflow-wrap: normal !important;
  }
  
  /* Focus states */
  .tox-dialog input:focus,
  .tox-dialog textarea:focus,
  .tox-dialog [contenteditable]:focus,
  .tox-dialog [data-alloy-id]:focus {
    outline: 2px solid #0066cc !important;
    background-color: white !important;
    color: black !important;
    pointer-events: auto !important;
    user-select: text !important;
    cursor: text !important;
    border-color: #0066cc !important;
  }
  
  /* Container fixes */
  .tox-dialog__content-js {
    pointer-events: auto !important;
  }
  .tox-dialog__footer {
    pointer-events: auto !important;
  }
  .tox-dialog__header {
    pointer-events: auto !important;
  }
  .tox-dialog .tox-button {
    pointer-events: auto !important;
  }
  .tox-dialog .tox-form__group {
    pointer-events: auto !important;
  }
  .tox-dialog .tox-label {
    pointer-events: auto !important;
  }
  
  /* Force override any Material-UI or other framework interference */
  .tox-dialog * {
    pointer-events: auto !important;
  }
  
  /* Additional focus and interaction fixes */
  .tox-dialog textarea[data-alloy-id]:hover {
    cursor: text !important;
    border-color: #999 !important;
  }
  
  .tox-dialog textarea[data-alloy-id]:active {
    cursor: text !important;
    border-color: #0066cc !important;
  }
  
  /* Override any potential z-index or positioning issues */
  .tox-dialog-wrap {
    pointer-events: auto !important;
    position: fixed !important;
    z-index: 10000 !important;
  }
  
  /* Make sure text selection works */
  .tox-dialog ::selection {
    background-color: #b3d4fc !important;
  }
  .tox-dialog ::-moz-selection {
    background-color: #b3d4fc !important;
  }
  
  /* Disable any animations that might interfere */
  .tox-dialog * {
    transition: none !important;
    animation: none !important;
  }
`;

// Inject styles and global handlers
if (typeof document !== 'undefined') {
  const styleElement = document.getElementById('tinymce-static-dialog-fix');
  if (!styleElement) {
    const style = document.createElement('style');
    style.id = 'tinymce-static-dialog-fix';
    style.textContent = tinyMCEStyles;
    document.head.appendChild(style);
  }
  
  // Add global click handler to force-enable TinyMCE dialogs
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.tox-dialog')) {
      // Force enable any TinyMCE dialog elements that were clicked
      setTimeout(() => {
        const dialog = target.closest('.tox-dialog');
        if (dialog) {
          const inputs = dialog.querySelectorAll('input, textarea, [contenteditable], [data-alloy-id]');
          inputs.forEach((input: any) => {
            input.style.pointerEvents = 'auto !important';
            input.style.userSelect = 'text !important';
            input.disabled = false;
            input.readOnly = false;
            input.contentEditable = 'true';
            if (input.tagName === 'TEXTAREA' || input.hasAttribute('data-alloy-id')) {
              input.focus();
            }
          });
        }
      }, 0);
    }
  });
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
      key={id || 'tinymce-static-editor'}
      {...props}
      init={enhancedInit}
      onInit={(evt: any, editor: any) => {
        editorRef.current = editor;
      }}
    />
  );
};

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

  // Additional effect to fix TinyMCE dialog issues when the main dialog opens
  useEffect(() => {
    if (openDialog) {
      // Wait for dialog to render, then fix TinyMCE dialogs
      const timer = setTimeout(() => {
        // Force fix all TinyMCE dialogs that might exist
        const fixTinyMCEDialogs = () => {
          const dialogs = document.querySelectorAll('.tox-dialog, .tox-dialog-wrap');
          dialogs.forEach((dialog: any) => {
            // Remove any blocking styles
            dialog.style.pointerEvents = 'auto';
            dialog.style.userSelect = 'auto';
            
            // Fix all input elements in the dialog
            const inputs = dialog.querySelectorAll('input, textarea, [contenteditable], [data-alloy-id]');
            inputs.forEach((input: any) => {
              // Force enable input
              input.style.pointerEvents = 'auto !important';
              input.style.userSelect = 'text !important';
              input.style.cursor = 'text !important';
              input.disabled = false;
              input.readOnly = false;
              input.contentEditable = 'true';
              input.tabIndex = 0;
              
              // Remove any blocking event listeners
              input.onclick = null;
              input.onmousedown = null;
              input.onfocus = null;
              
              // Add working event listeners
              input.addEventListener('click', (e: any) => {
                e.stopPropagation();
                input.focus();
              });
              
              input.addEventListener('focus', () => {
                input.style.pointerEvents = 'auto';
                input.style.userSelect = 'text';
              });
            });
          });
        };
        
        // Fix immediately and then set up an interval to keep fixing
        fixTinyMCEDialogs();
        const interval = setInterval(fixTinyMCEDialogs, 250);
        
        // Clean up interval when dialog closes
        return () => clearInterval(interval);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [openDialog]);

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

      {/* Edit/Create Dialog - with aggressive TinyMCE fixes */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        // Disable Material-UI focus trap that interferes with TinyMCE
        disableEnforceFocus={true}
        disableAutoFocus={true}
        disableRestoreFocus={true}
        // Additional props to prevent interference
        keepMounted={false}
        PaperProps={{
          style: {
            pointerEvents: 'auto',
          }
        }}
        BackdropProps={{
          style: {
            pointerEvents: 'none',
          }
        }}
      >
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
              <TinyMCEEditor
                id="static-page-content-editor"
                apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                value={formData.content}
                onEditorChange={(content) => setFormData({ ...formData, content })}
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
                  // Use absolute URLs to prevent path issues
                  relative_urls: false,
                  convert_urls: true,
                  // Static page specific settings
                  block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6; Preformatted=pre',
                  font_family_formats: 'Arial=arial,helvetica,sans-serif; Georgia=georgia,palatino; Helvetica=helvetica; Times New Roman=times new roman,times; Verdana=verdana,geneva',
                  image_advtab: true,
                  image_caption: true,
                  image_title: true,
                  file_picker_types: 'image',
                  paste_data_images: true,
                  paste_as_text: false,
                  paste_webkit_styles: 'color font-size font-family background-color',
                  paste_retain_style_properties: 'color font-size font-family background-color',
                  // Enhanced dialog and focus fixes with more aggressive approach
                  setup: (editor: any) => {
                    // Force enable all dialog inputs immediately when dialog opens
                    editor.on('OpenWindow', (e: any) => {
                      console.log('TinyMCE dialog opening:', e);
                      
                      // Multiple intervals to ensure inputs get enabled
                      const intervals = [50, 100, 200, 500];
                      intervals.forEach(delay => {
                        setTimeout(() => {
                          const dialogs = document.querySelectorAll('.tox-dialog, .tox-dialog-wrap, .tox-dialog__body');
                          dialogs.forEach((dialog: any) => {
                            // Force all interactive elements to be enabled
                            const allInputs = dialog.querySelectorAll('input, textarea, [contenteditable], [data-alloy-id]');
                            allInputs.forEach((input: any) => {
                              // Remove all potential blocking attributes/properties
                              input.style.pointerEvents = 'auto !important';
                              input.style.userSelect = 'text !important';
                              input.style.webkitUserSelect = 'text !important';
                              input.style.mozUserSelect = 'text !important';
                              input.style.msUserSelect = 'text !important';
                              input.style.backgroundColor = 'white !important';
                              input.style.color = 'black !important';
                              input.style.border = '1px solid #ccc !important';
                              input.style.padding = '8px !important';
                              input.style.fontSize = '14px !important';
                              input.style.fontFamily = 'monospace !important';
                              input.style.lineHeight = '1.4 !important';
                              input.style.resize = 'vertical !important';
                              input.style.minHeight = '200px !important';
                              input.style.width = '100% !important';
                              input.style.boxSizing = 'border-box !important';
                              input.style.webkitAppearance = 'textfield !important';
                              input.style.appearance = 'textfield !important';
                              
                              // Force enable input functionality
                              input.disabled = false;
                              input.readOnly = false;
                              input.contentEditable = 'true';
                              
                              // Remove any event listeners that might be blocking input
                              input.onkeydown = null;
                              input.onkeyup = null;
                              input.onkeypress = null;
                              input.oninput = null;
                              
                              // Force focus capability
                              input.tabIndex = 0;
                              
                              // Add focus and click handlers to ensure input works
                              input.addEventListener('focus', () => {
                                input.style.pointerEvents = 'auto';
                                input.style.userSelect = 'text';
                              });
                              
                              input.addEventListener('click', (event: any) => {
                                event.stopPropagation();
                                input.focus();
                              });
                              
                              // Special handling for HTML source editor textarea
                              if (input.tagName === 'TEXTAREA' || input.hasAttribute('data-alloy-id')) {
                                input.style.cursor = 'text !important';
                                input.spellcheck = true;
                                
                                // Force cursor positioning
                                input.addEventListener('mousedown', (e: any) => {
                                  e.stopPropagation();
                                  setTimeout(() => input.focus(), 0);
                                });
                              }
                            });
                            
                            // Fix dialog container styles
                            dialog.style.pointerEvents = 'auto';
                            dialog.style.userSelect = 'auto';
                          });
                          
                          // Additional global style fixes
                          const style = document.createElement('style');
                          style.id = 'tinymce-input-force-' + Date.now();
                          style.textContent = `
                            .tox-dialog input:focus,
                            .tox-dialog textarea:focus,
                            .tox-dialog [contenteditable]:focus,
                            .tox-dialog [data-alloy-id]:focus {
                              outline: 2px solid #0066cc !important;
                              background-color: white !important;
                              color: black !important;
                              pointer-events: auto !important;
                              user-select: text !important;
                              cursor: text !important;
                            }
                            .tox-dialog textarea[data-alloy-id] {
                              cursor: text !important;
                              pointer-events: auto !important;
                              user-select: text !important;
                              background: white !important;
                              color: black !important;
                            }
                          `;
                          document.head.appendChild(style);
                        }, delay);
                      });
                    });
                    
                    editor.on('AfterRenderUI', (e: any) => {
                      console.log('TinyMCE dialog after render:', e);
                      // Fix dialog layering
                      setTimeout(() => {
                        const dialogs = document.querySelectorAll('.tox-dialog');
                        dialogs.forEach((dialog: any) => {
                          dialog.style.zIndex = '10000';
                          const backdrop = dialog.parentElement?.querySelector('.tox-dialog__backdrop');
                          if (backdrop) {
                            backdrop.style.zIndex = '9999';
                            backdrop.style.pointerEvents = 'none';
                          }
                        });
                      }, 50);
                    });
                    
                    // Add event listener to detect when HTML source dialog specifically opens
                    editor.on('OpenWindow', (e: any) => {
                      if (e.dialog && e.dialog.getData) {
                        console.log('Dialog data:', e.dialog.getData());
                      }
                      
                      // Check every 100ms for 5 seconds to find and fix HTML source textarea
                      let attempts = 0;
                      const maxAttempts = 50;
                      const fixInterval = setInterval(() => {
                        attempts++;
                        const htmlTextareas = document.querySelectorAll('.tox-dialog textarea[data-alloy-id]');
                        
                        if (htmlTextareas.length > 0) {
                          htmlTextareas.forEach((textarea: any) => {
                            console.log('Found HTML source textarea, fixing...', textarea);
                            
                            // Force all properties to enable editing
                            textarea.style.pointerEvents = 'auto !important';
                            textarea.style.userSelect = 'text !important';
                            textarea.style.cursor = 'text !important';
                            textarea.disabled = false;
                            textarea.readOnly = false;
                            textarea.contentEditable = 'true';
                            textarea.tabIndex = 0;
                            
                            // Add event listeners to ensure it works
                            textarea.addEventListener('click', (e: any) => {
                              e.stopPropagation();
                              textarea.focus();
                            });
                            
                            textarea.addEventListener('focus', () => {
                              console.log('HTML textarea focused');
                              textarea.style.pointerEvents = 'auto';
                              textarea.style.userSelect = 'text';
                            });
                            
                            // Try to focus it
                            setTimeout(() => textarea.focus(), 100);
                          });
                          
                          clearInterval(fixInterval);
                        } else if (attempts >= maxAttempts) {
                          clearInterval(fixInterval);
                        }
                      }, 100);
                    });
                  }
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