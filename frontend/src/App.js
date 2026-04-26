import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('React Error Boundary caught:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', fontFamily:'sans-serif', gap:16 }}>
          <div style={{ fontSize:48 }}>⚠️</div>
          <h2 style={{ color:'#0F172A', margin:0 }}>Hitilafu imetokea</h2>
          <p style={{ color:'#64748B', margin:0 }}>Tafadhali reload ukurasa au jaribu tena.</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ background:'#059669', color:'white', border:'none', borderRadius:8, padding:'10px 24px', fontSize:15, cursor:'pointer' }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { LoadingProvider } from './contexts/LoadingContext';
import Layout from './components/layout/Layout';

import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SubjectsPage from './pages/subjects/SubjectsPage';
import SubjectDetailPage from './pages/subjects/SubjectDetailPage';
import ExamsPage from './pages/exams/ExamsPage';
import QuizPage from './pages/quiz/QuizPage';
import QuizzesPage from './pages/quiz/QuizzesPage';
import ProgressPage from './pages/progress/ProgressPage';
import ResourcesPage from './pages/resources/ResourcesPage';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ProfilePage from './pages/profile/ProfilePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AIPage from './pages/ai/AIPage';

const theme = createTheme({
  palette: {
    primary: { main: '#059669', light: '#34d399', dark: '#047857' },
    secondary: { main: '#F59E0B', light: '#FCD34D', dark: '#D97706' },
    background: { default: '#F8FAFC', paper: '#ffffff' },
    text: { primary: '#0F172A', secondary: '#475569' },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Helvetica Neue", Arial, sans-serif',
    h1: { fontFamily: '"Sora", sans-serif', fontWeight: 800 },
    h2: { fontFamily: '"Sora", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Sora", sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Sora", sans-serif', fontWeight: 700 },
    h5: { fontFamily: '"Sora", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Sora", sans-serif', fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0.3 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, padding: '10px 22px', fontSize: '0.9rem', transition: 'all 0.2s ease' },
        containedPrimary: {
          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          boxShadow: '0 4px 14px rgba(5,150,105,0.35)',
          '&:hover': { boxShadow: '0 6px 20px rgba(5,150,105,0.5)', transform: 'translateY(-1px)' },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
          '&:hover': { boxShadow: '0 6px 20px rgba(245,158,11,0.5)', transform: 'translateY(-1px)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { borderRadius: 16 } } },
    MuiTextField: { styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600, fontSize: '0.75rem' } } },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LoadingProvider>
        <AuthProvider>
          <ErrorBoundary>
          <Router>
            <Routes>
              <Route path="/" element={<Layout><HomePage /></Layout>} />
              <Route path="/login" element={<Layout><LoginPage /></Layout>} />
              <Route path="/register" element={<Layout><RegisterPage /></Layout>} />
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><Layout><DashboardPage /></Layout></ProtectedRoute>} />
              <Route path="/subjects" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><Layout><SubjectsPage /></Layout></ProtectedRoute>} />
              <Route path="/subjects/:id" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><Layout><SubjectDetailPage /></Layout></ProtectedRoute>} />
              <Route path="/exams" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><Layout><ExamsPage /></Layout></ProtectedRoute>} />
              <Route path="/quizzes" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><Layout><QuizzesPage /></Layout></ProtectedRoute>} />
              <Route path="/quiz/:id" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><Layout><QuizPage /></Layout></ProtectedRoute>} />
              <Route path="/progress" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><Layout><ProgressPage /></Layout></ProtectedRoute>} />
              <Route path="/resources" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><Layout><ResourcesPage /></Layout></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><Layout><ProfilePage /></Layout></ProtectedRoute>} />
              <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher','admin']}><Layout><TeacherDashboard /></Layout></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
              <Route path="/ai" element={<ProtectedRoute allowedRoles={['student','teacher','admin']}><Layout><AIPage /></Layout></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
          </ErrorBoundary>
          <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover />
        </AuthProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
