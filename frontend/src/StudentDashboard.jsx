import React, { useState, useEffect } from 'react';
import { Grid, Typography, Box, Card, CardContent, CardActionArea, Button, LinearProgress, Chip, Avatar, List, ListItem, ListItemText, ListItemAvatar, Divider, Skeleton } from '@mui/material';
import { School as SchoolIcon, Assignment as AssignmentIcon, TrendingUp as TrendingUpIcon, Quiz as QuizIcon, AccessTime as AccessTimeIcon, ArrowForward, Whatshot } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from './services/api';
import { useAuth } from './contexts/AuthContext';

const StatCard = ({ icon, label, value, color, suffix = '' }) => (
  <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}08 0%, ${color}15 100%)`, border: `1.5px solid ${color}25` }}>
    <CardContent sx={{ p: '20px !important' }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="h3" fontWeight={800} sx={{ color, fontFamily: '"Sora",sans-serif', lineHeight: 1 }}>
            {value}{suffix}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={500} mt={0.5}>{label}</Typography>
        </Box>
        <Avatar sx={{ bgcolor: color + '20', color, width: 44, height: 44 }}>{icon}</Avatar>
      </Box>
    </CardContent>
  </Card>
);

const subjects = [
  { id: 1, name: 'Hisabati', emoji: '∑', color: '#EF4444', bg: '#FEF2F2' },
  { id: 2, name: 'Kiswahili', emoji: '🗣', color: '#06B6D4', bg: '#ECFEFF' },
  { id: 3, name: 'English', emoji: 'A', color: '#F59E0B', bg: '#FFFBEB' },
  { id: 4, name: 'Sayansi', emoji: '🔬', color: '#059669', bg: '#ECFDF5' },
  { id: 5, name: 'Jiografia', emoji: '🌍', color: '#3B82F6', bg: '#EFF6FF' },
  { id: 6, name: 'Historia', emoji: '📜', color: '#8B5CF6', bg: '#F5F3FF' },
];

export default function StudentDashboard() {
  const [stats, setStats] = useState({ totalSubjects: 0, completedExams: 0, averageScore: 0, streak: 0 });
  const [recentExams, setRecentExams] = useState([]);
  const [recommendedQuizzes, setRecommendedQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [s, e, q] = await Promise.all([api.get('/progress/stats'), api.get('/progress/recent-exams'), api.get('/quizzes/recommended')]);
        // APIs return { success: true, data: ... } — extract the inner data
        const statsData = s.data?.data || s.data || {};
        const examsData = e.data?.data || e.data || [];
        const quizzesData = q.data?.data || q.data || [];
        setStats({ totalSubjects: 0, completedExams: 0, averageScore: 0, streak: 0, ...statsData });
        setRecentExams(Array.isArray(examsData) ? examsData : []);
        setRecommendedQuizzes(Array.isArray(quizzesData) ? quizzesData : []);
      } catch {
        // stats stay at defaults — dashboard still renders with zeros
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <Box sx={{ p: 4 }}>
      <Grid container spacing={3}>
        {[0,1,2,3].map(i => <Grid item xs={6} md={3} key={i}><Skeleton variant="rounded" height={100} sx={{ borderRadius: 3 }} /></Grid>)}
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Welcome Banner */}
      <Box sx={{
        background: 'linear-gradient(135deg, #022c22 0%, #065f46 100%)',
        borderRadius: 3, p: { xs: 3, md: 4 }, mb: 4, color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', filter: 'blur(30px)' }} />
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} sx={{ position: 'relative' }}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Sora",sans-serif', mb: 0.5 }}>
              Karibu, {user?.fullName?.split(' ')[0]}! 👋
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
              {recommendedQuizzes.length > 0 ? `Una maswali ${recommendedQuizzes.length} yanayokusubiri leo.` : 'Uko tayari kujifunza leo?'}
            </Typography>
          </Box>
          <Button variant="contained" color="secondary" endIcon={<ArrowForward />} onClick={() => navigate('/subjects')} sx={{ whiteSpace: 'nowrap' }}>
            Angalia Masomo
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2.5} mb={4}>
        <Grid item xs={6} md={3}><StatCard icon={<SchoolIcon />} label="Masomo" value={stats.totalSubjects} color="#059669" /></Grid>
        <Grid item xs={6} md={3}><StatCard icon={<AssignmentIcon />} label="Mitihani" value={stats.completedExams} color="#3B82F6" /></Grid>
        <Grid item xs={6} md={3}><StatCard icon={<TrendingUpIcon />} label="Wastani" value={stats.averageScore} color="#8B5CF6" suffix="%" /></Grid>
        <Grid item xs={6} md={3}><StatCard icon={<Whatshot />} label="Streak" value={stats.streak} color="#F59E0B" suffix=" days" /></Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Quick Access Subjects */}
        <Grid item xs={12}>
          <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>📚 Masomo ya Haraka</Typography>
            <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/subjects')} sx={{ color: '#059669' }}>Yote</Button>
          </Box>
          <Grid container spacing={2}>
            {subjects.map((s) => (
              <Grid item xs={4} sm={2} key={s.id}>
                <CardActionArea onClick={() => navigate(`/subjects/${s.id}`)} sx={{ borderRadius: 3 }}>
                  <Card sx={{ textAlign: 'center', p: 2, bgcolor: s.bg, border: `1.5px solid ${s.color}20`, '&:hover': { bgcolor: s.bg, borderColor: s.color } }}>
                    <Typography variant="h4" mb={0.5}>{s.emoji}</Typography>
                    <Typography variant="caption" fontWeight={700} sx={{ color: s.color, fontSize: '0.72rem' }}>{s.name}</Typography>
                  </Card>
                </CardActionArea>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Quizzes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={700}>🧠 Maswali Yanayopendekezwa</Typography>
                <Chip label={`${recommendedQuizzes.length} quiz`} size="small" sx={{ bgcolor: '#ECFDF5', color: '#059669' }} />
              </Box>
              {recommendedQuizzes.length === 0 ? (
                <Box textAlign="center" py={3}>
                  <Typography variant="body2" color="text.secondary">Hakuna maswali mapya kwa sasa.</Typography>
                  <Button size="small" onClick={() => navigate('/exams')} sx={{ mt: 1, color: '#059669' }}>Angalia Past Papers</Button>
                </Box>
              ) : (
                <List disablePadding>
                  {recommendedQuizzes.slice(0, 4).map((quiz, i) => (
                    <React.Fragment key={quiz.id}>
                      <ListItem disablePadding sx={{ py: 1.2 }} secondaryAction={
                        <Button variant="contained" size="small" onClick={() => navigate(`/quiz/${quiz.id}`)} sx={{ fontSize: '0.75rem' }}>Start</Button>
                      }>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: '#059669', width: 34, height: 34, fontSize: '0.8rem', fontWeight: 700 }}>{i + 1}</Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600}>{quiz.title}</Typography>}
                          secondary={
                            <Box display="flex" alignItems="center" gap={0.8} mt={0.3}>
                              <Typography variant="caption" color="text.secondary">{quiz.subject_name}</Typography>
                              <Chip size="small" label={quiz.difficulty} sx={{ height: 16, fontSize: '0.65rem' }}
                                color={quiz.difficulty === 'easy' ? 'success' : quiz.difficulty === 'medium' ? 'warning' : 'error'} />
                            </Box>
                          }
                        />
                      </ListItem>
                      {i < Math.min(recommendedQuizzes.length, 4) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Exams */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={700}>📋 Mitihani ya Hivi Karibuni</Typography>
                <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/exams')} sx={{ color: '#059669', fontSize: '0.75rem' }}>Yote</Button>
              </Box>
              {recentExams.length === 0 ? (
                <Box textAlign="center" py={3}>
                  <Typography variant="body2" color="text.secondary">Bado hujafanya mitihani yoyote.</Typography>
                  <Button size="small" onClick={() => navigate('/exams')} sx={{ mt: 1, color: '#059669' }}>Angalia Past Papers</Button>
                </Box>
              ) : (
                <List disablePadding>
                  {recentExams.slice(0, 4).map((exam, i) => (
                    <React.Fragment key={exam.id}>
                      <ListItem disablePadding sx={{ py: 1.2 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: exam.score >= 50 ? '#ECFDF5' : '#FEF2F2', color: exam.score >= 50 ? '#059669' : '#EF4444', width: 40, height: 40, fontSize: '0.8rem', fontWeight: 800 }}>
                            {exam.score}%
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600}>{exam.exam_title}</Typography>}
                          secondary={
                            <Box display="flex" alignItems="center" gap={1} mt={0.3}>
                              <Typography variant="caption" color="text.secondary">{exam.subject_name}</Typography>
                              <Box sx={{ height: 6, flex: 1, bgcolor: '#F1F5F9', borderRadius: 3, overflow: 'hidden', maxWidth: 80 }}>
                                <Box sx={{ height: '100%', width: `${exam.score}%`, bgcolor: exam.score >= 50 ? '#059669' : '#EF4444', borderRadius: 3 }} />
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      {i < Math.min(recentExams.length, 4) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
