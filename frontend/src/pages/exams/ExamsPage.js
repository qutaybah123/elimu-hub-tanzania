import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Container,
  FormControl, Grid, InputAdornment, InputLabel, MenuItem, Select,
  TextField, Typography, Collapse, Badge, Divider, IconButton, Tooltip,
} from '@mui/material';
import {
  Download, OpenInNew, Search, FilterList, Close,
  Assignment, CalendarToday, LocationOn, School,
} from '@mui/icons-material';
import api from '../../services/api';

// Detect if a URL is a direct file (download) or a web page (view)
const isDirectFile = (url = '') => {
  if (!url) return false;
  if (url.startsWith('/') || url.includes('/uploads/')) return true; // local upload
  const ext = url.split('?')[0].split('#')[0].split('.').pop().toLowerCase();
  return ['pdf', 'doc', 'docx', 'zip', 'rar', 'xlsx', 'pptx'].includes(ext);
};

const typeConfig = {
  PSLE:  { color: '#3B82F6', bg: '#EFF6FF', label: 'PSLE',          sub: 'Standard 7' },
  CSEE:  { color: '#059669', bg: '#ECFDF5', label: 'CSEE (O-Level)', sub: 'Form 4' },
  ACSEE: { color: '#8B5CF6', bg: '#F5F3FF', label: 'ACSEE (A-Level)', sub: 'Form 6' },
};

function PaperCard({ paper }) {
  const cfg = typeConfig[paper.exam_type] || { color: '#64748B', bg: '#F8FAFC', label: paper.exam_type, sub: '' };
  const canDownload = isDirectFile(paper.file_url);

  return (
    <Card sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      border: `1.5px solid ${cfg.color}20`,
      transition: 'all 0.22s ease',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 12px 28px ${cfg.color}18`, borderColor: cfg.color + '50' },
    }}>
      {/* Color stripe */}
      <Box sx={{ height: 5, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}90)` }} />
      <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 2.5 } }}>

        {/* Top row */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Box>
            <Chip
              label={cfg.label} size="small"
              sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: '0.72rem', height: 22 }}
            />
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.3 }}>
              {cfg.sub}
            </Typography>
          </Box>
          <Box sx={{
            bgcolor: cfg.bg, color: cfg.color, borderRadius: 2,
            px: 1.5, py: 0.5, fontWeight: 800, fontSize: '1.1rem',
            fontFamily: '"Sora",sans-serif', border: `1.5px solid ${cfg.color}30`,
          }}>
            {paper.year}
          </Box>
        </Box>

        {/* Subject */}
        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3, mb: 1, fontFamily: '"Sora",sans-serif' }}>
          {paper.subject_name}
        </Typography>

        {/* Meta */}
        <Box display="flex" flexWrap="wrap" gap={1} mb={1.5}>
          {paper.paper_number && (
            <Box display="flex" alignItems="center" gap={0.4}>
              <Assignment sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Paper {paper.paper_number}
              </Typography>
            </Box>
          )}
          {paper.region && (
            <Box display="flex" alignItems="center" gap={0.4}>
              <LocationOn sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">{paper.region}</Typography>
            </Box>
          )}
          {paper.questions_count && (
            <Box display="flex" alignItems="center" gap={0.4}>
              <School sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">{paper.questions_count} maswali</Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 500 }}>
            📥 {paper.downloads_count || 0} downloads
          </Typography>
          <Button
            variant="contained" size="small"
            startIcon={canDownload ? <Download sx={{ fontSize: 15 }} /> : <OpenInNew sx={{ fontSize: 15 }} />}
            href={paper.file_url} target="_blank" rel="noopener noreferrer"
            onClick={() => api.post(`/exams/${paper.id}/download`).catch(() => {})}
            sx={{
              bgcolor: cfg.color, fontSize: '0.75rem', fontWeight: 700, px: 1.8, py: 0.6,
              borderRadius: 2, '&:hover': { bgcolor: cfg.color, filter: 'brightness(0.9)', transform: 'translateY(-1px)' },
              transition: 'all 0.18s ease',
            }}
          >
            {canDownload ? 'Download' : 'View'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function ExamsPage() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]       = useState('');
  const [examType, setExamType]   = useState('');
  const [year, setYear]           = useState('');
  const [subjectQ, setSubjectQ]   = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);
  const activeFilters = [examType, year, subjectQ].filter(Boolean).length;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (examType)  params.append('exam_type', examType);
    if (year)      params.append('year', year);
    api.get(`/exams?${params}`)
      .then((r) => setPapers(r.data?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [examType, year]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return papers.filter((p) => {
      const matchSearch = !q ||
        p.subject_name?.toLowerCase().includes(q) ||
        p.exam_type?.toLowerCase().includes(q) ||
        String(p.year).includes(q) ||
        p.region?.toLowerCase().includes(q);
      const matchSubject = !subjectQ || p.subject_name?.toLowerCase().includes(subjectQ.toLowerCase());
      return matchSearch && matchSubject;
    });
  }, [papers, search, subjectQ]);

  // Group by exam type for summary
  const counts = { PSLE: 0, CSEE: 0, ACSEE: 0 };
  filtered.forEach((p) => { if (counts[p.exam_type] !== undefined) counts[p.exam_type]++; });

  const clearAll = () => { setSearch(''); setExamType(''); setYear(''); setSubjectQ(''); };
  const hasAnyFilter = search || examType || year || subjectQ;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 } }}>

      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Sora",sans-serif', mb: 0.5 }}>
          📋 NECTA Past Papers
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Tafuta na upakue mitihani ya zamani ya PSLE, CSEE na ACSEE
        </Typography>
      </Box>

      {/* Summary chips */}
      <Box display="flex" gap={1.5} mb={3} flexWrap="wrap">
        {Object.entries(typeConfig).map(([key, cfg]) => (
          <Box
            key={key}
            onClick={() => setExamType(examType === key ? '' : key)}
            sx={{
              px: 2, py: 1, borderRadius: 2.5, cursor: 'pointer',
              bgcolor: examType === key ? cfg.color : cfg.bg,
              border: `1.5px solid ${examType === key ? cfg.color : cfg.color + '30'}`,
              transition: 'all 0.18s ease',
              '&:hover': { borderColor: cfg.color },
            }}
          >
            <Typography variant="body2" fontWeight={700} sx={{ color: examType === key ? 'white' : cfg.color }}>
              {cfg.label}
            </Typography>
            <Typography variant="caption" sx={{ color: examType === key ? 'rgba(255,255,255,0.8)' : 'text.secondary' }}>
              {counts[key]} papers
            </Typography>
          </Box>
        ))}
        <Box sx={{ px: 2, py: 1, borderRadius: 2.5, bgcolor: '#F8FAFC', border: '1.5px solid rgba(0,0,0,0.08)' }}>
          <Typography variant="body2" fontWeight={700} color="text.primary">Total</Typography>
          <Typography variant="caption" color="text.secondary">{filtered.length} papers</Typography>
        </Box>
      </Box>

      {/* Search + Filters */}
      <Box sx={{ bgcolor: 'white', borderRadius: 3, border: '1.5px solid rgba(0,0,0,0.08)', p: { xs: 2, sm: 2.5 }, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <Box display="flex" gap={1.5} alignItems="center">
          <TextField
            fullWidth
            placeholder="Tafuta kwa jina la somo, mwaka, aina ya mtihani..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94A3B8' }} /></InputAdornment>,
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}><Close fontSize="small" /></IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <Tooltip title="More filters">
            <Badge badgeContent={activeFilters} color="primary" sx={{ flexShrink: 0 }}>
              <Button
                variant={showFilters ? 'contained' : 'outlined'}
                startIcon={<FilterList />}
                onClick={() => setShowFilters(!showFilters)}
                sx={{ whiteSpace: 'nowrap', borderRadius: 2, px: { xs: 1.5, sm: 2 } }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Filters</Box>
              </Button>
            </Badge>
          </Tooltip>
        </Box>

        <Collapse in={showFilters}>
          <Box display="flex" gap={2} mt={2} flexWrap="wrap">
            <TextField
              label="Somo (Subject)" size="small" value={subjectQ}
              onChange={(e) => setSubjectQ(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              placeholder="e.g. Hisabati, English..."
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Aina ya Mtihani</InputLabel>
              <Select value={examType} label="Aina ya Mtihani" onChange={(e) => setExamType(e.target.value)} sx={{ borderRadius: 2 }}>
                <MenuItem value="">Yote</MenuItem>
                <MenuItem value="PSLE">PSLE (Std 7)</MenuItem>
                <MenuItem value="CSEE">CSEE (O-Level)</MenuItem>
                <MenuItem value="ACSEE">ACSEE (A-Level)</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Mwaka</InputLabel>
              <Select value={year} label="Mwaka" onChange={(e) => setYear(e.target.value)} sx={{ borderRadius: 2 }}>
                <MenuItem value="">Yote</MenuItem>
                {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
            {hasAnyFilter && (
              <Button onClick={clearAll} size="small" sx={{ color: '#EF4444', whiteSpace: 'nowrap', alignSelf: 'center' }}
                startIcon={<Close fontSize="small" />}>
                Clear all
              </Button>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* Results */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={10}>
          <CircularProgress sx={{ color: '#059669' }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, bgcolor: 'white', borderRadius: 3, border: '2px dashed rgba(0,0,0,0.08)' }}>
          <Typography fontSize={52} mb={2}>📂</Typography>
          <Typography variant="h6" fontWeight={700} mb={1}>Hakuna mitihani iliyopatikana</Typography>
          <Typography color="text.secondary" mb={2}>
            {hasAnyFilter ? 'Jaribu kubadilisha filters au kutafuta tofauti.' : 'Hakuna mitihani bado imewekwa.'}
          </Typography>
          {hasAnyFilter && <Button onClick={clearAll} sx={{ color: '#059669' }}>Futa Filters</Button>}
        </Box>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          {filtered.map((p) => (
            <Grid item xs={12} sm={6} md={4} key={p.id}>
              <PaperCard paper={p} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
