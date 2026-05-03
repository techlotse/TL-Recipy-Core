import { createApp } from './app.js';
import { closePool } from './db.js';
import { runMigrations, seedSampleRecipes } from './migrate.js';
import { config } from './config.js';

async function start() {
  await runMigrations();
  await seedSampleRecipes();

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
