import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, TextField, IconButton, Avatar, Chip,
  CircularProgress, Tooltip, Fade, useTheme, useMediaQuery,
  Drawer, Button, Skeleton, Divider,
} from '@mui/material';
import {
  Send, Add, Delete, AutoAwesome, Person, Menu as MenuIcon,
  Close, ContentCopy, Check, School, Science, Calculate, Biotech,
  Public, HistoryEdu, Language, Gavel, TrendingUp, Computer,
  MenuBook, EditNote, Refresh,
} from '@mui/icons-material';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import api from '../../services/api';
import { toast } from 'react-toastify';

// ── Subjects ──────────────────────────────────────────────────────────────────
const SUBJECTS = [
  { value:'physics',          label:'Physics',          icon:<Science />,    color:'#3B82F6' },
  { value:'chemistry',        label:'Chemistry',        icon:<Biotech />,    color:'#8B5CF6' },
  { value:'mathematics',      label:'Mathematics',      icon:<Calculate />,  color:'#059669' },
  { value:'biology',          label:'Biology',          icon:<Biotech />,    color:'#10B981' },
  { value:'history',          label:'History',          icon:<HistoryEdu />, color:'#F59E0B' },
  { value:'geography',        label:'Geography',        icon:<Public />,     color:'#0EA5E9' },
  { value:'civics',           label:'Civics',           icon:<Gavel />,      color:'#EC4899' },
  { value:'english',          label:'English',          icon:<Language />,   color:'#6366F1' },
  { value:'kiswahili',        label:'Kiswahili',        icon:<MenuBook />,   color:'#EF4444' },
  { value:'commerce',         label:'Commerce',         icon:<TrendingUp />, color:'#F97316' },
  { value:'bookkeeping',      label:'Bookkeeping',      icon:<EditNote />,   color:'#84CC16' },
  { value:'computer_science', label:'Computer Science', icon:<Computer />,   color:'#06B6D4' },
];
const getSI = v => SUBJECTS.find(s => s.value === v) || { label:v||'', color:'#94A3B8', icon:<School/> };

// ════════════════════════════════════════════════════════════════════════════════
// LATEX-AWARE INLINE RENDERER
// Splits text on \(...\) and \[...\] markers, renders each piece correctly.
// Falls back gracefully if KaTeX can't parse the expression.
// ════════════════════════════════════════════════════════════════════════════════
function LatexInline({ tex, isUser }) {
  try {
    return (
      <Box component="span" sx={{ color: isUser ? '#FCD34D' : 'inherit',
        '& .katex': { fontSize: '1em' } }}>
        <InlineMath
          math={tex}
          renderError={(e) => <code style={{ color:'#EF4444', fontSize:'0.82em' }}>{tex}</code>}
        />
      </Box>
    );
  } catch (_) {
    return <code style={{ color: isUser ? '#FCD34D' : '#7C3AED' }}>{tex}</code>;
  }
}

function LatexBlock({ tex }) {
  try {
    return (
      <Box sx={{ my:2, overflowX:'auto', textAlign:'center', px:1,
        '& .katex-display':{ margin:0 },
        '& .katex':{ fontSize:'1.15em' } }}>
        <BlockMath
          math={tex}
          renderError={(e) => (
            <Box component="pre" sx={{ background:'#FEF2F2', color:'#991B1B', p:1.5,
              borderRadius:2, overflowX:'auto', fontSize:'0.8rem', textAlign:'left' }}>
              {tex}
            </Box>
          )}
        />
      </Box>
    );
  } catch (_) {
    return (
      <Box component="pre" sx={{ background:'#F1F5F9', p:1.5, borderRadius:2,
        overflowX:'auto', fontSize:'0.85rem', my:1 }}>
        {tex}
      </Box>
    );
  }
}

// Split a string on LaTeX delimiters and return array of {type, value} tokens
function tokenizeLatex(text) {
  // Note: display math \[...\] is already extracted by MdMsg before this runs.
  // This function only needs to handle INLINE math: \(...\) and $...$
  const tokens = [];
  // Match \(...\) OR single $...$ (not $$, already handled)
  // The negative lookahead/lookbehind prevents matching $$
  const pattern = /\\\(([\s\S]*?)\\\)|\.{0}(?<!\$)\$(?!\$)((?:[^$\n]|\\\$)+?)(?<!\$)\$(?!\$)/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      tokens.push({ type: 'text', value: text.slice(last, match.index) });
    }
    // match[1] = \(...\) content, match[2] = $...$ content
    const mathTex = match[1] !== undefined ? match[1] : match[2];
    if (mathTex !== undefined) {
      tokens.push({ type: 'inline', value: mathTex });
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });
  return tokens;
}

// ── Bold / code / italic inline formatter ─────────────────────────────────────
function TextSpan({ text, isUser }) {
  const parts = []; let rem = text; let k = 0;
  while (rem.length) {
    const bM = rem.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    const cM = rem.match(/^(.*?)`([^`]+)`(.*)/s);
    const cs = [
      bM ? { m:bM, pos:bM[1].length, t:'b' } : null,
      cM ? { m:cM, pos:cM[1].length, t:'c' } : null,
    ].filter(Boolean).sort((a,b) => a.pos - b.pos);
    if (!cs.length) { parts.push(<span key={k++}>{rem}</span>); break; }
    const f = cs[0];
    if (f.pos > 0) parts.push(<span key={k++}>{f.m[1]}</span>);
    if (f.t === 'b') parts.push(<strong key={k++}>{f.m[2]}</strong>);
    else parts.push(
      <Box key={k++} component="code" sx={{
        background: isUser ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
        color: isUser ? '#FCD34D' : '#7C3AED',
        px: 0.8, py: 0.15, borderRadius: 1, fontSize: '0.82em', fontFamily: 'monospace',
      }}>{f.m[2]}</Box>
    );
    rem = f.m[3];
  }
  return <>{parts}</>;
}

// Full inline renderer: LaTeX first, then bold/code within text segments
function Inline({ text, isUser }) {
  const tokens = tokenizeLatex(text);
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.type === 'block') return <LatexBlock key={i} tex={tok.value} />;
        if (tok.type === 'inline') return <LatexInline key={i} tex={tok.value} isUser={isUser} />;
        return <TextSpan key={i} text={tok.value} isUser={isUser} />;
      })}
    </>
  );
}

// ── Full markdown + LaTeX renderer ───────────────────────────────────────────
function MdMsg({ content, isUser }) {
  if (!content) return null;

  // ── STEP 1: Extract multiline \[...\] display math BEFORE splitting by newline.
  // This is the critical fix — splitting first destroys multiline math blocks.
  // We replace every \[...\] (including multiline) with a unique placeholder.
  const mathBlocks = [];
  let src = content.replace(/\\\[([\s\S]*?)\\\]/g, (_, tex) => {
    const ph = `__DMATH_${mathBlocks.length}__`;
    mathBlocks.push(tex.trim());
    return ph;
  });

  // ── STEP 2: Also handle $$...$$ display math (some models use this style)
  src = src.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    const ph = `__DMATH_${mathBlocks.length}__`;
    mathBlocks.push(tex.trim());
    return ph;
  });

  // ── STEP 3: Line-by-line markdown processing
  const lines = src.split('\n');
  const els   = [];
  let inCode  = false;
  let cLines  = [];
  let key     = 0;

  const el = (node) => { els.push(React.cloneElement(node, { key: key++ })); };

  lines.forEach((line) => {
    // ── Code fences ──────────────────────────────────────────────────────────
    if (line.startsWith('```')) {
      if (inCode) {
        el(
          <Box component="pre" sx={{
            background:'#0F172A', color:'#e2e8f0', borderRadius:2,
            p:2, overflowX:'auto', fontSize:'0.82rem', my:1,
            fontFamily:'"Fira Code",monospace', lineHeight:1.65,
          }}>
            <code>{cLines.join('\n')}</code>
          </Box>
        );
        inCode = false; cLines = [];
      } else { inCode = true; }
      return;
    }
    if (inCode) { cLines.push(line); return; }

    // ── Display math placeholder ─────────────────────────────────────────────
    const dmPh = line.trim().match(/^__DMATH_(\d+)__$/);
    if (dmPh) {
      el(<LatexBlock tex={mathBlocks[Number(dmPh[1])]} />);
      return;
    }

    // ── Horizontal rule ──────────────────────────────────────────────────────
    if (/^-{3,}$/.test(line.trim()) || /^\*{3,}$/.test(line.trim())) {
      el(<Divider sx={{ my:1.5, borderColor:isUser?'rgba(255,255,255,0.18)':'rgba(0,0,0,0.08)' }} />);
      return;
    }

    // ── Headings ─────────────────────────────────────────────────────────────
    if (line.startsWith('#### ')) {
      el(<Typography sx={{ fontWeight:700, mt:1, mb:0.3, fontSize:'0.88rem', color:isUser?'white':'#334155' }}>
        <Inline text={line.slice(5)} isUser={isUser}/>
      </Typography>);
      return;
    }
    if (line.startsWith('### ')) {
      el(<Typography sx={{ fontWeight:700, mt:1.5, mb:0.5, fontSize:'0.95rem', color:isUser?'white':'#0F172A' }}>
        <Inline text={line.slice(4)} isUser={isUser}/>
      </Typography>);
      return;
    }
    if (line.startsWith('## ')) {
      el(<Typography sx={{ fontWeight:700, mt:2, mb:0.5, fontSize:'1.05rem', color:isUser?'white':'#059669' }}>
        <Inline text={line.slice(3)} isUser={isUser}/>
      </Typography>);
      return;
    }
    if (line.startsWith('# ')) {
      el(<Typography sx={{ fontWeight:800, mt:2, mb:1, fontSize:'1.12rem', color:isUser?'white':'#059669' }}>
        <Inline text={line.slice(2)} isUser={isUser}/>
      </Typography>);
      return;
    }

    // ── Numbered list ────────────────────────────────────────────────────────
    const numMatch = line.match(/^(\d+)\. (.*)$/);
    if (numMatch) {
      el(
        <Box sx={{ display:'flex', gap:1, my:0.5, pl:1 }}>
          <Typography sx={{ color:isUser?'rgba(255,255,255,0.7)':'#059669', fontWeight:700,
                            minWidth:20, fontSize:'0.85rem', mt:'2px', flexShrink:0 }}>
            {numMatch[1]}.
          </Typography>
          <Typography sx={{ fontSize:'0.9rem', color:isUser?'white':'#1E293B', lineHeight:1.85 }}>
            <Inline text={numMatch[2]} isUser={isUser}/>
          </Typography>
        </Box>
      );
      return;
    }

    // ── Bullet list ──────────────────────────────────────────────────────────
    const bulletMatch = line.match(/^[\*\-•] (.+)$/);
    if (bulletMatch) {
      el(
        <Box sx={{ display:'flex', gap:1, my:0.5, pl:1 }}>
          <Typography sx={{ color:isUser?'rgba(255,255,255,0.55)':'#059669',
                            mt:'4px', fontSize:'0.75rem', flexShrink:0, lineHeight:1 }}>●</Typography>
          <Typography sx={{ fontSize:'0.9rem', color:isUser?'white':'#1E293B', lineHeight:1.85 }}>
            <Inline text={bulletMatch[1]} isUser={isUser}/>
          </Typography>
        </Box>
      );
      return;
    }

    // ── Empty line ───────────────────────────────────────────────────────────
    if (!line.trim()) {
      el(<Box sx={{ height:6 }}/>);
      return;
    }

    // ── Normal paragraph (inline LaTeX + bold/italic/code) ──────────────────
    el(
      <Typography sx={{ fontSize:'0.9rem', color:isUser?'white':'#1E293B', lineHeight:1.9, mb:0.15 }}>
        <Inline text={line} isUser={isUser}/>
      </Typography>
    );
  });

  return <Box>{els}</Box>;
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <Tooltip title={ok ? 'Copied!' : 'Copy response'}>
      <IconButton size="small"
        onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); }}
        sx={{ opacity:0.45, '&:hover':{ opacity:1 } }}>
        {ok ? <Check fontSize="small" sx={{ color:'#059669' }}/> : <ContentCopy fontSize="small"/>}
      </IconButton>
    </Tooltip>
  );
}

function Dots() {
  return (
    <Box sx={{ display:'flex', gap:'5px', alignItems:'center', px:1, py:'6px' }}>
      {[0,1,2].map(i => (
        <Box key={i} sx={{
          width:7, height:7, borderRadius:'50%', background:'#059669',
          animation:'tdot 1.2s infinite', animationDelay:`${i*0.18}s`,
          '@keyframes tdot': { '0%,80%,100%':{ transform:'translateY(0)', opacity:0.35 }, '40%':{ transform:'translateY(-7px)', opacity:1 } },
        }}/>
      ))}
    </Box>
  );
}

// ── Tip suggestions per subject ───────────────────────────────────────────────
const TIPS = {
  physics:          ["Explain Newton's Laws of Motion","How does electric current flow?","What is the photoelectric effect?"],
  chemistry:        ["What is the mole concept?","Explain ionic vs covalent bonding","How does electrolysis work?"],
  mathematics:      ["Differentiate y = x³ + 2x step by step","How do I solve quadratic equations?","Prove the binomial theorem"],
  biology:          ["How does photosynthesis work?","Explain DNA replication","What is natural selection?"],
  history:          ["Explain the Maji Maji rebellion","What was the Arusha Declaration?","Describe colonial rule in Tanzania"],
  geography:        ["What are the major rivers of Tanzania?","Explain the water cycle","What causes climate change?"],
  civics:           ["What are human rights?","Explain separation of powers","What is democracy?"],
  english:          ["Explain the passive voice","How do I write a good essay?","What are figures of speech?"],
  kiswahili:        ["Eleza ngeli za Kiswahili","Jinsi ya kuandika insha nzuri","Maana ya methali"],
  commerce:         ["Explain demand and supply","What is entrepreneurship?","How does insurance work?"],
  bookkeeping:      ["Explain double-entry bookkeeping","What is a trial balance?","How to record journal entries?"],
  computer_science: ["Explain sorting algorithms","What is an operating system?","How does the internet work?"],
};

function EmptyState({ subject, onTip }) {
  const si = getSI(subject);
  return (
    <Box sx={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:3, p:4, textAlign:'center' }}>
      <Box sx={{ width:84, height:84, borderRadius:'24px', display:'flex', alignItems:'center', justifyContent:'center',
                 background:`linear-gradient(135deg,${si.color}20,${si.color}40)`, border:`2px solid ${si.color}40` }}>
        <AutoAwesome sx={{ fontSize:42, color:si.color }}/>
      </Box>
      <Box>
        <Typography variant="h5" sx={{ fontWeight:800, color:'#0F172A', mb:0.5 }}>
          TIE AI — {subject ? si.label : 'Tutor Intelligence Engine'}
        </Typography>
        <Typography sx={{ color:'#64748B', maxWidth:440, lineHeight:1.7 }}>
          {subject
            ? `Ask anything about ${si.label}. TIE AI streams the answer from your textbook — with full LaTeX formulas, worked examples, and step-by-step solutions.`
            : 'Select a subject below, then ask your question. TIE AI reads your official Tanzanian textbook and streams a detailed answer with proper math rendering.'}
        </Typography>
      </Box>
      {subject && TIPS[subject] && (
        <Box sx={{ display:'flex', flexDirection:'column', gap:1, width:'100%', maxWidth:440 }}>
          <Typography variant="caption" sx={{ color:'#94A3B8', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>
            Try asking
          </Typography>
          {TIPS[subject].map((tip, i) => (
            <Box key={i} onClick={() => onTip(tip)}
              sx={{ p:'11px 16px', borderRadius:2, border:'1px solid rgba(0,0,0,0.08)', background:'#F8FAFC', cursor:'pointer',
                   '&:hover':{ background:`${si.color}10`, borderColor:`${si.color}50` }, transition:'all 0.2s' }}>
              <Typography sx={{ fontSize:'0.875rem', color:'#374151' }}>{tip}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  const si = getSI(msg.subject);
  return (
    <Fade in>
      <Box sx={{ display:'flex', gap:1.5, alignItems:'flex-start', flexDirection:isUser?'row-reverse':'row' }}>
        <Avatar sx={{ width:32, height:32, flexShrink:0,
          background: isUser ? 'linear-gradient(135deg,#3B82F6,#2563EB)' : 'linear-gradient(135deg,#059669,#047857)' }}>
          {isUser ? <Person sx={{ fontSize:16 }}/> : <AutoAwesome sx={{ fontSize:16 }}/>}
        </Avatar>
        <Box sx={{ flex:1, maxWidth:'86%' }}>
          <Paper elevation={0} sx={{
            p:'13px 17px',
            borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            background: isUser ? 'linear-gradient(135deg,#059669,#047857)' : 'white',
            border: isUser ? 'none' : '1px solid rgba(0,0,0,0.07)',
            boxShadow: isUser ? '0 4px 14px rgba(5,150,105,0.28)' : '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <MdMsg content={msg.content} isUser={isUser}/>
          </Paper>
          <Box sx={{ display:'flex', alignItems:'center', gap:1, mt:0.6, flexDirection:isUser?'row-reverse':'row' }}>
            {msg.subject && !isUser && (
              <Typography sx={{ fontSize:'0.68rem', color:si.color, fontWeight:700 }}>{si.label}</Typography>
            )}
            {msg.ts && (
              <Typography sx={{ fontSize:'0.65rem', color:'#94A3B8' }}>
                {new Date(msg.ts).toLocaleTimeString('en-TZ', { hour:'2-digit', minute:'2-digit' })}
              </Typography>
            )}
            {!isUser && msg.content && <CopyBtn text={msg.content}/>}
          </Box>
        </Box>
      </Box>
    </Fade>
  );
}

function StreamBubble({ text, thinkingText, isThinking }) {
  const [showThink, setShowThink] = React.useState(false);
  return (
    <Box sx={{ display:'flex', gap:1.5, alignItems:'flex-start' }}>
      <Avatar sx={{ width:32, height:32, flexShrink:0, background:'linear-gradient(135deg,#059669,#047857)' }}>
        <AutoAwesome sx={{ fontSize:16 }}/>
      </Avatar>
      <Box sx={{ flex:1, minWidth:0 }}>
        {/* Thinking section — only shown when reasoning model is used */}
        {thinkingText && (
          <Box sx={{ mb:1 }}>
            <Box onClick={() => setShowThink(v => !v)}
              sx={{ display:'inline-flex', alignItems:'center', gap:0.6, px:1.4, py:0.4, borderRadius:2,
                   bgcolor:'#FEF3C7', border:'1px solid #FDE68A', cursor:'pointer',
                   '&:hover':{ bgcolor:'#FDE68A' }, transition:'all 0.15s' }}>
              <CircularProgress size={10} sx={{ color:'#D97706' }} />
              <Typography sx={{ color:'#92400E', fontSize:'0.72rem', fontWeight:700 }}>
                {isThinking ? 'Thinking…' : 'Thought'} {showThink ? '▲' : '▼'}
              </Typography>
            </Box>
            {showThink && (
              <Box sx={{ mt:0.8, p:1.5, bgcolor:'#FFFBEB', border:'1px solid #FDE68A',
                borderRadius:2, maxHeight:180, overflowY:'auto',
                '&::-webkit-scrollbar':{ width:3 }, '&::-webkit-scrollbar-thumb':{ background:'#FCD34D', borderRadius:2 } }}>
                <Typography sx={{ fontSize:'0.72rem', color:'#78350F', lineHeight:1.6, fontFamily:'monospace', whiteSpace:'pre-wrap' }}>
                  {thinkingText}
                </Typography>
              </Box>
            )}
          </Box>
        )}
        <Paper elevation={0} sx={{ p:'13px 17px', borderRadius:'4px 16px 16px 16px',
          border:'1px solid rgba(0,0,0,0.07)', background:'white', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
          {text ? (
            <>
              <MdMsg content={text} isUser={false}/>
              <Box sx={{ display:'flex', alignItems:'center', gap:0.8, mt:1 }}>
                <CircularProgress size={10} sx={{ color:'#059669' }}/>
                <Typography sx={{ color:'#94A3B8', fontSize:'0.7rem' }}>Streaming…</Typography>
              </Box>
            </>
          ) : (
            <Dots/>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════
export default function AIPage() {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [chats,        setChats]        = useState([]);
  const [activeCid,    setActiveCid]    = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState('');
  const [subject,      setSubject]      = useState('');
  const [streaming,    setStreaming]     = useState(false);
  const [streamText,   setStreamText]   = useState('');
  const [thinkingText, setThinkingText]  = useState('');
  const [isThinking,   setIsThinking]    = useState(false);
  const [sidebar,      setSidebar]      = useState(!isMobile);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [bookStatus,   setBookStatus]   = useState({});

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const abortRef  = useRef(null);

  const scrollEnd = useCallback(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, []);
  useEffect(() => { scrollEnd(); }, [messages, streamText, scrollEnd]);
  useEffect(() => { fetchChats(); fetchBooks(); return () => { abortRef.current?.abort(); }; }, []);

  async function fetchChats() {
    try { const r = await api.get('/ai/chats'); setChats(r.data.data || []); } catch(_){}
    setLoadingChats(false);
  }
  async function fetchBooks() {
    try { const r = await api.get('/ai/status'); setBookStatus(r.data.data || {}); } catch(_){}
  }

  async function openChat(cid) {
    if (cid === activeCid) return;
    abortRef.current?.abort();
    setStreaming(false); setStreamText('');
    setActiveCid(cid); setMessages([]); setLoadingMsgs(true);
    try {
      const r = await api.get(`/ai/chats/${cid}`);
      setMessages(r.data.data.messages || []);
      if (r.data.data.subject) setSubject(r.data.data.subject);
    } catch(_) { toast.error('Failed to load chat'); }
    setLoadingMsgs(false);
    if (isMobile) setSidebar(false);
    setTimeout(() => inputRef.current?.focus(), 200);
  }

  async function newChat() {
    try { const r = await api.post('/ai/chats'); await fetchChats(); openChat(r.data.data.id); }
    catch(_) { toast.error('Could not create chat'); }
  }

  async function delChat(e, cid) {
    e.stopPropagation();
    try { await api.delete(`/ai/chats/${cid}`); } catch(_){}
    setChats(p => p.filter(c => c.id !== cid));
    if (activeCid === cid) { setActiveCid(null); setMessages([]); }
  }

  async function send(override) {
    const q = (override || input).trim();
    if (!q || streaming) return;

    let cid = activeCid;
    if (!cid) {
      try { const r = await api.post('/ai/chats'); cid = r.data.data.id; setActiveCid(cid); await fetchChats(); }
      catch(_) { toast.error('Failed to create chat'); return; }
    }

    setInput('');
    setMessages(p => [...p, { role:'user', content:q, ts:new Date().toISOString() }]);
    setStreaming(true);
    setStreamText('');
    setThinkingText('');
    setIsThinking(false);

    const ctrl  = new AbortController();
    abortRef.current = ctrl;
    const token = localStorage.getItem('token');
    const base  = process.env.REACT_APP_API_URL || '/api';

    try {
      const resp = await fetch(`${base}/ai/chats/${cid}/message`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
        body: JSON.stringify({ message:q, subject }),
        signal: ctrl.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${resp.status}`);
      }

      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '', full = '', detectedSubject = subject;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream:true });
        const lines = buf.split('\n');
        buf = lines.pop();

        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith(':')) continue;         // SSE heartbeat comment
          if (!t.startsWith('data:')) continue;
          const raw = t.slice(5).trim();
          try {
            const payload = JSON.parse(raw);
            if (payload.thinking) { setThinkingText(t => t + payload.thinking); setIsThinking(true); }
            if (payload.token) { full += payload.token; setStreamText(full); setIsThinking(false); }
            if (payload.done)  { full = payload.full || full; }
            if (payload.meta)  {
              detectedSubject = payload.subject || detectedSubject;
              if (payload.subject) setSubject(payload.subject);
              setChats(p => p.map(c => c.id===cid ? { ...c, title:payload.title||c.title, subject:payload.subject||c.subject } : c));
            }
            if (payload.error) { toast.error(`TIE AI: ${payload.error}`); }
          } catch(_){}
        }
      }

      setMessages(p => [...p, { role:'assistant', content:full, subject:detectedSubject, ts:new Date().toISOString() }]);
      setStreamText('');
      setThinkingText('');
      setIsThinking(false);
      setStreaming(false);
      fetchChats();

    } catch(err) {
      if (err.name !== 'AbortError') toast.error('Connection error. Please try again.');
      setStreamText(''); setThinkingText(''); setIsThinking(false); setStreaming(false);
    }
  }

  function onKey(e) { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const SidebarEl = (
    <Box sx={{ display:'flex', flexDirection:'column', height:'100%', background:'#0F172A' }}>
      <Box sx={{ p:2, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1.5, mb:2 }}>
          <Box sx={{ width:38, height:38, borderRadius:'11px', display:'flex', alignItems:'center', justifyContent:'center',
                     background:'linear-gradient(135deg,#059669,#047857)', boxShadow:'0 4px 12px rgba(5,150,105,0.4)' }}>
            <AutoAwesome sx={{ color:'white', fontSize:19 }}/>
          </Box>
          <Box>
            <Typography sx={{ color:'white', fontWeight:700, fontSize:'0.97rem' }}>TIE AI</Typography>
            <Typography sx={{ color:'#475569', fontSize:'0.7rem' }}>Tutor Intelligence Engine</Typography>
          </Box>
          {isMobile && <IconButton onClick={() => setSidebar(false)} sx={{ color:'#94A3B8', ml:'auto' }}><Close/></IconButton>}
        </Box>
        <Button fullWidth variant="contained" startIcon={<Add/>} onClick={newChat}
          sx={{ background:'linear-gradient(135deg,#059669,#047857)', borderRadius:2, fontWeight:600,
               textTransform:'none', py:1, boxShadow:'0 4px 12px rgba(5,150,105,0.35)' }}>
          New Chat
        </Button>
      </Box>

      <Box sx={{ flex:1, overflowY:'auto', p:1,
        '&::-webkit-scrollbar':{ width:3 }, '&::-webkit-scrollbar-thumb':{ background:'#334155', borderRadius:2 } }}>
        {loadingChats ? [1,2,3,4].map(i => (
          <Box key={i} sx={{ p:1.5, mb:0.5 }}>
            <Skeleton variant="text" width="75%" sx={{ bgcolor:'#1E293B' }}/>
            <Skeleton variant="text" width="45%" sx={{ bgcolor:'#1E293B' }}/>
          </Box>
        )) : chats.length === 0 ? (
          <Box sx={{ p:3, textAlign:'center' }}>
            <Typography sx={{ color:'#475569', fontSize:'0.82rem' }}>No chats yet — start one!</Typography>
          </Box>
        ) : chats.map(chat => {
          const si = getSI(chat.subject);
          return (
            <Box key={chat.id} onClick={() => openChat(chat.id)}
              sx={{ display:'flex', alignItems:'center', gap:1.5, p:'10px 12px', borderRadius:2,
                   cursor:'pointer', mb:0.4,
                   background: activeCid===chat.id ? 'rgba(5,150,105,0.14)' : 'transparent',
                   border: activeCid===chat.id ? '1px solid rgba(5,150,105,0.28)' : '1px solid transparent',
                   '&:hover':{ background:'rgba(255,255,255,0.04)' }, transition:'all 0.15s' }}>
              <Box sx={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:chat.subject?si.color:'#334155' }}/>
              <Box sx={{ flex:1, minWidth:0 }}>
                <Typography sx={{ color:activeCid===chat.id?'white':'#CBD5E1', fontSize:'0.82rem', fontWeight:500,
                                   overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {chat.title || 'New Chat'}
                </Typography>
                {chat.subject && (
                  <Typography sx={{ color:'#475569', fontSize:'0.68rem' }}>
                    {si.label} · {chat.messageCount||0} msg{chat.messageCount!==1?'s':''}
                  </Typography>
                )}
              </Box>
              <IconButton size="small" onClick={e => delChat(e, chat.id)}
                sx={{ color:'#334155', opacity:0, '&:hover':{ color:'#EF4444', opacity:1 },
                      '.MuiBox-root:hover &':{ opacity:1 }, flexShrink:0 }}>
                <Delete sx={{ fontSize:14 }}/>
              </IconButton>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ p:2, borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <Typography sx={{ color:'#334155', fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:1, mb:1 }}>
          Books loaded
        </Typography>
        <Box sx={{ display:'flex', flexWrap:'wrap', gap:0.5 }}>
          {Object.entries(bookStatus).filter(([s]) => s!=='math').map(([s, info]) => (
            <Chip key={s} size="small" label={s.replace('_',' ')}
              sx={{ fontSize:'0.6rem', height:18,
                background: info.exists?'rgba(5,150,105,0.12)':'rgba(239,68,68,0.08)',
                color:       info.exists?'#34D399':'#F87171',
                border:      `1px solid ${info.exists?'rgba(5,150,105,0.25)':'rgba(239,68,68,0.18)'}` }}/>
          ))}
        </Box>
      </Box>
    </Box>
  );

  // ════════════════════════════════════════════════════════════════════════════
  const activeSubjectInfo = getSI(subject);

  return (
    <Box sx={{ display:'flex', height:'calc(100vh - 64px)', overflow:'hidden', background:'#F8FAFC' }}>

      {isMobile ? (
        <Drawer open={sidebar} onClose={() => setSidebar(false)}
          PaperProps={{ sx:{ width:276, background:'transparent', boxShadow:'none' } }}>
          {SidebarEl}
        </Drawer>
      ) : (
        <Box sx={{ width:sidebar?272:0, flexShrink:0, transition:'width 0.28s ease', overflow:'hidden' }}>
          <Box sx={{ width:272, height:'100%' }}>{SidebarEl}</Box>
        </Box>
      )}

      <Box sx={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* Top bar */}
        <Box sx={{ px:2, py:1.5, borderBottom:'1px solid rgba(0,0,0,0.08)', background:'white',
                   display:'flex', alignItems:'center', gap:1.5, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <Tooltip title={sidebar ? 'Close sidebar' : 'Open sidebar'}>
            <IconButton onClick={() => setSidebar(v => !v)} size="small">
              <MenuIcon sx={{ fontSize:20 }}/>
            </IconButton>
          </Tooltip>
          <Box sx={{ width:28, height:28, borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center',
                     background:'linear-gradient(135deg,#059669,#047857)' }}>
            <AutoAwesome sx={{ color:'white', fontSize:14 }}/>
          </Box>
          <Typography sx={{ fontWeight:700, color:'#0F172A', fontSize:'0.95rem' }}>TIE AI</Typography>

          {activeCid && subject && (
            <Chip size="small"
              icon={React.cloneElement(activeSubjectInfo.icon, { style:{ fontSize:13, color:activeSubjectInfo.color } })}
              label={activeSubjectInfo.label}
              sx={{ fontWeight:700, fontSize:'0.7rem', height:22,
                background:`${activeSubjectInfo.color}14`, color:activeSubjectInfo.color,
                border:`1px solid ${activeSubjectInfo.color}28` }}/>
          )}

          <Box sx={{ ml:'auto', display:'flex', alignItems:'center', gap:1 }}>
            <Tooltip title="Refresh book status">
              <IconButton size="small" onClick={fetchBooks}>
                <Refresh sx={{ fontSize:16, color:'#94A3B8' }}/>
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Messages */}
        <Box sx={{ flex:1, overflowY:'auto', p:{ xs:1.5, md:3 }, display:'flex', flexDirection:'column',
                   '&::-webkit-scrollbar':{ width:5 }, '&::-webkit-scrollbar-thumb':{ background:'#E2E8F0', borderRadius:3 } }}>
          {!activeCid ? (
            <EmptyState subject={subject} onTip={t => { setInput(t); inputRef.current?.focus(); }}/>
          ) : loadingMsgs ? (
            <Box sx={{ display:'flex', flexDirection:'column', gap:2.5, p:2 }}>
              {[1,2,3].map(i => (
                <Box key={i} sx={{ display:'flex', gap:1.5, alignItems:'flex-start' }}>
                  <Skeleton variant="circular" width={32} height={32}/>
                  <Box sx={{ flex:1 }}>
                    <Skeleton variant="text" width="65%" sx={{ mb:0.5 }}/>
                    <Skeleton variant="text" width="85%" sx={{ mb:0.5 }}/>
                    <Skeleton variant="text" width="45%"/>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ display:'flex', flexDirection:'column', gap:2.5, maxWidth:880, mx:'auto', width:'100%' }}>
              {messages.map((m, i) => <Bubble key={i} msg={m}/>)}
              {streaming && <StreamBubble text={streamText} thinkingText={thinkingText} isThinking={isThinking}/>}
              <div ref={bottomRef}/>
            </Box>
          )}
        </Box>

        {/* Input area */}
        <Box sx={{ p:{ xs:1.5, md:2 }, borderTop:'1px solid rgba(0,0,0,0.08)', background:'white',
                   boxShadow:'0 -2px 10px rgba(0,0,0,0.04)' }}>
          <Box sx={{ maxWidth:880, mx:'auto' }}>

            {/* Subject pills */}
            <Box sx={{ display:'flex', gap:0.7, mb:1.5, flexWrap:'wrap' }}>
              {SUBJECTS.map(s => (
                <Box key={s.value} onClick={() => setSubject(s.value)}
                  sx={{ display:'flex', alignItems:'center', gap:0.5, px:1.2, py:'4px',
                       borderRadius:2, cursor:'pointer', userSelect:'none',
                       fontSize:'0.72rem', fontWeight:600,
                       background: subject===s.value ? `${s.color}16` : '#F8FAFC',
                       color:      subject===s.value ? s.color : '#64748B',
                       border:     `1px solid ${subject===s.value ? `${s.color}3a` : 'rgba(0,0,0,0.08)'}`,
                       transition:'all 0.15s',
                       '&:hover':{ background:`${s.color}10`, color:s.color, borderColor:`${s.color}40` } }}>
                  {React.cloneElement(s.icon, { style:{ fontSize:11 } })}
                  {s.label}
                </Box>
              ))}
            </Box>

            <Box sx={{ display:'flex', gap:1, alignItems:'flex-end' }}>
              <TextField inputRef={inputRef} fullWidth multiline maxRows={5}
                placeholder={subject ? `Ask about ${getSI(subject).label}…` : 'Select a subject above, then ask your question…'}
                value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                disabled={streaming} size="small"
                sx={{ '& .MuiOutlinedInput-root':{ borderRadius:3, background:'#F8FAFC', fontSize:'0.9rem',
                  '& fieldset':{ borderColor:'rgba(0,0,0,0.1)' },
                  '&:hover fieldset':{ borderColor:'#059669' },
                  '&.Mui-focused fieldset':{ borderColor:'#059669' } } }}/>
              <IconButton onClick={() => send()} disabled={!input.trim() || streaming}
                sx={{ width:44, height:44, flexShrink:0,
                     background: input.trim()&&!streaming ? 'linear-gradient(135deg,#059669,#047857)' : '#F1F5F9',
                     color:      input.trim()&&!streaming ? 'white' : '#94A3B8',
                     borderRadius:2.5,
                     '&:hover':{ background: input.trim()&&!streaming ? 'linear-gradient(135deg,#047857,#065F46)' : '#F1F5F9', transform:'scale(1.06)' },
                     transition:'all 0.2s',
                     '&.Mui-disabled':{ background:'#F1F5F9', color:'#CBD5E1' } }}>
                {streaming
                  ? <CircularProgress size={18} sx={{ color:'#94A3B8' }}/>
                  : <Send sx={{ fontSize:18 }}/>}
              </IconButton>
            </Box>

            <Typography sx={{ mt:0.8, color:'#94A3B8', fontSize:'0.67rem', textAlign:'center' }}>
              TIE AI streams answers with LaTeX math rendering from your Tanzanian textbooks · Enter to send · Shift+Enter for new line
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
