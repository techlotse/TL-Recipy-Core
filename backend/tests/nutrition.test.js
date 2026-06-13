import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNutritionPayload } from '../src/services/aiService.js';

test('normalizes per-serving and total values', () => {
  const n = normalizeNutritionPayload({
    servings: 4,
    perServing: { calories: 250.4, protein: 8, carbs: 30, fat: 10, fiber: 3, sugar: 12, sodium: 200 },
    total: { calories: 1001.6, protein: 32, carbs: 120, fat: 40, fiber: 12, sugar: 48, sodium: 800 },
    basis: 'From ingredients'
  });
  assert.equal(n.servings, 4);
  assert.equal(n.perServing.calories, 250.4);
  assert.equal(n.perServing.proteinGrams, 8);
  assert.equal(n.total.sodiumMg, 800);
  assert.equal(n.estimate, true);
  assert.equal(typeof n.generatedAt, 'string');
});

test('backfills per-serving from total using servings', () => {
  const n = normalizeNutritionPayload({
    servings: 2,
    total: { calories: 400, protein: 20, carbs: 40, fat: 10, fiber: 4, sugar: 8, sodium: 600 }
  });
  assert.equal(n.perServing.calories, 200);
  assert.equal(n.perServing.proteinGrams, 10);
  assert.equal(n.perServing.sodiumMg, 300);
});

test('backfills total from per-serving using servings', () => {
  const n = normalizeNutritionPayload({
    servings: 3,
    perServing: { calories: 100, protein: 5 }
  });
  assert.equal(n.total.calories, 300);
  assert.equal(n.total.proteinGrams, 15);
});

test('negative and non-numeric values become null', () => {
  const n = normalizeNutritionPayload({
    perServing: { calories: -5, protein: 'lots', carbs: 20 }
  });
  assert.equal(n.perServing.calories, null);
  assert.equal(n.perServing.proteinGrams, null);
  assert.equal(n.perServing.carbsGrams, 20);
});

test('throws when no usable values are present', () => {
  assert.throws(() => normalizeNutritionPayload({ servings: 4, perServing: {}, total: {} }));
});

test('accepts alternate field names from the model', () => {
  const n = normalizeNutritionPayload({
    perServing: { kcal: 150, carbohydrates: 22, sodium: 90 }
  });
  assert.equal(n.perServing.calories, 150);
  assert.equal(n.perServing.carbsGrams, 22);
  assert.equal(n.perServing.sodiumMg, 90);
});
