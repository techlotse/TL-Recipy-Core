import crypto from 'node:crypto';
import { query, withTransaction } from '../db.js';
import { notFound } from '../errors.js';
import { slugify, uniqueStrings } from '../utils/slug.js';
import { canonicalCategoryName, categoryFilterSlugs, isCategoryName, normalizeTagName } from '../categoryOptions.js';

function toDbJson(value) {
  return JSON.stringify(value || []);
}

function toDbObject(value) {
  return JSON.stringify(value || {});
}

function mergeUsage(existing, incoming) {
  if (!incoming) return existing;
  if (!existing) return incoming;

  return {
    ...existing,
    model: uniqueStrings([existing.model, incoming.model]).join(' + '),
    inputTokens: (existing.inputTokens || 0) + (incoming.inputTokens || 0),
    outputTokens: (existing.outputTokens || 0) + (incoming.outputTokens || 0),
    totalTokens: (existing.totalTokens || 0) + (incoming.totalTokens || 0),
    responseMs: (existing.responseMs || 0) + (incoming.responseMs || 0),
    inputPricePerMillionUsd: incoming.inputPricePerMillionUsd || existing.inputPricePerMillionUsd || 0,
    outputPricePerMillionUsd: incoming.outputPricePerMillionUsd || existing.outputPricePerMillionUsd || 0,
    inputCostUsd: (existing.inputCostUsd || 0) + (incoming.inputCostUsd || 0),
    outputCostUsd: (existing.outputCostUsd || 0) + (incoming.outputCostUsd || 0),
    imageModel: incoming.imageModel || existing.imageModel || '',
    imageCount: (existing.imageCount || 0) + (incoming.imageCount || 0),
    imageCostUsd: (existing.imageCostUsd || 0) + (incoming.imageCostUsd || 0),
    totalCostUsd: (existing.totalCostUsd || 0) + (incoming.totalCostUsd || 0)
  };
}

function mapTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag) => tag && tag.id)
    .map((tag) => ({
      id: tag.id,
      name: tag.name,
      categoryName: canonicalCategoryName(tag.name),
      slug: tag.slug,
      color: tag.color || null,
      isCategory: isCategoryName(tag.name)
    }));
}

export function mapRecipe(row) {
  if (!row) return null;
  const llmUsage = row.llm_model
    ? {
        provider: row.llm_provider || 'own_chatgpt',
        model: row.llm_model,
        inputTokens: row.llm_input_tokens || 0,
        outputTokens: row.llm_output_tokens || 0,
        totalTokens: row.llm_total_tokens || 0,
        responseMs: row.llm_response_ms || 0,
        inputPricePerMillionUsd: Number(row.llm_input_price_per_million_usd || 0),
        outputPricePerMillionUsd: Number(row.llm_output_price_per_million_usd || 0),
        inputCostUsd: Number(row.llm_input_cost_usd || 0),
        outputCostUsd: Number(row.llm_output_cost_usd || 0),
        imageModel: row.llm_image_model || '',
        imageCount: row.llm_image_count || 0,
        imageCostUsd: Number(row.llm_image_cost_usd || 0),
        totalCostUsd: Number(row.llm_total_cost_usd || 0)
      }
    : null;

  return {
    id: row.id,
    title: row.title,
    shortDescription: row.short_description || '',
    imageUrl: row.image_url || '',
    activeTimeMinutes: row.active_time_minutes,
    totalTimeMinutes: row.total_time_minutes,
    ingredients: row.ingredients || [],
    steps: row.steps || [],
    translations: row.translations || {},
    tags: mapTags(row.tags),
    sourceUrl: row.source_url || '',
    importMode: row.import_mode,
    llmUsage,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function ensureTags(client, names) {
  const existingResult = await client.query('SELECT id, name, slug, color FROM tags ORDER BY name');
  const existingTags = existingResult.rows;
  const cleanNames = uniqueStrings(names.map((name) => normalizeTagName(name, existingTags)));
  const tags = [];
  const tagIds = new Set();

  for (const name of cleanNames) {
    const slug = slugify(name);
    if (!slug) continue;

    const existing = existingTags.find(
      (tag) => slugify(tag.name) === slug || tag.slug === slug || normalizeTagName(tag.name) === name
    );
    if (existing) {
      if (!tagIds.has(existing.id)) {
        tagIds.add(existing.id);
        tags.push(existing);
      }
      continue;
    }

    const result = await client.query(
      `INSERT INTO tags (id, name, slug)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name, slug, color`,
      [crypto.randomUUID(), name, slug]
    );
    if (!tagIds.has(result.rows[0].id)) {
      tagIds.add(result.rows[0].id);
      tags.push(result.rows[0]);
    }
  }

  return tags;
}

async function attachTags(client, recipeId, tagNames) {
  await client.query('DELETE FROM recipe_tags WHERE recipe_id = $1', [recipeId]);
  const tags = await ensureTags(client, tagNames);

  for (const tag of tags) {
    await client.query(
      `INSERT INTO recipe_tags (recipe_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [recipeId, tag.id]
    );
  }
}

const recipeSelect = `
  SELECT
    r.*,
    COALESCE(
      json_agg(
        json_build_object('id', t.id, 'name', t.name, 'slug', t.slug, 'color', t.color)
        ORDER BY t.name
      ) FILTER (WHERE t.id IS NOT NULL),
      '[]'::json
    ) AS tags
  FROM recipes r
  LEFT JOIN recipe_tags rt ON rt.recipe_id = r.id
  LEFT JOIN tags t ON t.id = rt.tag_id
`;

export async function listRecipes({ search = '', tags = [], categories = [] } = {}) {
  const cleanSearch = `%${String(search || '').trim()}%`;
  const tagSlugs = uniqueStrings(
    [...tags, ...categories]
      .map((name) => normalizeTagName(name))
      .flatMap((name) => categoryFilterSlugs(name))
  )
    .map(slugify)
    .filter(Boolean);

  const result = await query(
    `${recipeSelect}
     WHERE
       ($1 = '%%' OR r.title ILIKE $1 OR r.short_description ILIKE $1 OR r.ingredients::text ILIKE $1)
       AND (
         cardinality($2::text[]) = 0 OR EXISTS (
           SELECT 1
           FROM recipe_tags filter_rt
           JOIN tags filter_t ON filter_t.id = filter_rt.tag_id
           WHERE filter_rt.recipe_id = r.id AND filter_t.slug = ANY($2::text[])
         )
       )
     GROUP BY r.id
     ORDER BY r.updated_at DESC`,
    [cleanSearch, tagSlugs]
  );

  return result.rows.map(mapRecipe);
}

export async function getRecipe(recipeId) {
  const result = await query(
    `${recipeSelect}
     WHERE r.id = $1
     GROUP BY r.id`,
    [recipeId]
  );

  const recipe = mapRecipe(result.rows[0]);
  if (!recipe) throw notFound('Recipe not found');
  return recipe;
}

export async function createRecipe(input) {
  const recipeId = await withTransaction(async (client) => {
    const id = crypto.randomUUID();
    await client.query(
      `INSERT INTO recipes (
        id, title, short_description, image_url, active_time_minutes, total_time_minutes,
        ingredients, steps, translations, source_url, import_mode, llm_provider, llm_model,
        llm_input_tokens, llm_output_tokens, llm_total_tokens, llm_response_ms,
        llm_input_price_per_million_usd, llm_output_price_per_million_usd,
        llm_input_cost_usd, llm_output_cost_usd, llm_image_model, llm_image_count,
        llm_image_cost_usd, llm_total_cost_usd
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
      )
      RETURNING *`,
      [
        id,
        input.title,
        input.shortDescription || '',
        input.imageUrl || '',
        input.activeTimeMinutes ?? null,
        input.totalTimeMinutes ?? null,
        toDbJson(input.ingredients),
        toDbJson(input.steps),
        toDbObject(input.translations),
        input.sourceUrl || null,
        input.importMode || 'manual',
        input.llmUsage?.provider || null,
        input.llmUsage?.model || null,
        input.llmUsage?.inputTokens ?? null,
        input.llmUsage?.outputTokens ?? null,
        input.llmUsage?.totalTokens ?? null,
        input.llmUsage?.responseMs ?? null,
        input.llmUsage?.inputPricePerMillionUsd ?? null,
        input.llmUsage?.outputPricePerMillionUsd ?? null,
        input.llmUsage?.inputCostUsd ?? null,
        input.llmUsage?.outputCostUsd ?? null,
        input.llmUsage?.imageModel || null,
        input.llmUsage?.imageCount ?? null,
        input.llmUsage?.imageCostUsd ?? null,
        input.llmUsage?.totalCostUsd ?? null
      ]
    );

    await attachTags(client, id, input.tags || []);
    return id;
  });

  return getRecipe(recipeId);
}

export async function updateRecipe(recipeId, input) {
  await withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE recipes
       SET title = $2,
           short_description = $3,
           image_url = $4,
           active_time_minutes = $5,
           total_time_minutes = $6,
           ingredients = $7::jsonb,
           steps = $8::jsonb,
           translations = $9::jsonb,
           source_url = $10,
           import_mode = $11,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [
        recipeId,
        input.title,
        input.shortDescription || '',
        input.imageUrl || '',
        input.activeTimeMinutes ?? null,
        input.totalTimeMinutes ?? null,
        toDbJson(input.ingredients),
        toDbJson(input.steps),
        toDbObject(input.translations),
        input.sourceUrl || null,
        input.importMode || 'manual'
      ]
    );

    if (!result.rowCount) throw notFound('Recipe not found');
    await attachTags(client, recipeId, input.tags || []);
  });

  return getRecipe(recipeId);
}

export async function addRecipeTranslations(recipeId, translations, llmUsage) {
  const current = await getRecipe(recipeId);
  const usage = mergeUsage(current.llmUsage, llmUsage);

  await query(
    `UPDATE recipes
     SET translations = COALESCE(translations, '{}'::jsonb) || $2::jsonb,
         llm_provider = $3,
         llm_model = $4,
         llm_input_tokens = $5,
         llm_output_tokens = $6,
         llm_total_tokens = $7,
         llm_response_ms = $8,
         llm_input_price_per_million_usd = $9,
         llm_output_price_per_million_usd = $10,
         llm_input_cost_usd = $11,
         llm_output_cost_usd = $12,
         llm_image_model = $13,
         llm_image_count = $14,
         llm_image_cost_usd = $15,
         llm_total_cost_usd = $16,
         updated_at = NOW()
     WHERE id = $1`,
    [
      recipeId,
      toDbObject(translations),
      usage?.provider || null,
      usage?.model || null,
      usage?.inputTokens ?? null,
      usage?.outputTokens ?? null,
      usage?.totalTokens ?? null,
      usage?.responseMs ?? null,
      usage?.inputPricePerMillionUsd ?? null,
      usage?.outputPricePerMillionUsd ?? null,
      usage?.inputCostUsd ?? null,
      usage?.outputCostUsd ?? null,
      usage?.imageModel || null,
      usage?.imageCount ?? null,
      usage?.imageCostUsd ?? null,
      usage?.totalCostUsd ?? null
    ]
  );

  return getRecipe(recipeId);
}

export async function deleteRecipe(recipeId) {
  const result = await query('DELETE FROM recipes WHERE id = $1', [recipeId]);
  if (!result.rowCount) throw notFound('Recipe not found');
}

export async function listTags() {
  const result = await query(
    `SELECT t.id, t.name, t.slug, t.color, COUNT(rt.recipe_id)::int AS recipe_count
     FROM tags t
     LEFT JOIN recipe_tags rt ON rt.tag_id = t.id
     GROUP BY t.id
     ORDER BY t.name`
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    categoryName: canonicalCategoryName(row.name),
    slug: row.slug,
    color: row.color || null,
    isCategory: isCategoryName(row.name),
    recipeCount: row.recipe_count
  }));
}

export async function createTag(name) {
  const existingResult = await query('SELECT id, name, slug, color FROM tags ORDER BY name');
  const cleanName = normalizeTagName(name, existingResult.rows);
  const slug = slugify(cleanName);
  const result = await query(
    `INSERT INTO tags (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name, slug, color`,
    [crypto.randomUUID(), cleanName, slug]
  );
  return {
    ...result.rows[0],
    categoryName: canonicalCategoryName(result.rows[0].name),
    isCategory: isCategoryName(result.rows[0].name),
    recipeCount: 0
  };
}
