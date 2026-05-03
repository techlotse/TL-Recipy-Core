CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY,
  owner_user_id UUID NULL,
  title TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  active_time_minutes INTEGER NULL CHECK (active_time_minutes IS NULL OR active_time_minutes >= 0),
  total_time_minutes INTEGER NULL CHECK (total_time_minutes IS NULL OR total_time_minutes >= 0),
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_url TEXT NULL,
  import_mode TEXT NOT NULL DEFAULT 'manual' CHECK (import_mode IN ('manual', 'verbatim', 'ai')),
  llm_provider TEXT NULL,
  llm_model TEXT NULL,
  llm_input_tokens INTEGER NULL CHECK (llm_input_tokens IS NULL OR llm_input_tokens >= 0),
  llm_output_tokens INTEGER NULL CHECK (llm_output_tokens IS NULL OR llm_output_tokens >= 0),
  llm_total_tokens INTEGER NULL CHECK (llm_total_tokens IS NULL OR llm_total_tokens >= 0),
  llm_response_ms INTEGER NULL CHECK (llm_response_ms IS NULL OR llm_response_ms >= 0),
  llm_input_price_per_million_usd NUMERIC(12,6) NULL,
  llm_output_price_per_million_usd NUMERIC(12,6) NULL,
  llm_input_cost_usd NUMERIC(12,6) NULL,
  llm_output_cost_usd NUMERIC(12,6) NULL,
  llm_total_cost_usd NUMERIC(12,6) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY,
  owner_user_id UUID NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_tags (
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  secret BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_updated_at ON recipes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_title_search ON recipes USING gin (to_tsvector('simple', title || ' ' || short_description));
CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag_id ON recipe_tags(tag_id);
