const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/init');

// Files land in /uploads with a random name so nobody can guess/enumerate them.
// DATA_DIR points at a persistent Railway volume in production.
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');
const storage = multer.diskStorage({
  destination: path.join(dataDir, 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB is plenty for lecture notes
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word, and PowerPoint files are allowed'));
    }
  },
});

// GET /api/items/:id - single item detail (for the item/preview page)
router.get('/:id', (req, res) => {
  const item = db
    .prepare(
      `SELECT items.id, items.title, items.description, items.uploader_name, items.price,
              items.created_at, courses.code AS course_code, courses.name AS course_name
       FROM items JOIN courses ON items.course_id = courses.id
       WHERE items.id = ?`
    )
    .get(req.params.id);

  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// POST /api/items - upload a new note/past question for a course
// Expects multipart/form-data: course_code, title, description, uploader_name, price, file
router.post('/', upload.single('file'), (req, res) => {
  const { course_code, title, description, uploader_name, price } = req.body;

  if (!course_code || !title || !price || !req.file) {
    return res.status(400).json({ error: 'course_code, title, price, and file are required' });
  }

  const course = db.prepare(`SELECT id FROM courses WHERE code = ?`).get(course_code.toUpperCase());
  if (!course) return res.status(404).json({ error: 'Course not found — create it first' });

  const priceInKobo = Math.round(parseFloat(price) * 100);
  if (isNaN(priceInKobo) || priceInKobo < 0) {
    return res.status(400).json({ error: 'Invalid price' });
  }

  const result = db
    .prepare(
      `INSERT INTO items (course_id, title, description, uploader_name, file_path, price)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(course.id, title, description || null, uploader_name || 'Anonymous', req.file.filename, priceInKobo);

  res.status(201).json({ id: result.lastInsertRowid, title, price: priceInKobo });
});

module.exports = router;
