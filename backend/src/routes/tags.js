import express from 'express';
import { z } from 'zod';
import { asyncHandler } from '../errors.js';
import { createTag, listTags } from '../services/recipeStore.js';

export const tagsRouter = express.Router();

const tagInputSchema = z.object({
  name: z.string().trim().min(1).max(60)
});

tagsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ tags: await listTags() });
  })
);

tagsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = tagInputSchema.parse(req.body);
    res.status(201).json({ tag: await createTag(input.name) });
  })
);
