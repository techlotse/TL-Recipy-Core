import { z } from 'zod';
import { LLM_PROVIDERS, OPENAI_MODEL_OPTIONS } from './llmOptions.js';

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .default('')
  .refine(
    (value) => !value || value.startsWith('data:image/') || z.string().url().safeParse(value).success,
    'Must be a valid URL or image upload'
  );

export const ingredientSchema = z.object({
  name: z.string().trim().min(1, 'Ingredient name is required'),
  quantity: z.string().trim().optional().default(''),
  unit: z.string().trim().optional().default(''),
  notes: z.string().trim().optional().default(''),
  originalQuantity: z.string().trim().optional().default(''),
  originalUnit: z.string().trim().optional().default(''),
  originalText: z.string().trim().optional().default('')
});

export const stepSchema = z.object({
  text: z.string().trim().min(1, 'Step text is required'),
  imageUrl: optionalUrl,
  imagePrompt: z.string().trim().optional().default('')
});

const tagInputSchema = z
  .union([
    z.string().trim().min(1),
    z.object({
      name: z.string().trim().min(1)
    })
  ])
  .transform((value) => (typeof value === 'string' ? value : value.name));

export const recipeInputSchema = z.object({
  title: z.string().trim().min(2, 'Title is required'),
  shortDescription: z.string().trim().optional().default(''),
  imageUrl: optionalUrl,
  activeTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  totalTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  ingredients: z.array(ingredientSchema).min(1, 'Add at least one ingredient'),
  steps: z.array(stepSchema).min(1, 'Add at least one method step'),
  tags: z.array(tagInputSchema).max(30).optional().default([]),
  sourceUrl: z.string().trim().url().optional().or(z.literal('')).default(''),
  importMode: z.enum(['manual', 'verbatim', 'ai']).optional().default('manual'),
  llmUsage: z
    .object({
      provider: z.string().trim().optional().default('own_chatgpt'),
      model: z.string().trim().optional().default(''),
      inputTokens: z.number().int().nonnegative().nullable().optional(),
      outputTokens: z.number().int().nonnegative().nullable().optional(),
      totalTokens: z.number().int().nonnegative().nullable().optional(),
      responseMs: z.number().int().nonnegative().nullable().optional(),
      inputPricePerMillionUsd: z.number().nonnegative().nullable().optional(),
      outputPricePerMillionUsd: z.number().nonnegative().nullable().optional(),
      inputCostUsd: z.number().nonnegative().nullable().optional(),
      outputCostUsd: z.number().nonnegative().nullable().optional(),
      imageModel: z.string().trim().optional().default(''),
      imageCount: z.number().int().nonnegative().nullable().optional(),
      imageCostUsd: z.number().nonnegative().nullable().optional(),
      totalCostUsd: z.number().nonnegative().nullable().optional()
    })
    .nullable()
    .optional()
});

export const importRequestSchema = z.object({
  url: z.string().trim().url('Enter a valid recipe URL'),
  mode: z.enum(['verbatim', 'ai']),
  createToddlerVersion: z.boolean().optional().default(false)
});

export const settingsInputSchema = z.object({
  openaiApiKey: z.string().optional(),
  defaultLanguage: z.string().trim().min(2).max(12).optional(),
  unitSystem: z.literal('metric').optional(),
  aiProcessingEnabled: z.boolean().optional(),
  llmProvider: z.enum(LLM_PROVIDERS).optional(),
  openaiModel: z.enum(OPENAI_MODEL_OPTIONS.map((option) => option.id)).optional()
});

export const verifyOpenAiInputSchema = z.object({
  apiKey: z.string().optional(),
  model: z.enum(OPENAI_MODEL_OPTIONS.map((option) => option.id)).optional()
});

export const backupImportSchema = z.object({
  version: z.string().optional(),
  recipes: z.array(recipeInputSchema).min(1, 'Backup contains no recipes')
});
