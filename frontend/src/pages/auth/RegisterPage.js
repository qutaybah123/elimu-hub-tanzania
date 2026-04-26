import React, { useState } from 'react';
import { Box, Button, Container, TextField, Typography, Alert, Link, MenuItem, Select, InputLabel, FormControl, Grid } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const grades = ['Standard 1','Standard 2','Standard 3','Standard 4','Standard 5','Standard 6','Standard 7','Form 1','Form 2','Form 3','Form 4','Form 5','Form 6'];

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'student', grade: '', schoolId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try { await register(form); navigate('/dashboard'); }
    catch (err) { setError(err.message || 'Registration failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg,#022c22 0%,#064e3b 100%)' }}>
      <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', py: 6 }}>
        <Box sx={{ width: '100%', bgcolor: 'white', borderRadius: 4, p: { xs: 3, md: 5 }, boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
          <Box textAlign="center" mb={4}>
            <Box sx={{ width: 54, height: 54, borderRadius: 3, background: 'linear-gradient(135deg,#059669,#34d399)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, mb: 2, boxShadow: '0 8px 20px rgba(5,150,105,0.35)' }}>📚</Box>
            <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Sora", sans-serif', mb: 0.5 }}>Fungua Akaunti</Typography>
            <Typography variant="body2" color="text.secondary">Jiunge na Elimu Hub Tanzania — bila malipo</Typography>
          </Box>
          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label="Jina Kamili (Full Name)" name="fullName" value={form.fullName} onChange={handleChange} required margin="normal" />
            <TextField fullWidth label="Email" name="email" type="email" value={form.email} onChange={handleChange} required margin="normal" />
            <TextField fullWidth label="Nywila (min. 6 chars)" name="password" type="password" value={form.password} onChange={handleChange} required margin="normal" />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Wewe ni nani?</InputLabel>
                  <Select name="role" value={form.role} label="Wewe ni nani?" onChange={handleChange}>
                    <MenuItem value="student">🎒 Mwanafunzi</MenuItem>
                    <MenuItem value="teacher">👩‍🏫 Mwalimu</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {form.role === 'student' && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Darasa / Form</InputLabel>
                    <Select name="grade" value={form.grade} label="Darasa / Form" onChange={handleChange}>
                      {grades.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
            <TextField fullWidth label="School ID (hiari)" name="schoolId" value={form.schoolId} onChange={handleChange} margin="normal" />
            <Button fullWidth variant="contained" type="submit" size="large" disabled={loading} sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1rem' }}>
              {loading ? 'Inasajili...' : 'Fungua Akaunti →'}
            </Button>
          </Box>
          <Box sx={{ textAlign: 'center', pt: 1, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <Typography variant="body2" color="text.secondary">
              Una akaunti tayari?{' '}
              <Link component={RouterLink} to="/login" sx={{ color: '#059669', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                Ingia hapa
              </Link>
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default RegisterPage;
