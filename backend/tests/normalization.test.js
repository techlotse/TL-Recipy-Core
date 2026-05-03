import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAiRecipePayload } from '../src/services/aiService.js';

test('normalizes AI payloads into recipe input shape', () => {
  const recipe = normalizeAiRecipePayload(
    {
      title: 'Metric Pancakes',
      activeTime: '15 min',
      totalTime: '25 min',
      ingredients: [{ ingredient: 'Flour', amount: '200', unit: 'g' }],
      method: ['Mix batter.', 'Cook in a pan.'],
      tags: ['breakfast']
    },
    'https://example.com/pancakes'
  );

  assert.equal(recipe.title, 'Metric Pancakes');
  assert.equal(recipe.activeTimeMinutes, 15);
  assert.equal(recipe.totalTimeMinutes, 25);
  assert.equal(recipe.ingredients[0].name, 'Flour');
  assert.equal(recipe.steps.length, 2);
  assert.deepEqual(recipe.tags, ['breakfast', 'imported', 'ai-normalized']);
});
