import express from 'express';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { config } from './config.js';
import { errorHandler } from './errors.js';
import { recipesRouter } from './routes/recipes.js';
import { tagsRouter } from './routes/tags.js';
import { importsRouter } from './routes/imports.js';
import { settingsRouter } from './routes/settings.js';
import { backupsRouter } from './routes/backups.js';
import { shareRouter } from './routes/share.js';
import { requireBasicAuth } from './middleware/basicAuth.js';
import { getPublicPreferences } from './services/settingsStore.js';

const appVersion = JSON.parse(
  readFileSync(path.join(config.rootDir, 'shared', 'app-version.json'), 'utf8')
);

export function createApp() {
  const app = express();
  // Recipes can carry data-URL cover images and AI step images, so allow larger bodies.
  const defaultJsonParser = express.json({ limit: '30mb' });

  app.use(requireBasicAuth);

  app.use((req, res, next) => {
    if (req.path === '/api/imports/photos') {
      next();
      return;
    }
    defaultJsonParser(req, res, next);
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/version', (req, res) => {
    res.json(appVersion);
  });

  app.get('/api/preferences', async (req, res, next) => {
    try {
      res.json({ preferences: await getPublicPreferences() });
    } catch (error) {
      next(error);
    }
  });

  app.use('/api/recipes', recipesRouter);
  app.use('/api/tags', tagsRouter);
  app.use('/api/imports', importsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/backups', backupsRouter);
  app.use('/api/share', shareRouter);

  if (existsSync(config.frontendDist)) {
    app.use(express.static(config.frontendDist));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(config.frontendDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
