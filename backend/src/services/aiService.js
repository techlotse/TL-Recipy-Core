import { badRequest, ApiError } from '../errors.js';
import { config } from '../config.js';
import { getOpenAiApiKey, getOpenAiModel, getPublicSettings } from './settingsStore.js';
import { parseDurationToMinutes } from '../utils/duration.js';
import { recipeInputSchema } from '../validation.js';
import { uniqueStrings } from '../utils/slug.js';
import { getOpenAiModelPricing } from '../llmOptions.js';

function stripCodeFence(value) {
  return String(value || '')
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

function parseJsonOutput(value) {
  const cleaned = stripCodeFence(value);
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw badRequest('AI response was not valid JSON');
  }
}

function normalizeIngredient(value) {
  if (typeof value === 'string') {
    return { name: value, quantity: '', unit: '', notes: '', originalQuantity: '', originalUnit: '', originalText: value };
  }

  return {
    name: String(value?.name || value?.ingredient || '').trim(),
    quantity: String(value?.quantity || value?.amount || '').trim(),
    unit: String(value?.unit || '').trim(),
    notes: String(value?.notes || value?.note || '').trim(),
    originalQuantity: String(value?.originalQuantity || value?.originalAmount || '').trim(),
    originalUnit: String(value?.originalUnit || '').trim(),
    originalText: String(value?.originalText || value?.sourceText || '').trim()
  };
}

function normalizeStep(value) {
  if (typeof value === 'string') return { text: value.trim() };
  return {
    text: String(value?.text || value?.instruction || value?.step || '').trim(),
    imageUrl: String(value?.imageUrl || '').trim(),
    imagePrompt: String(value?.imagePrompt || '').trim()
  };
}

function getResponseText(data) {
  if (data.output_text) return data.output_text;
  const output = data.output || [];
  for (const item of output) {
    for (const content of item.content || []) {
      if (content.text) return content.text;
    }
  }
  return '';
}

function usageFromResponses(data, model, responseMs) {
  const usage = data.usage || {};
  const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? 0;
  const pricing = getOpenAiModelPricing(model);
  const inputPricePerMillionUsd = pricing?.inputPerMillionUsd || 0;
  const outputPricePerMillionUsd = pricing?.outputPerMillionUsd || 0;
  const inputCostUsd = (inputTokens / 1000000) * inputPricePerMillionUsd;
  const outputCostUsd = (outputTokens / 1000000) * outputPricePerMillionUsd;

  return {
    provider: 'own_chatgpt',
    model,
    inputTokens,
    outputTokens,
    totalTokens: usage.total_tokens ?? inputTokens + outputTokens,
    responseMs,
    inputPricePerMillionUsd,
    outputPricePerMillionUsd,
    inputCostUsd,
    outputCostUsd,
    totalCostUsd: inputCostUsd + outputCostUsd
  };
}

function combineUsage(baseUsage, extraUsage) {
  if (!baseUsage) return extraUsage;
  if (!extraUsage) return baseUsage;

  return {
    ...baseUsage,
    model: [baseUsage.model, extraUsage.model].filter(Boolean).join(' + '),
    inputTokens: (baseUsage.inputTokens || 0) + (extraUsage.inputTokens || 0),
    outputTokens: (baseUsage.outputTokens || 0) + (extraUsage.outputTokens || 0),
    totalTokens: (baseUsage.totalTokens || 0) + (extraUsage.totalTokens || 0),
    responseMs: (baseUsage.responseMs || 0) + (extraUsage.responseMs || 0),
    inputCostUsd: (baseUsage.inputCostUsd || 0) + (extraUsage.inputCostUsd || 0),
    outputCostUsd: (baseUsage.outputCostUsd || 0) + (extraUsage.outputCostUsd || 0),
    imageModel: extraUsage.imageModel || baseUsage.imageModel || '',
    imageCount: (baseUsage.imageCount || 0) + (extraUsage.imageCount || 0),
    imageCostUsd: (baseUsage.imageCostUsd || 0) + (extraUsage.imageCostUsd || 0),
    totalCostUsd: (baseUsage.totalCostUsd || 0) + (extraUsage.totalCostUsd || 0)
  };
}

export function normalizeAiRecipePayload(payload, sourceUrl) {
  const recipe = payload.recipe || payload;
  const tags = uniqueStrings([...(recipe.tags || []), 'imported', 'ai-normalized']);

  const normalized = {
    title: String(recipe.title || recipe.name || '').trim(),
    shortDescription: String(recipe.shortDescription || recipe.description || '').trim(),
    imageUrl: String(recipe.imageUrl || recipe.image || '').trim(),
    activeTimeMinutes: parseDurationToMinutes(
      recipe.activeTimeMinutes || recipe.activeTime || recipe.prepTime || recipe.cookTime
    ),
    totalTimeMinutes: parseDurationToMinutes(recipe.totalTimeMinutes || recipe.totalTime),
    ingredients: (recipe.ingredients || []).map(normalizeIngredient).filter((item) => item.name),
    steps: (recipe.method || recipe.steps || recipe.instructions || [])
      .map(normalizeStep)
      .filter((step) => step.text),
    tags,
    sourceUrl,
    importMode: 'ai'
  };

  return recipeInputSchema.parse(normalized);
}

export async function normalizeRecipeWithOpenAi({ sourceUrl, extracted, sourceText }) {
  const settings = await getPublicSettings();
  if (!settings.aiProcessingEnabled) {
    throw badRequest('AI processing is disabled in Settings');
  }

  const apiKey = await getOpenAiApiKey();
  if (!apiKey) {
    throw badRequest('OpenAI API key is not configured');
  }
  const model = await getOpenAiModel();

  const systemPrompt =
    'You normalize recipes for TL Recipe Core. Return only valid JSON. Extract only recipe-relevant content, remove blog/story text, convert all values and units to metric, keep temperatures in Celsius, and preserve the source URL.';
  const userPrompt = JSON.stringify({
    requiredShape: {
      title: 'string',
      shortDescription: 'string',
      imageUrl: 'string',
      activeTimeMinutes: 'number or null',
      totalTimeMinutes: 'number or null',
      ingredients: [
        {
          name: 'string',
          quantity: 'metric quantity as string',
          unit: 'metric unit',
          notes: 'string',
          originalQuantity: 'original quantity before metric conversion, if different',
          originalUnit: 'original unit before metric conversion, if different',
          originalText: 'original ingredient line before normalization'
        }
      ],
      method: [{ text: 'ordered cooking step' }],
      tags: ['string']
    },
    sourceUrl,
    extracted,
    sourceText: sourceText.slice(0, 18000)
  });

  const startedAt = Date.now();
  const response = await fetch(`${config.openai.baseUrl.replace(/\/$/, '')}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }]
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: userPrompt }]
        }
      ],
      text: {
        format: { type: 'json_object' }
      }
    })
  });
  const responseMs = Date.now() - startedAt;

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(502, 'AI recipe processing failed', body.slice(0, 500));
  }

  const data = await response.json();
  const content = getResponseText(data);
  if (!content) throw new ApiError(502, 'AI recipe processing returned no content');

  return {
    recipe: normalizeAiRecipePayload(parseJsonOutput(content), sourceUrl),
    llmUsage: usageFromResponses(data, model, responseMs)
  };
}

function normalizeToddlerPayload(payload, sourceRecipe, sourceUrl) {
  const recipe = payload.recipe || payload;
  const title = String(recipe.title || `Toddler helper: ${sourceRecipe.title}`).trim();
  const steps = (recipe.steps || recipe.method || [])
    .map(normalizeStep)
    .filter((step) => step.text)
    .slice(0, 8);

  const toddlerRecipe = {
    title,
    shortDescription:
      String(recipe.shortDescription || recipe.description || '').trim() ||
      `A toddler-friendly helper version of ${sourceRecipe.title} for supervised cooking.`,
    imageUrl: '',
    activeTimeMinutes: sourceRecipe.activeTimeMinutes ?? null,
    totalTimeMinutes: sourceRecipe.totalTimeMinutes ?? null,
    ingredients: (recipe.ingredients || []).map(normalizeIngredient).filter((item) => item.name).slice(0, 20),
    steps,
    tags: uniqueStrings([...(recipe.tags || []), 'toddler-friendly', 'ai-normalized', 'helper']),
    sourceUrl,
    importMode: 'ai'
  };
  if (!toddlerRecipe.ingredients.length) toddlerRecipe.ingredients = sourceRecipe.ingredients;

  return recipeInputSchema.parse(toddlerRecipe);
}

function buildToddlerPrompt(sourceRecipe, sourceUrl) {
  return JSON.stringify({
    task:
      'Create a toddler-helper version of this recipe. It is for a toddler to participate with direct adult supervision, not to cook alone.',
    rules: [
      'No knife work, hot pans, oven handling, raw meat handling, boiling water, or appliance operation for the toddler.',
      'Convert unsafe cooking tasks into toddler-safe helper actions such as washing produce, pouring pre-measured ingredients, stirring cold mixtures, sprinkling herbs, setting napkins, watching an adult do a hot step, smelling ingredients, or tasting only when safe.',
      'Use one short action per step, in order. Keep steps concrete and kind.',
      'For every step include imagePrompt for a bright, simple, toddler-safe illustration. Do not put text or labels in the image.'
    ],
    outputShape: {
      title: 'Toddler helper: recipe title',
      shortDescription: 'string',
      ingredients: [{ name: 'string', quantity: 'metric quantity as string', unit: 'metric unit', notes: 'string' }],
      steps: [{ text: 'one toddler-safe step', imagePrompt: 'safe child-friendly illustration prompt' }],
      tags: ['string']
    },
    sourceUrl,
    recipe: sourceRecipe
  });
}

async function generateJsonWithOpenAi({ systemPrompt, userPrompt, errorMessage }) {
  const apiKey = await getOpenAiApiKey();
  if (!apiKey) throw badRequest('OpenAI API key is not configured');

  const model = await getOpenAiModel();
  const startedAt = Date.now();
  const response = await fetch(`${config.openai.baseUrl.replace(/\/$/, '')}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }]
        },
        {
          role: 'user',
          content: [{ type: 'input_text', text: userPrompt }]
        }
      ],
      text: {
        format: { type: 'json_object' }
      }
    })
  });
  const responseMs = Date.now() - startedAt;

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(502, errorMessage, body.slice(0, 500));
  }

  const data = await response.json();
  const content = getResponseText(data);
  if (!content) throw new ApiError(502, `${errorMessage}: no content returned`);

  return {
    payload: parseJsonOutput(content),
    llmUsage: usageFromResponses(data, model, responseMs)
  };
}

async function generateToddlerStepImage({ title, step, apiKey }) {
  const prompt = [
    step.imagePrompt || step.text,
    `Recipe: ${title}.`,
    'Style: warm, simple, bright toddler picture-book illustration.',
    'Show a toddler-safe cooking helper action with an adult nearby.',
    'No knives, hot pans, flames, boiling water, dangerous tools, choking hazards, text, logos, or labels.'
  ].join(' ');

  const response = await fetch(`${config.openai.baseUrl.replace(/\/$/, '')}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.openai.imageModel,
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'low'
    }),
    signal: AbortSignal.timeout(120000)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(502, 'Toddler step image generation failed', body.slice(0, 500));
  }

  const data = await response.json();
  const generated = data.data?.[0];
  if (generated?.b64_json) return `data:image/png;base64,${generated.b64_json}`;
  if (generated?.url) return generated.url;
  throw new ApiError(502, 'Toddler step image generation returned no image');
}

export async function createToddlerRecipeWithOpenAi({ sourceRecipe, sourceUrl }) {
  const settings = await getPublicSettings();
  if (!settings.aiProcessingEnabled) {
    throw badRequest('AI processing is disabled in Settings');
  }

  const apiKey = await getOpenAiApiKey();
  if (!apiKey) throw badRequest('OpenAI API key is not configured');

  const { payload, llmUsage } = await generateJsonWithOpenAi({
    systemPrompt:
      'You create safe toddler-helper recipe versions. Return only valid JSON. Every step must be toddler-safe with adult supervision and must include an imagePrompt.',
    userPrompt: buildToddlerPrompt(sourceRecipe, sourceUrl),
    errorMessage: 'Toddler recipe generation failed'
  });

  const toddlerRecipe = normalizeToddlerPayload(payload, sourceRecipe, sourceUrl);
  const imageWarnings = [];

  for (const step of toddlerRecipe.steps) {
    try {
      step.imageUrl = await generateToddlerStepImage({
        title: toddlerRecipe.title,
        step,
        apiKey
      });
    } catch (error) {
      imageWarnings.push(`Could not generate image for step "${step.text.slice(0, 60)}"`);
    }
  }

  const generatedImageCount = toddlerRecipe.steps.filter((step) => step.imageUrl).length;
  const imageCostUsd = generatedImageCount * 0.011;
  const imageUsage = {
    provider: 'own_chatgpt',
    model: '',
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    responseMs: 0,
    inputPricePerMillionUsd: 0,
    outputPricePerMillionUsd: 0,
    inputCostUsd: 0,
    outputCostUsd: 0,
    imageModel: config.openai.imageModel,
    imageCount: generatedImageCount,
    imageCostUsd,
    totalCostUsd: imageCostUsd
  };

  return {
    recipe: {
      ...toddlerRecipe,
      imageUrl: toddlerRecipe.steps.find((step) => step.imageUrl)?.imageUrl || '',
      llmUsage: combineUsage(llmUsage, imageUsage)
    },
    warnings: imageWarnings
  };
}
