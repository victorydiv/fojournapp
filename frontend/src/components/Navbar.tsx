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
} from '@mui/material';
import {
  Map as MapIcon,
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  AccountCircle,
  CalendarMonth as CalendarIcon,
  Hiking as JourneysIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  const handleProfile = () => {
    navigate('/profile');
    handleClose();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Travel Log
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            color="inherit"
            startIcon={<CalendarIcon />}
            onClick={() => navigate('/calendar')}
          >
            Calendar
          </Button>
          
          <Button
            color="inherit"
            startIcon={<DashboardIcon />}
            onClick={() => navigate('/dashboard')}
          >
            Memories
          </Button>
          
          <Button
            color="inherit"
            startIcon={<MapIcon />}
            onClick={() => navigate('/map')}
          >
            Map
          </Button>
          
          <Button
            color="inherit"
            startIcon={<SearchIcon />}
            onClick={() => navigate('/search')}
          >
            Search
          </Button>
          
          <Button
            color="inherit"
            startIcon={<JourneysIcon />}
            onClick={() => navigate('/journeys')}
          >
            Journeys
          </Button>

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
          
          {/* Fojourn Icon */}
          <Box sx={{ ml: 2 }}>
            <img 
              src="/fojourn-icon.png" 
              alt="Fojourn" 
              style={{ 
                width: 40, 
                height: 40,
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }} 
            />
          </Box>
          
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
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;


