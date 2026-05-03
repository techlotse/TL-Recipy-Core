ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS llm_image_model TEXT NULL,
  ADD COLUMN IF NOT EXISTS llm_image_count INTEGER NULL CHECK (llm_image_count IS NULL OR llm_image_count >= 0),
  ADD COLUMN IF NOT EXISTS llm_image_cost_usd NUMERIC(12,6) NULL;
