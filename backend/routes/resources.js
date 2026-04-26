const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/database');
const { authorize } = require('../middleware/auth');
const { check, validationResult } = require('express-validator');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|ppt|pptx|mp4|png|jpg|jpeg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    if (ext) return cb(null, true);
    cb(new Error('Invalid file type'));
  },
});

/**
 * @swagger
 * /api/resources:
 *   get:
 *     summary: Get all approved resources
 *     tags: [Resources]
 */
router.get('/', async (req, res) => {
  try {
    const { subject_id, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const isAdmin = req.user?.role === 'admin';
    const params = isAdmin ? [] : ['approved'];
    let where = isAdmin ? '1=1' : 'r.approval_status = $1';

    if (subject_id) { params.push(subject_id); where += ` AND r.subject_id = $${params.length}`; }
    if (type) { params.push(type); where += ` AND r.type = $${params.length}`; }

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT r.*, s.name AS subject_name, u.full_name AS uploader_name
       FROM resources r
       LEFT JOIN subjects s ON s.id = r.subject_id
       LEFT JOIN users u ON u.id = r.uploaded_by
       WHERE ${where}
       ORDER BY r.created_at DESC
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
 * /api/resources/{id}:
 *   get:
 *     summary: Get resource by ID
 *     tags: [Resources]
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, s.name AS subject_name, u.full_name AS uploader_name
       FROM resources r
       LEFT JOIN subjects s ON s.id = r.subject_id
       LEFT JOIN users u ON u.id = r.uploaded_by
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Resource not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/resources/{id}/download:
 *   post:
 *     summary: Track resource download
 *     tags: [Resources]
 */
router.post('/:id/download', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO resource_downloads (user_id, resource_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.user.id, req.params.id]
    );
    await pool.query(
      'UPDATE resources SET downloads_count = downloads_count + 1 WHERE id = $1',
      [req.params.id]
    );
    res.json({ success: true, message: 'Download tracked' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/resources:
 *   post:
 *     summary: Upload a new resource
 *     tags: [Resources]
 */
router.post('/', upload.single('file'), [
  check('title').not().isEmpty(),
  check('type').isIn(['notes', 'video', 'pdf', 'presentation', 'exercise']),
  check('subjectId').not().isEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, type, subjectId } = req.body;
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : req.body.fileUrl;
  const fileSize = req.file ? req.file.size : null;

  if (!fileUrl) return res.status(400).json({ success: false, message: 'File or fileUrl is required' });

  try {
    const approvalStatus = req.user.role === 'admin' ? 'approved' : 'pending';
    const result = await pool.query(
      `INSERT INTO resources (subject_id, title, description, type, file_url, file_size, uploaded_by, approval_status, is_approved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [subjectId, title, description, type, fileUrl, fileSize, req.user.id, approvalStatus, approvalStatus === 'approved']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/resources/{id}/approve:
 *   patch:
 *     summary: Approve or reject a resource (admin/teacher)
 *     tags: [Resources]
 */
router.patch('/:id/approve', authorize('admin', 'teacher'), async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
  }
  try {
    const result = await pool.query(
      `UPDATE resources SET approval_status = $1, is_approved = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, status === 'approved', req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Resource not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/resources/{id}:
 *   delete:
 *     summary: Delete a resource
 *     tags: [Resources]
 */
router.delete('/:id', async (req, res) => {
  try {
    const resource = await pool.query('SELECT * FROM resources WHERE id = $1', [req.params.id]);
    if (resource.rows.length === 0) return res.status(404).json({ success: false, message: 'Resource not found' });
    if (resource.rows[0].uploaded_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await pool.query('DELETE FROM resources WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Resource deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
