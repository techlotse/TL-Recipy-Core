import express from 'express';
import { asyncHandler } from '../errors.js';
import { settingsInputSchema, verifyOpenAiInputSchema } from '../validation.js';
import { getPublicSettings, updateSettings, verifyOpenAiKey } from '../services/settingsStore.js';

export const settingsRouter = express.Router();

settingsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ settings: await getPublicSettings() });
  })
);

settingsRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    const input = settingsInputSchema.parse(req.body);
    res.json({ settings: await updateSettings(input) });
  })
);

settingsRouter.post(
  '/verify-openai',
  asyncHandler(async (req, res) => {
    const input = verifyOpenAiInputSchema.parse(req.body || {});
    res.json({ settings: await verifyOpenAiKey(input) });
  })
);
