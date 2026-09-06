const express = require('express');
const router = express.Router();
const db = require('../db/init');

// GET /api/courses - list all courses, optionally filtered by search text
router.get('/', (req, res) => {
  const { q } = req.query;
  let rows;
  if (q) {
    const like = `%${q}%`;
    rows = db
      .prepare(`SELECT * FROM courses WHERE code LIKE ? OR name LIKE ? ORDER BY code`)
      .all(like, like);
  } else {
    rows = db.prepare(`SELECT * FROM courses ORDER BY code`).all();
  }
  res.json(rows);
});

// GET /api/courses/:code - a single course plus its items
router.get('/:code', (req, res) => {
  const course = db
    .prepare(`SELECT * FROM courses WHERE code = ?`)
    .get(req.params.code.toUpperCase());

  if (!course) return res.status(404).json({ error: 'Course not found' });

  const items = db
    .prepare(`SELECT id, title, description, uploader_name, price, created_at FROM items WHERE course_id = ? ORDER BY created_at DESC`)
    .all(course.id);

  res.json({ ...course, items });
});

// POST /api/courses - add a new course (used by the upload flow if the course doesn't exist yet)
router.post('/', (req, res) => {
  const { code, name, department } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'code and name are required' });

  try {
    const result = db
      .prepare(`INSERT INTO courses (code, name, department) VALUES (?, ?, ?)`)
      .run(code.toUpperCase(), name, department || null);
    res.status(201).json({ id: result.lastInsertRowid, code, name, department });
  } catch (err) {
    if (/UNIQUE constraint/i.test(err.message)) {
      return res.status(409).json({ error: 'That course code already exists' });
    }
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
