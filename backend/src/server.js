import { createApp } from './app.js';
import { closePool } from './db.js';
import { runMigrations, seedSampleRecipes } from './migrate.js';
import { config } from './config.js';

const RETRYABLE_DATABASE_CODES = new Set([
  'EAI_AGAIN',
  'ENOTFOUND',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  '57P03',
  '53300'
]);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableDatabaseStartupError(error) {
  if (RETRYABLE_DATABASE_CODES.has(error?.code)) return true;
  if (typeof error?.code === 'string' && error.code.startsWith('08')) return true;
  if (error?.syscall === 'getaddrinfo') return true;
  return false;
}

async function initializeDatabase() {
  const retries = Number.isFinite(config.databaseStartupRetries) ? config.databaseStartupRetries : 30;
  const retryMs = Number.isFinite(config.databaseStartupRetryMs) ? config.databaseStartupRetryMs : 2000;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await runMigrations();
      await seedSampleRecipes();
      return;
    } catch (error) {
      if (attempt >= retries || !isRetryableDatabaseStartupError(error)) {
        throw error;
      }

      console.warn(
        `Database is not ready yet (${error.code || error.message}). Retry ${attempt}/${retries} in ${retryMs}ms.`
      );
      await sleep(retryMs);
    }
  }
}

async function start() {
  await initializeDatabase();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`${config.appName} listening on port ${config.port}`);
  });

  async function shutdown(signal) {
    console.log(`Received ${signal}, shutting down`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
