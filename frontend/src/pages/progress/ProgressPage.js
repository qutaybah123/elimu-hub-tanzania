import React, { useState, useEffect } from 'react';
import {
  Avatar, Box, Card, CardContent, CircularProgress, Container,
  Grid, LinearProgress, Typography,
} from '@mui/material';
import { TrendingUp, EmojiEvents, LocalFireDepartment, School } from '@mui/icons-material';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../../services/api';

const StatCard = ({ icon, label, value, color }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" gap={2}>
        <Avatar sx={{ bgcolor: color }}>{icon}</Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const ProgressPage = () => {
  const [stats, setStats] = useState(null);
  const [subjectProgress, setSubjectProgress] = useState([]);
  const [recentExams, setRecentExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/progress/stats'),
      api.get('/progress/subjects'),
      api.get('/progress/recent-exams'),
    ]).then(([s, sp, re]) => {
      setStats(s.data.data);
      setSubjectProgress(sp.data.data);
      setRecentExams(re.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  const radarData = subjectProgress.map((s) => ({
    subject: s.subject_name,
    score: Number(s.average_score) || 0,
  }));

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>My Progress</Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <StatCard icon={<School />} label="Subjects Active" value={stats?.totalSubjects || 0} color="primary.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<EmojiEvents />} label="Quizzes Done" value={stats?.completedExams || 0} color="secondary.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<TrendingUp />} label="Average Score" value={`${stats?.averageScore || 0}%`} color="success.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<LocalFireDepartment />} label="Day Streak" value={`${stats?.streak || 0} 🔥`} color="warning.main" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Radar Chart */}
        {radarData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>Performance by Subject</Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Score" dataKey="score" stroke="#2E7D32" fill="#2E7D32" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Subject Progress Bars */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Subject Breakdown</Typography>
              {subjectProgress.length === 0 && (
                <Typography color="text.secondary">Take some quizzes to see your progress!</Typography>
              )}
              {subjectProgress.map((s) => (
                <Box key={s.subject_id} sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" fontWeight={600}>{s.subject_name}</Typography>
                    <Typography variant="body2" color="text.secondary">{s.average_score}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate" value={Number(s.average_score) || 0}
                    sx={{ height: 8, borderRadius: 4, mt: 0.5 }}
                    color={s.average_score >= 70 ? 'success' : s.average_score >= 50 ? 'warning' : 'error'}
                  />
                  <Typography variant="caption" color="text.disabled">
                    {s.completed_quizzes} quizzes · Last active: {s.last_active ? new Date(s.last_active).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Recent Quiz Results</Typography>
              {recentExams.length === 0 && (
                <Typography color="text.secondary">No quiz attempts yet.</Typography>
              )}
              {recentExams.map((e) => (
                <Box key={e.id} display="flex" justifyContent="space-between" alignItems="center"
                  sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>{e.exam_title}</Typography>
                    <Typography variant="caption" color="text.secondary">{e.subject_name}</Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="h6" fontWeight={700}
                      color={e.score >= 50 ? 'success.main' : 'error.main'}>
                      {e.score}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {e.correct_answers}/{e.total_questions} correct
                    </Typography>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProgressPage;
