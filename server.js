require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const path       = require('path');

const publicRoutes = require('./routes/public');
const adminRoutes  = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Security headers ── */
app.use(helmet({ contentSecurityPolicy: false }));

/* ── CORS — allow frontend ── */
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'https://digisakhi2026.netlify.app',
    'http://localhost:5500',  /* local dev */
    'http://127.0.0.1:5500'
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/* ── Body parsers ── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Serve admin panel static files ── */
app.use('/admin', express.static(path.join(__dirname, 'admin')));

/* ── API routes ── */
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

/* ── Health check ── */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()) + 's'
  });
});

/* ── Connect to MongoDB and start server ── */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`DigiSakhi backend running on http://localhost:${PORT}`);
      console.log(`Admin panel: http://localhost:${PORT}/admin`);
      console.log(`API health:  http://localhost:${PORT}/health`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

/* ── Graceful shutdown ── */
process.on('SIGTERM', () => {
  mongoose.connection.close(() => {
    console.log('MongoDB disconnected. Server shutting down.');
    process.exit(0);
  });
});
