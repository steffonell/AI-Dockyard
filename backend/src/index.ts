import 'dotenv/config';
import { createApp } from './app';
import { logger } from './utils/logger';
import { connectDatabase } from './utils/database';
import { config } from './config';

async function startServer(): Promise<void> {
  try {
    logger.info('Starting server with validated configuration');

    // Initialize database connection
    await connectDatabase();
    logger.info('Database connected successfully');

    // Create Express app
    const app = createApp();

    // Start the server
    const server = app.listen(config.server.port, () => {
      logger.info(`Server running on port ${config.server.port}`);
      logger.info(`Environment: ${config.server.nodeEnv}`);
      logger.info(`CORS Origin: ${config.server.corsOrigin}`);
      logger.info(`Database URL: ${config.database.url.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(() => {
        logger.info('HTTP server closed');
        // Close database connections
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  logger.error('Unhandled error during server startup:', error);
  process.exit(1);
}); 