import { query } from '../db.js';
import { config } from '../config.js';
import { decryptSecret, encryptSecret } from '../utils/crypto.js';
import { badRequest } from '../errors.js';
import {
  DEFAULT_OPENAI_MODEL,
  LLM_PROVIDERS,
  OPENAI_MODEL_OPTIONS,
  isSupportedOpenAiModel
} from '../llmOptions.js';

const DEFAULTS = {
  default_language: 'en',
  unit_system: 'metric',
  ai_processing_enabled: 'true',
  llm_provider: 'own_chatgpt',
  openai_model: isSupportedOpenAiModel(config.openai.model) ? config.openai.model : DEFAULT_OPENAI_MODEL,
  openai_key_status: 'unverified',
  openai_key_checked_at: '',
  openai_key_error: ''
};

async function getSettingMap() {
  const result = await query('SELECT key, value, secret FROM settings');
  return new Map(result.rows.map((row) => [row.key, row]));
}

async function upsertSetting(key, value, secret = false) {
  await query(
    `INSERT INTO settings (key, value, secret, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, secret = EXCLUDED.secret, updated_at = NOW()`,
    [key, value, secret]
  );
}

async function getUsageSummary() {
  const total = await query(
    `SELECT
       COUNT(*) FILTER (WHERE llm_model IS NOT NULL)::int AS recipe_count,
       COALESCE(SUM(llm_input_tokens), 0)::int AS input_tokens,
       COALESCE(SUM(llm_output_tokens), 0)::int AS output_tokens,
       COALESCE(SUM(llm_total_tokens), 0)::int AS total_tokens,
       COALESCE(SUM(llm_total_cost_usd), 0)::float AS total_cost_usd,
       COALESCE(ROUND(AVG(llm_response_ms))::int, 0) AS average_response_ms
     FROM recipes`
  );
  const byModel = await query(
    `SELECT
       llm_model,
       COUNT(*)::int AS recipe_count,
       COALESCE(SUM(llm_input_tokens), 0)::int AS input_tokens,
       COALESCE(SUM(llm_output_tokens), 0)::int AS output_tokens,
       COALESCE(SUM(llm_total_tokens), 0)::int AS total_tokens,
       COALESCE(SUM(llm_total_cost_usd), 0)::float AS total_cost_usd,
       COALESCE(ROUND(AVG(llm_response_ms))::int, 0) AS average_response_ms
     FROM recipes
     WHERE llm_model IS NOT NULL
     GROUP BY llm_model
     ORDER BY total_tokens DESC, llm_model`
  );

  return {
    recipeCount: total.rows[0].recipe_count,
    inputTokens: total.rows[0].input_tokens,
    outputTokens: total.rows[0].output_tokens,
    totalTokens: total.rows[0].total_tokens,
    totalCostUsd: Number(total.rows[0].total_cost_usd || 0),
    averageResponseMs: total.rows[0].average_response_ms,
    byModel: byModel.rows.map((row) => ({
      model: row.llm_model,
      recipeCount: row.recipe_count,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      totalTokens: row.total_tokens,
      totalCostUsd: Number(row.total_cost_usd || 0),
      averageResponseMs: row.average_response_ms
    }))
  };
}

export async function ensureDefaultSettings() {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    await query(
      `INSERT INTO settings (key, value, secret)
       VALUES ($1, $2, false)
       ON CONFLICT (key) DO NOTHING`,
      [key, value]
    );
  }
}

export async function getPublicSettings() {
  const settings = await getSettingMap();
  const dbKey = settings.get('openai_api_key')?.value || '';
  const model = settings.get('openai_model')?.value || config.openai.model;
  const provider = settings.get('llm_provider')?.value || DEFAULTS.llm_provider;

  return {
    defaultLanguage: settings.get('default_language')?.value || DEFAULTS.default_language,
    unitSystem: 'metric',
    aiProcessingEnabled:
      (settings.get('ai_processing_enabled')?.value || DEFAULTS.ai_processing_enabled) === 'true',
    llmProvider: LLM_PROVIDERS.includes(provider) ? provider : DEFAULTS.llm_provider,
    openaiApiKeyConfigured: Boolean(config.openai.apiKey || dbKey),
    openaiApiKeySource: config.openai.apiKey ? 'environment' : dbKey ? 'settings' : 'none',
    openaiModel: isSupportedOpenAiModel(model) ? model : DEFAULT_OPENAI_MODEL,
    openaiModelOptions: OPENAI_MODEL_OPTIONS,
    openaiKeyStatus: settings.get('openai_key_status')?.value || DEFAULTS.openai_key_status,
    openaiKeyCheckedAt: settings.get('openai_key_checked_at')?.value || '',
    openaiKeyError: settings.get('openai_key_error')?.value || '',
    usageSummary: await getUsageSummary()
  };
}

export async function updateSettings(input) {
  if (input.defaultLanguage !== undefined) {
    await upsertSetting('default_language', input.defaultLanguage, false);
  }

  if (input.unitSystem !== undefined) {
    await upsertSetting('unit_system', 'metric', false);
  }

  if (input.aiProcessingEnabled !== undefined) {
    await upsertSetting('ai_processing_enabled', String(input.aiProcessingEnabled), false);
  }

  if (input.llmProvider !== undefined) {
    if (input.llmProvider !== 'own_chatgpt') {
      throw badRequest('Only Own ChatGPT is available in this MVP');
    }
    await upsertSetting('llm_provider', input.llmProvider, false);
  }

  if (input.openaiModel !== undefined) {
    if (!isSupportedOpenAiModel(input.openaiModel)) {
      throw badRequest('Unsupported OpenAI model');
    }
    await upsertSetting('openai_model', input.openaiModel, false);
  }

  if (input.openaiApiKey !== undefined) {
    if (input.openaiApiKey.trim()) {
      await upsertSetting('openai_api_key', encryptSecret(input.openaiApiKey.trim()), true);
      await upsertSetting('openai_key_status', 'unverified', false);
      await upsertSetting('openai_key_checked_at', '', false);
      await upsertSetting('openai_key_error', '', false);
    } else {
      await query('DELETE FROM settings WHERE key = $1', ['openai_api_key']);
      await upsertSetting('openai_key_status', 'missing', false);
      await upsertSetting('openai_key_checked_at', new Date().toISOString(), false);
      await upsertSetting('openai_key_error', '', false);
    }
  }

  return getPublicSettings();
}

export async function getOpenAiModel() {
  const result = await query('SELECT value FROM settings WHERE key = $1', ['openai_model']);
  const model = result.rows[0]?.value || config.openai.model;
  return isSupportedOpenAiModel(model) ? model : DEFAULT_OPENAI_MODEL;
}

export async function getOpenAiApiKey() {
  if (config.openai.apiKey) return config.openai.apiKey;

  const result = await query('SELECT value FROM settings WHERE key = $1', ['openai_api_key']);
  const value = result.rows[0]?.value || '';
  return value ? decryptSecret(value) : '';
}

export async function verifyOpenAiKey({ apiKey, model } = {}) {
  const keyToVerify = apiKey?.trim() || (await getOpenAiApiKey());
  const modelToVerify = model || (await getOpenAiModel());

  if (!keyToVerify) {
    await upsertSetting('openai_key_status', 'missing', false);
    await upsertSetting('openai_key_checked_at', new Date().toISOString(), false);
    await upsertSetting('openai_key_error', '', false);
    return getPublicSettings();
  }

  if (!isSupportedOpenAiModel(modelToVerify)) {
    throw badRequest('Unsupported OpenAI model');
  }

  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(
      `${config.openai.baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(modelToVerify)}`,
      {
        headers: {
          Authorization: `Bearer ${keyToVerify}`
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) {
      const body = await response.text();
      await upsertSetting('openai_key_status', 'invalid', false);
      await upsertSetting('openai_key_checked_at', checkedAt, false);
      await upsertSetting('openai_key_error', body.slice(0, 240), false);
      return getPublicSettings();
    }

    await upsertSetting('openai_key_status', 'verified', false);
    await upsertSetting('openai_key_checked_at', checkedAt, false);
    await upsertSetting('openai_key_error', '', false);
    return getPublicSettings();
  } catch (error) {
    await upsertSetting('openai_key_status', 'error', false);
    await upsertSetting('openai_key_checked_at', checkedAt, false);
    await upsertSetting('openai_key_error', error.message.slice(0, 240), false);
    return getPublicSettings();
  }
}
