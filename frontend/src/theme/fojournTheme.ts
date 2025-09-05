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
      main: '#21a7a0', // Teal accent
      light: '#26437d', // Navy blue
      dark: '#151a38', // Dark navy
    },
    secondary: {
      main: '#26437d', // Navy blue
      light: '#21a7a0', // Teal accent
      dark: '#151a38', // Dark navy
    },
    background: {
      default: '#fffceb', // Light cream background
      paper: '#f4ebe2', // Warm cream for cards/surfaces
    },
    text: {
      primary: '#000000', // Black for primary text
      secondary: '#151a38', // Dark navy for secondary text
    },
    // Custom colors for the palette
    info: {
      main: '#21a7a0', // Teal for info elements
    },
    success: {
      main: '#21a7a0', // Teal for success states
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 900,
      color: '#151a38', // Dark navy for main headings
    },
    h2: {
      fontWeight: 700,
      color: '#151a38', // Dark navy for headings
    },
    h3: {
      fontWeight: 700,
      color: '#26437d', // Navy blue for subheadings
    },
    h4: {
      fontWeight: 600,
      color: '#26437d', // Navy blue for subheadings
    },
    h5: {
      fontWeight: 600,
      color: '#21a7a0', // Teal for smaller headings
    },
    h6: {
      fontWeight: 600,
      color: '#21a7a0', // Teal for smaller headings
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(21, 26, 56, 0.1)',
          background: '#f4ebe2', // Warm cream background
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(21, 26, 56, 0.1)',
          backgroundColor: '#f4ebe2', // Warm cream background
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 20px 40px rgba(21, 26, 56, 0.15)',
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
          backgroundColor: '#21a7a0', // Teal background
          color: '#ffffff',
          boxShadow: '0 4px 15px rgba(33, 167, 160, 0.3)',
          '&:hover': {
            backgroundColor: '#26437d', // Navy blue on hover
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(38, 67, 125, 0.4)',
          },
        },
        outlined: {
          borderWidth: 2,
          borderColor: '#21a7a0', // Teal border
          color: '#21a7a0', // Teal text
          '&:hover': {
            borderWidth: 2,
            borderColor: '#26437d', // Navy border on hover
            color: '#26437d', // Navy text on hover
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
            backgroundColor: '#fffceb', // Light cream background
            transition: 'all 0.3s ease',
            '& fieldset': {
              borderColor: '#21a7a0', // Teal border
            },
            '&:hover fieldset': {
              borderColor: '#26437d', // Navy border on hover
            },
            '&.Mui-focused fieldset': {
              borderColor: '#151a38', // Dark navy border when focused
              boxShadow: '0 0 0 3px rgba(33, 167, 160, 0.1)',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#151a38', // Dark navy label
            '&.Mui-focused': {
              color: '#21a7a0', // Teal when focused
            },
          },
          '& .MuiOutlinedInput-input': {
            color: '#000000', // Black text
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
          backgroundColor: '#21a7a0', // Teal background
          color: 'white',
          '&:hover': {
            backgroundColor: '#26437d', // Navy on hover
          },
        },
        colorSecondary: {
          backgroundColor: '#26437d', // Navy background
          color: 'white',
          '&:hover': {
            backgroundColor: '#151a38', // Dark navy on hover
          },
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
    backgroundColor: '#fffceb', // Light cream background
    minHeight: '100vh',
  },
  secondary: {
    backgroundColor: '#f4ebe2', // Warm cream background
    minHeight: '100vh',
  },
  warm: {
    backgroundColor: '#f4ebe2', // Warm cream background
    minHeight: '100vh',
  },
  paper: {
    backgroundColor: '#f4ebe2', // Warm cream background
    backdropFilter: 'blur(10px)',
    borderRadius: 16,
    boxShadow: '0 10px 30px rgba(21, 26, 56, 0.1)',
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
