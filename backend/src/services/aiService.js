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
  return { text: String(value?.text || value?.instruction || value?.step || '').trim() };
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
