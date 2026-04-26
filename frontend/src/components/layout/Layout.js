import React, { useState, useRef, useEffect } from 'react';
import {
  AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography,
  Avatar, Menu, MenuItem, Divider, useMediaQuery, useTheme, Tooltip, Chip,
  InputBase, Paper, Popper, ClickAwayListener, CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, School, Assignment, Quiz,
  TrendingUp, Folder, Person, Logout, AdminPanelSettings, Security,
  Search, Close, AutoAwesome,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const DRAWER_WIDTH = 256;

const studentNav = [
  { label: 'Dashboard',  icon: <Dashboard />,         path: '/dashboard' },
  { label: 'Subjects',   icon: <School />,             path: '/subjects' },
  { label: 'TIE AI',     icon: <AutoAwesome />,        path: '/ai', highlight: true },
  { label: 'Past Papers',icon: <Assignment />,         path: '/exams' },
  { label: 'Quizzes',    icon: <Quiz />,               path: '/quizzes' },
  { label: 'Resources',  icon: <Folder />,             path: '/resources' },
  { label: 'Progress',   icon: <TrendingUp />,         path: '/progress' },
  { label: 'Profile',    icon: <Person />,             path: '/profile' },
];
const teacherNav = [
  { label: 'Dashboard',     icon: <Dashboard />,          path: '/dashboard' },
  { label: 'Teacher Panel', icon: <AdminPanelSettings />, path: '/teacher' },
  { label: 'TIE AI',        icon: <AutoAwesome />,        path: '/ai', highlight: true },
  { label: 'Subjects',      icon: <School />,             path: '/subjects' },
  { label: 'Past Papers',   icon: <Assignment />,         path: '/exams' },
  { label: 'Quizzes',       icon: <Quiz />,               path: '/quizzes' },
  { label: 'Resources',     icon: <Folder />,             path: '/resources' },
  { label: 'Profile',       icon: <Person />,             path: '/profile' },
];
const adminNav = [
  { label: 'Dashboard',     icon: <Dashboard />,          path: '/dashboard' },
  { label: 'Admin Panel',   icon: <Security />,           path: '/admin',   highlight: true },
  { label: 'Teacher Panel', icon: <AdminPanelSettings />, path: '/teacher' },
  { label: 'TIE AI',        icon: <AutoAwesome />,        path: '/ai', highlight: true },
  { label: 'Subjects',      icon: <School />,             path: '/subjects' },
  { label: 'Resources',     icon: <Folder />,             path: '/resources' },
  { label: 'Profile',       icon: <Person />,             path: '/profile' },
];

const roleColors = { admin: '#7C3AED', teacher: '#059669', student: '#3B82F6' };
const roleLabels = { admin: 'Admin', teacher: 'Mwalimu', student: 'Mwanafunzi' };

// ── Global Search ────────────────────────────────────────────────────────────
function GlobalSearch() {
  const navigate    = useNavigate();
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const anchorRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const q = encodeURIComponent(query.trim());
        const [exams, resources, subjects, quizzes] = await Promise.allSettled([
          api.get(`/exams?limit=4`),
          api.get(`/resources?limit=4`),
          api.get(`/subjects`),
          api.get(`/quizzes?limit=4`),
        ]);
        const filter = (arr) => (Array.isArray(arr) ? arr : []).filter((x) =>
          Object.values(x).some((v) => String(v || '').toLowerCase().includes(query.toLowerCase()))
        ).slice(0, 3);

        const examsData    = exams.status    === 'fulfilled' ? exams.value.data?.data    || [] : [];
        const resourcesData= resources.status=== 'fulfilled' ? resources.value.data?.data|| [] : [];
        const subjectsData = subjects.status === 'fulfilled' ? subjects.value.data?.data || [] : [];
        const quizzesData  = quizzes.status  === 'fulfilled' ? quizzes.value.data?.data  || [] : [];

        setResults({
          exams:     filter(examsData),
          resources: filter(resourcesData),
          subjects:  filter(subjectsData),
          quizzes:   filter(quizzesData),
        });
      } catch {}
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const total = results ? Object.values(results).reduce((a, b) => a + b.length, 0) : 0;

  const go = (path) => {
    navigate(path);
    setOpen(false);
    setQuery('');
    setResults(null);
  };

  return (
    <Box ref={anchorRef} sx={{ flex: 1, maxWidth: { xs: open ? 220 : 36, sm: 340 }, mx: { xs: 0.5, sm: 2 }, transition: 'max-width 0.25s' }}>
      <Paper
        elevation={0}
        sx={{
          display: 'flex', alignItems: 'center',
          border: open ? '1.5px solid #059669' : '1.5px solid rgba(0,0,0,0.1)',
          borderRadius: 2.5, px: 1.5, py: 0.5, bgcolor: open ? 'white' : '#F8FAFC',
          transition: 'all 0.2s ease', cursor: 'pointer',
        }}
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
      >
        {loading
          ? <CircularProgress size={16} sx={{ color: '#059669', mr: 1, flexShrink: 0 }} />
          : <Search sx={{ color: '#94A3B8', fontSize: 18, mr: 1, flexShrink: 0 }} />}
        <InputBase
          inputRef={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Tafuta..."
          sx={{ fontSize: '0.875rem', flex: 1, minWidth: 0 }}
        />
        {query && (
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setQuery(''); setResults(null); }} sx={{ p: 0.3 }}>
            <Close sx={{ fontSize: 16, color: '#94A3B8' }} />
          </IconButton>
        )}
      </Paper>

      <Popper open={open && !!results} anchorEl={anchorRef.current} placement="bottom-start"
        style={{ zIndex: 1400, width: anchorRef.current?.offsetWidth || 340, minWidth: 280, maxWidth: 400 }}>
        <ClickAwayListener onClickAway={() => { setOpen(false); }}>
          <Paper elevation={8} sx={{ mt: 1, borderRadius: 2.5, overflow: 'hidden', border: '1.5px solid rgba(0,0,0,0.08)', maxHeight: '70vh', overflowY: 'auto' }}>
            {total === 0 && query ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Hakuna matokeo kwa "{query}"</Typography>
              </Box>
            ) : (
              <>
                {results?.subjects?.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      📚 Subjects
                    </Typography>
                    {results.subjects.map((s) => (
                      <MenuItem key={s.id} onClick={() => go(`/subjects/${s.id}`)} sx={{ py: 1.2, px: 2, gap: 1.5 }}>
                        <School fontSize="small" sx={{ color: '#059669' }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.grade_level}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                    <Divider />
                  </Box>
                )}
                {results?.exams?.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      📋 Past Papers
                    </Typography>
                    {results.exams.map((e) => (
                      <MenuItem key={e.id} onClick={() => go('/exams')} sx={{ py: 1.2, px: 2, gap: 1.5 }}>
                        <Assignment fontSize="small" sx={{ color: '#3B82F6' }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{e.subject_name} {e.year}</Typography>
                          <Typography variant="caption" color="text.secondary">{e.exam_type}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                    <Divider />
                  </Box>
                )}
                {results?.resources?.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      📁 Resources
                    </Typography>
                    {results.resources.map((r) => (
                      <MenuItem key={r.id} onClick={() => go('/resources')} sx={{ py: 1.2, px: 2, gap: 1.5 }}>
                        <Folder fontSize="small" sx={{ color: '#F59E0B' }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{r.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{r.subject_name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                    <Divider />
                  </Box>
                )}
                {results?.quizzes?.length > 0 && (
                  <Box>
                    <Typography variant="caption" sx={{ px: 2, pt: 1.5, pb: 0.5, display: 'block', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      🧠 Quizzes
                    </Typography>
                    {results.quizzes.map((q) => (
                      <MenuItem key={q.id} onClick={() => go(`/quiz/${q.id}`)} sx={{ py: 1.2, px: 2, gap: 1.5 }}>
                        <Quiz fontSize="small" sx={{ color: '#8B5CF6' }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{q.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{q.subject_name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Box>
                )}
                <Box sx={{ p: 1.5, borderTop: '1px solid rgba(0,0,0,0.06)', bgcolor: '#FAFAFA' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                    {total} result{total !== 1 ? 's' : ''} · Press Enter to search all
                  </Typography>
                </Box>
              </>
            )}
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
}

// ── Layout ───────────────────────────────────────────────────────────────────
const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl]     = useState(null);

  const navItems    = user?.role === 'admin' ? adminNav : user?.role === 'teacher' ? teacherNav : studentNav;
  const isPublicPage = ['/', '/login', '/register'].includes(location.pathname);

  // Close drawer on route change on mobile
  useEffect(() => { if (isMobile) setMobileOpen(false); }, [location.pathname, isMobile]);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0F172A' }}>
      {/* Logo */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #059669, #34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📚</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700, lineHeight: 1.2, fontFamily: '"Sora", sans-serif', fontSize: '0.95rem' }}>
            Elimu Hub
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>Tanzania</Typography>
        </Box>
      </Box>

      {/* User card */}
      {user && (
        <Box sx={{ mx: 1.5, my: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <Box display="flex" alignItems="center" gap={1.2}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: roleColors[user.role] || '#059669', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {user.fullName?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ color: 'white', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.fullName}
              </Typography>
              <Chip label={roleLabels[user.role] || user.role} size="small"
                sx={{ height: 17, fontSize: '0.62rem', bgcolor: (roleColors[user.role] || '#059669') + '30', color: roleColors[user.role] || '#059669', fontWeight: 700 }} />
            </Box>
          </Box>
        </Box>
      )}

      {/* Nav items */}
      <List sx={{ px: 1.5, py: 1, flex: 1, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === '/quizzes' && location.pathname.startsWith('/quiz'));
          const isAI     = item.path === '/ai';
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.4 }}>
              <ListItemButton
                onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
                sx={{
                  borderRadius: 2, py: 1, px: 1.5, minHeight: 42,
                  bgcolor: isActive
                    ? (isAI ? 'rgba(5,150,105,0.22)' : 'rgba(5,150,105,0.18)')
                    : isAI
                    ? 'rgba(5,150,105,0.08)'
                    : item.highlight ? 'rgba(124,58,237,0.1)' : 'transparent',
                  borderLeft: `3px solid ${isActive ? '#059669' : isAI ? '#059669' : item.highlight ? '#7C3AED' : 'transparent'}`,
                  '&:hover': { bgcolor: isAI ? 'rgba(5,150,105,0.16)' : isActive ? 'rgba(5,150,105,0.22)' : 'rgba(255,255,255,0.06)' },
                  ...(isAI && !isActive && {
                    boxShadow: 'inset 0 0 0 1px rgba(5,150,105,0.2)',
                  }),
                }}
              >
                <ListItemIcon sx={{ minWidth: 34, color: isActive ? '#34d399' : isAI ? '#34d399' : item.highlight ? '#A78BFA' : 'rgba(255,255,255,0.45)', fontSize: 20 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 700 : isAI ? 600 : 500,
                    color: isActive ? '#34d399' : isAI ? '#34d399' : item.highlight ? '#A78BFA' : 'rgba(255,255,255,0.72)',
                  }}
                />
                {isAI && (
                  <Box sx={{ ml: 1, px: 0.8, py: 0.2, borderRadius: 1,
                             background: 'rgba(5,150,105,0.25)', border: '1px solid rgba(5,150,105,0.35)' }}>
                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#34d399', lineHeight: 1.2 }}>NEW</Typography>
                  </Box>
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Logout */}
      {user && (
        <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <ListItemButton
            onClick={() => { logout(); navigate('/'); }}
            sx={{ borderRadius: 2, py: 0.9, '&:hover': { bgcolor: 'rgba(239,68,68,0.12)' } }}
          >
            <ListItemIcon sx={{ minWidth: 34, color: 'rgba(239,68,68,0.65)' }}><Logout fontSize="small" /></ListItemIcon>
            <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.875rem', color: 'rgba(239,68,68,0.65)', fontWeight: 600 }} />
          </ListItemButton>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          color: '#0F172A',
        }}>
        <Toolbar sx={{ minHeight: { xs: '56px !important', sm: '64px !important' }, gap: 1 }}>
          {user && !isPublicPage && (
            <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)}
              sx={{ mr: 0.5, display: { md: 'none' }, color: '#0F172A', flexShrink: 0 }}>
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo */}
          <Box
            display="flex" alignItems="center" gap={1} sx={{ cursor: 'pointer', flexShrink: 0 }}
            onClick={() => navigate(user ? '/dashboard' : '/')}
          >
            <Box sx={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg,#059669,#34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📚</Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: '"Sora", sans-serif', color: '#0F172A', fontSize: { xs: '0.9rem', sm: '1rem' }, display: { xs: user && !isPublicPage ? 'none' : 'block', sm: 'block' } }}>
              Elimu Hub <Box component="span" sx={{ color: '#059669' }}>TZ</Box>
            </Typography>
          </Box>

          {/* Global Search — show when logged in */}
          {user && !isPublicPage && <GlobalSearch />}

          {!user && <Box flex={1} />}

          {/* Right side */}
          {user ? (
            <>
              <Tooltip title={user.fullName}>
                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5, flexShrink: 0 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: roleColors[user.role] || '#059669', fontSize: 13, fontWeight: 700 }}>
                    {user.fullName?.[0]?.toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
                PaperProps={{ sx: { borderRadius: 2.5, mt: 1, minWidth: 190, boxShadow: '0 10px 40px rgba(0,0,0,0.13)' } }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <Typography variant="body2" fontWeight={700}>{user?.fullName}</Typography>
                  <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
                </Box>
                <MenuItem onClick={() => { navigate('/profile'); setAnchorEl(null); }} sx={{ gap: 1.5, py: 1.2, fontSize: '0.875rem' }}>
                  <Person fontSize="small" /> Profile
                </MenuItem>
                {user?.role === 'admin' && (
                  <MenuItem onClick={() => { navigate('/admin'); setAnchorEl(null); }} sx={{ gap: 1.5, py: 1.2, color: '#7C3AED', fontSize: '0.875rem' }}>
                    <Security fontSize="small" /> Admin Panel
                  </MenuItem>
                )}
                <Divider />
                <MenuItem onClick={() => { logout(); navigate('/'); setAnchorEl(null); }} sx={{ gap: 1.5, py: 1.2, color: 'error.main', fontSize: '0.875rem' }}>
                  <Logout fontSize="small" /> Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box display="flex" gap={1} sx={{ flexShrink: 0 }}>
              <Box component="button" onClick={() => navigate('/login')}
                sx={{ border: '1.5px solid #059669', borderRadius: 2, px: { xs: 1.5, sm: 2 }, py: 0.7, color: '#059669', bgcolor: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.85rem' }, '&:hover': { bgcolor: '#05966910' } }}>
                Ingia
              </Box>
              <Box component="button" onClick={() => navigate('/register')}
                sx={{ border: 'none', borderRadius: 2, px: { xs: 1.5, sm: 2 }, py: 0.7, color: 'white', bgcolor: '#059669', cursor: 'pointer', fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.85rem' }, '&:hover': { bgcolor: '#047857' } }}>
                Jisajili
              </Box>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Drawers */}
      {user && !isPublicPage && (
        <>
          <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none', boxShadow: '4px 0 24px rgba(0,0,0,0.15)' } }}>
            {drawer}
          </Drawer>
          <Drawer variant="permanent"
            sx={{ display: { xs: 'none', md: 'block' }, width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none', borderRight: '1px solid rgba(0,0,0,0.06)' } }}>
            {drawer}
          </Drawer>
        </>
      )}

      <Box component="main"
        sx={{
          flexGrow: 1, width: '100%',
          mt: { xs: '56px', sm: '64px' },
          minHeight: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
          bgcolor: '#F8FAFC',
          overflowX: 'hidden',
        }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
