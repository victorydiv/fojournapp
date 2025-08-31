import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tooltip,
  CircularProgress,
  Badge,
  Avatar,
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  LocalBar as BreweryIcon,
  Restaurant as RestaurantIcon,
  DirectionsRun as ActivityIcon,
  Pets as PetsIcon,
  Map as MapIcon,
  Schedule as PlannerIcon,
  Camera as CameraIcon,
  Videocam as VideoIcon,
  Person as PersonIcon,
  Create as CreateIcon
} from '@mui/icons-material';
import { badgeAPI, publicAPI } from '../services/api';
import AuthenticatedImage from './AuthenticatedImage';

interface UserBadge {
  id: number;
  name: string;
  description: string;
  icon: string;
  icon_url?: string; // For uploaded badge images
  type: string;
  points: number;
  requirement_value: number;
  criteria: any;
  awarded_at: string;
  progress?: {
    current_count: number;
    target_count: number;
    percentage: number;
  };
}

interface BadgeDisplayProps {
  userId?: number;
  username?: string; // For public mode API calls
  showProgress?: boolean;
  maxDisplay?: number;
  variant?: 'grid' | 'horizontal';
  size?: 'small' | 'medium' | 'large';
  publicMode?: boolean; // New prop for public profile access
}

const BADGE_ICONS: { [key: string]: React.ReactNode } = {
  trophy: <TrophyIcon />,
  star: <StarIcon />,
  brewery: <BreweryIcon />,
  restaurant: <RestaurantIcon />,
  activity: <ActivityIcon />,
  pets: <PetsIcon />,
  map: <MapIcon />,
  schedule: <PlannerIcon />,
  camera: <CameraIcon />,
  videocam: <VideoIcon />,
  person: <PersonIcon />,
  create: <CreateIcon />
};

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  userId,
  username,
  showProgress = false,
  maxDisplay,
  variant = 'grid',
  size = 'medium',
  publicMode = false
}) => {
  const theme = useTheme();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBadges = async () => {
      if (publicMode && !username) {
        setLoading(false);
        return;
      }
      
      if (!publicMode && !userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let response;
        
        if (publicMode && username) {
          // Use public API for public profiles
          response = await publicAPI.getPublicUserBadges(username);
        } else if (userId) {
          // Use authenticated API for private profiles
          response = await badgeAPI.getUserBadges(userId);
        } else {
          setError('Missing required parameters');
          return;
        }
        
        setBadges(response.data.badges);
      } catch (err) {
        setError('Failed to load badges');
        console.error('Badge loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [userId, username, publicMode]);

  const getBadgeIcon = (badge: UserBadge, size: 'small' | 'medium' | 'large' = 'medium') => {
    const iconSize = size === 'small' ? 20 : size === 'large' ? 40 : 24;
    
    // Check if badge has an uploaded icon (icon_url field or icon field contains a path/filename)
    const iconPath = badge.icon_url || badge.icon;
    if (iconPath && (iconPath.includes('/') || iconPath.includes('.png') || iconPath.includes('.jpg') || iconPath.includes('.jpeg') || iconPath.includes('.gif'))) {
      if (publicMode) {
        // For public mode, use the icon_url directly (already contains public path)
        const publicIconUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${iconPath}`;
        
        return (
          <img
            src={publicIconUrl}
            alt={badge.name}
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '50%'
            }}
            onError={(e) => {
              console.log('Public badge icon failed to load for badge:', badge.name);
              // Hide the broken image and fall back to Material-UI icon
              e.currentTarget.style.display = 'none';
            }}
          />
        );
      } else {
        // For authenticated mode, use AuthenticatedImage
        return (
          <AuthenticatedImage
            src={badgeAPI.getBadgeIconUrl(iconPath) || ''}
            alt={badge.name}
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '50%'
            }}
            onError={() => {
              console.log('Badge icon failed to load for badge:', badge.name);
            }}
          />
        );
      }
    }
    
    // Fall back to Material-UI icons
    return BADGE_ICONS[badge.icon] || <StarIcon sx={{ fontSize: iconSize }} />;
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'milestone':
        return theme.palette.primary.main;
      case 'achievement':
        return theme.palette.secondary.main;
      case 'content':
        return theme.palette.success.main;
      case 'social':
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getSizeProps = () => {
    switch (size) {
      case 'small':
        return { width: 40, height: 40, fontSize: '1rem' };
      case 'large':
        return { width: 80, height: 80, fontSize: '2rem' };
      default:
        return { width: 60, height: 60, fontSize: '1.5rem' };
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={100}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" variant="body2" textAlign="center">
        {error}
      </Typography>
    );
  }

  const displayBadges = maxDisplay ? badges.slice(0, maxDisplay) : badges;
  const sizeProps = getSizeProps();

  if (variant === 'horizontal') {
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {displayBadges.map((badge) => (
          <Tooltip
            key={badge.id}
            title={
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">
                  {badge.name}
                </Typography>
                <Typography variant="body2">
                  {badge.description}
                </Typography>
                <Typography variant="caption" color="inherit">
                  Points: {badge.points} • Earned: {new Date(badge.awarded_at).toLocaleDateString()}
                </Typography>
                {badge.progress && showProgress && (
                  <Typography variant="caption" display="block">
                    Progress: {badge.progress.current_count}/{badge.progress.target_count} ({badge.progress.percentage}%)
                  </Typography>
                )}
              </Box>
            }
            arrow
          >
            <Avatar
              sx={{
                ...sizeProps,
                bgcolor: alpha(getBadgeColor(badge.type), 0.1),
                color: getBadgeColor(badge.type),
                border: `2px solid ${getBadgeColor(badge.type)}`,
                cursor: 'pointer',
                '&:hover': {
                  transform: 'scale(1.1)',
                  transition: 'transform 0.2s'
                }
              }}
            >
              {getBadgeIcon(badge, size)}
            </Avatar>
          </Tooltip>
        ))}
        {maxDisplay && badges.length > maxDisplay && (
          <Avatar
            sx={{
              ...sizeProps,
              bgcolor: alpha(theme.palette.grey[500], 0.1),
              color: theme.palette.grey[500]
            }}
          >
            +{badges.length - maxDisplay}
          </Avatar>
        )}
      </Stack>
    );
  }

  return (
    <Box>
      <Grid container spacing={2}>
        {displayBadges.map((badge) => (
          <Grid key={badge.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[4]
                }
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Avatar
                  sx={{
                    ...sizeProps,
                    bgcolor: alpha(getBadgeColor(badge.type), 0.1),
                    color: getBadgeColor(badge.type),
                    border: `2px solid ${getBadgeColor(badge.type)}`,
                    mx: 'auto',
                    mb: 1
                  }}
                >
                  {getBadgeIcon(badge, size)}
                </Avatar>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  {badge.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                  {badge.description}
                </Typography>
                <Typography variant="caption" color="primary" display="block" sx={{ mt: 1 }}>
                  {badge.points} points
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {new Date(badge.awarded_at).toLocaleDateString()}
                </Typography>
                {badge.progress && showProgress && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {badge.progress.current_count}/{badge.progress.target_count}
                    </Typography>
                    <Box
                      sx={{
                        width: '100%',
                        height: 4,
                        bgcolor: alpha(getBadgeColor(badge.type), 0.2),
                        borderRadius: 2,
                        mt: 0.5
                      }}
                    >
                      <Box
                        sx={{
                          width: `${badge.progress.percentage}%`,
                          height: '100%',
                          bgcolor: getBadgeColor(badge.type),
                          borderRadius: 2,
                          transition: 'width 0.3s'
                        }}
                      />
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {badges.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="body2" color="text.secondary">
            No badges earned yet. Start creating memories to unlock achievements!
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BadgeDisplay;
