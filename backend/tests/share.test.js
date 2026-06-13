import test from 'node:test';
import assert from 'node:assert/strict';
import { toPublicRecipe } from '../src/services/recipeStore.js';

function fullRecipe() {
  return {
    id: 'r1',
    title: 'Coconut cake',
    shortDescription: 'Moist and sweet.',
    imageUrl: 'data:image/png;base64,AAA',
    activeTimeMinutes: 20,
    totalTimeMinutes: 60,
    ingredients: [
      {
        name: 'flour',
        quantity: '120',
        unit: 'g',
        notes: 'sifted',
        originalQuantity: '1',
        originalUnit: 'cup',
        originalText: '1 cup flour'
      }
    ],
    steps: [{ text: 'Mix and bake.', imageUrl: 'data:image/png;base64,BBB', imagePrompt: 'a cake' }],
    tags: [{ id: 't1', name: 'Cakes', slug: 'cakes' }],
    translations: {
      de: {
        title: 'Kokoskuchen',
        shortDescription: 'Saftig.',
        ingredients: [
          { name: 'Mehl', quantity: '120', unit: 'g', notes: '', originalQuantity: '1', originalUnit: 'Tasse', originalText: '1 Tasse Mehl' }
        ],
        steps: [{ text: 'Verrühren und backen.', imagePrompt: 'kuchen' }],
        tags: ['Kuchen']
      }
    },
    sourceUrl: 'https://example.com/cake',
    sourcePhotos: [{ name: 'p.jpg', type: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,CCC' }],
    importMode: 'ai',
    shareEnabled: true,
    llmUsage: { model: 'gpt', totalCostUsd: 0.01 }
  };
}

test('toPublicRecipe keeps final ingredients, method, and picture', () => {
  const pub = toPublicRecipe(fullRecipe());
  assert.equal(pub.title, 'Coconut cake');
  assert.equal(pub.imageUrl, 'data:image/png;base64,AAA');
  assert.equal(pub.ingredients[0].name, 'flour');
  assert.equal(pub.ingredients[0].quantity, '120');
  assert.equal(pub.ingredients[0].unit, 'g');
  assert.equal(pub.ingredients[0].notes, 'sifted');
  assert.equal(pub.steps[0].text, 'Mix and bake.');
  assert.equal(pub.steps[0].imageUrl, 'data:image/png;base64,BBB');
  assert.deepEqual(pub.tags, ['Cakes']);
});

test('toPublicRecipe drops diagnostic/comparative and internal data', () => {
  const pub = toPublicRecipe(fullRecipe());
  // No pre-conversion originals on ingredients.
  assert.equal('originalQuantity' in pub.ingredients[0], false);
  assert.equal('originalUnit' in pub.ingredients[0], false);
  assert.equal('originalText' in pub.ingredients[0], false);
  // No import/source diagnostics, LLM usage, or step prompts.
  assert.equal('sourcePhotos' in pub, false);
  assert.equal('sourceUrl' in pub, false);
  assert.equal('llmUsage' in pub, false);
  assert.equal('importMode' in pub, false);
  assert.equal('shareEnabled' in pub, false);
  assert.equal('imagePrompt' in pub.steps[0], false);
});

test('toPublicRecipe sanitizes translations the same way', () => {
  const pub = toPublicRecipe(fullRecipe());
  const de = pub.translations.de;
  assert.equal(de.title, 'Kokoskuchen');
  assert.equal(de.ingredients[0].name, 'Mehl');
  assert.equal('originalUnit' in de.ingredients[0], false);
  assert.equal('imagePrompt' in de.steps[0], false);
  assert.deepEqual(de.tags, ['Kuchen']);
});

test('toPublicRecipe handles null', () => {
  assert.equal(toPublicRecipe(null), null);
});
