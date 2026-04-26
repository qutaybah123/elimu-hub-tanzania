import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress, Container,
  FormControl, Grid, InputAdornment, InputLabel, MenuItem, Select,
  TextField, Typography, Collapse, Badge, Divider, IconButton,
} from '@mui/material';
import { Download, OpenInNew, Search, FilterList, Close } from '@mui/icons-material';
import api from '../../services/api';

const isDirectFile = (url = '') => {
  if (!url) return false;
  if (url.startsWith('/') || url.includes('/uploads/')) return true;
  const ext = url.split('?')[0].split('#')[0].split('.').pop().toLowerCase();
  return ['pdf', 'doc', 'docx', 'zip', 'rar', 'xlsx', 'pptx', 'mp4', 'ppt'].includes(ext);
};

const typeConfig = {
  notes:        { color: '#3B82F6', bg: '#EFF6FF', emoji: '📝', label: 'Notes' },
  pdf:          { color: '#EF4444', bg: '#FEF2F2', emoji: '📄', label: 'PDF' },
  video:        { color: '#8B5CF6', bg: '#F5F3FF', emoji: '🎬', label: 'Video' },
  presentation: { color: '#F59E0B', bg: '#FFFBEB', emoji: '📊', label: 'Slides' },
  exercise:     { color: '#059669', bg: '#ECFDF5', emoji: '✏️', label: 'Exercise' },
};

function ResourceCard({ resource }) {
  const cfg = typeConfig[resource.type] || { color: '#64748B', bg: '#F8FAFC', emoji: '📁', label: resource.type };
  const canDownload = isDirectFile(resource.file_url);

  return (
    <Card sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      border: `1.5px solid ${cfg.color}20`,
      transition: 'all 0.22s ease',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 12px 28px ${cfg.color}18`, borderColor: cfg.color + '50' },
    }}>
      <Box sx={{ height: 4, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}80)` }} />
      <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 2.5 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Chip
            label={`${cfg.emoji} ${cfg.label}`} size="small"
            sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: '0.72rem', height: 22 }}
          />
          <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 500 }}>
            📥 {resource.downloads_count || 0}
          </Typography>
        </Box>

        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.35, mb: 0.8, fontFamily: '"Sora",sans-serif' }}>
          {resource.title}
        </Typography>

        {resource.description && (
          <Typography variant="body2" color="text.secondary" sx={{
            mb: 1.5, fontSize: '0.83rem', lineHeight: 1.6,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
          }}>
            {resource.description}
          </Typography>
        )}

        <Box display="flex" alignItems="center" gap={0.5} mt="auto">
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: cfg.color, fontWeight: 600 }}>
            {resource.subject_name}
          </Typography>
        </Box>
      </CardContent>

      <Box sx={{ p: { xs: 1.5, sm: 2 }, pt: 0 }}>
        <Button
          fullWidth variant="contained" size="small"
          startIcon={canDownload ? <Download sx={{ fontSize: 16 }} /> : <OpenInNew sx={{ fontSize: 16 }} />}
          href={resource.file_url} target="_blank" rel="noopener noreferrer"
          onClick={() => api.post(`/resources/${resource.id}/download`).catch(() => {})}
          sx={{
            bgcolor: cfg.color, fontWeight: 700, borderRadius: 2, py: 0.8,
            '&:hover': { bgcolor: cfg.color, filter: 'brightness(0.9)' },
          }}
        >
          {canDownload ? 'Download' : 'View'}
        </Button>
      </Box>
    </Card>
  );
}

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [subjects, setSubjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [type, setType]           = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const activeFilters = [subjectId, type].filter(Boolean).length;

  useEffect(() => {
    api.get('/subjects').then((r) => setSubjects(r.data?.data || [])).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (subjectId) params.append('subject_id', subjectId);
    if (type)      params.append('type', type);
    api.get(`/resources?${params}`)
      .then((r) => setResources(r.data?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subjectId, type]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return resources.filter((r) =>
      !q ||
      r.title?.toLowerCase().includes(q) ||
      r.subject_name?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.type?.toLowerCase().includes(q)
    );
  }, [resources, search]);

  const clearAll = () => { setSearch(''); setSubjectId(''); setType(''); };
  const hasAnyFilter = search || subjectId || type;

  // Type quick-filter tabs
  const typeCounts = {};
  resources.forEach((r) => { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1; });

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 } }}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Sora",sans-serif', mb: 0.5 }}>
          📚 Study Resources
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Notes, PDFs, videos na zaidi kwa masomo yote
        </Typography>
      </Box>

      {/* Type quick chips */}
      <Box display="flex" gap={1} mb={3} sx={{ overflowX: 'auto', pb: 0.5, flexWrap: { xs: 'nowrap', sm: 'wrap' } }}>
        <Chip
          label={`Yote (${resources.length})`} onClick={() => setType('')}
          sx={{ fontWeight: 700, bgcolor: !type ? '#0F172A' : '#F8FAFC', color: !type ? 'white' : 'text.primary', flexShrink: 0 }}
        />
        {Object.entries(typeConfig).map(([key, cfg]) => (
          typeCounts[key] ? (
            <Chip key={key}
              label={`${cfg.emoji} ${cfg.label} (${typeCounts[key]})`}
              onClick={() => setType(type === key ? '' : key)}
              sx={{ fontWeight: 700, flexShrink: 0, bgcolor: type === key ? cfg.color : cfg.bg, color: type === key ? 'white' : cfg.color, border: `1px solid ${cfg.color}30` }}
            />
          ) : null
        ))}
      </Box>

      {/* Search + filters */}
      <Box sx={{ bgcolor: 'white', borderRadius: 3, border: '1.5px solid rgba(0,0,0,0.08)', p: { xs: 2, sm: 2.5 }, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <Box display="flex" gap={1.5} alignItems="center">
          <TextField
            fullWidth
            placeholder="Tafuta resources kwa jina, somo, aina..."
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
        </Box>
        <Collapse in={showFilters}>
          <Box display="flex" gap={2} mt={2} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Somo</InputLabel>
              <Select value={subjectId} label="Somo" onChange={(e) => setSubjectId(e.target.value)} sx={{ borderRadius: 2 }}>
                <MenuItem value="">Masomo Yote</MenuItem>
                {subjects.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>
            {hasAnyFilter && (
              <Button onClick={clearAll} size="small" sx={{ color: '#EF4444', alignSelf: 'center' }} startIcon={<Close fontSize="small" />}>
                Clear all
              </Button>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* Results count */}
      {!loading && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {filtered.length} resource{filtered.length !== 1 ? 's' : ''} {hasAnyFilter ? 'found' : 'available'}
          </Typography>
          {hasAnyFilter && (
            <Button size="small" onClick={clearAll} sx={{ color: '#64748B', fontSize: '0.75rem' }}>
              Clear filters
            </Button>
          )}
        </Box>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={10}><CircularProgress sx={{ color: '#059669' }} /></Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, bgcolor: 'white', borderRadius: 3, border: '2px dashed rgba(0,0,0,0.08)' }}>
          <Typography fontSize={52} mb={2}>📭</Typography>
          <Typography variant="h6" fontWeight={700} mb={1}>Hakuna rasilimali zilizopatikana</Typography>
          <Typography color="text.secondary" mb={2}>
            {hasAnyFilter ? 'Jaribu kubadilisha utafutaji wako.' : 'Hakuna resources bado zimewekwa.'}
          </Typography>
          {hasAnyFilter && <Button onClick={clearAll} sx={{ color: '#059669' }}>Futa Filters</Button>}
        </Box>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          {filtered.map((r) => (
            <Grid item xs={12} sm={6} md={4} key={r.id}>
              <ResourceCard resource={r} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
