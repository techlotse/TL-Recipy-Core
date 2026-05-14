# TL Recipe Core User Guide

## Add a Recipe Manually

1. Open `Add Recipe`.
2. Fill in the title, short description, image URL or upload an image, active time, and total time.
3. Add ingredients with name, quantity, unit, and notes.
4. Add ordered method steps.
5. Pick existing tags or create new tags.
6. Review the recipe and select `Save recipe`.

The recipe opens automatically after saving.

## Import a Recipe from a URL

1. Open `Import from URL`.
2. Paste the recipe page URL.
3. Choose `Verbatim import` or `ChatGPT processed import`.
4. If using `ChatGPT processed import`, optionally enable `Create toddler helper version with AI step images`.
5. Select `Import recipe`.

The app fetches the page on the backend, extracts recipe metadata where possible, and saves the result to the database.

## Verbatim Import vs AI-Processed Import

`Verbatim import` saves extracted recipe content as close to the source page as possible. It is fast and does not require an OpenAI API key, but results depend on the quality of the source page metadata.

`ChatGPT processed import` sends the extracted recipe content to the configured OpenAI API. It asks the model to remove blog/story content, normalize the recipe into the TL Recipe Core structure, convert units to metric, keep temperatures in Celsius, and return structured JSON before saving.

AI-processed import is only for edible food cooking recipes. Imported page content is treated as untrusted data, so hidden text, metadata, comments, scripts, and instructions aimed at AI agents are ignored. Pages that are not food recipes are rejected instead of saved.

If AI processing fails, the app shows an error and does not create a partial recipe.

When the toddler helper option is enabled, TL Recipe Core first imports the normal AI-processed recipe. It then creates a second supervised toddler-friendly helper recipe with short safe steps and one generated image per step. Toddler helper recipes are designed for adult-supervised participation and avoid toddler tasks involving knives, heat, boiling water, raw meat, or appliance operation.

## Metric Conversion

AI-processed imports request metric units for quantities and Celsius for temperatures. The backend validates the JSON response before saving. Manual recipes and verbatim imports keep the values you enter or the values extracted from the source page.

The default unit system is metric in Settings for v1.

## Tag and Search Recipes

Use `Recipes` for the main library view:

- Search by title, description, or ingredient text.
- Select a tag chip to filter recipe cards.
- Select `All` to clear the tag filter.

Use `Tags / Search` when you want to combine search text with one or more tags.

## Configure API Keys

1. Open `Settings`.
2. Open the `LLM` tab.
3. Select `Own ChatGPT`.
4. Enter an OpenAI API key.
5. Select the model used for AI imports.
6. Select `Verify key`.
7. Select `Save settings`.

If `OPENAI_API_KEY` is configured in the server environment, it is used instead of a key stored from Settings. The UI shows the key source but never displays the key value.

## LLM Model and Usage Stats

The LLM tab can use:

- `Platform supplied ChatGPT`, disabled for now.
- `Own ChatGPT`, available now with API key, status, model selection, and token usage stats.
- `Bring your own LLM`, disabled for now.

AI-processed recipe imports store the model, input tokens, output tokens, total tokens, and response time. Recipe detail pages show those metrics when available.

AI-processed imports also store the input/output token price and calculated cost at the time of import. If an ingredient was converted to metric, the original ingredient text or original value is shown below the metric value when available.

## Personal Backups

Open `Settings` and select `Backup`.

- `Export data` downloads recipes and tags as JSON.
- `Import data` uploads a TL Recipe Core JSON backup and adds those recipes to the library.

Personal backups do not include stored API keys.

## Common Workflows

**Save a quick internal recipe**

Open `Add Recipe`, enter the required fields, add one or more tags, then save.

**Import and clean up a web recipe**

Open `Import from URL`, choose `ChatGPT processed import`, then review the saved recipe detail page.

**Import without using AI**

Open `Import from URL`, choose `Verbatim import`, then use the source link on the detail page if the source metadata was incomplete.

**Find weeknight recipes**

Open `Tags / Search`, select tags such as `quick` or `weeknight`, and add search text if needed.

**Rotate an OpenAI API key**

Open `Settings`, paste the new key, and save. To remove a stored key, check `Clear stored OpenAI key` and save.

**Move recipes between local instances**

Open `Settings`, export a backup from the source instance, then import that JSON file on the target instance.
