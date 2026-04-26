import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Container, Grid, Typography, Chip } from '@mui/material';
import { ArrowForward, CheckCircle, PlayArrow } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Count-up animation hook
function useCountUp(target, duration, started) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, started]);
  return count;
}

// Stat card with animated count-up
function StatCard({ value, label, suffix, delay, started }) {
  const num = useCountUp(value, 1800 + delay, started);
  return (
    <Box
      textAlign="center"
      sx={{
        py: { xs: 3, md: 4 }, px: 2, position: 'relative',
        '&::after': { content: '""', position: 'absolute', right: 0, top: '20%', height: '60%', width: '1px', bgcolor: 'rgba(255,255,255,0.12)' },
        '&:last-child::after': { display: 'none' },
      }}
    >
      <Typography sx={{
        fontFamily: '"Sora", sans-serif', fontWeight: 800,
        fontSize: { xs: '2rem', md: '2.8rem' }, lineHeight: 1,
        background: 'linear-gradient(135deg, #34d399 0%, #6EE7B7 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5,
      }}>
        {num.toLocaleString()}{suffix}
      </Typography>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '0.85rem' }}>
        {label}
      </Typography>
    </Box>
  );
}

// Feature card with hover animations
function FeatureCard({ icon, title, desc, color, bg, index }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <Box
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        p: 3.5, height: '100%', borderRadius: 3, cursor: 'default',
        border: `1.5px solid ${hovered ? color + '60' : 'rgba(0,0,0,0.07)'}`,
        background: hovered ? `linear-gradient(135deg, ${bg}, white)` : 'white',
        boxShadow: hovered ? `0 20px 40px ${color}20` : '0 2px 8px rgba(0,0,0,0.04)',
        transform: visible ? (hovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0)') : 'translateY(30px)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        transitionDelay: visible ? `${index * 80}ms` : '0ms',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right, ${color}18, transparent 70%)`, opacity: hovered ? 1 : 0, transition: 'opacity 0.3s' }} />
      <Box sx={{ width: 52, height: 52, borderRadius: 2.5, bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, mb: 2.5, border: `1.5px solid ${color}25`, transform: hovered ? 'scale(1.15) rotate(-4deg)' : 'scale(1)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
        {icon}
      </Box>
      <Typography variant="h6" fontWeight={700} mb={1.5} fontSize="1rem" sx={{ color: hovered ? color : '#0F172A', transition: 'color 0.3s' }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" lineHeight={1.75} fontSize="0.88rem">{desc}</Typography>
    </Box>
  );
}

// Animated progress bar (fills when in view)
function AnimatedBar({ subject, progress, color, delay, started }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!started) return;
    const t = setTimeout(() => setWidth(progress), delay);
    return () => clearTimeout(t);
  }, [started, progress, delay]);
  return (
    <Box mb={2.5}>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{subject}</Typography>
        <Typography variant="body2" sx={{ color, fontWeight: 800, fontFamily: '"Sora", sans-serif' }}>{progress}%</Typography>
      </Box>
      <Box sx={{ height: 8, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${width}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, borderRadius: 10, transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: `0 0 12px ${color}80` }} />
      </Box>
    </Box>
  );
}

const features = [
  { icon: '📖', title: 'Masomo ya Kidijitali', desc: 'Study materials for all Tanzania curriculum subjects — Hisabati, Kiswahili, Sayansi, na zaidi.', color: '#059669', bg: '#ECFDF5' },
  { icon: '📋', title: 'NECTA Past Papers', desc: 'Download PSLE, CSEE, and ACSEE past papers going back years. Jipange vizuri kwa mitihani.', color: '#3B82F6', bg: '#EFF6FF' },
  { icon: '🧠', title: 'Interactive Quizzes', desc: 'Test your knowledge with quizzes created by teachers. Get instant feedback and detailed scores.', color: '#8B5CF6', bg: '#F5F3FF' },
  { icon: '📊', title: 'Track Progress', desc: 'Monitor your performance across subjects, track learning streaks, and see your growth over time.', color: '#F59E0B', bg: '#FFFBEB' },
];

const benefits = ['Tanzania NECTA curriculum aligned', 'Accessible from any device', 'Created by qualified teachers', 'Free for all students'];

const progressBars = [
  { subject: 'Hisabati', progress: 78, color: '#34d399', delay: 200 },
  { subject: 'Kiswahili', progress: 91, color: '#6EE7B7', delay: 400 },
  { subject: 'Sayansi', progress: 65, color: '#F59E0B', delay: 600 },
  { subject: 'English', progress: 84, color: '#A78BFA', delay: 800 },
];

const steps = [
  { step: '01', icon: '✍️', title: 'Jisajili Bure', desc: 'Tengeneza akaunti yako kwa sekunde chache. Hakuna malipo, hakuna masharti.' },
  { step: '02', icon: '📚', title: 'Chagua Masomo', desc: 'Chagua masomo unayoyapenda na uanze kupata vifaa vya kujifunzia.' },
  { step: '03', icon: '🏆', title: 'Fanya Vizuri', desc: 'Fanya mazoezi, pima maarifa yako, na upate matokeo mazuri mitihani.' },
];

const floatingDots = [
  { top: '18%', left: '7%', size: 6, color: '#34d399', duration: 4, delay: '0s' },
  { top: '72%', left: '4%', size: 4, color: '#6EE7B7', duration: 6, delay: '1s' },
  { top: '28%', left: '93%', size: 8, color: '#F59E0B', duration: 5, delay: '0.5s' },
  { top: '82%', left: '89%', size: 5, color: '#34d399', duration: 7, delay: '2s' },
  { top: '50%', left: '96%', size: 3, color: '#A78BFA', duration: 4.5, delay: '1.5s' },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const statsRef = useRef(null);
  const ctaRef = useRef(null);
  const [statsStarted, setStatsStarted] = useState(false);
  const [ctaStarted, setCtaStarted] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => { const t = setTimeout(() => setHeroVisible(true), 80); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const sObs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsStarted(true); }, { threshold: 0.3 });
    const cObs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setCtaStarted(true); }, { threshold: 0.2 });
    if (statsRef.current) sObs.observe(statsRef.current);
    if (ctaRef.current) cObs.observe(ctaRef.current);
    return () => { sObs.disconnect(); cObs.disconnect(); };
  }, []);

  const slide = (delay) => ({
    transform: heroVisible ? 'translateY(0)' : 'translateY(28px)',
    opacity: heroVisible ? 1 : 0,
    transition: `all 0.8s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
  });

  return (
    <Box sx={{ overflowX: 'hidden' }}>

      {/* ── HERO ── */}
      <Box sx={{
        background: 'linear-gradient(135deg, #011c16 0%, #022c22 35%, #064e3b 70%, #065f46 100%)',
        color: 'white', pt: { xs: 9, md: 13 }, pb: { xs: 14, md: 18 },
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glowing orbs */}
        <Box sx={{ position: 'absolute', top: -100, right: -120, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.18) 0%, transparent 70%)', animation: 'pulse1 6s ease-in-out infinite', '@keyframes pulse1': { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.12)' } } }} />
        <Box sx={{ position: 'absolute', bottom: -80, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)', animation: 'pulse1 8s ease-in-out infinite reverse' }} />
        {/* Dot grid */}
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
        {/* Floating dots */}
        {floatingDots.map((p, i) => (
          <Box key={i} sx={{
            position: 'absolute', width: p.size, height: p.size, borderRadius: '50%',
            bgcolor: p.color, top: p.top, left: p.left, opacity: 0.35,
            animation: `floatDot ${p.duration}s ease-in-out infinite`,
            animationDelay: p.delay, pointerEvents: 'none',
            '@keyframes floatDot': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-18px)' } },
          }} />
        ))}

        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          <Box textAlign="center" maxWidth={780} mx="auto">
            <Box sx={slide(0)}>
              <Chip
                label="🇹🇿 Built for Tanzania"
                sx={{ mb: 3, bgcolor: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)', fontWeight: 700, fontSize: '0.8rem',
                  animation: 'chipGlow 3s ease-in-out infinite',
                  '@keyframes chipGlow': { '0%,100%': { boxShadow: '0 0 0 0 rgba(52,211,153,0)' }, '50%': { boxShadow: '0 0 0 6px rgba(52,211,153,0.08)' } }
                }}
              />
            </Box>
            <Box sx={slide(100)}>
              <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '4rem' }, mb: 2.5, lineHeight: 1.08, letterSpacing: '-0.03em', fontFamily: '"Sora", sans-serif', fontWeight: 800 }}>
                Jifunze Smarter,{' '}
                <Box component="span" sx={{
                  background: 'linear-gradient(90deg, #34d399, #6EE7B7, #A7F3D0, #34d399)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundSize: '300% 100%',
                  animation: 'shimmer 4s linear infinite',
                  '@keyframes shimmer': { '0%': { backgroundPosition: '100% center' }, '100%': { backgroundPosition: '-100% center' } },
                }}>
                  Achieve More
                </Box>
              </Typography>
            </Box>
            <Box sx={slide(200)}>
              <Typography variant="h6" sx={{ opacity: 0.72, mb: 5.5, maxWidth: 560, mx: 'auto', fontWeight: 400, fontSize: { xs: '1.05rem', md: '1.18rem' }, lineHeight: 1.75 }}>
                Jukwaa la kujifunza kwa wanafunzi na walimu wa Tanzania. Toka Standard 1 hadi Form 6, tuna kila kitu unachohitaji.
              </Typography>
            </Box>
            <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap" sx={slide(300)}>
              {user ? (
                <Button variant="contained" size="large" color="secondary" endIcon={<ArrowForward />} onClick={() => navigate('/dashboard')}
                  sx={{ px: 4.5, py: 1.6, fontSize: '1rem', borderRadius: 2.5, fontWeight: 700, boxShadow: '0 8px 24px rgba(245,158,11,0.4)', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 32px rgba(245,158,11,0.5)' }, transition: 'all 0.25s ease' }}>
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button variant="contained" size="large" color="secondary" endIcon={<ArrowForward />} onClick={() => navigate('/register')}
                    sx={{ px: 4.5, py: 1.6, fontSize: '1rem', borderRadius: 2.5, fontWeight: 700, boxShadow: '0 8px 24px rgba(245,158,11,0.4)', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 32px rgba(245,158,11,0.5)' }, transition: 'all 0.25s ease' }}>
                    Anza Bure Leo
                  </Button>
                  <Button variant="outlined" size="large" startIcon={<PlayArrow />} onClick={() => navigate('/login')}
                    sx={{ px: 4, py: 1.6, fontSize: '1rem', borderRadius: 2.5, color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.25)', bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { borderColor: 'rgba(255,255,255,0.6)', bgcolor: 'rgba(255,255,255,0.1)', transform: 'translateY(-2px)' }, transition: 'all 0.25s ease' }}>
                    Ingia
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Container>

        {/* Wave divider */}
        <Box sx={{ position: 'absolute', bottom: -2, left: 0, right: 0, lineHeight: 0 }}>
          <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', width: '100%' }}>
            <path d="M0 60L60 48C120 36 240 12 360 8C480 4 600 20 720 28C840 36 960 36 1080 28C1200 20 1320 4 1380 0L1440 -4V60H0Z" fill="#F8FAFC"/>
          </svg>
        </Box>
      </Box>

      {/* ── ANIMATED STATS BAR ── */}
      <Box ref={statsRef} sx={{
        background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)',
        mx: { md: 4 }, borderRadius: { md: 4 }, mt: { md: -3 },
        position: 'relative', zIndex: 10, boxShadow: '0 20px 60px rgba(2,44,34,0.4)', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(52,211,153,0.07) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          <Grid container>
            <Grid item xs={6} md={3}><StatCard value={5000} suffix="+" label="Wanafunzi Active" delay={0} started={statsStarted} /></Grid>
            <Grid item xs={6} md={3}><StatCard value={12} suffix="" label="Masomo" delay={100} started={statsStarted} /></Grid>
            <Grid item xs={6} md={3}><StatCard value={500} suffix="+" label="Past Papers" delay={200} started={statsStarted} /></Grid>
            <Grid item xs={6} md={3}><StatCard value={1200} suffix="+" label="Maswali ya Quiz" delay={300} started={statsStarted} /></Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── FEATURES ── */}
      <Box sx={{ bgcolor: '#F8FAFC', pt: 12, pb: 10 }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Chip label="Features" sx={{ mb: 2, bgcolor: '#ECFDF5', color: '#059669', fontWeight: 700 }} />
            <Typography variant="h2" sx={{ fontSize: { xs: '1.9rem', md: '2.6rem' }, mb: 2, fontFamily: '"Sora", sans-serif', fontWeight: 800, color: '#0F172A' }}>
              Kila kitu unachohitaji kufaulu
            </Typography>
            <Typography variant="body1" color="text.secondary" maxWidth={480} mx="auto" lineHeight={1.85} fontSize="0.95rem">
              Built specifically for Tanzania's education system — from syllabus-aligned content to NECTA exam prep.
            </Typography>
          </Box>
          <Grid container spacing={2.5}>
            {features.map((f, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <FeatureCard {...f} index={i} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── HOW IT WORKS ── */}
      <Box sx={{ bgcolor: 'white', py: 10 }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={7}>
            <Chip label="Hatua 3 tu" sx={{ mb: 2, bgcolor: '#EFF6FF', color: '#3B82F6', fontWeight: 700 }} />
            <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.4rem' }, fontFamily: '"Sora", sans-serif', fontWeight: 800, color: '#0F172A' }}>
              Jinsi inavyofanya kazi
            </Typography>
          </Box>
          <Grid container spacing={4} justifyContent="center">
            {steps.map((item, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Box sx={{ textAlign: 'center', p: 4, borderRadius: 4, '&:hover .step-ico': { transform: 'scale(1.15) rotate(-6deg)' } }}>
                  <Typography sx={{ fontFamily: '"Sora",sans-serif', fontWeight: 900, fontSize: '5.5rem', color: '#059669', opacity: 0.07, lineHeight: 1, userSelect: 'none', mb: -1 }}>
                    {item.step}
                  </Typography>
                  <Box className="step-ico" sx={{ width: 72, height: 72, borderRadius: '50%', mx: 'auto', mb: 2.5, background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, border: '2px solid rgba(5,150,105,0.2)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 8px 20px rgba(5,150,105,0.15)' }}>
                    {item.icon}
                  </Box>
                  <Typography variant="h6" fontWeight={700} mb={1.5} sx={{ fontFamily: '"Sora",sans-serif', color: '#0F172A' }}>{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary" lineHeight={1.8} maxWidth={260} mx="auto">{item.desc}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── CTA + ANIMATED PROGRESS ── */}
      <Box ref={ctaRef} sx={{ background: 'linear-gradient(160deg, #F0FDF4 0%, #ECFDF5 50%, #D1FAE5 100%)', borderTop: '1px solid rgba(5,150,105,0.08)', py: 12 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Chip label="Jiunge Nasi" sx={{ mb: 2.5, bgcolor: '#ECFDF5', color: '#059669', fontWeight: 700 }} />
              <Typography variant="h2" sx={{ fontSize: { xs: '1.9rem', md: '2.5rem' }, mb: 2, fontFamily: '"Sora",sans-serif', fontWeight: 800, lineHeight: 1.2, color: '#0F172A' }}>
                Anza Kujifunza Leo —{' '}
                <Box component="span" sx={{ color: '#059669' }}>It's Free</Box>
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={4} lineHeight={1.85} fontSize="0.95rem">
                Join thousands of students across Tanzania already using Elimu Hub to prepare for NECTA exams and beyond.
              </Typography>
              <Box display="flex" flexDirection="column" gap={1.8} mb={4.5}>
                {benefits.map((b, i) => (
                  <Box key={i} display="flex" alignItems="center" gap={1.5} sx={{ opacity: ctaStarted ? 1 : 0, transform: ctaStarted ? 'translateX(0)' : 'translateX(-20px)', transition: `all 0.5s ease ${i * 100 + 200}ms` }}>
                    <CheckCircle sx={{ color: '#059669', fontSize: 20, flexShrink: 0 }} />
                    <Typography variant="body2" fontWeight={600} color="text.primary">{b}</Typography>
                  </Box>
                ))}
              </Box>
              {!user && (
                <Button variant="contained" size="large" endIcon={<ArrowForward />} onClick={() => navigate('/register')}
                  sx={{ px: 4.5, py: 1.6, fontSize: '1rem', borderRadius: 2.5, fontWeight: 700, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 8px 24px rgba(5,150,105,0.35)', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 32px rgba(5,150,105,0.45)' }, transition: 'all 0.25s ease' }}>
                  Create Free Account
                </Button>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ background: 'linear-gradient(145deg, #022c22 0%, #064e3b 60%, #047857 100%)', borderRadius: 4, p: { xs: 3.5, md: 4.5 }, color: 'white', boxShadow: '0 30px 60px rgba(2,44,34,0.35)', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.2), transparent)', pointerEvents: 'none' }} />
                <Box sx={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.15), transparent)', pointerEvents: 'none' }} />
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3.5} sx={{ position: 'relative' }}>
                  <Typography variant="h6" fontWeight={700} sx={{ fontFamily: '"Sora",sans-serif' }}>🎯 Maendeleo ya Masomo</Typography>
                  <Chip label="Form 4" size="small" sx={{ bgcolor: 'rgba(52,211,153,0.15)', color: '#34d399', fontWeight: 700, fontSize: '0.72rem' }} />
                </Box>
                <Box sx={{ position: 'relative' }}>
                  {progressBars.map((bar, i) => (<AnimatedBar key={i} {...bar} started={ctaStarted} />))}
                </Box>
                <Box sx={{ mt: 3.5, pt: 3, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 0.5 }}>WASTANI WA JUMLA</Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Sora",sans-serif', color: '#34d399', lineHeight: 1.1 }}>79.5%</Typography>
                  </Box>
                  <Box sx={{ bgcolor: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 2.5, px: 2.5, py: 1.2, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', fontWeight: 600 }}>STREAK</Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ fontFamily: '"Sora",sans-serif', color: '#F59E0B' }}>🔥 14</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>siku mfululizo</Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── FOOTER ── */}
      <Box sx={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: 'rgba(255,255,255,0.45)', py: 5, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ mb: 1 }}>© 2026 Elimu Hub Tanzania · Made with ❤️ for Tanzania's students</Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)' }}>PSLE · CSEE · ACSEE · NECTA</Typography>
      </Box>
    </Box>
  );
};

export default HomePage;
