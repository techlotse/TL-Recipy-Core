import express from 'express';
import { asyncHandler } from '../errors.js';
import { getSharedRecipeByToken } from '../services/recipeStore.js';

export const shareRouter = express.Router();

// Public, unauthenticated read of a single shared recipe by its share token.
// Returns a sanitized recipe (no original/diagnostic values) — see issue #4.
shareRouter.get(
  '/:token',
  asyncHandler(async (req, res) => {
    res.json({ recipe: await getSharedRecipeByToken(req.params.token) });
  })
);
