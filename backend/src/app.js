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
import { requireBasicAuth } from './middleware/basicAuth.js';

const appVersion = JSON.parse(
  readFileSync(path.join(config.rootDir, 'shared', 'app-version.json'), 'utf8')
);

export function createApp() {
  const app = express();
  const defaultJsonParser = express.json({ limit: '3mb' });

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

  app.use('/api/recipes', recipesRouter);
  app.use('/api/tags', tagsRouter);
  app.use('/api/imports', importsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/backups', backupsRouter);

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
