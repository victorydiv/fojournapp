import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Switch,
  FormControlLabel,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Stack,
} from '@mui/material';
import {
  Email as EmailIcon,
  Campaign as CampaignIcon,
  Announcement as AnnouncementIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Editor } from '@tinymce/tinymce-react';
import { communicationsAPI, EmailTemplate, SentEmail, Announcement, User } from '../services/communicationsAPI';

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
    setup: (editor: any) => {
      editorRef.current = editor;
      // Call original setup if provided
      if (props.init?.setup) {
        props.init.setup(editor);
      }
    },
    // Ensure proper initialization
    promotion: false,
    branding: false,
    // Fix skin loading issues in complex React trees
    skin_url: undefined,
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
      id={`communications-tabpanel-${index}`}
      aria-labelledby={`communications-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CommunicationsPanel: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email Templates State
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  
  // Email Sending State
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  
  // Announcements State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  // Form State
  const [emailForm, setEmailForm] = useState({
    template_id: '',
    subject: '',
    html_content: '',
    dynamic_content: '', // New: content to replace {{content}} placeholder
    dynamic_title: '', // New: content to replace {{title}} placeholder
    recipient_type: 'all' as 'all' | 'selected',
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    html_content: '',
    css_styles: '',
    is_default: false,
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    content_type: 'html' as 'html' | 'markdown' | 'text',
    announcement_type: 'info' as 'info' | 'warning' | 'success' | 'error' | 'feature',
    is_active: true,
    is_featured: false,
    priority: 0,
    target_audience: 'all' as 'all' | 'users' | 'admins',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadEmailTemplates();
    loadUsers();
    loadSentEmails();
    loadAnnouncements();
  }, []);

  // ============ DATA LOADING ============

  const loadEmailTemplates = async () => {
    try {
      const response = await communicationsAPI.getEmailTemplates();
      setEmailTemplates(response.data.templates);
    } catch (error: any) {
      console.error('Failed to load email templates:', error);
      setError('Failed to load email templates');
    }
  };

  const loadUsers = async () => {
    try {
      const response = await communicationsAPI.getUsers();
      setUsers(response.data.users);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      setError('Failed to load users');
    }
  };

  const loadSentEmails = async () => {
    try {
      const response = await communicationsAPI.getSentEmails();
      setSentEmails(response.data.emails);
    } catch (error: any) {
      console.error('Failed to load sent emails:', error);
      setError('Failed to load sent emails');
    }
  };

  const loadAnnouncements = async () => {
    try {
      const response = await communicationsAPI.getAnnouncements();
      setAnnouncements(response.data.announcements);
    } catch (error: any) {
      console.error('Failed to load announcements:', error);
      setError('Failed to load announcements');
    }
  };

  // ============ EMAIL TEMPLATES ============

  const handleCreateTemplate = async () => {
    try {
      setLoading(true);
      await communicationsAPI.createEmailTemplate(templateForm);
      setTemplateDialogOpen(false);
      resetTemplateForm();
      await loadEmailTemplates();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    
    try {
      setLoading(true);
      await communicationsAPI.updateEmailTemplate(editingTemplate.id, templateForm);
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      resetTemplateForm();
      await loadEmailTemplates();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update template');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      setLoading(true);
      await communicationsAPI.deleteEmailTemplate(templateId);
      await loadEmailTemplates();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      subject: '',
      html_content: '',
      css_styles: '',
      is_default: false,
    });
  };

  const openTemplateDialog = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        subject: template.subject,
        html_content: template.html_content,
        css_styles: template.css_styles,
        is_default: template.is_default,
      });
    } else {
      setEditingTemplate(null);
      resetTemplateForm();
    }
    setTemplateDialogOpen(true);
  };

  // ============ EMAIL SENDING ============

  const handleSendEmail = async () => {
    try {
      setLoading(true);
      const sendData = {
        ...emailForm,
        template_id: emailForm.template_id ? parseInt(emailForm.template_id) : undefined,
        selected_users: emailForm.recipient_type === 'selected' ? selectedUsers : undefined,
      };
      
      await communicationsAPI.sendEmail(sendData);
      setEmailDialogOpen(false);
      resetEmailForm();
      await loadSentEmails();
      alert('Email queued for sending successfully!');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const resetEmailForm = () => {
    setEmailForm({
      template_id: '',
      subject: '',
      html_content: '',
      dynamic_content: '',
      dynamic_title: '',
      recipient_type: 'all',
    });
    setSelectedUsers([]);
  };

  const handleUserSelection = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const loadTemplateToEmail = (template: EmailTemplate) => {
    setEmailForm({
      template_id: template.id.toString(),
      subject: template.subject,
      html_content: template.html_content,
      dynamic_content: '',
      dynamic_title: '',
      recipient_type: 'all',
    });
    setEmailDialogOpen(true);
  };

  // ============ ANNOUNCEMENTS ============

  const handleCreateAnnouncement = async () => {
    try {
      setLoading(true);
      const createData = {
        ...announcementForm,
        start_date: announcementForm.start_date || undefined,
        end_date: announcementForm.end_date || undefined,
      };
      
      await communicationsAPI.createAnnouncement(createData);
      setAnnouncementDialogOpen(false);
      resetAnnouncementForm();
      await loadAnnouncements();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement) return;
    
    try {
      setLoading(true);
      const updateData = {
        ...announcementForm,
        start_date: announcementForm.start_date || undefined,
        end_date: announcementForm.end_date || undefined,
      };
      
      await communicationsAPI.updateAnnouncement(editingAnnouncement.id, updateData);
      setAnnouncementDialogOpen(false);
      setEditingAnnouncement(null);
      resetAnnouncementForm();
      await loadAnnouncements();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: number) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      setLoading(true);
      await communicationsAPI.deleteAnnouncement(announcementId);
      await loadAnnouncements();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete announcement');
    } finally {
      setLoading(false);
    }
  };

  const resetAnnouncementForm = () => {
    setAnnouncementForm({
      title: '',
      content: '',
      content_type: 'html',
      announcement_type: 'info',
      is_active: true,
      is_featured: false,
      priority: 0,
      target_audience: 'all',
      start_date: '',
      end_date: '',
    });
  };

  const openAnnouncementDialog = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setAnnouncementForm({
        title: announcement.title,
        content: announcement.content,
        content_type: announcement.content_type,
        announcement_type: announcement.announcement_type,
        is_active: announcement.is_active,
        is_featured: announcement.is_featured,
        priority: announcement.priority,
        target_audience: announcement.target_audience,
        start_date: announcement.start_date ? announcement.start_date.split('T')[0] : '',
        end_date: announcement.end_date ? announcement.end_date.split('T')[0] : '',
      });
    } else {
      setEditingAnnouncement(null);
      resetAnnouncementForm();
    }
    setAnnouncementDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Communications Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab icon={<EmailIcon />} label="Email Templates" />
          <Tab icon={<SendIcon />} label="Send Emails" />
          <Tab icon={<CampaignIcon />} label="Email History" />
          <Tab icon={<AnnouncementIcon />} label="Announcements" />
        </Tabs>
      </Box>

      {/* Email Templates Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Email Templates</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => openTemplateDialog()}
          >
            Create Template
          </Button>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 2 }}>
          {emailTemplates.map((template) => (
            <Card key={template.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" component="div">
                    {template.name}
                  </Typography>
                  {template.is_default && (
                    <Chip label="Default" color="primary" size="small" />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Subject: {template.subject}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Created by: {template.created_by_username}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {formatDate(template.created_at)}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button 
                    size="small" 
                    startIcon={<EditIcon />}
                    onClick={() => openTemplateDialog(template)}
                  >
                    Edit
                  </Button>
                  <Button 
                    size="small" 
                    startIcon={<SendIcon />}
                    onClick={() => loadTemplateToEmail(template)}
                  >
                    Use
                  </Button>
                  {!template.is_default && (
                    <Button 
                      size="small" 
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      Delete
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </TabPanel>

      {/* Send Emails Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Send Email Campaign</Typography>
          <Button 
            variant="contained" 
            startIcon={<SendIcon />}
            onClick={() => setEmailDialogOpen(true)}
          >
            Compose Email
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Send emails to users using your email templates or create custom messages.
          You can target all users or select specific recipients.
        </Typography>
      </TabPanel>

      {/* Email History Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>Email History</Typography>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Subject</TableCell>
                <TableCell>Sender</TableCell>
                <TableCell>Recipients</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Sent Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sentEmails.map((email) => (
                <TableRow key={email.id}>
                  <TableCell>{email.subject}</TableCell>
                  <TableCell>{email.sender_username}</TableCell>
                  <TableCell>
                    <Chip 
                      label={`${email.recipient_count} users`} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={email.status} 
                      color={
                        email.status === 'completed' ? 'success' :
                        email.status === 'failed' ? 'error' :
                        email.status === 'sending' ? 'warning' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {email.sent_at ? formatDate(email.sent_at) : 'Not sent'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Announcements Tab */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Site Announcements</Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => openAnnouncementDialog()}
          >
            Create Announcement
          </Button>
        </Box>

        <List>
          {announcements.map((announcement) => (
            <ListItem key={announcement.id} divider>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">{announcement.title}</Typography>
                    <Chip 
                      label={announcement.announcement_type} 
                      color={
                        announcement.announcement_type === 'success' ? 'success' :
                        announcement.announcement_type === 'warning' ? 'warning' :
                        announcement.announcement_type === 'error' ? 'error' : 'info'
                      }
                      size="small"
                    />
                    {announcement.is_featured && (
                      <Chip label="Featured" color="secondary" size="small" />
                    )}
                    <Chip 
                      label={announcement.is_active ? 'Active' : 'Inactive'} 
                      color={announcement.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                      <div dangerouslySetInnerHTML={{ __html: announcement.content.substring(0, 200) + '...' }} />
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Created by {announcement.created_by_username} on {formatDate(announcement.created_at)}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  onClick={() => openAnnouncementDialog(announcement)}
                  sx={{ mr: 1 }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton 
                  edge="end" 
                  color="error"
                  onClick={() => handleDeleteAnnouncement(announcement.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </TabPanel>

      {/* Email Template Dialog */}
      <Dialog 
        open={templateDialogOpen} 
        onClose={() => setTemplateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Template Name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={templateForm.is_default}
                    onChange={(e) => setTemplateForm({ ...templateForm, is_default: e.target.checked })}
                  />
                }
                label="Default Template"
              />
            </Box>
            
            <TextField
              fullWidth
              label="Email Subject"
              value={templateForm.subject}
              onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
            />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>Email Content (HTML)</Typography>
              <TinyMCEEditor
                id="template-editor"
                apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                value={templateForm.html_content}
                onEditorChange={(content: string) => setTemplateForm({ ...templateForm, html_content: content })}
                init={{
                  height: 300,
                  menubar: 'insert',
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'help', 'wordcount'
                  ],
                  toolbar: 'undo redo | blocks | ' +
                    'bold italic forecolor | alignleft aligncenter ' +
                    'alignright alignjustify | bullist numlist outdent indent | ' +
                    'removeformat | image media | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                  // Enable context menu
                  contextmenu: 'link image table',
                  toolbar_mode: 'sliding',
                  elementpath: false,
                  // Enhanced image editing options
                  image_advtab: true,
                  image_caption: true,
                  image_title: true,
                  image_description: true,
                  image_dimensions: true,
                  // Allow image uploads and editing
                  file_picker_types: 'image',
                  images_upload_handler: (blobInfo: any, progress: (percent: number) => void) => {
                    return new Promise<string>((resolve, reject) => {
                      // Create a data URL for the image
                      const reader = new FileReader();
                      reader.onload = () => {
                        resolve(reader.result as string);
                      };
                      reader.onerror = () => {
                        reject('Image upload failed');
                      };
                      reader.readAsDataURL(blobInfo.blob());
                    });
                  },
                  // Enable drag and drop of images
                  paste_data_images: true,
                  // Allow editing of image properties
                  image_class_list: [
                    {title: 'None', value: ''},
                    {title: 'Responsive', value: 'img-responsive'},
                    {title: 'Rounded', value: 'img-rounded'},
                    {title: 'Circle', value: 'img-circle'}
                  ],
                  // File picker callback for more control
                  file_picker_callback: (callback: (url: string, meta?: any) => void, value: string, meta: any) => {
                    if (meta.filetype === 'image') {
                      const input = document.createElement('input');
                      input.setAttribute('type', 'file');
                      input.setAttribute('accept', 'image/*');
                      input.onchange = () => {
                        const file = input.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            callback(reader.result as string, {
                              alt: file.name,
                              title: file.name
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }
                  }
                }}
              />
            </Box>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Custom CSS Styles (Optional)"
              value={templateForm.css_styles}
              onChange={(e) => setTemplateForm({ ...templateForm, css_styles: e.target.value })}
              placeholder=".email-container { max-width: 600px; margin: 0 auto; }"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
            disabled={loading || !templateForm.name || !templateForm.subject || !templateForm.html_content}
          >
            {loading ? <CircularProgress size={20} /> : (editingTemplate ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog 
        open={emailDialogOpen} 
        onClose={() => setEmailDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Compose Email</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Email Template (Optional)</InputLabel>
                <Select
                  value={emailForm.template_id}
                  onChange={(e) => {
                    const templateId = e.target.value;
                    setEmailForm({ ...emailForm, template_id: templateId });
                    if (templateId) {
                      const template = emailTemplates.find(t => t.id.toString() === templateId);
                      if (template) {
                        setEmailForm({
                          ...emailForm,
                          template_id: templateId,
                          subject: template.subject,
                          html_content: template.html_content,
                        });
                      }
                    }
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  {emailTemplates.map((template) => (
                    <MenuItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>Recipients</InputLabel>
                <Select
                  value={emailForm.recipient_type}
                  onChange={(e) => setEmailForm({ ...emailForm, recipient_type: e.target.value as 'all' | 'selected' })}
                >
                  <MenuItem value="all">All Users ({users.length})</MenuItem>
                  <MenuItem value="selected">Selected Users</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            {emailForm.recipient_type === 'selected' && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Select Users ({selectedUsers.length} selected)
                </Typography>
                <Paper sx={{ maxHeight: 200, overflow: 'auto', p: 1 }}>
                  {users.map((user) => (
                    <FormControlLabel
                      key={user.id}
                      control={
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleUserSelection(user.id)}
                        />
                      }
                      label={`${user.first_name} ${user.last_name} (${user.username}) - ${user.email}`}
                      sx={{ display: 'block' }}
                    />
                  ))}
                </Paper>
              </Box>
            )}
            
            <TextField
              fullWidth
              label="Email Subject"
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
            />
            
            {/* Template Selection */}
            <FormControl fullWidth>
              <InputLabel>Email Template (Optional)</InputLabel>
              <Select
                value={emailForm.template_id}
                onChange={(e) => {
                  const templateId = e.target.value;
                  const template = emailTemplates.find(t => t.id.toString() === templateId);
                  if (template) {
                    setEmailForm({
                      ...emailForm,
                      template_id: templateId,
                      subject: template.subject,
                      html_content: template.html_content,
                    });
                  } else {
                    setEmailForm({ ...emailForm, template_id: templateId });
                  }
                }}
              >
                <MenuItem value="">Custom Email (No Template)</MenuItem>
                {emailTemplates.map((template) => (
                  <MenuItem key={template.id} value={template.id.toString()}>
                    {template.name} {template.is_default && '(Default)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Dynamic Content for {{content}} placeholder */}
            {emailForm.html_content.includes('{{content}}') && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Dynamic Content (replaces {'{content}'} in template)
                </Typography>
                <TinyMCEEditor
                  id="dynamic-content-editor"
                  apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                  value={emailForm.dynamic_content}
                  onEditorChange={(content: string) => setEmailForm({ ...emailForm, dynamic_content: content })}
                  init={{
                    height: 250,
                    menubar: 'insert',
                    plugins: [
                      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                      'insertdatetime', 'media', 'table', 'help', 'wordcount'
                    ],
                    toolbar: 'undo redo | blocks | ' +
                      'bold italic forecolor | alignleft aligncenter ' +
                      'alignright alignjustify | bullist numlist outdent indent | ' +
                      'removeformat | image media | help',
                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                    contextmenu: 'link image table',
                    toolbar_mode: 'sliding',
                    elementpath: false,
                    image_advtab: true,
                    image_caption: true,
                    image_title: true,
                    image_description: true,
                    image_dimensions: true,
                    file_picker_types: 'image',
                    images_upload_handler: async (blobInfo: any, progress: (percent: number) => void) => {
                      try {
                        const formData = new FormData();
                        formData.append('image', blobInfo.blob(), blobInfo.filename());

                        const response = await fetch('/api/communications/upload-image', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                          },
                          body: formData
                        });

                        if (!response.ok) {
                          throw new Error('Upload failed');
                        }

                        const result = await response.json();
                        return result.location; // Return the public URL
                      } catch (error) {
                        console.error('Image upload error:', error);
                        throw error;
                      }
                    },
                    paste_data_images: true,
                    image_class_list: [
                      {title: 'None', value: ''},
                      {title: 'Responsive', value: 'img-responsive'},
                      {title: 'Rounded', value: 'img-rounded'},
                      {title: 'Circle', value: 'img-circle'}
                    ],
                    file_picker_callback: (callback: (url: string, meta?: any) => void, value: string, meta: any) => {
                      if (meta.filetype === 'image') {
                        const input = document.createElement('input');
                        input.setAttribute('type', 'file');
                        input.setAttribute('accept', 'image/*');
                        input.onchange = async () => {
                          const file = input.files?.[0];
                          if (file) {
                            try {
                              const formData = new FormData();
                              formData.append('image', file);

                              const response = await fetch('/api/communications/upload-image', {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                                },
                                body: formData
                              });

                              if (!response.ok) {
                                throw new Error('Upload failed');
                              }

                              const result = await response.json();
                              callback(result.location, {
                                alt: file.name,
                                title: file.name
                              });
                            } catch (error) {
                              console.error('Image upload error:', error);
                              alert('Failed to upload image. Please try again.');
                            }
                          }
                        };
                        input.click();
                      }
                    }
                  }}
                />
              </Box>
            )}

            {/* Dynamic Title for {{title}} placeholder */}
            {emailForm.html_content.includes('{{title}}') && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Dynamic Title (replaces {'{title}'} in template)
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Enter the title content to replace {{title}} placeholder"
                  value={emailForm.dynamic_title}
                  onChange={(e) => setEmailForm({ ...emailForm, dynamic_title: e.target.value })}
                  sx={{ mb: 2 }}
                />
              </Box>
            )}
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Email Content {emailForm.template_id ? '(Template Base)' : '(Full Email)'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Available placeholders: {'{first_name}'} {'{last_name}'} {'{email}'} {'{username}'}
                {emailForm.html_content.includes('{{content}}') && ', {content}'}
                {emailForm.html_content.includes('{{title}}') && ', {title}'}
              </Typography>
              <TinyMCEEditor
                id="email-editor"
                apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                value={emailForm.html_content}
                onEditorChange={(content: string) => setEmailForm({ ...emailForm, html_content: content })}
                init={{
                  height: 400,
                  menubar: 'insert',
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'help', 'wordcount'
                  ],
                  toolbar: 'undo redo | blocks | ' +
                    'bold italic forecolor | alignleft aligncenter ' +
                    'alignright alignjustify | bullist numlist outdent indent | ' +
                    'removeformat | image media | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                  contextmenu: 'link image table',
                  toolbar_mode: 'sliding',
                  elementpath: false,
                  image_advtab: true,
                  image_caption: true,
                  image_title: true,
                  image_description: true,
                  image_dimensions: true,
                  file_picker_types: 'image',
                  images_upload_handler: (blobInfo: any, progress: (percent: number) => void) => {
                    return new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result as string);
                      reader.onerror = () => reject('Image upload failed');
                      reader.readAsDataURL(blobInfo.blob());
                    });
                  },
                  paste_data_images: true,
                  image_class_list: [
                    {title: 'None', value: ''},
                    {title: 'Responsive', value: 'img-responsive'},
                    {title: 'Rounded', value: 'img-rounded'},
                    {title: 'Circle', value: 'img-circle'}
                  ],
                  file_picker_callback: (callback: (url: string, meta?: any) => void, value: string, meta: any) => {
                    if (meta.filetype === 'image') {
                      const input = document.createElement('input');
                      input.setAttribute('type', 'file');
                      input.setAttribute('accept', 'image/*');
                      input.onchange = () => {
                        const file = input.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            callback(reader.result as string, {
                              alt: file.name,
                              title: file.name
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }
                  }
                }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSendEmail}
            disabled={
              loading || 
              !emailForm.subject || 
              !emailForm.html_content || 
              (emailForm.recipient_type === 'selected' && selectedUsers.length === 0)
            }
          >
            {loading ? <CircularProgress size={20} /> : 'Send Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog 
        open={announcementDialogOpen} 
        onClose={() => setAnnouncementDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Announcement Title"
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                sx={{ flex: 2 }}
              />
              <FormControl fullWidth sx={{ flex: 1 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={announcementForm.announcement_type}
                  onChange={(e) => setAnnouncementForm({ 
                    ...announcementForm, 
                    announcement_type: e.target.value as any 
                  })}
                >
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="feature">Feature</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Target Audience</InputLabel>
                <Select
                  value={announcementForm.target_audience}
                  onChange={(e) => setAnnouncementForm({ 
                    ...announcementForm, 
                    target_audience: e.target.value as any 
                  })}
                >
                  <MenuItem value="all">All Users</MenuItem>
                  <MenuItem value="users">Regular Users</MenuItem>
                  <MenuItem value="admins">Admins Only</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                type="number"
                label="Priority"
                value={announcementForm.priority}
                onChange={(e) => setAnnouncementForm({ 
                  ...announcementForm, 
                  priority: parseInt(e.target.value) || 0 
                })}
                helperText="Higher numbers show first"
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={announcementForm.is_active}
                    onChange={(e) => setAnnouncementForm({ 
                      ...announcementForm, 
                      is_active: e.target.checked 
                    })}
                  />
                }
                label="Active"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={announcementForm.is_featured}
                    onChange={(e) => setAnnouncementForm({ 
                      ...announcementForm, 
                      is_featured: e.target.checked 
                    })}
                  />
                }
                label="Featured"
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                type="date"
                label="Start Date (Optional)"
                value={announcementForm.start_date}
                onChange={(e) => setAnnouncementForm({ 
                  ...announcementForm, 
                  start_date: e.target.value 
                })}
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                fullWidth
                type="date"
                label="End Date (Optional)"
                value={announcementForm.end_date}
                onChange={(e) => setAnnouncementForm({ 
                  ...announcementForm, 
                  end_date: e.target.value 
                })}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>Announcement Content</Typography>
              <TinyMCEEditor
                id="announcement-editor"
                apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                value={announcementForm.content}
                onEditorChange={(content: string) => setAnnouncementForm({ ...announcementForm, content })}
                init={{
                  height: 300,
                  menubar: 'insert',
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'help', 'wordcount'
                  ],
                  toolbar: 'undo redo | blocks | ' +
                    'bold italic forecolor | alignleft aligncenter ' +
                    'alignright alignjustify | bullist numlist outdent indent | ' +
                    'removeformat | image media | help',
                  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                  // Enable context menu
                  contextmenu: 'link image table',
                  toolbar_mode: 'sliding',
                  elementpath: false,
                  // Enhanced image editing options
                  image_advtab: true,
                  image_caption: true,
                  image_title: true,
                  image_description: true,
                  image_dimensions: true,
                  // Allow image uploads and editing
                  file_picker_types: 'image',
                  images_upload_handler: (blobInfo: any, progress: (percent: number) => void) => {
                    return new Promise<string>((resolve, reject) => {
                      // Create a data URL for the image
                      const reader = new FileReader();
                      reader.onload = () => {
                        resolve(reader.result as string);
                      };
                      reader.onerror = () => {
                        reject('Image upload failed');
                      };
                      reader.readAsDataURL(blobInfo.blob());
                    });
                  },
                  // Enable drag and drop of images
                  paste_data_images: true,
                  // Allow editing of image properties
                  image_class_list: [
                    {title: 'None', value: ''},
                    {title: 'Responsive', value: 'img-responsive'},
                    {title: 'Rounded', value: 'img-rounded'},
                    {title: 'Circle', value: 'img-circle'}
                  ],
                  // File picker callback for more control
                  file_picker_callback: (callback: (url: string, meta?: any) => void, value: string, meta: any) => {
                    if (meta.filetype === 'image') {
                      const input = document.createElement('input');
                      input.setAttribute('type', 'file');
                      input.setAttribute('accept', 'image/*');
                      input.onchange = () => {
                        const file = input.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            callback(reader.result as string, {
                              alt: file.name,
                              title: file.name
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }
                  }
                }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnnouncementDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={editingAnnouncement ? handleUpdateAnnouncement : handleCreateAnnouncement}
            disabled={loading || !announcementForm.title || !announcementForm.content}
          >
            {loading ? <CircularProgress size={20} /> : (editingAnnouncement ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommunicationsPanel;
