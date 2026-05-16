import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAiRecipePayload } from '../src/services/aiService.js';
import { importRequestSchema, photoImportRequestSchema, recipeTranslationRequestSchema } from '../src/validation.js';

test('normalizes AI payloads into recipe input shape', () => {
  const recipe = normalizeAiRecipePayload(
    {
      isFoodRecipe: true,
      isCookingRecipe: true,
      title: 'Metric Pancakes',
      activeTime: '15 min',
      totalTime: '25 min',
      ingredients: [{ ingredient: 'Flour', amount: '200', unit: 'g' }],
      method: ['Mix batter.', 'Cook in a pan.'],
      tags: ['breakfast'],
      translations: {
        af: {
          title: 'Metriese pannekoeke',
          ingredients: [{ name: 'Meel', quantity: '200', unit: 'g' }],
          method: ['Meng die beslag.', "Bak in 'n pan."],
          tags: ['ontbyt']
        }
      }
    },
    'https://example.com/pancakes'
  );

  assert.equal(recipe.title, 'Metric Pancakes');
  assert.equal(recipe.activeTimeMinutes, 15);
  assert.equal(recipe.totalTimeMinutes, 25);
  assert.equal(recipe.ingredients[0].name, 'Flour');
  assert.equal(recipe.steps.length, 2);
  assert.equal(recipe.translations.af.ingredients[0].name, 'Meel');
  assert.equal(recipe.translations.af.steps[0].text, 'Meng die beslag.');
  assert.deepEqual(recipe.tags, ['breakfast', 'imported', 'ai-normalized']);
});

test('rejects AI payloads that are not food cooking recipes', () => {
  assert.throws(
    () =>
      normalizeAiRecipePayload(
        {
          isFoodRecipe: false,
          isCookingRecipe: false,
          rejectionReason: 'Imported page is not a cooking recipe for food.',
          ingredients: [],
          method: [],
          tags: []
        },
        'https://example.com/not-a-recipe'
      ),
    /not a cooking recipe for food/
  );
});

test('rejects wrapped AI payloads with top-level non-food flags', () => {
  assert.throws(
    () =>
      normalizeAiRecipePayload(
        {
          isFoodRecipe: false,
          isCookingRecipe: false,
          rejectionReason: 'Imported page is not a food recipe.',
          recipe: {
            title: 'Not a recipe',
            ingredients: [],
            method: []
          }
        },
        'https://example.com/not-food'
      ),
    /not a food recipe/
  );
});

test('validates photo import upload limits', () => {
  const photo = {
    name: 'recipe.jpg',
    type: 'image/jpeg',
    dataUrl: 'data:image/jpeg;base64,abcd'
  };

  const valid = photoImportRequestSchema.parse({ photos: [photo] });
  assert.equal(valid.photos.length, 1);

  assert.throws(
    () => photoImportRequestSchema.parse({ photos: Array.from({ length: 6 }, () => photo) }),
    /Upload up to 5 photos/
  );
});

test('validates requested translation languages', () => {
  const input = importRequestSchema.parse({
    url: 'https://example.com/recipe',
    mode: 'ai',
    translationLanguages: ['en', 'de', 'af']
  });
  assert.deepEqual(input.translationLanguages, ['en', 'de', 'af']);

  assert.deepEqual(recipeTranslationRequestSchema.parse({ languages: ['af', 'de'] }).languages, ['af', 'de']);
  assert.throws(() => recipeTranslationRequestSchema.parse({ languages: ['fr'] }), /Invalid option/);
});
