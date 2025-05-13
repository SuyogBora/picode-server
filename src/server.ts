import 'module-alias/register';
import { errorHandler, notFound } from '@/middleware/error.middleware';
import globalRoutes from "@/routes/index";
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import path from 'path';
import { createLogger, format, transports } from 'winston';
import { corsOptions } from '@/config/cors';
import { initializeSocket } from './socket';
import http from "http";
// import "./utils/seed"
dotenv.config();

const app: Express = express();
const server = http.createServer(app); // Create HTTP server with Express app
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/picode';

// Initialize Socket.io
const io = initializeSocket(server); // Pass the HTTP server to Socket.io

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'picode-api' },
  transports: [
    new transports.File({ filename: path.join(__dirname, '../logs/error.log'), level: 'error' }),
    new transports.File({ filename: path.join(__dirname, '../logs/combined.log') })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    )
  }));
}

// Middleware
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Picode API' });
});

app.use("/api", globalRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start the server using the HTTP server, not Express directly
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Server running on port ${PORT}`);
});

export { app, io }; // Export both app and io if needed elsewhere