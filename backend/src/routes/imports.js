import express from 'express';
import { asyncHandler } from '../errors.js';
import { importRequestSchema } from '../validation.js';
import { importRecipeFromUrl } from '../services/importService.js';

export const importsRouter = express.Router();

importsRouter.post(
  '/url',
  asyncHandler(async (req, res) => {
    const input = importRequestSchema.parse(req.body);
    res.status(201).json(await importRecipeFromUrl(input));
  })
);
