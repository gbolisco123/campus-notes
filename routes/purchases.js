const express = require('express');
const router = express.Router();
const axios = require('axios');
const path = require('path');
const db = require('../db/init');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = 'https://api.paystack.co';
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');

// POST /api/purchases/initialize
// Body: { item_id, buyer_email }
// Starts a Paystack transaction and returns the checkout URL for the frontend to redirect to.
router.post('/initialize', async (req, res) => {
  const { item_id, buyer_email } = req.body;
  if (!item_id || !buyer_email) {
    return res.status(400).json({ error: 'item_id and buyer_email are required' });
  }

  const item = db.prepare(`SELECT * FROM items WHERE id = ?`).get(item_id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  try {
    const paystackRes = await axios.post(
      `${PAYSTACK_BASE}/transaction/initialize`,
      {
        email: buyer_email,
        amount: item.price, // already in kobo
        metadata: { item_id: item.id },
        callback_url: `${req.protocol}://${req.get('host')}/success.html`,
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    const { authorization_url, reference } = paystackRes.data.data;

    db.prepare(
      `INSERT INTO purchases (item_id, buyer_email, payment_reference, status) VALUES (?, ?, ?, 'pending')`
    ).run(item.id, buyer_email, reference);

    res.json({ authorization_url, reference });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(502).json({ error: 'Could not start payment. Please try again.' });
  }
});

// GET /api/purchases/verify/:reference
// Called by the success page once Paystack redirects back. Confirms payment
// server-side (never trust the client) and, if genuine, unlocks the download.
router.get('/verify/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    const verifyRes = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });

    const { status } = verifyRes.data.data;
    const purchase = db.prepare(`SELECT * FROM purchases WHERE payment_reference = ?`).get(reference);

    if (!purchase) return res.status(404).json({ error: 'Purchase record not found' });

    if (status === 'success') {
      db.prepare(`UPDATE purchases SET status = 'completed' WHERE id = ?`).run(purchase.id);
      return res.json({ status: 'completed', download_url: `/api/purchases/download/${reference}` });
    } else {
      db.prepare(`UPDATE purchases SET status = 'failed' WHERE id = ?`).run(purchase.id);
      return res.json({ status: 'failed' });
    }
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(502).json({ error: 'Could not verify payment right now' });
  }
});

// GET /api/purchases/download/:reference
// Only serves the file if that reference is marked completed in our own DB.
router.get('/download/:reference', (req, res) => {
  const purchase = db
    .prepare(`SELECT * FROM purchases WHERE payment_reference = ? AND status = 'completed'`)
    .get(req.params.reference);

  if (!purchase) return res.status(403).json({ error: 'No completed purchase found for this reference' });

  const item = db.prepare(`SELECT * FROM items WHERE id = ?`).get(purchase.item_id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  res.download(path.join(dataDir, 'uploads', item.file_path), item.title);
});

module.exports = router;
