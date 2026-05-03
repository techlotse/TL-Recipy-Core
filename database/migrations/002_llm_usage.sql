ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS llm_provider TEXT NULL,
  ADD COLUMN IF NOT EXISTS llm_model TEXT NULL,
  ADD COLUMN IF NOT EXISTS llm_input_tokens INTEGER NULL CHECK (llm_input_tokens IS NULL OR llm_input_tokens >= 0),
  ADD COLUMN IF NOT EXISTS llm_output_tokens INTEGER NULL CHECK (llm_output_tokens IS NULL OR llm_output_tokens >= 0),
  ADD COLUMN IF NOT EXISTS llm_total_tokens INTEGER NULL CHECK (llm_total_tokens IS NULL OR llm_total_tokens >= 0),
  ADD COLUMN IF NOT EXISTS llm_response_ms INTEGER NULL CHECK (llm_response_ms IS NULL OR llm_response_ms >= 0);
