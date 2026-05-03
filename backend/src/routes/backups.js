import express from 'express';
import { asyncHandler } from '../errors.js';
import { exportPersonalBackup, importPersonalBackup } from '../services/backupService.js';

export const backupsRouter = express.Router();

backupsRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    const backup = await exportPersonalBackup();
    res.setHeader('Content-Disposition', `attachment; filename="tl-recipe-core-backup.json"`);
    res.json(backup);
  })
);

backupsRouter.post(
  '/import',
  asyncHandler(async (req, res) => {
    res.status(201).json(await importPersonalBackup(req.body));
  })
);
