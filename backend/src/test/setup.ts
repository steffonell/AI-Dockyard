import 'dotenv/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'mysql://testuser:testpass@localhost:3306/test_db';
process.env.REDIS_URL = 'redis://localhost:6380';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

// Global test timeout
jest.setTimeout(30000);

// Mock external dependencies
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Suppress console logs during testing
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}; 