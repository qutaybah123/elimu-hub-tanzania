import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Container,
  FormControl, Grid, InputAdornment, InputLabel, MenuItem, Select,
  TextField, Typography, Avatar,
} from '@mui/material';
import { Search, Timer, Quiz as QuizIcon, PlayArrow } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const diffColors = { easy: '#059669', medium: '#F59E0B', hard: '#EF4444' };
const diffBg    = { easy: '#ECFDF5', medium: '#FFFBEB', hard: '#FEF2F2' };

const QuizzesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [difficulty, setDifficulty] = useState('');

  useEffect(() => {
    api.get('/subjects').then((r) => setSubjects(r.data?.data || [])).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (subjectId) params.append('subject_id', subjectId);
    if (difficulty) params.append('difficulty', difficulty);
    api.get(`/quizzes?${params}`)
      .then((r) => setQuizzes(r.data?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subjectId, difficulty]);

  const filtered = quizzes.filter((q) =>
    q.title?.toLowerCase().includes(search.toLowerCase()) ||
    q.subject_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Sora",sans-serif', mb: 0.5 }}>
            🧠 Maswali ya Quiz
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Test your knowledge with quizzes across all subjects
          </Typography>
        </Box>
        <Chip
          label={`${filtered.length} quiz${filtered.length !== 1 ? 'zes' : ''} available`}
          sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 700 }}
        />
      </Box>

      {/* Filters */}
      <Box display="flex" gap={2} mb={4} mt={3} flexWrap="wrap">
        <TextField
          placeholder="Search quizzes..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 220 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94A3B8' }} /></InputAdornment> }}
        />
        <FormControl sx={{ minWidth: 170 }}>
          <InputLabel>Subject</InputLabel>
          <Select value={subjectId} label="Subject" onChange={(e) => setSubjectId(e.target.value)}>
            <MenuItem value="">All Subjects</MenuItem>
            {subjects.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Difficulty</InputLabel>
          <Select value={difficulty} label="Difficulty" onChange={(e) => setDifficulty(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="easy">😊 Easy</MenuItem>
            <MenuItem value="medium">🤔 Medium</MenuItem>
            <MenuItem value="hard">😤 Hard</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}><CircularProgress sx={{ color: '#059669' }} /></Box>
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map((quiz) => (
            <Grid item xs={12} sm={6} md={4} key={quiz.id}>
              <Card
                sx={{
                  height: '100%', display: 'flex', flexDirection: 'column',
                  border: '1.5px solid rgba(0,0,0,0.07)',
                  transition: 'all 0.25s ease',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(0,0,0,0.1)', borderColor: diffColors[quiz.difficulty] + '50' },
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                  {/* Top chips */}
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Chip
                      label={quiz.difficulty || 'medium'}
                      size="small"
                      sx={{ bgcolor: diffBg[quiz.difficulty] || '#FFFBEB', color: diffColors[quiz.difficulty] || '#F59E0B', fontWeight: 700, fontSize: '0.72rem' }}
                    />
                    <Chip
                      label={quiz.subject_name || 'General'}
                      size="small" variant="outlined"
                      sx={{ fontSize: '0.72rem', maxWidth: 130, overflow: 'hidden' }}
                    />
                  </Box>

                  {/* Title */}
                  <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.35, mb: 1, fontFamily: '"Sora",sans-serif' }}>
                    {quiz.title}
                  </Typography>
                  {quiz.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.82rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {quiz.description}
                    </Typography>
                  )}

                  {/* Meta */}
                  <Box display="flex" alignItems="center" gap={2} mt="auto">
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <QuizIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {quiz.total_questions || quiz.questions_count || 0} questions
                      </Typography>
                    </Box>
                    {quiz.time_limit && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Timer sx={{ fontSize: 14, color: '#94A3B8' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {quiz.time_limit} min
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>

                {/* Action */}
                <Box sx={{ p: 2, pt: 0 }}>
                  {user?.role === 'student' ? (
                    <Button
                      fullWidth variant="contained" startIcon={<PlayArrow />}
                      onClick={() => navigate(`/quiz/${quiz.id}`)}
                      sx={{
                        background: `linear-gradient(135deg, ${diffColors[quiz.difficulty] || '#059669'}, ${diffColors[quiz.difficulty] || '#047857'})`,
                        fontWeight: 700, borderRadius: 2,
                        boxShadow: `0 4px 12px ${diffColors[quiz.difficulty] || '#059669'}40`,
                        '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 6px 18px ${diffColors[quiz.difficulty] || '#059669'}60` },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Start Quiz
                    </Button>
                  ) : (
                    <Button
                      fullWidth variant="outlined"
                      sx={{ borderColor: '#059669', color: '#059669', fontWeight: 700, borderRadius: 2 }}
                      onClick={() => navigate(`/quiz/${quiz.id}`)}
                    >
                      Preview Quiz
                    </Button>
                  )}
                </Box>
              </Card>
            </Grid>
          ))}

          {filtered.length === 0 && !loading && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 10, bgcolor: 'white', borderRadius: 3, border: '2px dashed rgba(0,0,0,0.08)' }}>
                <Typography fontSize={52} mb={2}>🧠</Typography>
                <Typography variant="h6" fontWeight={700} mb={1} color="text.primary">
                  Hakuna quiz zilizopatikana
                </Typography>
                <Typography color="text.secondary">
                  {search || subjectId || difficulty ? 'Try adjusting your filters.' : 'No quizzes have been published yet.'}
                </Typography>
                {(search || subjectId || difficulty) && (
                  <Button sx={{ mt: 2, color: '#059669' }} onClick={() => { setSearch(''); setSubjectId(''); setDifficulty(''); }}>
                    Clear filters
                  </Button>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      )}
    </Container>
  );
};

export default QuizzesPage;
