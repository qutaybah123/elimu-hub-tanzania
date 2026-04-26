const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authorize } = require('../middleware/auth');
const { check, validationResult } = require('express-validator');

/**
 * @swagger
 * /api/subjects:
 *   get:
 *     summary: Get all subjects
 *     tags: [Subjects]
 */
router.get('/', async (req, res) => {
  try {
    const { grade_level } = req.query;
    let query = 'SELECT * FROM subjects';
    const params = [];
    if (grade_level) { params.push(grade_level); query += ` WHERE grade_level = $1`; }
    query += ' ORDER BY name ASC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/subjects/{id}:
 *   get:
 *     summary: Get subject by ID with resources count
 *     tags: [Subjects]
 */
router.get('/:id', async (req, res) => {
  try {
    const subjectResult = await pool.query('SELECT * FROM subjects WHERE id = $1', [req.params.id]);
    if (subjectResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const statsResult = await pool.query(
      `SELECT
        COUNT(DISTINCT r.id) AS resource_count,
        COUNT(DISTINCT pp.id) AS past_paper_count,
        COUNT(DISTINCT q.id) AS quiz_count
       FROM subjects s
       LEFT JOIN resources r ON r.subject_id = s.id AND r.approval_status = 'approved'
       LEFT JOIN past_papers pp ON pp.subject_id = s.id
       LEFT JOIN quizzes q ON q.subject_id = s.id AND q.is_published = TRUE
       WHERE s.id = $1`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...subjectResult.rows[0], ...statsResult.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/subjects:
 *   post:
 *     summary: Create subject (admin only)
 *     tags: [Subjects]
 */
router.post('/', authorize('admin'), [
  check('name').not().isEmpty(),
  check('code').not().isEmpty(),
  check('gradeLevel').not().isEmpty(),
  check('syllabusYear').isInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, code, description, gradeLevel, syllabusYear, iconUrl, colorHex } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO subjects (name, code, description, grade_level, syllabus_year, icon_url, color_hex)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, code, description, gradeLevel, syllabusYear, iconUrl, colorHex]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Subject code already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/subjects/{id}:
 *   put:
 *     summary: Update subject (admin only)
 *     tags: [Subjects]
 */
router.put('/:id', authorize('admin'), async (req, res) => {
  const { name, description, gradeLevel, syllabusYear, iconUrl, colorHex } = req.body;
  try {
    const result = await pool.query(
      `UPDATE subjects SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        grade_level = COALESCE($3, grade_level),
        syllabus_year = COALESCE($4, syllabus_year),
        icon_url = COALESCE($5, icon_url),
        color_hex = COALESCE($6, color_hex)
       WHERE id = $7 RETURNING *`,
      [name, description, gradeLevel, syllabusYear, iconUrl, colorHex, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
