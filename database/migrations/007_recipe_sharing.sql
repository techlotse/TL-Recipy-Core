ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS share_token TEXT NULL,
  ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_share_token ON recipes(share_token) WHERE share_token IS NOT NULL;
