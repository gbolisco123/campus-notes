require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Make sure the uploads folder exists before multer tries to write to it.
// DATA_DIR points at a persistent Railway volume in production so uploaded
// files survive redeploys; locally it just falls back to this folder.
const dataDir = process.env.DATA_DIR || __dirname;
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/courses', require('./routes/courses'));
app.use('/api/items', require('./routes/items'));
app.use('/api/purchases', require('./routes/purchases'));

app.listen(PORT, () => {
  console.log(`Campus Notes running at http://localhost:${PORT}`);
});
