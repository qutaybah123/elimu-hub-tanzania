const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/database');
const { authorize } = require('../middleware/auth');
const { check, validationResult } = require('express-validator');

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for past papers
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|zip/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new Error('Only PDF, DOC, DOCX, ZIP files allowed'));
  },
});

/**
 * @swagger
 * /api/exams:
 *   get:
 *     summary: Get all past papers
 *     tags: [Exams]
 */
router.get('/', async (req, res) => {
  try {
    const { subject_id, exam_type, year, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    if (subject_id) { params.push(subject_id); conditions.push(`pp.subject_id = $${params.length}`); }
    if (exam_type) { params.push(exam_type); conditions.push(`pp.exam_type = $${params.length}`); }
    if (year) { params.push(year); conditions.push(`pp.year = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await pool.query(
      `SELECT pp.*, s.name AS subject_name, u.full_name AS uploader_name
       FROM past_papers pp
       LEFT JOIN subjects s ON s.id = pp.subject_id
       LEFT JOIN users u ON u.id = pp.uploaded_by
       ${where}
       ORDER BY pp.year DESC, pp.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/exams/{id}:
 *   get:
 *     summary: Get past paper by ID
 *     tags: [Exams]
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pp.*, s.name AS subject_name
       FROM past_papers pp
       LEFT JOIN subjects s ON s.id = pp.subject_id
       WHERE pp.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });

    // Track download
    await pool.query('UPDATE past_papers SET downloads_count = downloads_count + 1 WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/exams:
 *   post:
 *     summary: Upload a past paper (teacher/admin)
 *     tags: [Exams]
 */
router.post('/', authorize('teacher', 'admin'), upload.single('file'), [
  check('subjectId').not().isEmpty(),
  check('year').isInt({ min: 1990, max: new Date().getFullYear() + 1 }),
  check('examType').isIn(['PSLE', 'CSEE', 'ACSEE']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { subjectId, year, examType, region, paperNumber, questionsCount, title } = req.body;
  // Accept uploaded file OR external URL
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : req.body.fileUrl;
  const fileSize = req.file ? req.file.size : req.body.fileSize || null;

  if (!fileUrl) return res.status(400).json({ success: false, message: 'File or fileUrl is required' });

  try {
    const result = await pool.query(
      `INSERT INTO past_papers (subject_id, year, exam_type, region, paper_number, file_url, file_size, questions_count, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [subjectId, year, examType, region || null, paperNumber || null, fileUrl, fileSize, questionsCount || null, req.user.id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/exams/{id}:
 *   delete:
 *     summary: Delete a past paper (admin only)
 *     tags: [Exams]
 */
router.post('/:id/download', async (req, res) => {
  try {
    await pool.query('UPDATE past_papers SET downloads_count = downloads_count + 1 WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM past_papers WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.json({ success: true, message: 'Past paper deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
