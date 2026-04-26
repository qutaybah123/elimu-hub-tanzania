import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Container, LinearProgress, Paper, Radio, RadioGroup,
  FormControlLabel, FormControl, Typography,
} from '@mui/material';
import { CheckCircle, Cancel, Timer } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const QuizPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPreview = user?.role !== 'student'; // teachers/admins see preview mode
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    api.get(`/quizzes/${id}`).then((r) => {
      setQuiz(r.data.data);
      if (r.data.data.time_limit) setTimeLeft(r.data.data.time_limit * 60);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const res = await api.post(`/quizzes/${id}/submit`, { answers, timeTaken });
      setResult(res.data.data);
      setSubmitted(true);
    } catch (err) {
      toast.error('Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [id, answers, startTime]);

  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, submitted, handleSubmit]);

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;
  if (!quiz) return <Typography sx={{ p: 4 }}>Quiz not found.</Typography>;

  const questions = quiz.questions || [];
  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (submitted && result) {
    const passed = result.score >= 50;
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ color: passed ? 'success.main' : 'error.main', fontSize: 64, mb: 2 }}>
            {passed ? <CheckCircle fontSize="inherit" /> : <Cancel fontSize="inherit" />}
          </Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {passed ? 'Hongera! 🎉' : 'Jaribu tena!'}
          </Typography>
          <Typography variant="h2" fontWeight={700} color={passed ? 'success.main' : 'error.main'}>
            {result.score}%
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            {result.correctAnswers} out of {result.totalQuestions} correct
          </Typography>
          <Box display="flex" gap={2} justifyContent="center">
            <Button variant="outlined" onClick={() => navigate('/dashboard')}>Dashboard</Button>
            <Button variant="contained" onClick={() => navigate('/subjects')}>More Subjects</Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1.5, sm: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>{quiz.title}</Typography>
        <Box display="flex" gap={1} alignItems="center">
          {timeLeft !== null && (
            <Chip
              icon={<Timer />}
              label={formatTime(timeLeft)}
              color={timeLeft < 60 ? 'error' : 'primary'}
            />
          )}
          <Chip label={`${current + 1} / ${questions.length}`} variant="outlined" />
        </Box>
      </Box>

      {isPreview && (
        <Box sx={{ bgcolor: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 2, px: 2, py: 1, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: '#92400E', fontWeight: 600 }}>
            👁 Preview Mode — You are viewing this quiz as a {user?.role}. Only students can submit answers.
          </Typography>
        </Box>
      )}
      <LinearProgress variant="determinate" value={progress} sx={{ mb: 3, height: 8, borderRadius: 4 }} />

      {q && (
        <Card elevation={2}>
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              {current + 1}. {q.question_text}
            </Typography>

            {q.question_type === 'multiple_choice' && q.options && (
              <FormControl component="fieldset" fullWidth>
                <RadioGroup value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}>
                  {q.options.filter(Boolean).map((opt) => (
                    <FormControlLabel
                      key={opt.id} value={opt.id}
                      control={<Radio color="primary" />}
                      label={opt.option_text}
                      sx={{
                        border: '1px solid', borderColor: answers[q.id] === opt.id ? 'primary.main' : 'divider',
                        borderRadius: 2, mb: 1, px: { xs: 1, sm: 2 }, py: 0.5,
                        bgcolor: answers[q.id] === opt.id ? 'primary.50' : 'transparent',
                      }}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            )}

            {q.question_type === 'true_false' && (
              <FormControl component="fieldset">
                <RadioGroup value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}>
                  {(q.options || []).filter(Boolean).map((opt) => (
                    <FormControlLabel key={opt.id} value={opt.id} control={<Radio />} label={opt.option_text} />
                  ))}
                </RadioGroup>
              </FormControl>
            )}
          </CardContent>
        </Card>
      )}

      <Box display="flex" justifyContent="space-between" mt={3}>
        <Button variant="outlined" onClick={() => setCurrent((c) => c - 1)} disabled={current === 0}>
          Previous
        </Button>
        {current < questions.length - 1 ? (
          <Button variant="contained" onClick={() => setCurrent((c) => c + 1)}>
            Next
          </Button>
        ) : (
          <Button
            variant="contained" color="success" onClick={handleSubmit}
            disabled={submitting || isPreview}
          >
            {isPreview ? '👁 Preview Mode' : submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        )}
      </Box>

      {/* Answer overview dots */}
      <Box display="flex" flexWrap="wrap" gap={0.5} mt={3} justifyContent="center">
        {questions.map((_, i) => (
          <Box
            key={i}
            onClick={() => setCurrent(i)}
            sx={{
              width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600,
              bgcolor: i === current ? 'primary.main' : answers[questions[i]?.id] ? 'success.main' : 'grey.300',
              color: i === current || answers[questions[i]?.id] ? 'white' : 'text.primary',
            }}
          >
            {i + 1}
          </Box>
        ))}
      </Box>
    </Container>
  );
};

export default QuizPage;
