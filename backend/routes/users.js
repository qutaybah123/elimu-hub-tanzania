const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 */
router.get('/me', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, role, school_id, grade, avatar_url, created_at, last_login
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 */
router.put('/me', [
  check('fullName').optional().not().isEmpty().trim(),
  check('grade').optional().trim(),
  check('schoolId').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { fullName, grade, schoolId, avatarUrl } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        grade = COALESCE($2, grade),
        school_id = COALESCE($3, school_id),
        avatar_url = COALESCE($4, avatar_url),
        updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, full_name, role, school_id, grade, avatar_url`,
      [fullName, grade, schoolId, avatarUrl, req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/users/me/password:
 *   put:
 *     summary: Change password
 *     tags: [Users]
 */
router.put('/me/password', [
  check('currentPassword').not().isEmpty(),
  check('newPassword').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { currentPassword, newPassword } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashed, req.user.id]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users (admin only)
 *     tags: [Users]
 */
router.get('/', authorize('admin'), async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT id, email, full_name, role, school_id, grade, is_active, created_at FROM users`;
    const params = [];
    if (role) { params.push(role); query += ` WHERE role = $${params.length}`; }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


/**
 * PATCH /api/users/:id/role - Change user role (admin only)
 */
router.patch("/:id/role", authorize("admin"), async (req, res) => {
  const { role } = req.body;
  if (!["student","teacher","admin"].includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }
  try {
    const result = await pool.query(
      "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, role",
      [role, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * DELETE /api/users/:id - Delete a user account (admin only)
 * Cannot delete your own account or other admins
 */
router.delete('/:id', authorize('admin'), async (req, res) => {
  const targetId = req.params.id;

  // Prevent self-deletion
  if (targetId === req.user.id) {
    return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
  }

  try {
    // Prevent deleting other admins
    const check = await pool.query('SELECT role FROM users WHERE id = $1', [targetId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (check.rows[0].role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete admin accounts' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [targetId]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

