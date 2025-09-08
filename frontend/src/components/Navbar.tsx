import React from 'react';
import {
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
} from '@mui/material';
import {
  Map as MapIcon,
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  AccountCircle,
  CalendarMonth as CalendarIcon,
  Hiking as JourneysIcon,
  Star as DreamsIcon,
  EmojiEvents as BadgesIcon,
  Article as ArticleIcon,
  ArrowDropDown as ArrowDropDownIcon,
  Home as HomeIcon,
  Menu as MenuIcon,
  ExpandLess,
  ExpandMore,
  Help as HelpIcon,
  AdminPanelSettings as AdminIcon,
  Checklist as ChecklistIcon,
  LibraryBooks as TemplateLibraryIcon,
  Public as PublicIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InvitationNotifications from './InvitationNotifications';

interface NavbarProps {
  onStartTour?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onStartTour }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [memoriesAnchorEl, setMemoriesAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);
  const [memoriesExpanded, setMemoriesExpanded] = React.useState(false);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMemoriesMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMemoriesAnchorEl(event.currentTarget);
  };

  const handleMemoriesClose = () => {
    setMemoriesAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  const handleProfile = () => {
    navigate('/profile');
    handleClose();
    setMobileDrawerOpen(false);
  };

  const handleMobileMenuToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleMobileMenuClose = () => {
    setMobileDrawerOpen(false);
  };

  const handleMobileNavigation = (path: string) => {
    navigate(path);
    setMobileDrawerOpen(false);
    setMemoriesExpanded(false);
  };

  const handleMemoriesToggle = () => {
    setMemoriesExpanded(!memoriesExpanded);
  };

  const getAvatarUrl = () => {
    if (user?.avatarFilename) {
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('token');
      return `${apiBaseUrl}/auth/avatar/${user.avatarFilename}${token ? `?token=${token}` : ''}`;
    }
    return null;
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return user.firstName.charAt(0).toUpperCase() + user.lastName.charAt(0).toUpperCase();
    } else if (user?.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    return '';
  };

  const renderDesktopNav = () => {
    if (!user) {
      // Public navigation for non-logged-in users
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            color="inherit"
            startIcon={<ArticleIcon />}
            onClick={() => navigate('/blog')}
          >
            Blog
          </Button>
          
          <IconButton
            size="large"
            aria-label="account menu"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
          
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={() => { navigate('/login'); handleClose(); }}>Login</MenuItem>
          </Menu>
        </Box>
      );
    }

    // Authenticated user navigation
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          color="inherit"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/home')}
        >
          Home
        </Button>
        
        <Button
          color="inherit"
          startIcon={<DashboardIcon />}
          endIcon={<ArrowDropDownIcon />}
          onClick={handleMemoriesMenu}
        >
          Memories
        </Button>
        
        <Menu
          anchorEl={memoriesAnchorEl}
          open={Boolean(memoriesAnchorEl)}
          onClose={handleMemoriesClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <MenuItem onClick={() => { navigate('/dashboard'); handleMemoriesClose(); }}>
            <DashboardIcon sx={{ mr: 1 }} />
            All Memories
          </MenuItem>
          <MenuItem onClick={() => { navigate('/calendar'); handleMemoriesClose(); }}>
            <CalendarIcon sx={{ mr: 1 }} />
            Calendar View
          </MenuItem>
          <MenuItem onClick={() => { navigate('/map'); handleMemoriesClose(); }}>
            <MapIcon sx={{ mr: 1 }} />
            Map View
          </MenuItem>
          <MenuItem onClick={() => { navigate('/search'); handleMemoriesClose(); }}>
            <SearchIcon sx={{ mr: 1 }} />
            Search Memories
          </MenuItem>
        </Menu>
        
        <Button
          color="inherit"
          startIcon={<JourneysIcon />}
          onClick={() => navigate('/journeys')}
        >
          Journeys
        </Button>
        
        <Button
          color="inherit"
          startIcon={<DreamsIcon />}
          onClick={() => navigate('/dreams')}
        >
          Dreams
        </Button>

        <Button
          color="inherit"
          startIcon={<ArticleIcon />}
          onClick={() => navigate('/blog')}
        >
          Blog
        </Button>

        {user && <InvitationNotifications />}

        {/* Help/Tour button */}
        {onStartTour && user && (
          <IconButton
            size="large"
            aria-label="start app tour"
            onClick={onStartTour}
            color="inherit"
            title="Take App Tour"
          >
            <HelpIcon />
          </IconButton>
        )}

        <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="menu-appbar"
          aria-haspopup="true"
          onClick={handleMenu}
          color="inherit"
        >
          {user?.firstName ? (
            <Avatar 
              src={getAvatarUrl() || undefined}
              sx={{ width: 32, height: 32 }}
            >
              {getUserInitials()}
            </Avatar>
          ) : (
            <AccountCircle />
          )}
        </IconButton>
        
        <Menu
          id="menu-appbar"
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          <MenuItem onClick={handleProfile}>Profile</MenuItem>
          {user?.profilePublic && (
            <MenuItem onClick={() => { 
              const publicUrl = `/u/${user.publicUsername || user.username}`;
              window.open(publicUrl, '_blank');
              handleClose(); 
            }}>
              <PublicIcon sx={{ mr: 1 }} />
              View Public Profile
            </MenuItem>
          )}
          <MenuItem onClick={() => { navigate('/checklists'); handleClose(); }}>
            <ChecklistIcon sx={{ mr: 1 }} />
            Checklists
          </MenuItem>
          <MenuItem onClick={() => { navigate('/templates'); handleClose(); }}>
            <TemplateLibraryIcon sx={{ mr: 1 }} />
            Checklist Library
          </MenuItem>
          <MenuItem onClick={() => { navigate('/badges'); handleClose(); }}>
            <BadgesIcon sx={{ mr: 1 }} />
            Badges
          </MenuItem>
          {user?.isAdmin && (
            <MenuItem onClick={() => { navigate('/admin'); handleClose(); }}>
              Admin Panel
            </MenuItem>
          )}
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </Box>
    );
  };

  const renderMobileDrawer = () => (
    <Drawer
      anchor="top"
      open={mobileDrawerOpen}
      onClose={handleMobileMenuClose}
      sx={{
        '& .MuiDrawer-paper': {
          marginTop: '64px', // Height of AppBar
          width: '100%',
        },
      }}
    >
      <List>
        {!user ? (
          // Public mobile navigation for non-logged-in users
          <>
            <ListItemButton onClick={() => handleMobileNavigation('/blog')}>
              <ListItemIcon>
                <ArticleIcon />
              </ListItemIcon>
              <ListItemText primary="Blog" />
            </ListItemButton>
            
            <Divider />
            
            <ListItemButton onClick={() => handleMobileNavigation('/login')}>
              <ListItemIcon>
                <AccountCircle />
              </ListItemIcon>
              <ListItemText primary="Login" />
            </ListItemButton>
          </>
        ) : (
          // Authenticated user mobile navigation
          <>
            <ListItemButton onClick={() => handleMobileNavigation('/home')}>
              <ListItemIcon>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText primary="Home" />
            </ListItemButton>
            
            <ListItemButton onClick={handleMemoriesToggle}>
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Memories" />
              {memoriesExpanded ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            
            <Collapse in={memoriesExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItemButton 
                  sx={{ pl: 4 }} 
                  onClick={() => handleMobileNavigation('/dashboard')}
                >
                  <ListItemIcon>
                    <DashboardIcon />
                  </ListItemIcon>
                  <ListItemText primary="All Memories" />
                </ListItemButton>
                <ListItemButton 
                  sx={{ pl: 4 }} 
                  onClick={() => handleMobileNavigation('/calendar')}
                >
                  <ListItemIcon>
                    <CalendarIcon />
                  </ListItemIcon>
                  <ListItemText primary="Calendar View" />
                </ListItemButton>
                <ListItemButton 
                  sx={{ pl: 4 }} 
                  onClick={() => handleMobileNavigation('/map')}
                >
                  <ListItemIcon>
                    <MapIcon />
                  </ListItemIcon>
                  <ListItemText primary="Map View" />
                </ListItemButton>
                <ListItemButton 
                  sx={{ pl: 4 }} 
                  onClick={() => handleMobileNavigation('/search')}
                >
                  <ListItemIcon>
                    <SearchIcon />
                  </ListItemIcon>
                  <ListItemText primary="Search Memories" />
                </ListItemButton>
              </List>
            </Collapse>
            
            <ListItemButton onClick={() => handleMobileNavigation('/journeys')}>
              <ListItemIcon>
                <JourneysIcon />
              </ListItemIcon>
              <ListItemText primary="Journeys" />
            </ListItemButton>
            
            <ListItemButton onClick={() => handleMobileNavigation('/dreams')}>
              <ListItemIcon>
                <DreamsIcon />
              </ListItemIcon>
              <ListItemText primary="Dreams" />
            </ListItemButton>

            <ListItemButton onClick={() => handleMobileNavigation('/blog')}>
              <ListItemIcon>
                <ArticleIcon />
              </ListItemIcon>
              <ListItemText primary="Blog" />
            </ListItemButton>

            <Divider />

            <ListItemButton onClick={handleProfile}>
              <ListItemIcon>
                <AccountCircle />
              </ListItemIcon>
              <ListItemText primary="Profile" />
            </ListItemButton>
            
            {user?.profilePublic && (
              <ListItemButton onClick={() => {
                const publicUrl = `/u/${user.publicUsername || user.username}`;
                window.open(publicUrl, '_blank');
                handleMobileMenuClose();
              }}>
                <ListItemIcon>
                  <PublicIcon />
                </ListItemIcon>
                <ListItemText primary="View Public Profile" />
              </ListItemButton>
            )}
            
            <ListItemButton onClick={() => handleMobileNavigation('/checklists')}>
              <ListItemIcon>
                <ChecklistIcon />
              </ListItemIcon>
              <ListItemText primary="Checklists" />
            </ListItemButton>
            
            <ListItemButton onClick={() => handleMobileNavigation('/templates')}>
              <ListItemIcon>
                <TemplateLibraryIcon />
              </ListItemIcon>
              <ListItemText primary="Checklist Library" />
            </ListItemButton>

            {user?.isAdmin && (
              <ListItemButton onClick={() => handleMobileNavigation('/admin')}>
                <ListItemIcon>
                  <AdminIcon />
                </ListItemIcon>
                <ListItemText primary="Admin Panel" />
              </ListItemButton>
            )}

            <ListItemButton onClick={handleLogout}>
              <ListItemIcon>
                <AccountCircle />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </>
        )}
      </List>
    </Drawer>
  );

  return (
    <>
      <AppBar 
        position="static"
        sx={{
          borderRadius: 0,
          backgroundColor: '#f4ebe2',
          '& .MuiButton-root': {
            color: '#151a38',
          },
          '& .MuiIconButton-root': {
            color: '#151a38',
          },
          '& .MuiSvgIcon-root': {
            color: '#151a38',
          },
          '& .MuiTypography-root': {
            color: '#151a38',
          },
        }}
      >
        <Toolbar>
          <Box 
            sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer'
            }}
            onClick={() => navigate(user ? '/home' : '/')}
          >
            <img 
              src="/newlogo_transparent.png" 
              alt="Fojourn - Your memories, beautifully organized" 
              style={{ 
                height: 40,
                width: 'auto',
                maxWidth: 200,
                objectFit: 'contain'
              }} 
            />
          </Box>
          
          {/* Desktop Navigation */}
          {!isMobile && renderDesktopNav()}
          
          {/* Mobile Hamburger Menu */}
          {isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {user && <InvitationNotifications />}
              
              {/* Help/Tour button for mobile */}
              {onStartTour && user && (
                <IconButton
                  size="large"
                  color="inherit"
                  aria-label="start app tour"
                  onClick={onStartTour}
                  title="Take App Tour"
                >
                  <HelpIcon />
                </IconButton>
              )}
              
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={handleMobileMenuToggle}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Mobile Drawer */}
      {isMobile && renderMobileDrawer()}
    </>
  );
};

export default Navbar;


