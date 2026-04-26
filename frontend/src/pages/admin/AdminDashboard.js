import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Tooltip, Avatar, LinearProgress, Alert,
} from '@mui/material';
import {
  People, School, Folder, Assignment, Security,
  Add, Edit, Delete, Check, Close, Refresh, AdminPanelSettings,
  CheckCircle, Cancel, Pending, CloudUpload, Link as LinkIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const StatCard = ({ icon, label, value, color }) => (
  <Card sx={{ background: `linear-gradient(135deg, ${color}08, ${color}18)`, border: `1.5px solid ${color}25`, height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '20px !important' }}>
      <Box sx={{ width: 50, height: 50, borderRadius: 3, bgcolor: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 24 }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Sora",sans-serif', color: '#0F172A', lineHeight: 1 }}>{value}</Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500} mt={0.3}>{label}</Typography>
      </Box>
    </CardContent>
  </Card>
);

const roleColors = { admin: '#7C3AED', teacher: '#059669', student: '#3B82F6' };
const statusColors = { approved: 'success', pending: 'warning', rejected: 'error' };
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [resources, setResources] = useState([]);
  const [pastPapers, setPastPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Subject dialog
  const [subjectDialog, setSubjectDialog] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', description: '', gradeLevel: 'ordinary', syllabusYear: 2023, colorHex: '#059669' });
  const [savingSubject, setSavingSubject] = useState(false);

  // Past paper upload dialog
  const [paperDialog, setPaperDialog] = useState(false);
  const [paperForm, setPaperForm] = useState({ subjectId: '', year: currentYear, examType: 'CSEE', region: '', paperNumber: '', questionsCount: '', fileUrl: '' });
  const [paperFile, setPaperFile] = useState(null);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'url'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingPaper, setUploadingPaper] = useState(false);

  // Resource upload dialog
  const [resourceDialog, setResourceDialog] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: '', description: '', type: 'notes', subjectId: '', fileUrl: '' });
  const [resourceFile, setResourceFile] = useState(null);
  const [resourceUploadMode, setResourceUploadMode] = useState('file');
  const [uploadingResource, setUploadingResource] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, subjectsRes, resourcesRes, papersRes] = await Promise.all([
        api.get('/users'),
        api.get('/subjects'),
        api.get('/resources?page=1&limit=100'),
        api.get('/exams?limit=100'),
      ]);
      const u = usersRes.data.data || usersRes.data || [];
      const s = subjectsRes.data.data || [];
      const r = resourcesRes.data.data || [];
      const p = papersRes.data.data || [];
      setUsers(u); setSubjects(s); setResources(r); setPastPapers(p);
      setStats({
        totalUsers: u.length,
        students: u.filter(x => x.role === 'student').length,
        teachers: u.filter(x => x.role === 'teacher').length,
        totalSubjects: s.length,
        totalResources: r.length,
        totalPapers: p.length,
        pending: r.filter(x => x.approval_status === 'pending').length,
      });
    } catch { toast.error('Failed to load admin data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── User role change ─────────────────────────────────────────────
  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Role updated!');
    } catch { toast.error('Failed to update role'); }
  };

  // ── Delete user ──────────────────────────────────────────────────
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Futa akaunti ya "${userName}"? Hatua hii haiwezi kurudishwa.`)) return;
    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      toast.success(`Akaunti ya ${userName} imefutwa.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  // ── Resource approval ────────────────────────────────────────────
  const handleApproveResource = async (id, status) => {
    try {
      await api.patch(`/resources/${id}/approve`, { status });
      setResources(resources.map(r => r.id === id ? { ...r, approval_status: status, is_approved: status === 'approved' } : r));
      toast.success(`Resource ${status}!`);
    } catch { toast.error('Failed to update resource'); }
  };

  const handleDeleteResource = async (id) => {
    if (!window.confirm('Delete this resource?')) return;
    try {
      await api.delete(`/resources/${id}`);
      setResources(resources.filter(r => r.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // ── Subject CRUD ─────────────────────────────────────────────────
  const openNewSubject = () => {
    setEditSubject(null);
    setSubjectForm({ name: '', code: '', description: '', gradeLevel: 'ordinary', syllabusYear: 2023, colorHex: '#059669' });
    setSubjectDialog(true);
  };
  const openEditSubject = (s) => {
    setEditSubject(s);
    setSubjectForm({ name: s.name, code: s.code, description: s.description || '', gradeLevel: s.grade_level || 'ordinary', syllabusYear: s.syllabus_year || 2023, colorHex: s.color_hex || '#059669' });
    setSubjectDialog(true);
  };
  const handleSaveSubject = async () => {
    if (!subjectForm.name || !subjectForm.code) { toast.error('Name and code are required'); return; }
    setSavingSubject(true);
    try {
      if (editSubject) {
        const res = await api.put(`/subjects/${editSubject.id}`, subjectForm);
        setSubjects(subjects.map(s => s.id === editSubject.id ? res.data.data : s));
        toast.success('Subject updated!');
      } else {
        const res = await api.post('/subjects', subjectForm);
        setSubjects([...subjects, res.data.data]);
        toast.success('Subject created!');
      }
      setSubjectDialog(false);
    } catch (e) { toast.error(e.message || 'Failed to save'); }
    finally { setSavingSubject(false); }
  };

  // ── Past Paper Upload ────────────────────────────────────────────
  const handleUploadPaper = async () => {
    if (!paperForm.subjectId || !paperForm.year || !paperForm.examType) {
      toast.error('Subject, Year and Exam Type are required'); return;
    }
    if (uploadMode === 'file' && !paperFile) { toast.error('Please select a file'); return; }
    if (uploadMode === 'url' && !paperForm.fileUrl) { toast.error('Please enter a file URL'); return; }

    setUploadingPaper(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('subjectId', paperForm.subjectId);
      formData.append('year', paperForm.year);
      formData.append('examType', paperForm.examType);
      if (paperForm.region) formData.append('region', paperForm.region);
      if (paperForm.paperNumber) formData.append('paperNumber', paperForm.paperNumber);
      if (paperForm.questionsCount) formData.append('questionsCount', paperForm.questionsCount);
      if (uploadMode === 'file' && paperFile) {
        formData.append('file', paperFile);
      } else {
        formData.append('fileUrl', paperForm.fileUrl);
      }

      const res = await api.post('/exams', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded * 100) / e.total)),
      });
      setPastPapers([res.data.data, ...pastPapers]);
      setPaperDialog(false);
      setPaperForm({ subjectId: '', year: currentYear, examType: 'CSEE', region: '', paperNumber: '', questionsCount: '', fileUrl: '' });
      setPaperFile(null);
      setUploadProgress(0);
      toast.success('Past paper uploaded successfully! 🎉');
      setStats(s => s ? { ...s, totalPapers: s.totalPapers + 1 } : s);
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Upload failed');
    } finally { setUploadingPaper(false); }
  };

  const handleDeletePaper = async (id) => {
    if (!window.confirm('Delete this past paper?')) return;
    try {
      await api.delete(`/exams/${id}`);
      setPastPapers(pastPapers.filter(p => p.id !== id));
      toast.success('Past paper deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // ── Resource Upload ──────────────────────────────────────────────
  const handleUploadResource = async () => {
    if (!resourceForm.title || !resourceForm.subjectId || !resourceForm.type) {
      toast.error('Title, Subject and Type are required'); return;
    }
    if (resourceUploadMode === 'file' && !resourceFile) { toast.error('Please select a file'); return; }
    if (resourceUploadMode === 'url' && !resourceForm.fileUrl) { toast.error('Please enter a file URL'); return; }

    setUploadingResource(true);
    try {
      const formData = new FormData();
      formData.append('title', resourceForm.title);
      formData.append('description', resourceForm.description);
      formData.append('type', resourceForm.type);
      formData.append('subjectId', resourceForm.subjectId);
      if (resourceUploadMode === 'file' && resourceFile) {
        formData.append('file', resourceFile);
      } else {
        formData.append('fileUrl', resourceForm.fileUrl);
      }

      const res = await api.post('/resources', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResources([res.data.data, ...resources]);
      setResourceDialog(false);
      setResourceForm({ title: '', description: '', type: 'notes', subjectId: '', fileUrl: '' });
      setResourceFile(null);
      toast.success('Resource uploaded! ✅');
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Upload failed');
    } finally { setUploadingResource(false); }
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" flexDirection="column" gap={2}>
      <CircularProgress sx={{ color: '#7C3AED' }} size={48} />
      <Typography color="text.secondary">Loading admin panel...</Typography>
    </Box>
  );

  if (!stats) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" flexDirection="column" gap={2}>
      <Typography variant="h6" color="text.secondary">Imeshindwa kupakia data. Tafadhali jaribu tena.</Typography>
      <Button variant="contained" onClick={fetchAll} sx={{ bgcolor: '#7C3AED' }}>Jaribu Tena</Button>
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4} flexWrap="wrap" gap={2}>
        <Box>
          <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Security sx={{ color: 'white', fontSize: 22 }} />
            </Box>
            <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Sora",sans-serif' }}>Admin Panel</Typography>
          </Box>
          <Typography color="text.secondary">Karibu, {user?.fullName}. Simamia tovuti yako yote kutoka hapa.</Typography>
        </Box>
        <Button startIcon={<Refresh />} onClick={fetchAll} variant="outlined" sx={{ borderColor: '#7C3AED', color: '#7C3AED' }}>Refresh</Button>
      </Box>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2.5} mb={4}>
          <Grid item xs={6} sm={4} md={2}><StatCard icon={<People />} label="Watumiaji" value={stats.totalUsers} color="#3B82F6" /></Grid>
          <Grid item xs={6} sm={4} md={2}><StatCard icon="🎒" label="Wanafunzi" value={stats.students} color="#059669" /></Grid>
          <Grid item xs={6} sm={4} md={2}><StatCard icon="👩‍🏫" label="Walimu" value={stats.teachers} color="#7C3AED" /></Grid>
          <Grid item xs={6} sm={4} md={2}><StatCard icon={<School />} label="Masomo" value={stats.totalSubjects} color="#F59E0B" /></Grid>
          <Grid item xs={6} sm={4} md={2}><StatCard icon="📋" label="Past Papers" value={stats.totalPapers} color="#EF4444" /></Grid>
          <Grid item xs={6} sm={4} md={2}><StatCard icon={<Folder />} label="Resources" value={stats.totalResources} color="#06B6D4" /></Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 0, borderRadius: '16px 16px 0 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          variant="scrollable" scrollButtons="auto"
          sx={{ px: 2, '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', minWidth: 110 }, '& .Mui-selected': { color: '#7C3AED !important' }, '& .MuiTabs-indicator': { bgcolor: '#7C3AED' } }}>
          <Tab label="👥 Users" />
          <Tab label="📚 Subjects" />
          <Tab label="📋 Past Papers" />
          <Tab label="📁 Resources" />
        </Tabs>
      </Paper>

      <Paper sx={{ borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>

        {/* ── USERS TAB ── */}
        {tab === 0 && (
          <Box>
            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontWeight={700}>All Users ({users.length})</Typography>
              <Typography variant="body2" color="text.secondary">Change roles using the dropdown</Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', fontWeight: 700 } }}>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Grade</TableCell>
                    <TableCell>Joined</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Avatar sx={{ width: 30, height: 30, bgcolor: roleColors[u.role] || '#059669', fontSize: 11, fontWeight: 700 }}>
                            {u.full_name?.[0]?.toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>{u.full_name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{u.email}</Typography></TableCell>
                      <TableCell>
                        <Select size="small" value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={u.id === user?.id}
                          sx={{ fontSize: '0.78rem', borderRadius: 2, minWidth: 100 }}>
                          <MenuItem value="student">Student</MenuItem>
                          <MenuItem value="teacher">Teacher</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{u.grade || '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{new Date(u.created_at).toLocaleDateString()}</Typography></TableCell>
                      <TableCell>
                        <Tooltip title={u.id === user?.id ? 'Cannot delete your own account' : u.role === 'admin' ? 'Cannot delete admin' : `Delete ${u.full_name}`}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={u.id === user?.id || u.role === 'admin'}
                              onClick={() => handleDeleteUser(u.id, u.full_name)}
                              sx={{ color: '#EF4444', '&:hover': { bgcolor: '#FEF2F2' }, '&.Mui-disabled': { color: '#CBD5E1' } }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── SUBJECTS TAB ── */}
        {tab === 1 && (
          <Box>
            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontWeight={700}>Subjects ({subjects.length})</Typography>
              <Button variant="contained" startIcon={<Add />} size="small" onClick={openNewSubject}
                sx={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}>
                Add Subject
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', fontWeight: 700 } }}>
                    <TableCell>Subject</TableCell>
                    <TableCell>Code</TableCell>
                    <TableCell>Grade Level</TableCell>
                    <TableCell>Year</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subjects.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: s.color_hex || '#059669', flexShrink: 0 }} />
                          <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Chip label={s.code} size="small" sx={{ fontWeight: 700 }} /></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{s.grade_level}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{s.syllabus_year}</Typography></TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => openEditSubject(s)} sx={{ color: '#7C3AED' }}><Edit fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── PAST PAPERS TAB ── */}
        {tab === 2 && (
          <Box>
            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography fontWeight={700}>Past Papers ({pastPapers.length})</Typography>
                <Typography variant="caption" color="text.secondary">Upload NECTA past papers — PDF files supported up to 100MB</Typography>
              </Box>
              <Button variant="contained" startIcon={<CloudUpload />} onClick={() => setPaperDialog(true)}
                sx={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}>
                Upload Past Paper
              </Button>
            </Box>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', fontWeight: 700 } }}>
                    <TableCell>Subject</TableCell>
                    <TableCell>Year</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Region</TableCell>
                    <TableCell>Paper</TableCell>
                    <TableCell>Downloads</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pastPapers.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell><Typography variant="body2" fontWeight={600}>{p.subject_name || '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight={700} color="#EF4444">{p.year}</Typography></TableCell>
                      <TableCell>
                        <Chip label={p.exam_type} size="small"
                          sx={{ bgcolor: p.exam_type === 'PSLE' ? '#EFF6FF' : p.exam_type === 'CSEE' ? '#ECFDF5' : '#FFF7ED',
                                color: p.exam_type === 'PSLE' ? '#3B82F6' : p.exam_type === 'CSEE' ? '#059669' : '#F59E0B', fontWeight: 700 }} />
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{p.region || '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{p.paper_number ? `Paper ${p.paper_number}` : '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{p.downloads_count || 0}</Typography></TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="View/Download">
                            <IconButton size="small" href={p.file_url} target="_blank" sx={{ color: '#3B82F6' }}>
                              <CloudUpload fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDeletePaper(p.id)} sx={{ color: '#EF4444' }}><Delete fontSize="small" /></IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pastPapers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                        <Typography color="text.secondary">No past papers yet. Upload the first one!</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── RESOURCES TAB ── */}
        {tab === 3 && (
          <Box>
            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography fontWeight={700}>Resources ({resources.length})</Typography>
                <Chip label={`${resources.filter(r => r.approval_status === 'pending').length} pending`} color="warning" size="small" sx={{ ml: 1 }} />
              </Box>
              <Button variant="contained" startIcon={<Add />} onClick={() => setResourceDialog(true)}
                sx={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)', boxShadow: '0 4px 12px rgba(6,182,212,0.35)' }}>
                Add Resource
              </Button>
            </Box>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', fontWeight: 700 } }}>
                    <TableCell>Title</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>By</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resources.map((r) => (
                    <TableRow key={r.id} hover sx={{ bgcolor: r.approval_status === 'pending' ? '#FFFBEB' : 'inherit' }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.title}
                        </Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{r.subject_name || '—'}</Typography></TableCell>
                      <TableCell><Chip label={r.type} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} /></TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{r.uploader_name || '—'}</Typography></TableCell>
                      <TableCell>
                        <Chip label={r.approval_status} size="small" color={statusColors[r.approval_status] || 'default'} />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.3}>
                          {r.approval_status !== 'approved' && (
                            <Tooltip title="Approve"><IconButton size="small" onClick={() => handleApproveResource(r.id, 'approved')} sx={{ color: '#059669' }}><Check fontSize="small" /></IconButton></Tooltip>
                          )}
                          {r.approval_status !== 'rejected' && (
                            <Tooltip title="Reject"><IconButton size="small" onClick={() => handleApproveResource(r.id, 'rejected')} sx={{ color: '#F59E0B' }}><Close fontSize="small" /></IconButton></Tooltip>
                          )}
                          <Tooltip title="Delete"><IconButton size="small" onClick={() => handleDeleteResource(r.id)} sx={{ color: '#EF4444' }}><Delete fontSize="small" /></IconButton></Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* ══ SUBJECT DIALOG ══════════════════════════════════════════════ */}
      <Dialog open={subjectDialog} onClose={() => setSubjectDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontFamily: '"Sora",sans-serif', fontWeight: 700 }}>
          {editSubject ? '✏️ Edit Subject' : '➕ New Subject'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={8}><TextField fullWidth label="Subject Name *" value={subjectForm.name} onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })} /></Grid>
            <Grid item xs={4}><TextField fullWidth label="Code *" value={subjectForm.code} onChange={e => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Description" multiline rows={2} value={subjectForm.description} onChange={e => setSubjectForm({ ...subjectForm, description: e.target.value })} /></Grid>
            <Grid item xs={6}>
              <FormControl fullWidth><InputLabel>Grade Level</InputLabel>
                <Select value={subjectForm.gradeLevel} label="Grade Level" onChange={e => setSubjectForm({ ...subjectForm, gradeLevel: e.target.value })}>
                  <MenuItem value="primary">Primary (Std 1–7)</MenuItem>
                  <MenuItem value="ordinary">Ordinary (Form 1–4)</MenuItem>
                  <MenuItem value="advanced">Advanced (Form 5–6)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={3}><TextField fullWidth label="Year" type="number" value={subjectForm.syllabusYear} onChange={e => setSubjectForm({ ...subjectForm, syllabusYear: parseInt(e.target.value) })} /></Grid>
            <Grid item xs={3}><TextField fullWidth label="Color" type="color" value={subjectForm.colorHex} onChange={e => setSubjectForm({ ...subjectForm, colorHex: e.target.value })} InputProps={{ sx: { height: 56 } }} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setSubjectDialog(false)} variant="outlined">Cancel</Button>
          <Button variant="contained" onClick={handleSaveSubject} disabled={savingSubject}
            sx={{ background: 'linear-gradient(135deg,#7C3AED,#6D28D9)' }}>
            {savingSubject ? 'Saving...' : editSubject ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ PAST PAPER UPLOAD DIALOG ════════════════════════════════════ */}
      <Dialog open={paperDialog} onClose={() => !uploadingPaper && setPaperDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontFamily: '"Sora",sans-serif', fontWeight: 700 }}>📋 Upload Past Paper</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            Upload NECTA past papers (PSLE, CSEE, ACSEE) in PDF format. Max 100MB.
          </Alert>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Somo (Subject) *</InputLabel>
                <Select value={paperForm.subjectId} label="Somo (Subject) *" onChange={e => setPaperForm({ ...paperForm, subjectId: e.target.value })}>
                  {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth required>
                <InputLabel>Exam Type *</InputLabel>
                <Select value={paperForm.examType} label="Exam Type *" onChange={e => setPaperForm({ ...paperForm, examType: e.target.value })}>
                  <MenuItem value="PSLE">PSLE (Primary)</MenuItem>
                  <MenuItem value="CSEE">CSEE (O-Level)</MenuItem>
                  <MenuItem value="ACSEE">ACSEE (A-Level)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth required>
                <InputLabel>Year *</InputLabel>
                <Select value={paperForm.year} label="Year *" onChange={e => setPaperForm({ ...paperForm, year: e.target.value })}>
                  {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Region (e.g. National)" value={paperForm.region} onChange={e => setPaperForm({ ...paperForm, region: e.target.value })} />
            </Grid>
            <Grid item xs={3}>
              <TextField fullWidth label="Paper No." type="number" value={paperForm.paperNumber} onChange={e => setPaperForm({ ...paperForm, paperNumber: e.target.value })} />
            </Grid>
            <Grid item xs={3}>
              <TextField fullWidth label="Questions" type="number" value={paperForm.questionsCount} onChange={e => setPaperForm({ ...paperForm, questionsCount: e.target.value })} />
            </Grid>

            {/* Upload mode toggle */}
            <Grid item xs={12}>
              <Box display="flex" gap={1} mb={1}>
                <Button size="small" variant={uploadMode === 'file' ? 'contained' : 'outlined'} startIcon={<CloudUpload />} onClick={() => setUploadMode('file')}>Upload File</Button>
                <Button size="small" variant={uploadMode === 'url' ? 'contained' : 'outlined'} startIcon={<LinkIcon />} onClick={() => setUploadMode('url')}>Use URL</Button>
              </Box>
              {uploadMode === 'file' ? (
                <Box sx={{ border: '2px dashed rgba(0,0,0,0.15)', borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: '#EF4444', bgcolor: '#FEF2F2' } }}
                  onClick={() => document.getElementById('paper-file-input').click()}>
                  <input id="paper-file-input" type="file" accept=".pdf,.doc,.docx,.zip" hidden onChange={e => setPaperFile(e.target.files[0])} />
                  <CloudUpload sx={{ fontSize: 36, color: paperFile ? '#059669' : '#CBD5E1', mb: 1 }} />
                  <Typography variant="body2" color={paperFile ? '#059669' : 'text.secondary'} fontWeight={600}>
                    {paperFile ? `✅ ${paperFile.name} (${(paperFile.size / 1024 / 1024).toFixed(1)} MB)` : 'Click to select PDF file'}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">PDF, DOC, DOCX, ZIP — up to 100MB</Typography>
                </Box>
              ) : (
                <TextField fullWidth label="File URL (Google Drive, Dropbox, etc.)" value={paperForm.fileUrl}
                  onChange={e => setPaperForm({ ...paperForm, fileUrl: e.target.value })}
                  placeholder="https://drive.google.com/..." />
              )}
            </Grid>

            {uploadingPaper && uploadProgress > 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" mb={0.5} fontWeight={600}>Uploading... {uploadProgress}%</Typography>
                <LinearProgress variant="determinate" value={uploadProgress} sx={{ borderRadius: 5, height: 8 }} />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setPaperDialog(false)} variant="outlined" disabled={uploadingPaper}>Cancel</Button>
          <Button variant="contained" onClick={handleUploadPaper} disabled={uploadingPaper}
            sx={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)', px: 3 }}>
            {uploadingPaper ? `Uploading ${uploadProgress}%...` : '📤 Upload Paper'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ RESOURCE UPLOAD DIALOG ══════════════════════════════════════ */}
      <Dialog open={resourceDialog} onClose={() => !uploadingResource && setResourceDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontFamily: '"Sora",sans-serif', fontWeight: 700 }}>📁 Add Learning Resource</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}><TextField fullWidth label="Title *" value={resourceForm.title} onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Description" multiline rows={2} value={resourceForm.description} onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })} /></Grid>
            <Grid item xs={6}>
              <FormControl fullWidth required>
                <InputLabel>Subject *</InputLabel>
                <Select value={resourceForm.subjectId} label="Subject *" onChange={e => setResourceForm({ ...resourceForm, subjectId: e.target.value })}>
                  {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth required>
                <InputLabel>Type *</InputLabel>
                <Select value={resourceForm.type} label="Type *" onChange={e => setResourceForm({ ...resourceForm, type: e.target.value })}>
                  <MenuItem value="notes">📝 Notes</MenuItem>
                  <MenuItem value="pdf">📄 PDF</MenuItem>
                  <MenuItem value="video">🎥 Video</MenuItem>
                  <MenuItem value="presentation">📊 Presentation</MenuItem>
                  <MenuItem value="exercise">✏️ Exercise</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Box display="flex" gap={1} mb={1}>
                <Button size="small" variant={resourceUploadMode === 'file' ? 'contained' : 'outlined'} startIcon={<CloudUpload />} onClick={() => setResourceUploadMode('file')}>Upload File</Button>
                <Button size="small" variant={resourceUploadMode === 'url' ? 'contained' : 'outlined'} startIcon={<LinkIcon />} onClick={() => setResourceUploadMode('url')}>Use URL</Button>
              </Box>
              {resourceUploadMode === 'file' ? (
                <Box sx={{ border: '2px dashed rgba(0,0,0,0.15)', borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: '#06B6D4', bgcolor: '#ECFEFF' } }}
                  onClick={() => document.getElementById('resource-file-input').click()}>
                  <input id="resource-file-input" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.png,.jpg" hidden onChange={e => setResourceFile(e.target.files[0])} />
                  <CloudUpload sx={{ fontSize: 36, color: resourceFile ? '#059669' : '#CBD5E1', mb: 1 }} />
                  <Typography variant="body2" color={resourceFile ? '#059669' : 'text.secondary'} fontWeight={600}>
                    {resourceFile ? `✅ ${resourceFile.name}` : 'Click to select file'}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">PDF, DOC, PPT, MP4, Images — up to 50MB</Typography>
                </Box>
              ) : (
                <TextField fullWidth label="File URL" value={resourceForm.fileUrl}
                  onChange={e => setResourceForm({ ...resourceForm, fileUrl: e.target.value })}
                  placeholder="https://..." />
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setResourceDialog(false)} variant="outlined" disabled={uploadingResource}>Cancel</Button>
          <Button variant="contained" onClick={handleUploadResource} disabled={uploadingResource}
            sx={{ background: 'linear-gradient(135deg,#06B6D4,#0891B2)', px: 3 }}>
            {uploadingResource ? 'Uploading...' : '📤 Add Resource'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
