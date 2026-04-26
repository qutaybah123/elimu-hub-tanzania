/**
 * TIE AI — Tutor Intelligence Engine
 * Elimu Hub Tanzania
 *
 * Streaming via SSE — works on Cloudflare because we use deepseek-chat
 * (fast model, 8-20s) not deepseek-r1 (reasoning, 2-5min).
 *
 * Balanced retrieval config:
 *   CHUNK_SIZE 800  — wide enough to capture full concepts
 *   CHUNK_OVERLAP 200 — generous overlap so no idea is cut in half
 *   TOP_K 6         — enough context without overwhelming the model
 *   max_tokens 1800 — full detailed answer with examples
 */

const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const https   = require('https');
const { v4: uuidv4 } = require('uuid');

// ── Paths ─────────────────────────────────────────────────────────────────────
const BOOKS_DIR      = path.join(__dirname, '..', 'books');
const DATA_DIR       = path.join(__dirname, '..', 'data');
const CHATS_FILE     = path.join(DATA_DIR, 'ai_chats.json');
const TEXT_CACHE_DIR = path.join(DATA_DIR, 'text_cache');
[BOOKS_DIR, DATA_DIR, TEXT_CACHE_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ── Config ────────────────────────────────────────────────────────────────────
// deepseek-chat = fast (~8-20s), no reasoning delay. Use deepseek/deepseek-r1 only if you want
// slow deep reasoning (2-5 min) — the r1 model streams reasoning_content first, answer last.
const MODEL         = 'nvidia/nemotron-3-nano-30b-a3b:free'; // fast free model
const CHUNK_SIZE    = 800;   // words per chunk — wide enough to capture full concepts & examples
const CHUNK_OVERLAP = 200;   // generous overlap — prevents cutting ideas mid-sentence
const TOP_K         = 6;     // 6 × 800w ≈ 4800w context — rich without overwhelming
const MAX_TOKENS    = 3500;  // room for full definition + formula + explanation + multiple worked examples

// ── In-memory caches ──────────────────────────────────────────────────────────
const bookTextCache = {};  // subject -> full text
const chunkCache    = {};  // subject -> [{text, words}]

// ── JSON helpers ──────────────────────────────────────────────────────────────
const loadJson  = (p, d) => { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,'utf8')) : d; } catch(_){ return d; } };
const saveJson  = (p, d) => { try { fs.writeFileSync(p, JSON.stringify(d,null,2),'utf8'); } catch(_){} };
const getChats  = () => loadJson(CHATS_FILE, {});
const saveChats = d  => saveJson(CHATS_FILE, d);

// ── Subject → book ────────────────────────────────────────────────────────────
const SUBJECT_BOOKS = {
  physics:'physics.pdf', chemistry:'chemistry.pdf',
  mathematics:'mathematics.pdf', math:'mathematics.pdf',
  biology:'biology.pdf', history:'history.pdf',
  geography:'geography.pdf', english:'english.pdf',
  kiswahili:'kiswahili.pdf', civics:'civics.pdf',
  commerce:'commerce.pdf', bookkeeping:'bookkeeping.pdf',
  computer_science:'computer_science.pdf',
};

// ── Keyword detection ─────────────────────────────────────────────────────────
const SUBJECT_KEYWORDS = {
  physics:['force','motion','velocity','acceleration','momentum','energy','power','wave',
    'light','optics','refraction','reflection','electricity','current','voltage','resistance',
    'magnetic','gravity','newton','pressure','density','heat','temperature','nuclear',
    'radioactive','electron','proton','neutron','atom','quantum','kinetic','potential',
    'work','joule','watt','ohm','ampere','circuit','frequency','wavelength','electromagnetic',
    'displacement','scalar','vector','torque','friction','tension','buoyancy','archimedes',
    'projectile','satellite','orbit','centripetal','collision','elastic','impulse','lens',
    'mirror','prism','spectrum','interference','diffraction','photon','photoelectric',
    'capacitor','inductor','doppler','fission','fusion','half-life','inclined'],
  chemistry:['element','compound','mixture','molecule','bond','ionic','covalent','reaction',
    'equation','mole','molar','acid','base','ph','salt','neutralization','oxidation',
    'reduction','redox','electrolysis','periodic','table','valence','orbital','isotope',
    'atomic','mass','formula','stoichiometry','solubility','concentration','solution',
    'titration','indicator','catalyst','enthalpy','entropy','equilibrium','avogadro',
    'organic','hydrocarbon','alkane','alkene','alkyne','benzene','ester','alcohol',
    'aldehyde','ketone','carboxylic','polymer','hydrolysis','saponification','alloy',
    'corrosion','galvanic','precipitation','distillation','crystallization'],
  mathematics:['equation','algebra','calculus','derivative','integral','function','graph',
    'matrix','vector','determinant','probability','statistics','mean','median','mode',
    'variance','permutation','combination','binomial','polynomial','quadratic','linear',
    'logarithm','exponential','trigonometry','sine','cosine','tangent','angle','triangle',
    'circle','geometry','area','volume','perimeter','radius','pythagoras','theorem','proof',
    'integer','fraction','ratio','proportion','sequence','series','limit','set','prime',
    'factor','multiple','lcm','hcf','complex','coordinate','slope','intercept','inequality',
    'solve','simplify','expand','factorise','differentiate','integrate','arithmetic','geometric'],
  biology:['cell','nucleus','membrane','organelle','mitochondria','chloroplast','ribosome',
    'dna','rna','gene','chromosome','genetics','heredity','allele','dominant','recessive',
    'phenotype','genotype','mutation','evolution','natural selection','darwin','species',
    'adaptation','ecosystem','food chain','photosynthesis','respiration','metabolism',
    'enzyme','protein','amino acid','carbohydrate','lipid','hormone','nervous system',
    'neuron','brain','heart','blood','circulation','digestion','immune','antibody','virus',
    'bacteria','fungi','taxonomy','osmosis','diffusion','mitosis','meiosis','fertilization',
    'tissue','organ','homeostasis','reproduction','biodiversity','ecology','biome',
    'population','community','symbiosis','parasite','predator','decomposer'],
  history:['history','historical','ancient','medieval','modern','revolution','war','empire',
    'colonial','colonialism','independence','civilization','dynasty','trade','slavery',
    'abolition','nationalism','imperialism','world war','treaty','uprising','resistance',
    'africa','tanzania','tanganyika','zanzibar','maji maji','arusha declaration',
    'julius nyerere','ujamaa','uhuru'],
  geography:['geography','map','continent','country','capital','climate','weather','rainfall',
    'temperature','soil','vegetation','population','migration','urbanization','agriculture',
    'industry','natural resources','mountain','river','lake','ocean','plateau','valley',
    'coast','latitude','longitude','scale','kilimanjaro','serengeti','victoria'],
  civics:['civics','government','democracy','constitution','parliament','president','citizen',
    'rights','duties','law','court','justice','election','vote','political party',
    'local government','human rights','freedom','equality','unity','corruption',
    'transparency','accountability','judiciary','executive','legislature'],
  english:['grammar','sentence','noun','verb','adjective','adverb','pronoun','conjunction',
    'preposition','tense','past','present','future','passive','active','vocabulary',
    'comprehension','essay','paragraph','composition','literature','poem','poetry',
    'novel','story','character','plot','theme','metaphor','simile','idiom','proverb',
    'punctuation','spelling'],
  kiswahili:['kiswahili','swahili','sentensi','nomino','kitenzi','kivumishi','kielezi',
    'wakati','ngeli','uandishi','insha','hadithi','shairi','methali','sarufi'],
  commerce:['commerce','trade','business','market','demand','supply','price','profit','loss',
    'revenue','cost','investment','insurance','banking','credit','debit','import','export',
    'entrepreneur','consumer','producer','wholesaler','retailer','advertising','distribution'],
  bookkeeping:['bookkeeping','accounting','ledger','journal','debit','credit','balance',
    'trial balance','assets','liabilities','capital','cash','bank','invoice','receipt',
    'depreciation','double entry','financial statement','income','expenditure','account'],
  computer_science:['algorithm','data structure','array','linked list','stack','queue','tree',
    'binary','graph','sorting','searching','recursion','complexity','big o','programming',
    'python','java','code','variable','loop','function','class','object','inheritance',
    'polymorphism','database','sql','network','protocol','tcp','ip','http','operating system',
    'process','thread','memory','cpu','compiler','interpreter','debugging','software',
    'hardware','boolean','logic','bit','byte','encryption','cybersecurity','hashing',
    'machine learning','neural network','artificial intelligence','cloud','api','internet',
    'computer','register','deadlock','semaphore','cache','pipeline'],
};

function detectSubject(q) {
  const lower = q.toLowerCase();
  const scores = {};
  for (const [s,kws] of Object.entries(SUBJECT_KEYWORDS)) {
    const sc = kws.filter(kw => lower.includes(kw)).length;
    if (sc > 0) scores[s] = sc;
  }
  if (!Object.keys(scores).length) return null;
  return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
}

// ── Stopwords ─────────────────────────────────────────────────────────────────
const SW = new Set(['the','a','an','is','are','was','were','be','been','have','has','had',
  'do','does','did','will','would','could','should','may','might','to','of','in','on','at',
  'by','for','with','about','from','this','that','these','those','it','its','and','but',
  'or','if','as','i','me','we','you','he','she','they','my','our','your','his','her',
  'their','what','which','who','whom','not','no','so','than','too','very','just','now',
  'please','find','write','explain','describe','define','calculate','solve','any','one',
  'get','also','example','question','give','can','tell','how','why','when','where']);

function tokenize(t) {
  return t.toLowerCase().replace(/[^\w\s]/g,'').split(/\s+/).filter(w=>w.length>1&&!SW.has(w));
}

// ── PDF extraction ────────────────────────────────────────────────────────────
async function extractPdf(pdfPath) {
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(fs.readFileSync(pdfPath), { max: 0 });
    return data.text || '';
  } catch(e) { console.error('[TIE AI] PDF error:', e.message); return ''; }
}

async function loadBook(subject) {
  if (bookTextCache[subject] !== undefined) return bookTextCache[subject];
  const fname = SUBJECT_BOOKS[subject];
  if (!fname) { bookTextCache[subject] = ''; return ''; }

  const pdfPath = path.join(BOOKS_DIR, fname);
  const txtPath = path.join(TEXT_CACHE_DIR, fname.replace('.pdf','.txt'));

  if (!fs.existsSync(pdfPath)) { bookTextCache[subject] = ''; return ''; }

  if (fs.existsSync(txtPath) && fs.statSync(txtPath).size > 100 &&
      fs.statSync(txtPath).mtimeMs > fs.statSync(pdfPath).mtimeMs) {
    const t = fs.readFileSync(txtPath, 'utf8');
    bookTextCache[subject] = t;
    buildIndex(subject, t);
    return t;
  }

  console.log(`[TIE AI] Extracting PDF: ${fname}`);
  const text = await extractPdf(pdfPath);
  if (text) {
    fs.writeFileSync(txtPath, text, 'utf8');
    bookTextCache[subject] = text;
    buildIndex(subject, text);
    console.log(`[TIE AI] ${subject}: ${text.split(/\s+/).length.toLocaleString()} words indexed`);
  } else { bookTextCache[subject] = ''; }
  return bookTextCache[subject];
}

function buildIndex(subject, text) {
  const words = text.split(/\s+/);
  const step  = Math.max(CHUNK_SIZE - CHUNK_OVERLAP, 1);
  const chunks = [];
  for (let i = 0; i < words.length; i += step) {
    const t = words.slice(i, i + CHUNK_SIZE).join(' ');
    if (t.trim()) chunks.push({ text: t, words: tokenize(t) });
  }
  chunkCache[subject] = chunks;
  console.log(`[TIE AI] ${subject}: ${chunks.length} chunks indexed (${CHUNK_SIZE}w, overlap ${CHUNK_OVERLAP}w)`);
}

function bm25(qToks, docWords, avgDl, k1=1.5, b=0.75) {
  const dl = docWords.length || 1;
  const joined = docWords.join(' ');
  let score = 0;
  for (const qt of qToks) {
    const tf = (joined.match(new RegExp(qt,'g'))||[]).length;
    if (!tf) continue;
    score += (tf*(k1+1)) / (tf + k1*(1 - b + b*dl/avgDl));
  }
  return score;
}

async function retrieveContext(subject, question) {
  if (!chunkCache[subject]) await loadBook(subject);
  const chunks = chunkCache[subject] || [];
  if (!chunks.length) return (bookTextCache[subject]||'').slice(0, 100000);

  let qToks = tokenize(question);
  if (!qToks.length) qToks = question.toLowerCase().split(/\s+/).slice(0,20);

  const avgDl  = chunks.reduce((s,c) => s+c.words.length, 0) / chunks.length;
  const scored = chunks.map((c,i) => [bm25(qToks,c.words,avgDl), i, c.text]);
  scored.sort((a,b) => b[0]-a[0]);

  // Take TOP_K best, restore reading order for coherent context
  const top = scored.slice(0, TOP_K).sort((a,b) => a[1]-b[1]);
  const ctx = top.map(([,,t]) => t).join('\n\n---\n\n');
  const words = top.reduce((s,[,,t]) => s + t.split(/\s+/).length, 0);
  console.log(`[TIE AI] Retrieved ${top.length} chunks, ~${words} words`);
  return ctx;
}

// ── Build API messages ────────────────────────────────────────────────────────
// Classify the question so the prompt adapts its format
function classifyQuestion(q) {
  const lower = q.toLowerCase().trim();

  // Identity / greeting
  if (/^(hi+|hey+|hello|salamu|habari|mambo|hujambo|sasa|howdy|yo|sup)\b/.test(lower) ||
      /\b(who|what|which).+(you|your|tie ai|tieai|yourself|ur)\b/.test(lower) ||
      /\b(introduce yourself|tell me about yourself|your name|your purpose)\b/.test(lower)) {
    return 'identity';
  }

  // Thank you / acknowledgement
  if (/^(thanks|thank you|asante|sawa|ok|okay|great|cool|got it|understood|nice|perfect|awesome|nzuri|vizuri)\b/.test(lower)) {
    return 'acknowledgement';
  }

  // Short casual conversation not related to subject
  if (lower.length < 25 && !/\d|\+|\-|\*|\/|=|\^|integral|derive|calculate|prove|solve|explain|what is|define|how does|why does/.test(lower)) {
    return 'casual';
  }

  return 'academic';
}

async function buildMessages(question, subject, history) {
  const context = await retrieveContext(subject, question);
  const sName   = subject.charAt(0).toUpperCase() + subject.slice(1).replace('_',' ');
  const qType   = classifyQuestion(question);

  // ── Identity / greeting: skip textbook, answer as TIE AI ─────────────────
  if (qType === 'identity' || qType === 'acknowledgement' || qType === 'casual') {
    const system = `You are TIE AI — the Tutor Intelligence Engine powering Elimu Hub Tanzania, \
an educational platform built specifically for Tanzanian students following the Tanzania \
Institute of Education (TIE) curriculum.

YOUR IDENTITY:
- Name: TIE AI (Tutor Intelligence Engine)
- Platform: Elimu Hub Tanzania (elimuhub.tz)
- Purpose: Help students from Standard 7 to Form 6 / A-Level understand their official TIE textbooks
- Subjects: Mathematics, Physics, Chemistry, Biology, History, Geography, Civics, English, Kiswahili, Commerce, Bookkeeping, Computer Science
- You do NOT browse the internet. You answer from TIE textbook excerpts only.
- You were built to make quality education accessible to every Tanzanian student.

TONE: Warm, encouraging, and friendly. Use simple language. Match the student's language — \
respond in Kiswahili if they write in Kiswahili, English if they write in English.

If the student greets you, greet them warmly and briefly explain what you can help with.
If they ask who/what you are, give a concise, friendly 2–3 sentence answer.
Do NOT use the academic answer format (Definition/Formula/etc.) for greetings or identity questions.`;

    const msgs = [{ role:'system', content:system }];
    for (const m of (history||[]).slice(-6)) msgs.push({ role:m.role, content:m.content });
    msgs.push({ role:'user', content:question });
    return msgs;
  }

  // ── Academic question: full textbook-grounded answer ─────────────────────
  const system = `You are TIE AI — the Tutor Intelligence Engine for Elimu Hub Tanzania. \
You are an expert ${sName} tutor for students following the Tanzania Institute of Education (TIE) curriculum.

Relevant excerpts from the student's official TIE ${sName} textbook are provided below. \
Use them as your PRIMARY and AUTHORITATIVE source.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANSWER FORMAT — choose the right format for the question:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A) For CONCEPT / THEORY questions (e.g. "What is Newton's 2nd law?", "Define osmosis"):
   ## [Concept Name]
   **Definition** — clear, textbook-accurate definition in 1–3 sentences.
   **Key Formula** — state the formula in display math (if applicable).
   **Explanation** — explain each component in plain, simple language.
   **Worked Example** — at least one fully worked example, every step numbered.
   **Key Points** — 3–5 concise bullet points.

B) For CALCULATION / PROBLEM questions (e.g. "Find the integral of...", "A car accelerates..."):
   **Given** — list the known values clearly.
   **Find** — state what needs to be solved.
   **Solution** — numbered steps, showing full working. Use LaTeX for every equation.
   **Answer** — state the final answer clearly in a box: \\[ \\boxed{...} \\]
   **Check** — verify the answer where possible.

C) For COMPARISON / DIFFERENCE questions (e.g. "Difference between X and Y"):
   Use a brief intro, then a clear comparison (prose or table), then a summary.

D) For ESSAY / DISCUSSION questions (e.g. "Discuss the causes of...", "Explain the importance of..."):
   Use clear paragraphs with headings. No need for formulas unless relevant.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LaTeX RULES — always use KaTeX-compatible LaTeX for all mathematics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Inline math  → \\( expression \\)     e.g. \\( F = ma \\)
- Display math → \\[ expression \\]     e.g. \\[ E = mc^2 \\]
- Fractions    → \\dfrac{num}{den}
- Powers       → x^{n}
- Subscripts   → x_{n}
- Greek        → \\alpha, \\beta, \\theta, \\pi
- Operators    → \\int, \\sum, \\lim, \\sqrt{}, \\vec{}, \\hat{}
- NEVER write math as plain text when LaTeX syntax is available.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Be COMPLETE. Never cut an answer short or say "I'll stop here."
- Show EVERY step in calculations — no skipping.
- Reproduce textbook examples in full when relevant.
- If a question has multiple parts, answer ALL parts.
- If the topic is NOT found in the excerpts, say honestly: "This specific topic does not appear \
  in the provided textbook excerpts. Here is what I know from general ${sName} knowledge: ..."
- End every academic answer with: *Source: TIE ${sName} Textbook*
- LANGUAGE: Respond in the same language the student used (English or Kiswahili).

====== TIE ${sName.toUpperCase()} TEXTBOOK EXCERPTS ======
${context}
====== END OF TEXTBOOK EXCERPTS ======`;

  const msgs = [{ role:'system', content:system }];
  for (const m of (history||[]).slice(-6)) msgs.push({ role:m.role, content:m.content });
  msgs.push({ role:'user', content:question });
  return msgs;
}

// ── SSE streaming helper ──────────────────────────────────────────────────────
// Writes tokens directly to res as they arrive from OpenRouter.
// Returns the full assembled reply when done.
function streamFromOpenRouter(messages, res) {
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  if (!apiKey) {
    const errMsg = '❌ OPENROUTER_API_KEY is not set in the server .env file. Contact your admin.';
    res.write(`data: ${JSON.stringify({ token: errMsg })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, full: errMsg })}\n\n`);
    if (typeof res.flush === 'function') res.flush();
    return Promise.resolve('');
  }

  const body = JSON.stringify({
    model: MODEL, messages, max_tokens: MAX_TOKENS, temperature: 0.3, stream: true,
  });

  const options = {
    hostname: 'openrouter.ai',
    path:     '/api/v1/chat/completions',
    method:   'POST',
    headers:  {
      'Authorization':  `Bearer ${apiKey}`,
      'Content-Type':   'application/json',
      'HTTP-Referer':   '*',
      'X-Title':        'ElimuHubTz',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  return new Promise((resolve) => {
    const tokens = [];
    let buffer   = '';

    const req = https.request(options, (apiRes) => {
      apiRes.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta   = parsed.choices?.[0]?.delta || {};
            // deepseek-r1 streams thinking in reasoning_content, answer in content
            // deepseek-chat streams everything in content directly
            const thinking = delta.reasoning_content || '';
            const token    = delta.content || '';
            if (thinking) {
              // Stream thinking tokens as a separate event type so frontend
              // can show a collapsible "Thinking..." section
              res.write(`data: ${JSON.stringify({ thinking })}\n\n`);
              if (typeof res.flush === 'function') res.flush();
            }
            if (token) {
              tokens.push(token);
              res.write(`data: ${JSON.stringify({ token })}\n\n`);
              if (typeof res.flush === 'function') res.flush();
            }
          } catch(_) {}
        }
      });

      apiRes.on('end', () => {
        const full = tokens.join('');
        res.write(`data: ${JSON.stringify({ done: true, full })}\n\n`);
        if (typeof res.flush === 'function') res.flush();
        resolve(full);
      });

      apiRes.on('error', (err) => {
        const msg = `OpenRouter connection error: ${err.message}`;
        res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
        if (typeof res.flush === 'function') res.flush();
        resolve('');
      });
    });

    req.on('error', (err) => {
      const msg = `Request error: ${err.message}`;
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      if (typeof res.flush === 'function') res.flush();
      resolve('');
    });

    req.write(body);
    req.end();
  });
}

// ── Book status ───────────────────────────────────────────────────────────────
function bookStatus() {
  const out = {};
  for (const [s,fname] of Object.entries(SUBJECT_BOOKS)) {
    if (out[s]) continue;
    const p = path.join(BOOKS_DIR, fname);
    const exists = fs.existsSync(p);
    out[s] = { file:fname, exists, loaded:!!bookTextCache[s],
               words: bookTextCache[s] ? bookTextCache[s].split(/\s+/).length : 0,
               size:  exists ? fs.statSync(p).size : 0 };
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════════════

router.get('/status', (_req, res) => res.json({ success:true, data:bookStatus() }));

router.get('/chats', (req, res) => {
  const uid = req.user.id;
  const ch  = getChats();
  const rows = Object.entries(ch[uid]||{})
    .map(([id,c]) => ({ id, title:c.title||'New Chat', subject:c.subject, updated:c.updated||'', messageCount:(c.messages||[]).length }))
    .sort((a,b) => b.updated > a.updated ? 1 : -1);
  res.json({ success:true, data:rows });
});

router.post('/chats', (req, res) => {
  const uid = req.user.id;
  const ch  = getChats();
  if (!ch[uid]) ch[uid] = {};
  const cid = uuidv4().slice(0,8);
  const now = new Date().toISOString();
  ch[uid][cid] = { title:'New Chat', messages:[], subject:null, created:now, updated:now };
  saveChats(ch);
  res.json({ success:true, data:{ id:cid } });
});

router.get('/chats/:cid', (req, res) => {
  const uid = req.user.id;
  const { cid } = req.params;
  const ch  = getChats();
  const chat = ch[uid]?.[cid];
  if (!chat) return res.status(404).json({ success:false, message:'Chat not found' });
  res.json({ success:true, data:{ id:cid, ...chat } });
});

router.delete('/chats/:cid', (req, res) => {
  const uid = req.user.id;
  const { cid } = req.params;
  const ch = getChats();
  if (ch[uid]?.[cid]) { delete ch[uid][cid]; saveChats(ch); }
  res.json({ success:true });
});

router.patch('/chats/:cid/title', (req, res) => {
  const uid = req.user.id;
  const { cid } = req.params;
  const { title } = req.body;
  const ch = getChats();
  if (ch[uid]?.[cid]) { ch[uid][cid].title = title||'New Chat'; saveChats(ch); }
  res.json({ success:true });
});

/**
 * POST /api/ai/chats/:cid/message
 * Streams the AI response token-by-token via SSE.
 *
 * Why this works now:
 *  - deepseek-chat completes in 8-20s (under Cloudflare's 100s limit)
 *  - no Transfer-Encoding header (illegal in HTTP/2)
 *  - compression middleware is bypassed for this route (see server.js filter)
 *  - nginx has proxy_buffering off for this exact path
 *  - res.flush() is called after every token
 */
router.post('/chats/:cid/message', async (req, res) => {
  const uid  = req.user.id;
  const { cid } = req.params;
  const { message, subject: forced } = req.body || {};
  const question = (message||'').trim();

  if (!question) return res.status(400).json({ success:false, message:'Empty message' });

  // Ensure chat exists
  const ch = getChats();
  if (!ch[uid]) ch[uid] = {};
  if (!ch[uid][cid]) {
    const now = new Date().toISOString();
    ch[uid][cid] = { title:'New Chat', messages:[], subject:null, created:now, updated:now };
    saveChats(ch);
  }

  const subject = (forced && SUBJECT_BOOKS[forced]) ? forced : detectSubject(question);

  // ── Set SSE headers (HTTP/2 safe — NO Transfer-Encoding, NO Content-Encoding) ──
  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.flushHeaders();

  // Send a heartbeat immediately so the browser knows connection is alive
  res.write(': heartbeat\n\n');
  if (typeof res.flush === 'function') res.flush();

  if (!subject) {
    const msg = 'I could not detect the subject from your question. Please tap a subject pill (Physics, Mathematics, etc.) above the input and try again.';
    res.write(`data: ${JSON.stringify({ token: msg })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, full: msg, subject: null })}\n\n`);
    if (typeof res.flush === 'function') res.flush();
    res.end();
    return;
  }

  console.log(`\n[TIE AI] ${uid} | ${subject.toUpperCase()} | "${question.slice(0,70)}"`);

  // Load book
  const bookOk = !!(await loadBook(subject));
  if (!bookOk) {
    const fname = SUBJECT_BOOKS[subject]||`${subject}.pdf`;
    const msg   = `⚠️ The **${subject}** textbook (\`${fname}\`) has not been uploaded yet.\n\nAsk your admin to place the PDF in the \`backend/books/\` folder on the server, then restart.`;
    res.write(`data: ${JSON.stringify({ token: msg })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, full: msg, subject })}\n\n`);
    if (typeof res.flush === 'function') res.flush();
    res.end();
    return;
  }

  // Build messages and stream
  const apiMessages = await buildMessages(question, subject, (ch[uid][cid].messages||[]).slice(-6));
  const full = await streamFromOpenRouter(apiMessages, res);

  // Persist to chat history
  const now = new Date().toISOString();
  const ch2 = getChats();
  if (!ch2[uid]) ch2[uid] = {};
  if (!ch2[uid][cid]) ch2[uid][cid] = ch[uid][cid];
  const c = ch2[uid][cid];
  c.messages = c.messages || [];
  c.messages.push({ role:'user',      content:question, ts:now });
  c.messages.push({ role:'assistant', content:full, subject, ts:now });
  c.updated = now;
  c.subject = subject;
  if (c.messages.length === 2) c.title = question.length>55 ? question.slice(0,55)+'…' : question;
  saveChats(ch2);

  // Final meta event — carries subject + updated title for sidebar
  res.write(`data: ${JSON.stringify({ meta:true, subject, title:c.title })}\n\n`);
  if (typeof res.flush === 'function') res.flush();
  res.end();
});

router.post('/preload/:subject', async (req, res) => {
  const { subject } = req.params;
  if (!SUBJECT_BOOKS[subject]) return res.status(400).json({ success:false, message:'Unknown subject' });
  delete bookTextCache[subject];
  delete chunkCache[subject];
  const text = await loadBook(subject);
  res.json({ success:!!text, data:{ subject, words: text ? text.split(/\s+/).length : 0 } });
});

// ── Startup ───────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(58));
console.log('  TIE AI — Tutor Intelligence Engine  (SSE Streaming)');
console.log(`  Model      : ${MODEL}`);
console.log(`  Chunk size : ${CHUNK_SIZE}w  Overlap: ${CHUNK_OVERLAP}w  Top-K: ${TOP_K}  Max tokens: ${MAX_TOKENS}`);
console.log(`  OpenRouter : ${process.env.OPENROUTER_API_KEY ? '✅ Key loaded' : '❌ MISSING — set OPENROUTER_API_KEY in .env'}`);
const st = bookStatus();
for (const [s,i] of Object.entries(st)) {
  if (s==='math') continue;
  console.log(`  [${i.exists?'✓':'✗'}] ${s.padEnd(16)} ${i.file}${i.exists?'':`  ← upload to backend/books/`}`);
}
console.log('═'.repeat(58) + '\n');

module.exports = router;
