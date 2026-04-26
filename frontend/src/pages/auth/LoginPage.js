import React, { useState } from 'react';
import { Box, Button, Container, TextField, Typography, Alert, Link } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg,#022c22 0%,#064e3b 100%)' }}>
      <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', py: 6 }}>
        <Box sx={{ width: '100%', bgcolor: 'white', borderRadius: 4, p: { xs: 3, md: 5 }, boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
          <Box textAlign="center" mb={4}>
            <Box sx={{ width: 54, height: 54, borderRadius: 3, background: 'linear-gradient(135deg,#059669,#34d399)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, mb: 2, boxShadow: '0 8px 20px rgba(5,150,105,0.35)' }}>📚</Box>
            <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Sora", sans-serif', mb: 0.5 }}>Karibu Tena!</Typography>
            <Typography variant="body2" color="text.secondary">Ingia kwenye akaunti yako ya Elimu Hub</Typography>
          </Box>
          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label="Email" name="email" type="email" value={form.email} onChange={handleChange} required margin="normal"
              sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: '#059669' }, '&.Mui-focused fieldset': { borderColor: '#059669' } } }} />
            <TextField fullWidth label="Nywila (Password)" name="password" type="password" value={form.password} onChange={handleChange} required margin="normal"
              sx={{ '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: '#059669' }, '&.Mui-focused fieldset': { borderColor: '#059669' } } }} />
            <Button fullWidth variant="contained" type="submit" size="large" disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1rem' }}>
              {loading ? 'Ingia...' : 'Ingia →'}
            </Button>
          </Box>
          <Box sx={{ textAlign: 'center', pt: 1, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <Typography variant="body2" color="text.secondary">
              Huna akaunti?{' '}
              <Link component={RouterLink} to="/register" sx={{ color: '#059669', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                Jisajili hapa
              </Link>
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default LoginPage;
