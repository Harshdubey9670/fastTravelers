import http from 'http';
import { app } from './app.js';
import { ENV } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { socketService } from './services/socket.service.js';

async function bootstrap() {
  try {
    // 1. Connect to MongoDB
    await connectDatabase();

    // 2. Create HTTP Server
    const server = http.createServer(app);

    // 3. Initialize Socket.IO Server
    socketService.init(server);

    // 4. Start Listening
    server.listen(ENV.PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Gaon Auto API & Socket.IO Server running on port ${ENV.PORT}`);
      console.log(`📡 Environment: ${ENV.NODE_ENV}`);
      console.log(`📱 SMS Provider: ${ENV.SMS_PROVIDER}`);
      console.log(`🗄️  Storage: ${ENV.STORAGE_TYPE} (${ENV.UPLOAD_DIR})`);
      console.log(`====================================================`);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown if taking too long
      setTimeout(() => {
        console.error('[Server] Graceful shutdown timed out. Forcing exit.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[Server] Fatal startup error:', error);
    process.exit(1);
  }
}

bootstrap();
