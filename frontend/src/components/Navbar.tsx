import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
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
  ListItem,
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
  ArrowDropDown as ArrowDropDownIcon,
  Home as HomeIcon,
  Menu as MenuIcon,
  ExpandLess,
  ExpandMore,
  Help as HelpIcon,
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

  const renderDesktopNav = () => (
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

      <InvitationNotifications />

      {/* Help/Tour button */}
      {onStartTour && (
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
          <Avatar sx={{ width: 32, height: 32 }}>
            {user.firstName.charAt(0).toUpperCase()}
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
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
      </Menu>
    </Box>
  );

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
        
        <Divider />
        
        {/* Help/Tour option in mobile menu */}
        {onStartTour && (
          <ListItemButton onClick={() => { onStartTour(); handleMobileMenuClose(); }}>
            <ListItemIcon>
              <HelpIcon />
            </ListItemIcon>
            <ListItemText primary="Take App Tour" />
          </ListItemButton>
        )}
        
        <ListItemButton onClick={handleProfile}>
          <ListItemIcon>
            {user?.firstName ? (
              <Avatar sx={{ width: 24, height: 24 }}>
                {user.firstName.charAt(0).toUpperCase()}
              </Avatar>
            ) : (
              <AccountCircle />
            )}
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </ListItemButton>
        
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon>
            <AccountCircle />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Drawer>
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Box 
            sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/home')}
          >
            <img 
              src="/fojourn-logo.png" 
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
              <InvitationNotifications />
              
              {/* Help/Tour button for mobile */}
              {onStartTour && (
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


