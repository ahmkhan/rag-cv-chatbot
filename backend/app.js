// app.js — Step 5b: the Express server for the CV chatbot.
// Run from the backend folder:  node app.js

require('dotenv').config({ quiet: true });
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const chatRoutes = require('./src/routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;

// Behind a host like Render, requests come through a proxy. This makes Express read the
// visitor's real IP, so rate limits apply per visitor instead of to everyone at once.
app.set('trust proxy', 1);

// CORS: only the websites listed in ALLOWED_ORIGINS may call the API from a browser.
// (Greetova will use the same idea to lock each customer's widget to their own domain.)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// During local development, also allow this server's own pages (public/demo.html).
// On the live server we set NODE_ENV=production, so only ALLOWED_ORIGINS are accepted.
if (process.env.NODE_ENV !== 'production') allowedOrigins.push(`http://localhost:${PORT}`);

app.use('/api', cors({
  origin: (origin, callback) => {
    // Requests without an Origin header (curl, server-to-server) are allowed through;
    // browsers always send one, so websites not on the list are blocked.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed'));
  },
}));

// Parse JSON bodies, with a small size limit so nobody can send huge payloads.
app.use(express.json({ limit: '10kb' }));

// Serve public/ (the chat widget script lives there): <script src=".../widget.js">
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', chatRoutes);

// Last-resort error handler: blocked origins and unexpected errors get a short message,
// never a stack trace.
app.use((error, req, res, next) => {
  if (error.message === 'Origin not allowed') return res.status(403).json({ error: 'Not allowed' });
  console.error(JSON.stringify({ event: 'server_error', error: error.message }));
  return res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(PORT, () => {
  console.log(`CV chatbot API running on http://localhost:${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ') || '(none)'}`);
});
