// routes/chat.js — maps URLs to controller functions, with rate limits in front.
//
// Note: there is deliberately NO public "ingest" endpoint. Re-loading the CV is done with
// `node scripts/ingest.js` on our machine, so nobody on the internet can trigger it.

const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { chat } = require('../controllers/chatController');

const router = express.Router();

// Rate limits per visitor IP protect the Gemini/Pinecone free quotas from spam or abuse.
// Short window: stops rapid-fire bots. Daily window: caps one person's total usage.
const burstLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 10,
  standardHeaders: 'draft-8', // tells well-behaved clients how long to wait
  legacyHeaders: false,
  message: { error: 'Too many questions in a short time. Please wait a few minutes.' },
});

const dailyLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Daily question limit reached. Please come back tomorrow or use the contact form.' },
});

router.post('/chat', burstLimit, dailyLimit, chat);

// Simple health check: lets us (and the hosting platform) confirm the server is up.
router.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = router;
