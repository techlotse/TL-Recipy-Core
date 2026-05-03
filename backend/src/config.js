import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_OPENAI_MODEL } from './llmOptions.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, '..', '..');

export const config = {
  appName: 'TL Recipe Core',
  appSecret: process.env.APP_SECRET || 'dev-only-change-me',
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://tl_recipe:tl_recipe@localhost:5432/tl_recipe_core',
  frontendDist: process.env.FRONTEND_DIST || path.join(rootDir, 'frontend', 'dist'),
  migrationsDir: path.join(rootDir, 'database', 'migrations'),
  nodeEnv: process.env.NODE_ENV || 'development',
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    imageModel: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
  },
  port: Number(process.env.PORT || 8080),
  rootDir,
  seedSampleData: process.env.SEED_SAMPLE_DATA !== 'false'
};
