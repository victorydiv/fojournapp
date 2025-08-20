import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  Link,
  Fade,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { backgroundStyles, componentStyles } from '../theme/fojournTheme';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={backgroundStyles.primary}>
      <Container component="main" maxWidth="sm" sx={componentStyles.pageContainer}>
        <Fade in timeout={1000}>
          <Paper elevation={0} sx={componentStyles.formCard}>
            <Typography component="h1" variant="h3" sx={componentStyles.brandTitle}>
              Fojourn
            </Typography>
            <Typography variant="h6" align="center" color="textSecondary" gutterBottom>
              Welcome back to your journey
            </Typography>

            {error && (
              <Fade in timeout={500}>
                <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                  {error}
                </Alert>
              </Fade>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Username or Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                variant="outlined"
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                variant="outlined"
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ 
                  mt: 3, 
                  mb: 3,
                  py: 1.5,
                  fontSize: '1.1rem',
                }}
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
              
              <Box textAlign="center" sx={{ mt: 2 }}>
                <Link 
                  component={RouterLink} 
                  to="/forgot-password" 
                  variant="body2" 
                  sx={{ 
                    mb: 2, 
                    display: 'block',
                    color: 'primary.main',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Forgot your password?
                </Link>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  Don't have an account?
                </Typography>
                <Link 
                  component={RouterLink} 
                  to="/register" 
                  variant="body1"
                  sx={{
                    color: 'secondary.main',
                    textDecoration: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Create your Fojourn account
                </Link>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default Login;
