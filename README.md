# Campus Notes

A marketplace where students upload and sell lecture notes, past questions, and summaries by course code. Buyers pay through Paystack and get an instant download link.

## What's in here

```
campus-notes/
  server.js              # Express app entry point
  db/
    init.js              # SQLite schema + seed courses
  routes/
    courses.js            # browse/search courses, view one course + its items
    items.js               # upload a note (handles the file upload)
    purchases.js           # start payment, verify payment, serve download
  public/
    index.html             # browse + course detail page
    item.html               # single item page with the "Pay & Download" button
    upload.html             # form for contributors to upload notes
    success.html            # page Paystack redirects back to after payment
    style.css               # all styling
  uploads/                # uploaded files land here (created automatically)
```

## 1. Install dependencies

You'll need [Node.js](https://nodejs.org) installed (v18+ recommended). Then:

```bash
cd campus-notes
npm install
```

## 2. Set up Paystack

1. Create a free account at [paystack.com](https://paystack.com) — the Nigerian sign-up flow gives you test keys immediately, no business verification needed to start testing.
2. Go to **Settings → API Keys & Webhooks** and copy your **Test Secret Key** (starts with `sk_test_`).
3. Copy `.env.example` to `.env` and paste your key in:

```bash
cp .env.example .env
```

```
PAYSTACK_SECRET_KEY=sk_test_your_real_key_here
```

Paystack gives you test card numbers on their docs (e.g. `4084 0840 8408 4081`) so you can complete a full payment flow without spending real money while testing.

## 3. Run it

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

## 4. Try the full flow

1. On the home page, click a course (e.g. MAT102) — it'll be empty at first.
2. Go to **Sell your notes**, fill the form, attach any PDF, and submit.
3. Go back to that course — your item now shows up.
4. Click into the item, enter an email, click **Pay & Download**.
5. Complete the test payment on Paystack's checkout using a test card.
6. You'll land back on the success page with a working download link.

## Notes on how it works

- **No user accounts yet** — buyers just enter an email at checkout, and contributors just type their name. This keeps the MVP fast to launch. You can add real accounts later once you validate people will actually pay.
- **Payment verification happens server-side** (`routes/purchases.js`) — the download link only unlocks after your server confirms the payment with Paystack directly, not just because the browser says it succeeded. This stops people from faking a successful payment.
- **Files are stored locally** in `/uploads` with randomized filenames, so people can't guess a download URL without paying. For a real deployment beyond your own laptop, you'll eventually want to move this to a cloud storage bucket (e.g. Cloudinary or S3) since most free hosts wipe local files on redeploy.
- **Database is SQLite**, stored as a single file (`db/campus-notes.db`) — zero setup, easy to inspect, fine until you have real concurrent traffic.

## Deploying for free (once you're ready to go live)

- **Railway** or **Render** both have free tiers that work well for a small Node + SQLite app like this.
- Set your `PAYSTACK_SECRET_KEY` as an environment variable in whichever platform you use — never commit your real `.env` file.
- When you're ready for real payments (not test mode), swap in your **Live Secret Key** from Paystack once your account is activated.

## Natural next steps once this is working

- Add simple admin protection on the upload form so randoms can't spam junk uploads.
- Add a rating/report system so bad uploads get flagged.
- Add student login so people can see their purchase history and re-download without re-paying.
- Take a cut: currently the full price goes to whoever's Paystack account is connected — if you want a marketplace where the *uploader* gets paid and you take a commission, you'd use Paystack's [Split Payments](https://paystack.com/docs/payments/split-payments/) feature.
