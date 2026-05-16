# Changelog

## v0.5.7

- Improved mobile fit behavior and moved AI import usage stats to the end of recipe details for cleaner cooking views.
- Added Basic Auth protection and a management login prompt for Settings, imports, backups, and recipe/tag management while keeping recipe browsing public.
- Applied the TL Platform Design System direction with the TL Recipe Core amber accent, softer dark SaaS surfaces, sidebar account treatment, and richer empty states.
- Replaced interactive tag chips with multi-select dropdown controls for tag assignment and filtering.
- Added startup retry handling for temporary PostgreSQL DNS/readiness failures.
- Added AI-assisted photo import for up to five uploaded recipe photos.
- Hardened OpenAI import instructions to accept only edible food cooking recipes and ignore hidden AI-agent instructions in imported page content.
- Fixed API validation errors rendering as `[object Object]` in the frontend.
- Invalid import URLs now show the actual validation field message.
- Started maintaining this changelog.
- Added optional toddler-helper recipe creation for AI-assisted imports.
- Added generated toddler-safe image support for each toddler helper step.
- Added image model, image count, and image cost tracking for AI-created step images.

## v0.4.2

- Added running app version display under `Settings` -> `General`.

## v0.4.1

- Updated global npm in Docker and CI to avoid vulnerable `picomatch` and `brace-expansion` versions bundled in the Node base image.

## v0.4.0

- Added recipe editing.
- Added AI import cost snapshots based on token usage and selected model pricing.
- Added original ingredient values when AI imports convert values to metric.

## v0.1.0

- Initial TL Recipe Core MVP.
- Added recipe cards, detail pages, manual recipe wizard, URL import, tag/search, settings, PostgreSQL storage, Docker, CI, and documentation.
