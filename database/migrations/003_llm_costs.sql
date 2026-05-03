ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS llm_input_price_per_million_usd NUMERIC(12,6) NULL,
  ADD COLUMN IF NOT EXISTS llm_output_price_per_million_usd NUMERIC(12,6) NULL,
  ADD COLUMN IF NOT EXISTS llm_input_cost_usd NUMERIC(12,6) NULL,
  ADD COLUMN IF NOT EXISTS llm_output_cost_usd NUMERIC(12,6) NULL,
  ADD COLUMN IF NOT EXISTS llm_total_cost_usd NUMERIC(12,6) NULL;
