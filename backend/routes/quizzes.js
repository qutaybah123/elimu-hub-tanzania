const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/database');
const { authorize } = require('../middleware/auth');
const { check, validationResult } = require('express-validator');

// Multer for JSON/CSV quiz imports (memory storage — we parse, don't save)
const importStorage = multer.memoryStorage();
const importUpload = multer({
  storage: importStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /json|csv|txt/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    if (ext) return cb(null, true);
    cb(new Error('Only JSON or CSV files are allowed for quiz import'));
  },
});

// ─── Parsers ────────────────────────────────────────────────────────────────

/**
 * Parse a JSON quiz payload. Accepts two shapes:
 *   Shape A (full quiz object):
 *     { title, description, difficulty, timeLimit, questions: [...] }
 *   Shape B (questions-only array):
 *     [ { text, type, options, explanation }, ... ]
 */
function parseJsonQuiz(raw) {
  let data;
  if (typeof raw === 'string') {
    data = JSON.parse(raw); // throws on invalid JSON
  } else {
    data = raw;
  }

  // Shape B — bare array
  if (Array.isArray(data)) {
    return { meta: {}, questions: normalizeQuestions(data) };
  }

  // Shape A — object with questions key
  const { title, description, difficulty, timeLimit, time_limit, questions, ...rest } = data;
  return {
    meta: { title, description, difficulty, timeLimit: timeLimit || time_limit },
    questions: normalizeQuestions(questions || []),
  };
}

/**
 * Normalise questions from various shapes into our internal format.
 */
function normalizeQuestions(rawQuestions) {
  if (!Array.isArray(rawQuestions)) return [];
  return rawQuestions.map((q, idx) => {
    const text = q.text || q.question || q.question_text || q.stem || `Question ${idx + 1}`;
    const type = detectType(q);
    const marks = parseInt(q.marks || q.points || q.score || 1, 10) || 1;
    const explanation = q.explanation || q.rationale || q.hint || null;

    let options = [];
    if (type === 'true_false') {
      const correct = String(q.answer || q.correct || q.correct_answer || 'true').toLowerCase();
      const isTrue = correct === 'true' || correct === '1' || correct === 'yes';
      options = [
        { text: 'True', isCorrect: isTrue },
        { text: 'False', isCorrect: !isTrue },
      ];
    } else if (type === 'multiple_choice') {
      options = normalizeOptions(q);
    }

    return { text, type, marks, explanation, options };
  });
}

function detectType(q) {
  const explicit = (q.type || q.question_type || '').toLowerCase();
  if (explicit.includes('true') || explicit.includes('false') || explicit === 'tf' || explicit === 'boolean') return 'true_false';
  if (explicit.includes('short') || explicit.includes('open') || explicit.includes('fill')) return 'short_answer';
  if (explicit.includes('multiple') || explicit.includes('mcq') || explicit.includes('choice')) return 'multiple_choice';
  // Auto-detect: if it has options array → multiple choice
  if (Array.isArray(q.options) && q.options.length > 0) return 'multiple_choice';
  if (Array.isArray(q.choices) && q.choices.length > 0) return 'multiple_choice';
  if (q.a || q.A) return 'multiple_choice';
  return 'multiple_choice'; // safe default
}

function normalizeOptions(q) {
  // Shape 1: options array of objects { text, isCorrect } or { text, correct }
  if (Array.isArray(q.options) && typeof q.options[0] === 'object') {
    return q.options.map(o => ({
      text: o.text || o.option_text || o.value || String(o),
      isCorrect: !!(o.isCorrect || o.is_correct || o.correct),
    }));
  }
  // Shape 2: options array of strings + correct_answer index or letter
  if (Array.isArray(q.options) && typeof q.options[0] === 'string') {
    const correctRef = String(q.answer || q.correct_answer || q.correct || '').toLowerCase();
    return q.options.map((text, i) => {
      const letter = String.fromCharCode(97 + i); // a, b, c, d
      const isCorrect = correctRef === String(i) || correctRef === letter || correctRef === text.toLowerCase();
      return { text, isCorrect };
    });
  }
  // Shape 3: a/b/c/d keys + answer key
  const letters = ['a', 'b', 'c', 'd', 'e'];
  const found = letters.filter(l => q[l] || q[l.toUpperCase()]);
  if (found.length > 0) {
    const correctRef = String(q.answer || q.correct || '').toLowerCase();
    return found.map(l => ({
      text: q[l] || q[l.toUpperCase()],
      isCorrect: correctRef === l || correctRef === (q[l] || '').toLowerCase(),
    }));
  }
  // Shape 4: choices array
  if (Array.isArray(q.choices)) {
    return normalizeOptions({ ...q, options: q.choices });
  }
  return [];
}

/**
 * Parse a CSV quiz file.
 * Expected columns (flexible): question, type, option_a, option_b, option_c, option_d, answer, explanation, marks
 * OR: text, a, b, c, d, correct, explanation
 */
function parseCsvQuiz(csvText) {
  const lines = csvText.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one question');

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

  const questions = lines.slice(1).map((line, idx) => {
    // Handle quoted commas
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = (cols[i] || '').trim().replace(/^["']|["']$/g, ''); });

    const text = row.question || row.text || row.stem || row.q || `Question ${idx + 1}`;
    const type = detectType(row);
    const marks = parseInt(row.marks || row.points || 1, 10) || 1;
    const explanation = row.explanation || row.rationale || null;

    // Build options from CSV columns
    const optionCols = ['option_a','option_b','option_c','option_d','a','b','c','d'].filter(k => row[k]);
    const correctRef = (row.answer || row.correct || row.correct_answer || '').toLowerCase();

    let options = [];
    if (type === 'true_false') {
      const isTrue = correctRef === 'true' || correctRef === '1' || correctRef === 'a';
      options = [{ text: 'True', isCorrect: isTrue }, { text: 'False', isCorrect: !isTrue }];
    } else {
      options = optionCols.map((col, i) => {
        const letter = col.replace('option_', '');
        const isCorrect = correctRef === letter || correctRef === String(i) || correctRef === row[col].toLowerCase();
        return { text: row[col], isCorrect };
      });
    }

    return { text, type, marks, explanation, options };
  }).filter(q => q.text);

  return { meta: {}, questions };
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += char; }
  }
  result.push(current);
  return result;
}

// ─── Helper: insert quiz + questions in a transaction ───────────────────────
async function insertQuizWithQuestions(client, { title, description, subjectId, difficulty, timeLimit, questions, userId }) {
  const quizResult = await client.query(
    `INSERT INTO quizzes (title, description, subject_id, created_by, difficulty, time_limit, total_questions)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [title, description || null, subjectId, userId, difficulty || 'medium', timeLimit || 30, questions.length]
  );
  const quiz = quizResult.rows[0];

  for (const q of questions) {
    const qResult = await client.query(
      `INSERT INTO questions (quiz_id, question_text, question_type, marks, explanation)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [quiz.id, q.text, q.type || 'multiple_choice', q.marks || 1, q.explanation || null]
    );
    const qId = qResult.rows[0].id;
    for (const opt of (q.options || [])) {
      await client.query(
        `INSERT INTO question_options (question_id, option_text, is_correct) VALUES ($1, $2, $3)`,
        [qId, opt.text, opt.isCorrect || false]
      );
    }
  }
  return quiz;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /api/quizzes
 * List all published quizzes
 */
router.get('/', async (req, res) => {
  try {
    const { subject_id, difficulty, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [true];
    let where = 'q.is_published = $1';
    if (subject_id) { params.push(subject_id); where += ` AND q.subject_id = $${params.length}`; }
    if (difficulty) { params.push(difficulty); where += ` AND q.difficulty = $${params.length}`; }
    params.push(limit, offset);
    const result = await pool.query(
      `SELECT q.*, s.name AS subject_name, u.full_name AS creator_name,
        (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) AS questions_count
       FROM quizzes q
       LEFT JOIN subjects s ON s.id = q.subject_id
       LEFT JOIN users u ON u.id = q.created_by
       WHERE ${where}
       ORDER BY q.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/quizzes/recommended
 */
router.get('/recommended', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT q.*, s.name AS subject_name,
        (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) AS questions_count
       FROM quizzes q
       LEFT JOIN subjects s ON s.id = q.subject_id
       WHERE q.is_published = TRUE
         AND q.id NOT IN (SELECT quiz_id FROM quiz_attempts WHERE student_id = $1 AND status = 'completed')
       ORDER BY RANDOM() LIMIT 5`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/quizzes/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const quizResult = await pool.query(
      `SELECT q.*, s.name AS subject_name FROM quizzes q
       LEFT JOIN subjects s ON s.id = q.subject_id WHERE q.id = $1`,
      [req.params.id]
    );
    if (quizResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Quiz not found' });
    const questionsResult = await pool.query(
      `SELECT q.*, json_agg(json_build_object(
          'id', o.id, 'option_text', o.option_text, 'is_correct', o.is_correct
        ) ORDER BY o.id) AS options
       FROM questions q
       LEFT JOIN question_options o ON o.question_id = q.id
       WHERE q.quiz_id = $1 GROUP BY q.id ORDER BY q.created_at`,
      [req.params.id]
    );
    res.json({ success: true, data: { ...quizResult.rows[0], questions: questionsResult.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/quizzes
 * Manual creation (empty quiz or with inline questions array)
 */
router.post('/', authorize('teacher', 'admin'), [
  check('title').not().isEmpty(),
  check('subjectId').not().isEmpty(),
  check('difficulty').isIn(['easy', 'medium', 'hard']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { title, description, subjectId, difficulty, timeLimit, questions } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const quiz = await insertQuizWithQuestions(client, {
      title, description, subjectId, difficulty, timeLimit,
      questions: questions || [],
      userId: req.user.id,
    });
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: quiz });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { client.release(); }
});

/**
 * POST /api/quizzes/import
 * Import a quiz from:
 *   - multipart file upload  (field: "file", type: .json or .csv)
 *   - URL fetch              (body: { importUrl })
 *   - raw JSON paste         (body: { rawJson })
 *
 * Required body fields: subjectId, title (optional — can come from JSON)
 */
router.post('/import', authorize('teacher', 'admin'), importUpload.single('file'), async (req, res) => {
  const { subjectId, title: bodyTitle, description, difficulty, timeLimit, importUrl, rawJson } = req.body;

  if (!subjectId) return res.status(400).json({ success: false, message: 'subjectId is required' });

  let parsed;
  try {
    if (req.file) {
      // ── File upload ──────────────────────────────────────────
      const text = req.file.buffer.toString('utf-8');
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (ext === '.csv') {
        parsed = parseCsvQuiz(text);
      } else {
        parsed = parseJsonQuiz(text);
      }
    } else if (importUrl) {
      // ── URL fetch ────────────────────────────────────────────
      const response = await fetch(importUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      const contentType = response.headers.get('content-type') || '';
      let text = await response.text();
      if (contentType.includes('text/csv') || importUrl.endsWith('.csv')) {
        parsed = parseCsvQuiz(text);
      } else {
        parsed = parseJsonQuiz(text);
      }
    } else if (rawJson) {
      // ── Pasted JSON ──────────────────────────────────────────
      parsed = parseJsonQuiz(rawJson);
    } else {
      return res.status(400).json({ success: false, message: 'Provide a file, importUrl, or rawJson' });
    }
  } catch (err) {
    return res.status(400).json({ success: false, message: `Parse error: ${err.message}` });
  }

  if (!parsed.questions || parsed.questions.length === 0) {
    return res.status(400).json({ success: false, message: 'No questions found in the imported data' });
  }

  const finalTitle = bodyTitle || parsed.meta?.title || 'Imported Quiz';
  const finalDifficulty = difficulty || parsed.meta?.difficulty || 'medium';
  const finalTimeLimit = timeLimit || parsed.meta?.timeLimit || 30;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const quiz = await insertQuizWithQuestions(client, {
      title: finalTitle,
      description: description || parsed.meta?.description || null,
      subjectId,
      difficulty: ['easy','medium','hard'].includes(finalDifficulty) ? finalDifficulty : 'medium',
      timeLimit: finalTimeLimit,
      questions: parsed.questions,
      userId: req.user.id,
    });
    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      data: quiz,
      imported: { questionsCount: parsed.questions.length },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Import quiz error:', err);
    res.status(500).json({ success: false, message: 'Server error while saving quiz' });
  } finally { client.release(); }
});

/**
 * PATCH /api/quizzes/:id/publish
 */
router.patch('/:id/publish', authorize('teacher', 'admin'), async (req, res) => {
  const { isPublished } = req.body;
  try {
    const result = await pool.query(
      'UPDATE quizzes SET is_published = $1, updated_at = NOW() WHERE id = $2 AND created_by = $3 RETURNING *',
      [isPublished, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Quiz not found or not authorized' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/quizzes/:id/submit
 */
router.post('/:id/submit', async (req, res) => {
  const { answers, timeTaken } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const questionsResult = await client.query(
      `SELECT q.id, q.marks, o.id AS correct_option_id
       FROM questions q
       LEFT JOIN question_options o ON o.question_id = q.id AND o.is_correct = TRUE
       WHERE q.quiz_id = $1`,
      [req.params.id]
    );
    const questions = questionsResult.rows;
    let correctAnswers = 0;
    const attemptResult = await client.query(
      `INSERT INTO quiz_attempts (student_id, quiz_id, completed_at, time_taken, total_questions, status)
       VALUES ($1, $2, NOW(), $3, $4, 'completed') RETURNING id`,
      [req.user.id, req.params.id, timeTaken, questions.length]
    );
    const attemptId = attemptResult.rows[0].id;
    for (const q of questions) {
      const userAnswer = answers?.[q.id];
      const isCorrect = userAnswer === q.correct_option_id;
      if (isCorrect) correctAnswers++;
      await client.query(
        `INSERT INTO student_answers (attempt_id, question_id, selected_option_id, is_correct, marks_obtained)
         VALUES ($1, $2, $3, $4, $5)`,
        [attemptId, q.id, userAnswer || null, isCorrect, isCorrect ? q.marks : 0]
      );
    }
    const score = questions.length > 0 ? (correctAnswers / questions.length) * 100 : 0;
    await client.query('UPDATE quiz_attempts SET correct_answers = $1, score = $2 WHERE id = $3',
      [correctAnswers, score.toFixed(2), attemptId]);
    await client.query(
      `INSERT INTO student_progress (student_id, subject_id, total_quizzes, completed_quizzes, average_score, last_active)
       SELECT $1, q.subject_id, 1, 1, $2, CURRENT_DATE FROM quizzes q WHERE q.id = $3
       ON CONFLICT (student_id, subject_id) DO UPDATE SET
         completed_quizzes = student_progress.completed_quizzes + 1,
         total_quizzes = student_progress.total_quizzes + 1,
         average_score = (student_progress.average_score * student_progress.completed_quizzes + $2) / (student_progress.completed_quizzes + 1),
         last_active = CURRENT_DATE, updated_at = NOW()`,
      [req.user.id, score.toFixed(2), req.params.id]
    );
    await client.query('COMMIT');
    res.json({ success: true, data: { score: score.toFixed(2), correctAnswers, totalQuestions: questions.length, attemptId } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { client.release(); }
});

module.exports = router;
