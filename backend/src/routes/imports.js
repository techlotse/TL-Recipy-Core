import express from 'express';
import { asyncHandler } from '../errors.js';
import { importRequestSchema, photoImportRequestSchema } from '../validation.js';
import { importRecipeFromPhotos, importRecipeFromUrl } from '../services/importService.js';

export const importsRouter = express.Router();

importsRouter.post(
  '/url',
  asyncHandler(async (req, res) => {
    const input = importRequestSchema.parse(req.body);
    res.status(201).json(await importRecipeFromUrl(input));
  })
);

importsRouter.post(
  '/photos',
  express.json({ limit: '30mb' }),
  asyncHandler(async (req, res) => {
    const input = photoImportRequestSchema.parse(req.body);
    res.status(201).json(await importRecipeFromPhotos(input));
  })
);
