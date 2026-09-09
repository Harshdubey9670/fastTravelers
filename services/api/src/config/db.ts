import mongoose from 'mongoose';
import { ENV } from './env.js';

export async function connectDatabase(): Promise<typeof mongoose> {
  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      autoIndex: true, // Build indexes in dev/test, manage via migrations in high-scale prod
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[Database] Connected successfully to MongoDB at ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('[Database] Connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] Disconnected from MongoDB. Attempting to reconnect...');
    });

    return conn;
  } catch (error) {
    console.error('[Database] Initial connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log('[Database] Disconnected from MongoDB gracefully.');
}
