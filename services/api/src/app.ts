import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRateLimiter, errorHandler } from './middlewares/errorHandler.middleware.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import driverRoutes from './routes/driver.routes.js';
import rideRoutes from './routes/ride.routes.js';
import locationRoutes from './routes/location.routes.js';
import { adminRouter, reportRouter } from './routes/admin.routes.js';

export const app = express();

// Security and CORS
app.use(helmet());
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'Accept'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(apiRateLimiter);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'gaon-auto-api',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// Mount Versioned API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/rides', rideRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/admin', adminRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The endpoint ${req.method} ${req.originalUrl} does not exist.`,
    },
  });
});

// Centralized Error Handler
app.use(errorHandler);
