// db/init.js
// Sets up the SQLite database and creates tables if they don't exist yet.
// Using better-sqlite3 because it's synchronous and dead simple for a small app like this.

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'campus-notes.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,       -- e.g. "MAT102"
    name TEXT NOT NULL,              -- e.g. "Calculus I"
    department TEXT
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id),
    title TEXT NOT NULL,
    description TEXT,
    uploader_name TEXT,
    file_path TEXT NOT NULL,         -- where the uploaded file lives on disk
    price INTEGER NOT NULL,          -- stored in kobo (NGN cents) to avoid float issues
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES items(id),
    buyer_email TEXT NOT NULL,
    payment_reference TEXT UNIQUE,
    status TEXT DEFAULT 'pending',   -- pending | completed | failed
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed a few common first/second-year courses so the site isn't empty on first run.
const seedCourses = db.prepare(
  `INSERT OR IGNORE INTO courses (code, name, department) VALUES (?, ?, ?)`
);
const courses = [
  ['MAT102', 'Calculus I', 'Mathematics'],
  ['PHY102', 'General Physics II', 'Physics'],
  ['CHM101', 'General Chemistry I', 'Chemistry'],
  ['GST101', 'Use of English', 'General Studies'],
];
for (const row of courses) seedCourses.run(...row);

module.exports = db;
