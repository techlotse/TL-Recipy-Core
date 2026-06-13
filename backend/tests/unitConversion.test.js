import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convertIngredientToMetric,
  convertIngredientsToMetric,
  densityForIngredient,
  formatMetricQuantity,
  isLiquidIngredient,
  parseQuantity
} from '../src/utils/unitConversion.js';

function ingredient(overrides) {
  return {
    name: '',
    quantity: '',
    unit: '',
    notes: '',
    originalQuantity: '',
    originalUnit: '',
    originalText: '',
    ...overrides
  };
}

test('parseQuantity handles numbers, fractions, and unicode fractions', () => {
  assert.equal(parseQuantity('2'), 2);
  assert.equal(parseQuantity('1.5'), 1.5);
  assert.equal(parseQuantity('1,5'), 1.5);
  assert.equal(parseQuantity('1/2'), 0.5);
  assert.equal(parseQuantity('1 1/2'), 1.5);
  assert.equal(parseQuantity('½'), 0.5);
  assert.equal(parseQuantity('1½'), 1.5);
  assert.equal(parseQuantity(''), null);
  assert.equal(parseQuantity('some'), null);
  assert.equal(parseQuantity('1-2'), null);
});

test('different dry ingredients use different densities per cup', () => {
  const flour = convertIngredientToMetric(ingredient({ name: 'all-purpose flour', quantity: '1', unit: 'cup' }));
  const coconut = convertIngredientToMetric(ingredient({ name: 'dried coconut', quantity: '1', unit: 'cup' }));
  const sugar = convertIngredientToMetric(ingredient({ name: 'sugar', quantity: '1', unit: 'cup' }));

  assert.equal(flour.unit, 'g');
  assert.equal(coconut.unit, 'g');
  assert.equal(sugar.unit, 'g');
  assert.equal(flour.quantity, '120');
  assert.equal(coconut.quantity, '85');
  assert.equal(sugar.quantity, '200');
  assert.notEqual(flour.quantity, coconut.quantity);
});

test('wet ingredients convert to milliliters', () => {
  const milk = convertIngredientToMetric(ingredient({ name: 'whole milk', quantity: '1', unit: 'cup' }));
  assert.equal(milk.quantity, '240');
  assert.equal(milk.unit, 'ml');

  const oil = convertIngredientToMetric(ingredient({ name: 'olive oil', quantity: '2', unit: 'tbsp' }));
  assert.equal(oil.quantity, '30');
  assert.equal(oil.unit, 'ml');

  const water = convertIngredientToMetric(ingredient({ name: 'water', quantity: '2', unit: 'l' }));
  assert.equal(water.quantity, '2000');
  assert.equal(water.unit, 'ml');
});

test('original measurement is preserved when converting', () => {
  const flour = convertIngredientToMetric(ingredient({ name: 'flour', quantity: '2', unit: 'cups' }));
  assert.equal(flour.originalQuantity, '2');
  assert.equal(flour.originalUnit, 'cups');
  assert.equal(flour.quantity, '240');
  assert.equal(flour.unit, 'g');
});

test('a recorded original volume corrects a bad upstream conversion', () => {
  // Upstream converted 1 cup coconut with flour density (120 g) — recompute from original.
  const fixed = convertIngredientToMetric(
    ingredient({
      name: 'desiccated coconut',
      quantity: '120',
      unit: 'g',
      originalQuantity: '1',
      originalUnit: 'cup'
    })
  );
  assert.equal(fixed.quantity, '85');
  assert.equal(fixed.unit, 'g');
  assert.equal(fixed.originalQuantity, '1');
  assert.equal(fixed.originalUnit, 'cup');
});

test('imperial weights convert to grams', () => {
  const beef = convertIngredientToMetric(ingredient({ name: 'ground beef', quantity: '1', unit: 'lb' }));
  assert.equal(beef.quantity, '454');
  assert.equal(beef.unit, 'g');

  const cheese = convertIngredientToMetric(ingredient({ name: 'cheddar', quantity: '4', unit: 'oz' }));
  assert.equal(cheese.quantity, '113');
  assert.equal(cheese.unit, 'g');
});

test('metric and unparseable values are left unchanged', () => {
  const grams = ingredient({ name: 'flour', quantity: '500', unit: 'g' });
  assert.deepEqual(convertIngredientToMetric(grams), grams);

  const ml = ingredient({ name: 'milk', quantity: '250', unit: 'ml' });
  assert.deepEqual(convertIngredientToMetric(ml), ml);

  const pinch = ingredient({ name: 'salt', quantity: 'a pinch', unit: '' });
  assert.deepEqual(convertIngredientToMetric(pinch), pinch);

  const range = ingredient({ name: 'flour', quantity: '1-2', unit: 'cups' });
  assert.deepEqual(convertIngredientToMetric(range), range);

  const count = ingredient({ name: 'eggs', quantity: '3', unit: '' });
  assert.deepEqual(convertIngredientToMetric(count), count);
});

test('unknown dry ingredients measured by volume fall back to milliliters', () => {
  const chopped = convertIngredientToMetric(ingredient({ name: 'chopped celery', quantity: '1', unit: 'cup' }));
  assert.equal(chopped.quantity, '240');
  assert.equal(chopped.unit, 'ml');
});

test('german spoon units convert', () => {
  const el = convertIngredientToMetric(ingredient({ name: 'Öl', quantity: '3', unit: 'EL' }));
  assert.equal(el.quantity, '45');
  assert.equal(el.unit, 'ml');

  const tl = convertIngredientToMetric(ingredient({ name: 'Salz', quantity: '1', unit: 'TL' }));
  assert.equal(tl.quantity, '5.7');
  assert.equal(tl.unit, 'g');
});

test('helpers classify ingredients', () => {
  assert.equal(isLiquidIngredient('coconut milk'), true);
  assert.equal(isLiquidIngredient('dried coconut'), false);
  assert.equal(densityForIngredient('bread flour'), 127);
  assert.equal(densityForIngredient('unknown thing'), null);
  assert.equal(formatMetricQuantity(123.4), '123');
  assert.equal(formatMetricQuantity(56.4), '56');
  assert.equal(formatMetricQuantity(2.36), '2.4');
});

test('convertIngredientsToMetric maps lists safely', () => {
  assert.deepEqual(convertIngredientsToMetric(null), []);
  const list = convertIngredientsToMetric([ingredient({ name: 'flour', quantity: '1', unit: 'cup' })]);
  assert.equal(list[0].quantity, '120');
});
