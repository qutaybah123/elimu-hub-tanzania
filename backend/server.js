const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const subjectRoutes = require('./routes/subjects');
const resourceRoutes = require('./routes/resources');
const examRoutes = require('./routes/exams');
const quizRoutes = require('./routes/quizzes');
const progressRoutes = require('./routes/progress');
const aiRoutes = require('./routes/ai');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');

const app = express();

// Trust nginx proxy — required so express-rate-limit can read the real client IP
// from X-Forwarded-For. Without this it throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// on every request, crashing the middleware chain and causing blank pages.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
// Compression — skip SSE streaming routes (gzip buffers chunks and destroys SSE)
app.use(compression({
  filter: (req, res) => {
    // Never compress SSE streams — the gzip buffer swallows tokens and causes 520s
    if (req.path.match(/\/ai\/chats\/[^/]+\/message$/)) return false;
    if (req.headers.accept && req.headers.accept.includes('text/event-stream')) return false;
    return compression.filter(req, res);
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per 15 min window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter limiter for auth endpoints only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login attempts per 15 min
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
// Allow all origins - nginx handles security at the proxy level
const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    // Allow if no specific origins set (dev mode)
    if (allowedOrigins.length === 0) return callback(null, true);
    // Allow if origin matches any in the list, or if it's a cloudflare tunnel
    if (allowedOrigins.some(o => o === '*') || allowedOrigins.some(o => origin.startsWith(o))) {
      return callback(null, true);
    }
    // Allow cloudflare tunnels and local
    if (origin.includes('trycloudflare.com') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, true); // permissive - nginx handles real security
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Elimu Hub Tanzania API',
      version: '1.0.0',
      description: 'API documentation for Elimu Hub Tanzania',
      contact: {
        name: 'Elimu Hub Team',
        email: 'support@elimuhub.tz'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000/api',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/subjects', authenticate, subjectRoutes);
app.use('/api/resources', authenticate, resourceRoutes);
app.use('/api/exams', authenticate, examRoutes);
app.use('/api/quizzes', authenticate, quizRoutes);
app.use('/api/progress', authenticate, progressRoutes);
app.use('/api/ai', authenticate, aiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Elimu Hub Tanzania API'
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Docs available at http://localhost:${PORT}/api-docs`);
});