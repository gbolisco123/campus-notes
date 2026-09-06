require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Make sure the uploads folder exists before multer tries to write to it
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/courses', require('./routes/courses'));
app.use('/api/items', require('./routes/items'));
app.use('/api/purchases', require('./routes/purchases'));

app.listen(PORT, () => {
  console.log(`Campus Notes running at http://localhost:${PORT}`);
});
