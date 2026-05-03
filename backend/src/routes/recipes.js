import express from 'express';
import { asyncHandler } from '../errors.js';
import { recipeInputSchema } from '../validation.js';
import {
  createRecipe,
  deleteRecipe,
  getRecipe,
  listRecipes,
  updateRecipe
} from '../services/recipeStore.js';

export const recipesRouter = express.Router();

recipesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const tags = req.query.tags ? String(req.query.tags).split(',') : [];
    const recipes = await listRecipes({ search: req.query.search || '', tags });
    res.json({ recipes });
  })
);

recipesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ recipe: await getRecipe(req.params.id) });
  })
);

recipesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = recipeInputSchema.parse(req.body);
    res.status(201).json({ recipe: await createRecipe(input) });
  })
);

recipesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = recipeInputSchema.parse(req.body);
    res.json({ recipe: await updateRecipe(req.params.id, input) });
  })
);

recipesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteRecipe(req.params.id);
    res.status(204).end();
  })
);
