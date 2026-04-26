import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardActionArea, CardContent, Chip, CircularProgress,
  Container, Grid, TextField, Typography, InputAdornment, Avatar,
} from '@mui/material';
import { Search, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const COLORS = [
  '#E53935','#8E24AA','#1E88E5','#43A047',
  '#00ACC1','#6D4C41','#2E7D32','#F4511E','#3949AB','#F59E0B',
];

export default function SubjectsPage() {
  const [subjects,  setSubjects]  = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/subjects').then((r) => {
      const data = r.data?.data || [];
      setSubjects(data);
      setFiltered(data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      subjects.filter((s) =>
        s.name?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      )
    );
  }, [search, subjects]);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
      <CircularProgress sx={{ color: '#059669' }} />
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 } }}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Sora",sans-serif', mb: 0.5 }}>
          📚 Masomo / Subjects
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Chagua somo lako na uanze kujifunza
        </Typography>
      </Box>

      <TextField
        fullWidth
        placeholder="Tafuta somo... (e.g. Hisabati, English, Sayansi)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 4, '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'white' } }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94A3B8' }} /></InputAdornment>,
        }}
      />

      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography fontSize={48} mb={2}>🔍</Typography>
          <Typography variant="h6" fontWeight={700} mb={1}>Hakuna masomo yaliyopatikana</Typography>
          <Typography color="text.secondary">Jaribu kutafuta tofauti.</Typography>
        </Box>
      ) : (
        <Grid container spacing={{ xs: 1.5, sm: 2.5 }}>
          {filtered.map((subject, idx) => {
            const color = subject.color_hex || COLORS[idx % COLORS.length];
            const initial = subject.name?.[0]?.toUpperCase() || '?';
            return (
              <Grid item xs={6} sm={4} md={3} key={subject.id}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%', border: `1.5px solid ${color}20`,
                    transition: 'all 0.25s ease',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 16px 36px ${color}22`, borderColor: color + '60' },
                  }}
                >
                  <CardActionArea onClick={() => navigate(`/subjects/${subject.id}`)} sx={{ height: '100%', p: 0 }}>
                    <Box sx={{ height: 5, bgcolor: color }} />
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                        <Avatar sx={{ width: 40, height: 40, bgcolor: color + '20', color, fontWeight: 800, fontSize: '1.1rem' }}>
                          {initial}
                        </Avatar>
                        <Chip
                          label={subject.grade_level || subject.code}
                          size="small"
                          sx={{ bgcolor: color + '12', color, fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                        />
                      </Box>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3, mb: 0.5, color: '#0F172A', fontFamily: '"Sora",sans-serif' }}>
                        {subject.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden', lineHeight: 1.5, mb: 1.5,
                      }}>
                        {subject.description || 'Gundua masomo na vifaa vya kujifunzia.'}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={0.5} sx={{ color, mt: 'auto' }}>
                        <Typography variant="caption" fontWeight={700} sx={{ color }}>Angalia</Typography>
                        <ArrowForward sx={{ fontSize: 13, color }} />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}
