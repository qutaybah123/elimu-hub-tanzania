const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * @swagger
 * /api/progress/stats:
 *   get:
 *     summary: Get summary stats for current student
 *     tags: [Progress]
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(DISTINCT sp.subject_id) AS "totalSubjects",
        COALESCE(SUM(sp.completed_quizzes), 0) AS "completedExams",
        COALESCE(ROUND(AVG(sp.average_score), 1), 0) AS "averageScore",
        COALESCE(MAX(sp.streak_days), 0) AS streak
       FROM student_progress sp
       WHERE sp.student_id = $1`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/progress/recent-exams:
 *   get:
 *     summary: Get recent quiz attempts for current student
 *     tags: [Progress]
 */
router.get('/recent-exams', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT qa.id, qa.score, qa.correct_answers, qa.total_questions, qa.completed_at,
        q.title AS exam_title, s.name AS subject_name
       FROM quiz_attempts qa
       JOIN quizzes q ON q.id = qa.quiz_id
       JOIN subjects s ON s.id = q.subject_id
       WHERE qa.student_id = $1 AND qa.status = 'completed'
       ORDER BY qa.completed_at DESC
       LIMIT 10`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/progress/subjects:
 *   get:
 *     summary: Get per-subject progress for current student
 *     tags: [Progress]
 */
router.get('/subjects', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sp.*, s.name AS subject_name, s.color_hex, s.icon_url
       FROM student_progress sp
       JOIN subjects s ON s.id = sp.subject_id
       WHERE sp.student_id = $1
       ORDER BY sp.last_active DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/progress/leaderboard:
 *   get:
 *     summary: Get leaderboard for a subject
 *     tags: [Progress]
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { subject_id } = req.query;
    const params = [];
    let where = '';
    if (subject_id) { params.push(subject_id); where = `WHERE sp.subject_id = $1`; }

    const result = await pool.query(
      `SELECT u.full_name, u.avatar_url, sp.average_score, sp.completed_quizzes, sp.streak_days
       FROM student_progress sp
       JOIN users u ON u.id = sp.student_id
       ${where}
       ORDER BY sp.average_score DESC
       LIMIT 20`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/progress/attempts/{attemptId}:
 *   get:
 *     summary: Get detailed result of a quiz attempt
 *     tags: [Progress]
 */
router.get('/attempts/:attemptId', async (req, res) => {
  try {
    const attemptResult = await pool.query(
      `SELECT qa.*, q.title, q.time_limit, s.name AS subject_name
       FROM quiz_attempts qa
       JOIN quizzes q ON q.id = qa.quiz_id
       JOIN subjects s ON s.id = q.subject_id
       WHERE qa.id = $1 AND qa.student_id = $2`,
      [req.params.attemptId, req.user.id]
    );
    if (attemptResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Attempt not found' });

    const answersResult = await pool.query(
      `SELECT sa.*, qs.question_text, qs.explanation,
        o.option_text AS selected_option,
        co.option_text AS correct_option
       FROM student_answers sa
       JOIN questions qs ON qs.id = sa.question_id
       LEFT JOIN question_options o ON o.id = sa.selected_option_id
       LEFT JOIN question_options co ON co.question_id = sa.question_id AND co.is_correct = TRUE
       WHERE sa.attempt_id = $1`,
      [req.params.attemptId]
    );

    res.json({ success: true, data: { attempt: attemptResult.rows[0], answers: answersResult.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
