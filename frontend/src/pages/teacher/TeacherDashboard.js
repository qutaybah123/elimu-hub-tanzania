import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Grid,
  Dialog, DialogActions, DialogContent, DialogTitle, FormControl,
  InputLabel, MenuItem, Select, TextField, Typography, Avatar, Divider,
  Tabs, Tab, IconButton, LinearProgress, Alert, Tooltip,
} from '@mui/material';
import {
  Add, Publish, UnpublishedOutlined, AdminPanelSettings,
  UploadFile, Link as LinkIcon, Code, Edit, Delete, Check, Close,
  DragIndicator, CloudUpload, ContentPaste,
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const diffColors = { easy: '#059669', medium: '#F59E0B', hard: '#EF4444' };

// ── blank question factory ─────────────────────────────────────────────────
const blankQuestion = () => ({
  _id: Math.random().toString(36).slice(2),
  text: '',
  type: 'multiple_choice',
  marks: 1,
  explanation: '',
  options: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
});

// ── single question editor ─────────────────────────────────────────────────
function QuestionEditor({ question, index, onChange, onRemove }) {
  const updateOption = (i, field, val) => {
    const opts = question.options.map((o, oi) => {
      if (field === 'isCorrect' && val) return { ...o, isCorrect: oi === i }; // radio behaviour
      if (oi === i) return { ...o, [field]: val };
      return o;
    });
    onChange({ ...question, options: opts });
  };

  const addOption = () => onChange({ ...question, options: [...question.options, { text: '', isCorrect: false }] });
  const removeOption = (i) => onChange({ ...question, options: question.options.filter((_, oi) => oi !== i) });

  return (
    <Box sx={{ border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: 2.5, p: 2.5, mb: 2, bgcolor: '#FAFAFA', position: 'relative' }}>
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <DragIndicator sx={{ color: '#CBD5E1', fontSize: 18 }} />
        <Typography variant="caption" fontWeight={700} color="text.secondary">Q{index + 1}</Typography>
        <Box flex={1} />
        <Select size="small" value={question.type} sx={{ fontSize: '0.75rem', height: 28, mr: 1 }}
          onChange={(e) => onChange({ ...question, type: e.target.value })}>
          <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
          <MenuItem value="true_false">True / False</MenuItem>
          <MenuItem value="short_answer">Short Answer</MenuItem>
        </Select>
        <TextField size="small" label="Marks" type="number" value={question.marks}
          onChange={(e) => onChange({ ...question, marks: parseInt(e.target.value) || 1 })}
          sx={{ width: 70 }} inputProps={{ min: 1 }} />
        <Tooltip title="Remove question">
          <IconButton size="small" onClick={onRemove} sx={{ color: '#EF4444', ml: 0.5 }}>
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <TextField fullWidth multiline rows={2} label="Question Text *" value={question.text}
        onChange={(e) => onChange({ ...question, text: e.target.value })}
        sx={{ mb: 1.5, bgcolor: 'white' }} />

      {question.type === 'multiple_choice' && (
        <Box>
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.8, display: 'block' }}>
            OPTIONS — click ✓ to mark correct answer
          </Typography>
          {question.options.map((opt, i) => (
            <Box key={i} display="flex" alignItems="center" gap={1} mb={0.8}>
              <Tooltip title="Mark as correct">
                <IconButton size="small" onClick={() => updateOption(i, 'isCorrect', true)}
                  sx={{ width: 28, height: 28, bgcolor: opt.isCorrect ? '#059669' : 'transparent', border: `1.5px solid ${opt.isCorrect ? '#059669' : '#CBD5E1'}`, '&:hover': { bgcolor: opt.isCorrect ? '#047857' : '#F0FDF4' } }}>
                  <Check sx={{ fontSize: 14, color: opt.isCorrect ? 'white' : '#94A3B8' }} />
                </IconButton>
              </Tooltip>
              <TextField size="small" fullWidth placeholder={`Option ${String.fromCharCode(65 + i)}`}
                value={opt.text} onChange={(e) => updateOption(i, 'text', e.target.value)}
                sx={{ bgcolor: opt.isCorrect ? '#F0FDF4' : 'white', '& .MuiOutlinedInput-root': { borderColor: opt.isCorrect ? '#059669' : undefined } }} />
              {question.options.length > 2 && (
                <IconButton size="small" onClick={() => removeOption(i)} sx={{ color: '#94A3B8' }}>
                  <Close fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
          {question.options.length < 6 && (
            <Button size="small" onClick={addOption} sx={{ mt: 0.5, color: '#059669', fontSize: '0.75rem' }}>+ Add option</Button>
          )}
        </Box>
      )}

      {question.type === 'true_false' && (
        <Box display="flex" gap={1}>
          {['True', 'False'].map((label) => {
            const isCorrect = question.options.find(o => o.text === label)?.isCorrect;
            return (
              <Button key={label} size="small" variant={isCorrect ? 'contained' : 'outlined'}
                onClick={() => onChange({ ...question, options: [{ text: 'True', isCorrect: label === 'True' }, { text: 'False', isCorrect: label === 'False' }] })}
                sx={{ flex: 1, ...(isCorrect ? {} : { borderColor: '#CBD5E1', color: '#64748B' }) }}>
                {label}
              </Button>
            );
          })}
        </Box>
      )}

      {question.type === 'short_answer' && (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Short answer — students type their response. No options needed.
        </Typography>
      )}

      <TextField fullWidth size="small" label="Explanation (optional)" value={question.explanation}
        onChange={(e) => onChange({ ...question, explanation: e.target.value })}
        sx={{ mt: 1.5, bgcolor: 'white' }} />
    </Box>
  );
}

// ── JSON template for the paste/url tab ──────────────────────────────────
const JSON_TEMPLATE = JSON.stringify({
  title: "My Quiz Title",
  difficulty: "medium",
  timeLimit: 30,
  questions: [
    {
      text: "What is the capital of Tanzania?",
      type: "multiple_choice",
      marks: 1,
      explanation: "Dodoma is the official capital.",
      options: [
        { text: "Dar es Salaam", isCorrect: false },
        { text: "Dodoma", isCorrect: true },
        { text: "Mwanza", isCorrect: false },
        { text: "Arusha", isCorrect: false }
      ]
    },
    {
      text: "Tanzania gained independence in 1961.",
      type: "true_false",
      answer: "true"
    }
  ]
}, null, 2);

const CSV_TEMPLATE = `question,type,option_a,option_b,option_c,option_d,answer,explanation,marks
What is 5 x 6?,multiple_choice,24,30,36,40,b,Multiplication,1
Water boils at 100°C at sea level.,true_false,,,,,true,Standard boiling point,1
Name the longest river in Africa.,multiple_choice,Nile,Amazon,Congo,Zambezi,a,The Nile is the longest,2`;

// ── Main Component ─────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [importTab, setImportTab] = useState(0); // 0=manual,1=file,2=url,3=paste
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Shared meta fields
  const [meta, setMeta] = useState({ title: '', description: '', subjectId: '', difficulty: 'medium', timeLimit: 30 });

  // Manual builder
  const [questions, setQuestions] = useState([blankQuestion()]);

  // File upload
  const fileRef = useRef(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // URL import
  const [importUrl, setImportUrl] = useState('');
  const [urlPreview, setUrlPreview] = useState(null);
  const [fetchingUrl, setFetchingUrl] = useState(false);

  // Paste JSON
  const [pastedJson, setPastedJson] = useState('');
  const [pastePreview, setPastePreview] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/quizzes'), api.get('/subjects')])
      .then(([q, s]) => {
        setQuizzes(q.data?.data || []);
        setSubjects(s.data?.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const resetDialog = () => {
    setMeta({ title: '', description: '', subjectId: '', difficulty: 'medium', timeLimit: 30 });
    setQuestions([blankQuestion()]);
    setUploadFile(null); setFilePreview(null);
    setImportUrl(''); setUrlPreview(null);
    setPastedJson(''); setPastePreview(null);
    setImportTab(0); setUploadProgress(0);
  };

  // ── File picked ─────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const ext = file.name.split('.').pop().toLowerCase();
        let preview;
        if (ext === 'csv') {
          const lines = text.trim().split('\n');
          preview = { questionsCount: lines.length - 1, format: 'CSV', snippet: lines.slice(0, 3).join('\n') };
        } else {
          const parsed = JSON.parse(text);
          const qs = parsed.questions || (Array.isArray(parsed) ? parsed : []);
          const titleFromFile = parsed.title || '';
          if (titleFromFile && !meta.title) setMeta(m => ({ ...m, title: titleFromFile }));
          preview = { questionsCount: qs.length, format: 'JSON', snippet: JSON.stringify(qs[0] || {}, null, 2).slice(0, 200) };
        }
        setFilePreview(preview);
      } catch { setFilePreview({ error: 'Could not parse file preview' }); }
    };
    reader.readAsText(file);
  };

  // ── Fetch URL preview ───────────────────────────────────────────────────
  const handleFetchPreview = async () => {
    if (!importUrl) return;
    setFetchingUrl(true); setUrlPreview(null);
    try {
      // We do the actual fetch on the backend; just show the URL for now
      const res = await api.post('/quizzes/import', { subjectId: meta.subjectId || 'preview', importUrl, title: 'preview' });
      setUrlPreview({ questionsCount: res.data.imported?.questionsCount, title: res.data.data?.title });
      // If we have a quiz ID back, delete it (we'll re-import on submit)
      if (res.data.data?.id) {
        await api.delete?.(`/quizzes/${res.data.data.id}`).catch(() => {});
      }
    } catch (err) {
      setUrlPreview({ error: err.response?.data?.message || 'Failed to fetch URL' });
    } finally { setFetchingUrl(false); }
  };

  // ── Paste preview ───────────────────────────────────────────────────────
  const handlePastePreview = () => {
    try {
      const parsed = JSON.parse(pastedJson);
      const qs = parsed.questions || (Array.isArray(parsed) ? parsed : []);
      if (parsed.title && !meta.title) setMeta(m => ({ ...m, title: parsed.title }));
      setPastePreview({ questionsCount: qs.length, ok: true });
    } catch (e) {
      setPastePreview({ error: 'Invalid JSON: ' + e.message });
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!meta.title) { toast.error('Quiz title is required'); return; }
    if (!meta.subjectId) { toast.error('Subject is required'); return; }
    setSaving(true);

    try {
      let res;

      if (importTab === 0) {
        // Manual — validate questions
        const valid = questions.filter(q => q.text.trim());
        if (valid.length === 0) { toast.error('Add at least one question'); setSaving(false); return; }
        res = await api.post('/quizzes', { ...meta, questions: valid });
        toast.success(`✅ Quiz created with ${valid.length} questions!`);

      } else if (importTab === 1) {
        // File upload
        if (!uploadFile) { toast.error('Please select a file'); setSaving(false); return; }
        const formData = new FormData();
        formData.append('file', uploadFile);
        Object.entries(meta).forEach(([k, v]) => formData.append(k, v));
        res = await api.post('/quizzes/import', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded / e.total) * 100)),
        });
        toast.success(`✅ Imported ${res.data.imported?.questionsCount} questions from file!`);

      } else if (importTab === 2) {
        // URL import
        if (!importUrl) { toast.error('Please enter a URL'); setSaving(false); return; }
        res = await api.post('/quizzes/import', { ...meta, importUrl });
        toast.success(`✅ Imported ${res.data.imported?.questionsCount} questions from URL!`);

      } else if (importTab === 3) {
        // Paste JSON
        if (!pastedJson) { toast.error('Please paste JSON data'); setSaving(false); return; }
        res = await api.post('/quizzes/import', { ...meta, rawJson: pastedJson });
        toast.success(`✅ Imported ${res.data.imported?.questionsCount} questions from JSON!`);
      }

      setQuizzes(prev => [res.data.data, ...prev]);
      setOpenDialog(false);
      resetDialog();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save quiz');
    } finally { setSaving(false); setUploadProgress(0); }
  };

  const handleTogglePublish = async (quiz) => {
    try {
      const res = await api.patch(`/quizzes/${quiz.id}/publish`, { isPublished: !quiz.is_published });
      setQuizzes(quizzes.map((q) => q.id === quiz.id ? res.data.data : q));
      toast.success(res.data.data.is_published ? 'Quiz published! 🎉' : 'Quiz unpublished.');
    } catch { toast.error('Failed to update quiz'); }
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress sx={{ color: '#059669' }} />
    </Box>
  );

  const published = quizzes.filter(q => q.is_published).length;
  const draft = quizzes.filter(q => !q.is_published).length;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4} flexWrap="wrap" gap={2}>
        <Box>
          <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AdminPanelSettings sx={{ color: 'white', fontSize: 22 }} />
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Sora",sans-serif' }}>Teacher Panel</Typography>
          </Box>
          <Typography color="text.secondary">Karibu, {user?.fullName}. Simamia maswali na rasilimali.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => { resetDialog(); setOpenDialog(true); }} sx={{ px: 3 }}>
          Create Quiz
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2.5} mb={4}>
        {[
          { label: 'Total Quizzes', value: quizzes.length, color: '#3B82F6', emoji: '📝' },
          { label: 'Published', value: published, color: '#059669', emoji: '✅' },
          { label: 'Draft', value: draft, color: '#F59E0B', emoji: '📋' },
          { label: 'Subjects', value: subjects.length, color: '#8B5CF6', emoji: '📚' },
        ].map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card sx={{ background: `linear-gradient(135deg, ${s.color}08, ${s.color}15)`, border: `1.5px solid ${s.color}25` }}>
              <CardContent sx={{ p: '20px !important' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h3" fontWeight={800} sx={{ color: s.color, fontFamily: '"Sora",sans-serif', lineHeight: 1 }}>{s.value}</Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={500} mt={0.5}>{s.label}</Typography>
                  </Box>
                  <Typography fontSize={28}>{s.emoji}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quiz List */}
      <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" fontWeight={700}>Maswali Yangu ({quizzes.length})</Typography>
      </Box>
      <Grid container spacing={2}>
        {quizzes.map((quiz) => (
          <Grid item xs={12} sm={6} md={4} key={quiz.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" mb={1.5}>
                  <Chip label={quiz.is_published ? '✅ Published' : '📋 Draft'} size="small"
                    sx={{ bgcolor: quiz.is_published ? '#ECFDF5' : '#F8FAFC', color: quiz.is_published ? '#059669' : '#64748B', fontWeight: 700, fontSize: '0.72rem' }} />
                  <Chip label={quiz.difficulty} size="small"
                    sx={{ bgcolor: diffColors[quiz.difficulty] + '15', color: diffColors[quiz.difficulty], fontWeight: 700, fontSize: '0.72rem' }} />
                </Box>
                <Typography variant="subtitle1" fontWeight={700} mb={0.5} sx={{ lineHeight: 1.3 }}>{quiz.title}</Typography>
                <Typography variant="body2" color="text.secondary" mb={0.5}>{quiz.subject_name}</Typography>
                <Typography variant="caption" color="text.disabled">
                  {quiz.total_questions || 0} maswali · {quiz.time_limit || '–'} min
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Button fullWidth size="small" variant={quiz.is_published ? 'outlined' : 'contained'}
                  startIcon={quiz.is_published ? <UnpublishedOutlined /> : <Publish />}
                  onClick={() => handleTogglePublish(quiz)}
                  sx={quiz.is_published ? { borderColor: '#EF4444', color: '#EF4444', '&:hover': { bgcolor: '#FEF2F2' } } : {}}>
                  {quiz.is_published ? 'Unpublish' : 'Publish Quiz'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {quizzes.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'white', borderRadius: 3, border: '2px dashed rgba(0,0,0,0.1)' }}>
              <Typography fontSize={48} mb={2}>📝</Typography>
              <Typography variant="h6" fontWeight={700} mb={1}>Hakuna maswali bado</Typography>
              <Typography color="text.secondary" mb={3}>Anza kuunda quiz yako ya kwanza!</Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => { resetDialog(); setOpenDialog(true); }}>Create Quiz</Button>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* ── CREATE QUIZ DIALOG ─────────────────────────────────── */}
      <Dialog open={openDialog} onClose={() => { if (!saving) { setOpenDialog(false); resetDialog(); } }}
        maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, maxHeight: '92vh' } }}>
        <DialogTitle sx={{ fontFamily: '"Sora",sans-serif', fontWeight: 700, pb: 0 }}>
          ➕ Tengeneza Quiz Mpya
        </DialogTitle>

        {/* Meta fields — always visible */}
        <Box sx={{ px: 3, pt: 1.5, pb: 0.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Quiz Title *" value={meta.title}
                onChange={(e) => setMeta({ ...meta, title: e.target.value })} size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Somo (Subject) *</InputLabel>
                <Select value={meta.subjectId} label="Somo (Subject) *"
                  onChange={(e) => setMeta({ ...meta, subjectId: e.target.value })}>
                  {subjects.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Description" value={meta.description}
                onChange={(e) => setMeta({ ...meta, description: e.target.value })} size="small" />
            </Grid>
            <Grid item xs={6} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Ugumu</InputLabel>
                <Select value={meta.difficulty} label="Ugumu"
                  onChange={(e) => setMeta({ ...meta, difficulty: e.target.value })}>
                  <MenuItem value="easy">😊 Easy</MenuItem>
                  <MenuItem value="medium">🤔 Medium</MenuItem>
                  <MenuItem value="hard">😤 Hard</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth label="Muda (min)" type="number" value={meta.timeLimit}
                onChange={(e) => setMeta({ ...meta, timeLimit: e.target.value })} size="small" />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mt: 2 }} />

        {/* Method tabs */}
        <Tabs value={importTab} onChange={(_, v) => setImportTab(v)}
          sx={{ px: 3, minHeight: 44, borderBottom: '1px solid rgba(0,0,0,0.08)' }}
          TabIndicatorProps={{ style: { backgroundColor: '#059669' } }}>
          <Tab icon={<Edit sx={{ fontSize: 16 }} />} iconPosition="start" label="Manual Builder"
            sx={{ minHeight: 44, fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', gap: 0.5 }} />
          <Tab icon={<UploadFile sx={{ fontSize: 16 }} />} iconPosition="start" label="Upload File"
            sx={{ minHeight: 44, fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', gap: 0.5 }} />
          <Tab icon={<LinkIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Import URL"
            sx={{ minHeight: 44, fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', gap: 0.5 }} />
          <Tab icon={<ContentPaste sx={{ fontSize: 16 }} />} iconPosition="start" label="Paste JSON"
            sx={{ minHeight: 44, fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', gap: 0.5 }} />
        </Tabs>

        <DialogContent sx={{ pt: 2, pb: 1, overflowY: 'auto' }}>

          {/* ── TAB 0: Manual Builder ─────────────────────────── */}
          {importTab === 0 && (
            <Box>
              {questions.map((q, i) => (
                <QuestionEditor key={q._id} question={q} index={i}
                  onChange={(updated) => setQuestions(qs => qs.map((x, xi) => xi === i ? updated : x))}
                  onRemove={() => setQuestions(qs => qs.filter((_, xi) => xi !== i))} />
              ))}
              <Button variant="outlined" startIcon={<Add />} fullWidth
                onClick={() => setQuestions(qs => [...qs, blankQuestion()])}
                sx={{ borderStyle: 'dashed', color: '#059669', borderColor: '#059669', mt: 0.5 }}>
                Add Question
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', textAlign: 'center' }}>
                {questions.length} question{questions.length !== 1 ? 's' : ''} · Click ✓ on an option to mark it as correct
              </Typography>
            </Box>
          )}

          {/* ── TAB 1: File Upload ────────────────────────────── */}
          {importTab === 1 && (
            <Box>
              <Box sx={{ border: '2px dashed rgba(5,150,105,0.35)', borderRadius: 3, p: 4, textAlign: 'center', bgcolor: '#F0FDF4', cursor: 'pointer', mb: 2, '&:hover': { borderColor: '#059669', bgcolor: '#ECFDF5' }, transition: 'all 0.2s' }}
                onClick={() => fileRef.current?.click()}>
                <CloudUpload sx={{ fontSize: 40, color: '#059669', mb: 1 }} />
                <Typography fontWeight={700} color="#059669">Click to upload JSON or CSV</Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  Drag & drop or click · Max 5MB · .json or .csv
                </Typography>
                {uploadFile && (
                  <Chip label={uploadFile.name} sx={{ mt: 1.5, bgcolor: '#059669', color: 'white' }} onDelete={() => { setUploadFile(null); setFilePreview(null); }} />
                )}
                <input ref={fileRef} type="file" accept=".json,.csv" hidden onChange={handleFileChange} />
              </Box>

              {filePreview && !filePreview.error && (
                <Alert severity="success" sx={{ mb: 1.5 }}>
                  <strong>{filePreview.format} file ready</strong> — {filePreview.questionsCount} questions detected
                  {filePreview.snippet && <Box component="pre" sx={{ mt: 1, fontSize: '0.72rem', bgcolor: '#F8FAFC', p: 1, borderRadius: 1, overflow: 'auto', maxHeight: 80 }}>{filePreview.snippet}...</Box>}
                </Alert>
              )}
              {filePreview?.error && <Alert severity="error" sx={{ mb: 1.5 }}>{filePreview.error}</Alert>}

              <Alert severity="info" sx={{ mb: 1.5 }}>
                <Typography variant="body2" fontWeight={600} mb={0.5}>JSON Format:</Typography>
                <Box component="pre" sx={{ fontSize: '0.7rem', overflow: 'auto', maxHeight: 120, m: 0 }}>{JSON_TEMPLATE}</Box>
              </Alert>
              <Alert severity="info">
                <Typography variant="body2" fontWeight={600} mb={0.5}>CSV Format:</Typography>
                <Box component="pre" sx={{ fontSize: '0.7rem', overflow: 'auto', maxHeight: 80, m: 0 }}>{CSV_TEMPLATE}</Box>
              </Alert>
            </Box>
          )}

          {/* ── TAB 2: URL Import ─────────────────────────────── */}
          {importTab === 2 && (
            <Box>
              <Box display="flex" gap={1} mb={2}>
                <TextField fullWidth label="URL to JSON or CSV file" value={importUrl}
                  onChange={(e) => { setImportUrl(e.target.value); setUrlPreview(null); }}
                  placeholder="https://example.com/quiz.json"
                  size="small" />
                <Button variant="outlined" onClick={handleFetchPreview} disabled={fetchingUrl || !importUrl || !meta.subjectId}
                  sx={{ whiteSpace: 'nowrap', borderColor: '#059669', color: '#059669', minWidth: 110 }}>
                  {fetchingUrl ? <CircularProgress size={16} /> : 'Preview'}
                </Button>
              </Box>

              {urlPreview && !urlPreview.error && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <strong>URL valid</strong> — {urlPreview.questionsCount} questions found
                  {urlPreview.title && ` · Title: "${urlPreview.title}"`}
                </Alert>
              )}
              {urlPreview?.error && <Alert severity="error" sx={{ mb: 2 }}>{urlPreview.error}</Alert>}

              <Alert severity="info">
                <Typography variant="body2">
                  The URL must return a <strong>public JSON or CSV</strong> file. Works great with:
                  GitHub raw files, Google Drive (direct download link), Dropbox, or your own server.
                  <br />⚠️ Select a subject above before clicking Preview.
                </Typography>
              </Alert>
            </Box>
          )}

          {/* ── TAB 3: Paste JSON ─────────────────────────────── */}
          {importTab === 3 && (
            <Box>
              <Box display="flex" gap={1} mb={1}>
                <Typography variant="body2" fontWeight={600} flex={1} color="text.secondary">
                  Paste your JSON below (full quiz object or just a questions array)
                </Typography>
                <Button size="small" onClick={() => { setPastedJson(JSON_TEMPLATE); setPastePreview(null); }}
                  sx={{ color: '#059669', fontSize: '0.75rem' }}>
                  Load example
                </Button>
                <Button size="small" onClick={handlePastePreview} disabled={!pastedJson}
                  sx={{ color: '#3B82F6', fontSize: '0.75rem' }}>
                  Validate
                </Button>
              </Box>

              <TextField fullWidth multiline rows={12} value={pastedJson}
                onChange={(e) => { setPastedJson(e.target.value); setPastePreview(null); }}
                placeholder={'{\n  "questions": [...]\n}'}
                sx={{ fontFamily: 'monospace', '& textarea': { fontFamily: 'monospace', fontSize: '0.8rem' } }} />

              {pastePreview && !pastePreview.error && (
                <Alert severity="success" sx={{ mt: 1.5 }}>
                  ✅ Valid JSON — <strong>{pastePreview.questionsCount} questions</strong> ready to import
                </Alert>
              )}
              {pastePreview?.error && <Alert severity="error" sx={{ mt: 1.5 }}>{pastePreview.error}</Alert>}
            </Box>
          )}
        </DialogContent>

        {saving && uploadProgress > 0 && (
          <Box sx={{ px: 3 }}>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ borderRadius: 1, height: 6, bgcolor: '#ECFDF5', '& .MuiLinearProgress-bar': { bgcolor: '#059669' } }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
              Uploading... {uploadProgress}%
            </Typography>
          </Box>
        )}

        <DialogActions sx={{ px: 3, pb: 3, gap: 1, pt: 1.5 }}>
          <Button onClick={() => { setOpenDialog(false); resetDialog(); }} variant="outlined" disabled={saving}>
            Ghairi
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving} sx={{ px: 4, minWidth: 130 }}>
            {saving ? <><CircularProgress size={16} sx={{ mr: 1, color: 'white' }} />Inasave...</> : '💾 Save Quiz'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
