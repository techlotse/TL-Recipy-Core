import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalCategoryName,
  categoryFilterSlugs,
  normalizeLanguageCodes,
  normalizeCategoryFilters,
  normalizeTagName
} from '../src/categoryOptions.js';

test('canonicalizes recipe categories across supported languages', () => {
  assert.equal(canonicalCategoryName('Vorspeisen'), 'Starters');
  assert.equal(canonicalCategoryName('plat principal'), 'Mains');
  assert.equal(canonicalCategoryName('hoofgereg'), 'Mains');
  assert.equal(canonicalCategoryName('vegano'), 'Vegan');
});

test('normalizes category filters and tags to standard names', () => {
  assert.deepEqual(normalizeCategoryFilters(['starter', 'Starters', 'senza zucchero']), [
    'Starters',
    'Sugar Free'
  ]);
  assert.equal(normalizeTagName('vegetarisch'), 'Vegetarian');
});

test('normalizes supported recipe translation language codes', () => {
  assert.deepEqual(normalizeLanguageCodes(['de', 'af', 'fr', 'en', 'af']), ['de', 'af', 'en']);
});

test('expands category filters to multilingual alias slugs', () => {
  const starters = categoryFilterSlugs('Starters');
  assert.ok(starters.includes('starters'));
  assert.ok(starters.includes('appetizer'));
  assert.ok(starters.includes('vorspeisen'));
});
