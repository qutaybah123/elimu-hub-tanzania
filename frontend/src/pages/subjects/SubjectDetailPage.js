import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress,
  Container, Divider, Grid, Tab, Tabs, Typography,
} from '@mui/material';
import { Assignment, Folder, Quiz } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const SubjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [resources, setResources] = useState([]);
  const [papers, setPapers] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/subjects/${id}`),
      api.get(`/resources?subject_id=${id}`),
      api.get(`/exams?subject_id=${id}`),
      api.get(`/quizzes?subject_id=${id}`),
    ]).then(([s, r, e, q]) => {
      setSubject(s.data.data);
      setResources(r.data.data);
      setPapers(e.data.data);
      setQuizzes(q.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;
  if (!subject) return <Typography sx={{ p: 4 }}>Subject not found.</Typography>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 4, borderRadius: 2, mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>{subject.name}</Typography>
        <Typography variant="body1" sx={{ opacity: 0.85, mt: 1 }}>{subject.description}</Typography>
        <Box display="flex" gap={1} mt={2}>
          <Chip label={subject.grade_level} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          <Chip label={`Syllabus ${subject.syllabus_year}`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: 'Resources', value: subject.resource_count || resources.length, icon: <Folder /> },
          { label: 'Past Papers', value: subject.past_paper_count || papers.length, icon: <Assignment /> },
          { label: 'Quizzes', value: subject.quiz_count || quizzes.length, icon: <Quiz /> },
        ].map((s) => (
          <Grid item xs={4} key={s.label}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: 'primary.main' }}>{s.icon}</Box>
                <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                <Typography variant="body2" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Resources" />
        <Tab label="Past Papers" />
        <Tab label="Quizzes" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={2}>
          {resources.map((r) => (
            <Grid item xs={12} sm={6} key={r.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="subtitle1" fontWeight={600}>{r.title}</Typography>
                    <Chip label={r.type} size="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">{r.description}</Typography>
                  <Button href={r.file_url} target="_blank" size="small" sx={{ mt: 1 }}>Download</Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {resources.length === 0 && <Grid item xs={12}><Typography color="text.secondary">No resources yet.</Typography></Grid>}
        </Grid>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          {papers.map((p) => (
            <Grid item xs={12} sm={6} key={p.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="subtitle1" fontWeight={600}>{p.exam_type} {p.year}</Typography>
                    <Chip label={`Paper ${p.paper_number || 1}`} size="small" />
                  </Box>
                  {p.region && <Typography variant="body2" color="text.secondary">{p.region}</Typography>}
                  <Button href={p.file_url} target="_blank" size="small" sx={{ mt: 1 }}>Download</Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {papers.length === 0 && <Grid item xs={12}><Typography color="text.secondary">No past papers yet.</Typography></Grid>}
        </Grid>
      )}

      {tab === 2 && (
        <Grid container spacing={2}>
          {quizzes.map((q) => (
            <Grid item xs={12} sm={6} key={q.id}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600}>{q.title}</Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip label={q.difficulty} size="small"
                      color={q.difficulty === 'easy' ? 'success' : q.difficulty === 'medium' ? 'warning' : 'error'} />
                    <Chip label={`${q.total_questions} questions`} size="small" variant="outlined" />
                  </Box>
                  <Button variant="contained" size="small" sx={{ mt: 2 }} onClick={() => navigate(`/quiz/${q.id}`)}>
                    Start Quiz
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {quizzes.length === 0 && <Grid item xs={12}><Typography color="text.secondary">No quizzes yet.</Typography></Grid>}
        </Grid>
      )}
    </Container>
  );
};

export default SubjectDetailPage;
