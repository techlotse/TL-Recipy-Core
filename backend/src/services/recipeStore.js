import crypto from 'node:crypto';
import { query, withTransaction } from '../db.js';
import { notFound } from '../errors.js';
import { slugify, uniqueStrings } from '../utils/slug.js';

function toDbJson(value) {
  return JSON.stringify(value || []);
}

function mapTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag) => tag && tag.id)
    .map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color || null
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
    tags: mapTags(row.tags),
    sourceUrl: row.source_url || '',
    importMode: row.import_mode,
    llmUsage,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function ensureTags(client, names) {
  const cleanNames = uniqueStrings(names);
  const tags = [];

  for (const name of cleanNames) {
    const slug = slugify(name);
    if (!slug) continue;

    const result = await client.query(
      `INSERT INTO tags (id, name, slug)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name, slug, color`,
      [crypto.randomUUID(), name, slug]
    );
    tags.push(result.rows[0]);
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

export async function listRecipes({ search = '', tags = [] } = {}) {
  const cleanSearch = `%${String(search || '').trim()}%`;
  const tagSlugs = uniqueStrings(tags).map(slugify).filter(Boolean);

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
        ingredients, steps, source_url, import_mode, llm_provider, llm_model,
        llm_input_tokens, llm_output_tokens, llm_total_tokens, llm_response_ms,
        llm_input_price_per_million_usd, llm_output_price_per_million_usd,
        llm_input_cost_usd, llm_output_cost_usd, llm_image_model, llm_image_count,
        llm_image_cost_usd, llm_total_cost_usd
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24
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
           source_url = $9,
           import_mode = $10,
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
        input.sourceUrl || null,
        input.importMode || 'manual'
      ]
    );

    if (!result.rowCount) throw notFound('Recipe not found');
    await attachTags(client, recipeId, input.tags || []);
  });

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
    slug: row.slug,
    color: row.color || null,
    recipeCount: row.recipe_count
  }));
}

export async function createTag(name) {
  const slug = slugify(name);
  const result = await query(
    `INSERT INTO tags (id, name, slug)
     VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name, slug, color`,
    [crypto.randomUUID(), name.trim(), slug]
  );
  return { ...result.rows[0], recipeCount: 0 };
}
