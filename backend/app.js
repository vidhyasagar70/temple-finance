const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const { clientOrigin, nodeEnv } = require('./config/env');
const apiRoutes = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = clientOrigin
  ? clientOrigin.split(',').map((o) => o.trim().replace(/\/+$/, ''))
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes('*') || allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }
      return callback(null, origin); // fallback to echo origin for credentials compatibility
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(mongoSanitize());
if (nodeEnv !== 'test') app.use(morgan(nodeEnv === 'development' ? 'dev' : 'combined'));

// Basic protection against brute-force login attempts
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
app.use('/api/auth/login', authLimiter);

app.get('/api/health', (req, res) => res.json({ success: true, message: 'OK' }));

app.use('/api', apiRoutes);

app.use((req, res, next) => next(ApiError.notFound(`Route not found: ${req.originalUrl}`)));

app.use(errorHandler);

module.exports = app;
