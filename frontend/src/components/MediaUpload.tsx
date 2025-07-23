import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Grid,
  Alert,
  LinearProgress,
  Chip,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Description as DocumentIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaAPI } from '../services/api';
import { MediaFile } from '../types';

interface MediaUploadProps {
  entryId?: number;
  existingMedia?: MediaFile[];
  onMediaChange?: (media: MediaFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxFileSize?: number; // in MB
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
}

const MediaUpload: React.FC<MediaUploadProps> = ({
  entryId,
  existingMedia = [],
  onMediaChange,
  disabled = false,
  maxFiles = 10,
  maxFileSize = 50 // 50MB default
}) => {
  const queryClient = useQueryClient();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);
  const [mediaList, setMediaList] = useState<MediaFile[]>(existingMedia);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!entryId) {
        throw new Error('Entry ID is required for upload');
      }
      return mediaAPI.uploadFiles(entryId, files);
    },
    onSuccess: (data) => {
      const newMedia = [...mediaList, ...data.data.files];
      setMediaList(newMedia);
      onMediaChange?.(newMedia);
      setUploadingFiles([]);
      if (entryId) {
        queryClient.invalidateQueries({ queryKey: ['entry', entryId] });
        queryClient.invalidateQueries({ queryKey: ['entries'] });
      }
    },
    onError: (error: any) => {
      console.error('Upload failed:', error);
      setUploadingFiles([]);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (fileId: number) => mediaAPI.deleteFile(fileId),
    onSuccess: (_, fileId) => {
      const updatedMedia = mediaList.filter(file => file.id !== fileId);
      setMediaList(updatedMedia);
      onMediaChange?.(updatedMedia);
      if (entryId) {
        queryClient.invalidateQueries({ queryKey: ['entry', entryId] });
        queryClient.invalidateQueries({ queryKey: ['entries'] });
      }
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (disabled) return;

    // Check file count limit
    if (mediaList.length + acceptedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Check file size
    const oversizedFiles = acceptedFiles.filter(file => file.size > maxFileSize * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert(`Files must be smaller than ${maxFileSize}MB`);
      return;
    }

    // If we have an entryId, upload immediately
    if (entryId) {
      setUploadingFiles(acceptedFiles.map(file => ({ file, progress: 0 })));
      uploadMutation.mutate(acceptedFiles);
    } else {
      // If no entryId, just add to preview list (for entry creation)
      const newFiles: MediaFile[] = acceptedFiles.map((file, index) => ({
        id: Date.now() + index, // Temporary ID
        fileName: file.name,
        originalName: file.name,
        fileType: file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('video/') ? 'video' : 'document',
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        url: URL.createObjectURL(file)
      }));
      const updatedMedia = [...mediaList, ...newFiles];
      setMediaList(updatedMedia);
      onMediaChange?.(updatedMedia);
    }
  }, [mediaList, maxFiles, maxFileSize, disabled, entryId, uploadMutation, onMediaChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov', '.avi'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md'],
    },
    disabled,
  });

  const handleDelete = (file: MediaFile) => {
    if (entryId && file.id && file.id > 0) {
      // Real uploaded file
      deleteMutation.mutate(file.id);
    } else {
      // Preview file (not yet uploaded)
      const updatedMedia = mediaList.filter(f => f !== file);
      setMediaList(updatedMedia);
      onMediaChange?.(updatedMedia);
      // Clean up object URL if it exists
      if (file.url.startsWith('blob:')) {
        URL.revokeObjectURL(file.url);
      }
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <ImageIcon />;
      case 'video':
        return <VideoIcon />;
      default:
        return <DocumentIcon />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      {/* Upload Area */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'center',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: disabled ? 'grey.300' : 'primary.main',
            backgroundColor: disabled ? 'background.paper' : 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop files here' : 'Upload Media Files'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Drag & drop files here, or click to select files
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Supports: Images, Videos, PDFs, Text files (Max {maxFileSize}MB per file)
        </Typography>
      </Paper>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Uploading files...
          </Typography>
          {uploadingFiles.map((uploadFile, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Typography variant="body2">{uploadFile.file.name}</Typography>
              <LinearProgress />
            </Box>
          ))}
        </Box>
      )}

      {/* Error Alert */}
      {uploadMutation.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Upload failed: {uploadMutation.error.message}
        </Alert>
      )}

      {/* Media Gallery */}
      {mediaList.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Media Files ({mediaList.length})
          </Typography>
          <Box
            display="grid"
            gridTemplateColumns={{
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            }}
            gap={2}
          >
            {mediaList.map((file, index) => (
              <Card key={file.id || index}>
                  {file.fileType === 'image' ? (
                    <CardMedia
                      component="img"
                      height="140"
                      image={file.url}
                      alt={file.originalName}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setPreviewMedia(file)}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 140,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'grey.100',
                        cursor: 'pointer',
                      }}
                      onClick={() => setPreviewMedia(file)}
                    >
                      {getFileIcon(file.fileType)}
                    </Box>
                  )}
                  <CardContent sx={{ p: 1 }}>
                    <Typography variant="body2" noWrap title={file.originalName}>
                      {file.originalName}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Chip
                        label={file.fileType}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(file.fileSize)}
                      </Typography>
                    </Box>
                  </CardContent>
                  <CardActions sx={{ p: 1, pt: 0 }}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(file)}
                      disabled={deleteMutation.isPending}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {/* Media Preview Dialog */}
        <Dialog
        open={!!previewMedia}
        onClose={() => setPreviewMedia(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{previewMedia?.originalName}</Typography>
            <IconButton onClick={() => setPreviewMedia(null)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {previewMedia && (
            <Box textAlign="center">
              {previewMedia.fileType === 'image' ? (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.originalName}
                  style={{ maxWidth: '100%', maxHeight: '70vh' }}
                />
              ) : previewMedia.fileType === 'video' ? (
                <video
                  controls
                  style={{ maxWidth: '100%', maxHeight: '70vh' }}
                >
                  <source src={previewMedia.url} type={previewMedia.mimeType} />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <Box>
                  <Typography variant="h4" sx={{ mb: 2 }}>
                    {getFileIcon(previewMedia.fileType)}
                  </Typography>
                  <Typography variant="body1">
                    {previewMedia.originalName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatFileSize(previewMedia.fileSize)}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewMedia(null)}>Close</Button>
          {previewMedia && (
            <Button
              variant="outlined"
              href={previewMedia.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Original
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MediaUpload;
