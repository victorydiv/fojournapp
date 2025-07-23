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
  LocationOn as LocationIcon,
  DateRange as DateIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaAPI } from '../services/api';
import { MediaFile } from '../types';
import { extractExifData, calculateDistance, shouldUpdateLocation, shouldPromptDateCorrection, ExifData } from '../utils/exifUtils';

interface MediaUploadProps {
  entryId?: number;
  existingMedia?: MediaFile[];
  onMediaChange?: (media: MediaFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  // EXIF data props
  currentLocation?: { latitude: number; longitude: number };
  currentDate?: Date;
  onLocationCorrection?: (location: { latitude: number; longitude: number; locationName?: string }) => void;
  onDateCorrection?: (date: Date) => void;
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
  maxFileSize = 50, // 50MB default
  currentLocation,
  currentDate,
  onLocationCorrection,
  onDateCorrection,
}) => {
  const queryClient = useQueryClient();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);
  const [mediaList, setMediaList] = useState<MediaFile[]>(existingMedia);
  
  // EXIF dialog states
  const [locationCorrectionData, setLocationCorrectionData] = useState<{
    exifData: ExifData;
    file: File;
    distance: number;
  } | null>(null);
  const [dateCorrectionData, setDateCorrectionData] = useState<{
    exifData: ExifData;
    file: File;
  } | null>(null);

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

  const processFileExif = async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    try {
      const exifData = await extractExifData(file);
      
      // Only process if we have EXIF data and callbacks are available
      if (!exifData.latitude || !exifData.longitude || !onLocationCorrection) {
        // No EXIF GPS data or no callback - do nothing, let normal pin selection work
        return;
      }

      // Check if we have a current location set (user has selected a pin or has existing location)
      if (currentLocation && (currentLocation.latitude !== 0 || currentLocation.longitude !== 0)) {
        // Compare EXIF location with current entry location
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          exifData.latitude,
          exifData.longitude
        );

        if (distance > 1) {
          // Significant difference - prompt user for location correction
          setLocationCorrectionData({ exifData, file, distance });
        } else if (distance > 0.1) {
          // Small difference - auto-correct location
          onLocationCorrection({
            latitude: exifData.latitude,
            longitude: exifData.longitude
          });
        }
        // If distance <= 0.1 miles, locations are very close, no action needed
      } else {
        // No current location set (user hasn't selected a pin yet)
        // Auto-suggest the EXIF location as the initial location
        onLocationCorrection({
          latitude: exifData.latitude,
          longitude: exifData.longitude
        });
      }

      // Check date correction only if we have EXIF date data
      if (exifData.dateTime && currentDate && onDateCorrection) {
        if (shouldPromptDateCorrection(currentDate, exifData.dateTime)) {
          setDateCorrectionData({ exifData, file });
        }
      }
    } catch (error) {
      console.warn('Failed to extract EXIF data:', error);
      // If EXIF extraction fails, do nothing - let normal workflow continue
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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

    // Process EXIF data for images
    for (const file of acceptedFiles) {
      await processFileExif(file);
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
  }, [mediaList, maxFiles, maxFileSize, disabled, entryId, uploadMutation, onMediaChange, currentLocation, currentDate, onLocationCorrection, onDateCorrection]);

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

      {/* Location Correction Dialog */}
      <Dialog
        open={!!locationCorrectionData}
        onClose={() => setLocationCorrectionData(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <LocationIcon color="warning" />
            <Typography variant="h6">Location Correction Detected</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {locationCorrectionData && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  This photo was taken {locationCorrectionData.distance.toFixed(2)} miles away from your current entry location.
                  Would you like to update the entry location based on the photo's GPS data?
                </Typography>
              </Alert>
              
              <Typography variant="subtitle2" gutterBottom>
                Current Entry Location:
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {currentLocation?.latitude.toFixed(6)}, {currentLocation?.longitude.toFixed(6)}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                Photo GPS Location:
              </Typography>
              <Typography variant="body2">
                {locationCorrectionData.exifData.latitude?.toFixed(6)}, {locationCorrectionData.exifData.longitude?.toFixed(6)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocationCorrectionData(null)}>
            Keep Current Location
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (locationCorrectionData && onLocationCorrection) {
                onLocationCorrection({
                  latitude: locationCorrectionData.exifData.latitude!,
                  longitude: locationCorrectionData.exifData.longitude!
                });
              }
              setLocationCorrectionData(null);
            }}
          >
            Update to Photo Location
          </Button>
        </DialogActions>
      </Dialog>

      {/* Date Correction Dialog */}
      <Dialog
        open={!!dateCorrectionData}
        onClose={() => setDateCorrectionData(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DateIcon color="warning" />
            <Typography variant="h6">Date Correction Suggested</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {dateCorrectionData && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  This photo's timestamp differs from your current entry date.
                  Would you like to update the entry date?
                </Typography>
              </Alert>
              
              <Typography variant="subtitle2" gutterBottom>
                Current Entry Date:
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {currentDate?.toLocaleDateString()} {currentDate?.toLocaleTimeString()}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                Photo Date:
              </Typography>
              <Typography variant="body2">
                {dateCorrectionData.exifData.dateTime?.toLocaleDateString()} {dateCorrectionData.exifData.dateTime?.toLocaleTimeString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDateCorrectionData(null)}>
            Keep Current Date
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (dateCorrectionData && onDateCorrection) {
                onDateCorrection(dateCorrectionData.exifData.dateTime!);
              }
              setDateCorrectionData(null);
            }}
          >
            Update to Photo Date
          </Button>
        </DialogActions>
      </Dialog>

      {/* Location Correction Dialog */}
      <Dialog
        open={!!locationCorrectionData}
        onClose={() => setLocationCorrectionData(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <LocationIcon color="warning" />
            Location Correction Suggested
          </Box>
        </DialogTitle>
        <DialogContent>
          {locationCorrectionData && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                The photo's GPS location differs from your entry location by{' '}
                {locationCorrectionData.distance.toFixed(2)} miles.
              </Alert>
              
              <Typography variant="h6" gutterBottom>
                Current Entry Location:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Latitude: {currentLocation?.latitude}, Longitude: {currentLocation?.longitude}
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                Photo GPS Location:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Latitude: {locationCorrectionData.exifData.latitude}, Longitude: {locationCorrectionData.exifData.longitude}
              </Typography>
              
              <Typography variant="body1">
                Would you like to update the entry location to match the photo's GPS coordinates?
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocationCorrectionData(null)}>
            Keep Current Location
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (locationCorrectionData && onLocationCorrection) {
                onLocationCorrection({
                  latitude: locationCorrectionData.exifData.latitude!,
                  longitude: locationCorrectionData.exifData.longitude!
                });
              }
              setLocationCorrectionData(null);
            }}
            startIcon={<LocationIcon />}
          >
            Update Location
          </Button>
        </DialogActions>
      </Dialog>

      {/* Date Correction Dialog */}
      <Dialog
        open={!!dateCorrectionData}
        onClose={() => setDateCorrectionData(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DateIcon color="warning" />
            Date Correction Suggested
          </Box>
        </DialogTitle>
        <DialogContent>
          {dateCorrectionData && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                The photo was taken on a different date than your entry date.
              </Alert>
              
              <Typography variant="h6" gutterBottom>
                Current Entry Date:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {currentDate?.toLocaleDateString()}
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                Photo Date:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {dateCorrectionData.exifData.dateTime?.toLocaleDateString()}
              </Typography>
              
              <Typography variant="body1">
                Would you like to update the entry date to match when the photo was taken?
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDateCorrectionData(null)}>
            Keep Current Date
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (dateCorrectionData && onDateCorrection) {
                onDateCorrection(dateCorrectionData.exifData.dateTime!);
              }
              setDateCorrectionData(null);
            }}
            startIcon={<DateIcon />}
          >
            Update Date
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MediaUpload;
