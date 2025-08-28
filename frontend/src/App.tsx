import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { AuthProvider, useAuth } from './context/AuthContext';
import { fojournTheme } from './theme/fojournTheme';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import EntryDetail from './pages/EntryDetail';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Calendar from './pages/Calendar';
import Journeys from './pages/Journeys';
import Dreams from './pages/Dreams';
import PublicProfile from './pages/PublicProfile';
import PublicMemoryView from './pages/PublicMemoryView';
import AdminPanel from './pages/AdminPanel';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Navbar from './components/Navbar';
import Loading from './components/Loading';
import AdminRoute from './components/AdminRoute';
import AppTour from './components/AppTour';
import { useTour } from './hooks/useTour';
import './App.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// App Routes Component
const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { showTour, closeTour, completeTour, startTour } = useTour();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="App">
      {isAuthenticated && <Navbar onStartTour={startTour} />}
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} 
        />
        <Route 
          path="/forgot-password" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} 
        />
        <Route 
          path="/reset-password/:token" 
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ResetPassword />} 
        />
        
        {/* Public profile routes (no authentication required) */}
        <Route path="/u/:username" element={<PublicProfile />} />
        <Route path="/u/:username/memory/:slug" element={<PublicMemoryView />} />
        
        {/* Protected routes */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <Calendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <MapView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/entry/:id"
          element={
            <ProtectedRoute>
              <EntryDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          }
        />
        <Route
          path="/journeys"
          element={
            <ProtectedRoute>
              <Journeys />
            </ProtectedRoute>
          }
        />
        <Route
          path="/journeys/:id"
          element={
            <ProtectedRoute>
              <Journeys />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dreams"
          element={
            <ProtectedRoute>
              <Dreams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />
        
        {/* Default redirect */}
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? "/home" : "/landing"} replace />}
        />
        
        {/* Landing page for non-authenticated users */}
        <Route 
          path="/landing" 
          element={isAuthenticated ? <Navigate to="/home" replace /> : <LandingPage />} 
        />
        
        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* App Tour for authenticated users */}
      {isAuthenticated && (
        <AppTour
          open={showTour}
          onClose={closeTour}
          onComplete={completeTour}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={fojournTheme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <CssBaseline />
          <AuthProvider>
            <Router>
              <AppRoutes />
            </Router>
          </AuthProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;


