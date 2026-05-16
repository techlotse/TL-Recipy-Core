import express from 'express';
import { asyncHandler } from '../errors.js';
import { recipeInputSchema, recipeTranslationRequestSchema } from '../validation.js';
import {
  addRecipeTranslations,
  createRecipe,
  deleteRecipe,
  getRecipe,
  listRecipes,
  updateRecipe
} from '../services/recipeStore.js';
import { translateRecipeWithOpenAi } from '../services/aiService.js';

export const recipesRouter = express.Router();

recipesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const tags = req.query.tags ? String(req.query.tags).split(',') : [];
    const categories = req.query.categories ? String(req.query.categories).split(',') : [];
    const recipes = await listRecipes({ search: req.query.search || '', tags, categories });
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

recipesRouter.post(
  '/:id/translations',
  asyncHandler(async (req, res) => {
    const input = recipeTranslationRequestSchema.parse(req.body);
    const recipe = await getRecipe(req.params.id);
    const result = await translateRecipeWithOpenAi({ recipe, languages: input.languages });
    res.json({
      recipe: await addRecipeTranslations(req.params.id, result.translations, result.llmUsage),
      translatedLanguages: Object.keys(result.translations)
    });
  })
);

recipesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteRecipe(req.params.id);
    res.status(204).end();
  })
);
