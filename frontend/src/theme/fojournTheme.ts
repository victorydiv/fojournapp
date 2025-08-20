import { createTheme } from '@mui/material/styles';
import { keyframes } from '@mui/system';

// Shared animations
export const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

export const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

export const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
`;

export const slideIn = keyframes`
  0% { transform: translateX(-20px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
`;

// Enhanced theme with Fojourn styling
export const fojournTheme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
      light: '#764ba2',
      dark: '#4c63d2',
    },
    secondary: {
      main: '#FF6B6B',
      light: '#FFE66D',
      dark: '#4ECDC4',
    },
    background: {
      default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      paper: 'rgba(255,255,255,0.95)',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 900,
      background: 'linear-gradient(45deg, #FFE66D, #FF6B6B, #4ECDC4)',
      backgroundSize: '400% 400%',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      animation: `${gradientShift} 3s ease infinite`,
    },
    h2: {
      fontWeight: 700,
      color: '#667eea',
    },
    h3: {
      fontWeight: 700,
      color: '#667eea',
    },
    h4: {
      fontWeight: 600,
      color: '#667eea',
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
          transition: 'all 0.3s ease',
        },
        contained: {
          background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #5a6fd8 0%, #6b4190 100%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            background: 'rgba(255,255,255,0.9)',
            transition: 'all 0.3s ease',
            '&:hover': {
              background: 'rgba(255,255,255,0.95)',
            },
            '&.Mui-focused': {
              background: 'rgba(255,255,255,1)',
              boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
        colorPrimary: {
          background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        },
        colorSecondary: {
          background: 'linear-gradient(45deg, #FF6B6B 0%, #FFE66D 100%)',
          color: 'white',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          position: 'relative',
        },
      },
    },
  },
});

// Shared background styles
export const backgroundStyles = {
  primary: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    minHeight: '100vh',
  },
  secondary: {
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    minHeight: '100vh',
  },
  warm: {
    background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)',
    minHeight: '100vh',
  },
  paper: {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: 16,
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
  },
};

// Shared component styles
export const componentStyles = {
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  
  contentCard: {
    ...backgroundStyles.paper,
    padding: 4,
    width: '100%',
    maxWidth: 600,
    margin: 'auto',
  },
  
  formCard: {
    ...backgroundStyles.paper,
    padding: 4,
    width: '100%',
    maxWidth: 500,
    margin: 'auto',
  },
  
  brandTitle: {
    fontWeight: 900,
    background: 'linear-gradient(45deg, #FFE66D, #FF6B6B, #4ECDC4)',
    backgroundSize: '400% 400%',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    animation: `${gradientShift} 3s ease infinite`,
    textAlign: 'center',
    marginBottom: 2,
  },
  
  glassCard: {
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 3,
    transition: 'all 0.3s ease',
    '&:hover': {
      background: 'rgba(255,255,255,0.15)',
      transform: 'translateY(-5px)',
    },
  },
};
