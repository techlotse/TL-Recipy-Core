import { slugify, uniqueStrings } from './utils/slug.js';

export const SUPPORTED_LANGUAGES = ['en', 'de', 'af'];

export const LANGUAGE_LABELS = {
  en: 'English',
  de: 'Deutsch',
  af: 'Afrikaans'
};

export function normalizeLanguageCodes(values = SUPPORTED_LANGUAGES) {
  const requested = Array.isArray(values) ? values : [];
  const filtered = requested.filter((code) => SUPPORTED_LANGUAGES.includes(code));
  return uniqueStrings(filtered).slice(0, SUPPORTED_LANGUAGES.length);
}

export const DEFAULT_CATEGORY_FILTERS = [
  'Starters',
  'Mains',
  'Desserts',
  'Drinks',
  'Cookies',
  'Cakes',
  'Tarts',
  'Vegan',
  'Vegetarian',
  'Sugar Free',
  'One-Pot'
];

const CATEGORY_ALIASES = {
  Starters: [
    'starter',
    'starters',
    'appetizer',
    'appetizers',
    'entree',
    'entrees',
    'vorspeise',
    'vorspeisen',
    'apéritif',
    'aperitif',
    'entrée',
    'entrées',
    'antipasto',
    'antipasti',
    'voorgereg',
    'voorgeregte'
  ],
  Mains: [
    'main',
    'mains',
    'main course',
    'main dish',
    'hauptgericht',
    'hauptgerichte',
    'plat principal',
    'plats principaux',
    'secondo',
    'secondi',
    'primo',
    'primi',
    'hoofgereg',
    'hoofgeregte'
  ],
  Desserts: ['dessert', 'desserts', 'nachtisch', 'dessert', 'dolce', 'dolci', 'nagereg', 'nageregte'],
  Drinks: ['drink', 'drinks', 'beverage', 'beverages', 'getränk', 'getraenk', 'getränke', 'boisson', 'boissons', 'bevanda', 'bevande', 'drankie', 'drankies'],
  Cookies: ['cookie', 'cookies', 'biscuit', 'biscuits', 'keks', 'kekse', 'plätzchen', 'plaetzchen', 'biscotto', 'biscotti', 'koekie', 'koekies'],
  Cakes: ['cake', 'cakes', 'kuchen', 'gâteau', 'gateau', 'gâteaux', 'gateaux', 'torta', 'torte', 'koek', 'koeke'],
  Tarts: ['tart', 'tarts', 'tarte', 'tartes', 'wähe', 'waehe', 'crostata', 'crostate', 'tert', 'terte'],
  Vegan: ['vegan', 'vegane', 'végane', 'vegano', 'vegana'],
  Vegetarian: ['vegetarian', 'vegetarisch', 'végétarien', 'vegetarien', 'vegetariano', 'vegetariana', 'vegetaries'],
  'Sugar Free': [
    'sugar free',
    'sugar-free',
    'without sugar',
    'zuckerfrei',
    'sans sucre',
    'senza zucchero',
    'suikervry'
  ],
  'One-Pot': [
    'one pot',
    'one-pot',
    'one pan',
    'one-pan',
    'ein topf',
    'eintopf',
    'un seul pot',
    'une casserole',
    'pentola unica',
    'eenpot'
  ]
};

function normalized(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const aliasToCategory = new Map();
for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
  for (const alias of [category, ...aliases]) {
    aliasToCategory.set(normalized(alias), category);
    aliasToCategory.set(slugify(alias), category);
  }
}

export function canonicalCategoryName(value) {
  return aliasToCategory.get(normalized(value)) || aliasToCategory.get(slugify(value)) || null;
}

export function isCategoryName(value) {
  return Boolean(canonicalCategoryName(value));
}

export function categoryFilterSlugs(value) {
  const category = canonicalCategoryName(value);
  if (!category) return [slugify(value)].filter(Boolean);

  return uniqueStrings([category, ...(CATEGORY_ALIASES[category] || [])].map(slugify)).filter(Boolean);
}

export function normalizeCategoryFilters(values = DEFAULT_CATEGORY_FILTERS) {
  const normalizedCategories = values
    .map((value) => canonicalCategoryName(value) || String(value || '').trim())
    .filter(Boolean);
  return uniqueStrings(normalizedCategories).slice(0, 30);
}

export function normalizeTagName(value, existingTags = []) {
  const clean = String(value || '').trim();
  if (!clean) return '';

  const category = canonicalCategoryName(clean);
  if (category) return category;

  const cleanNormalized = normalized(clean);
  const cleanSlug = slugify(clean);
  const existingMatch = existingTags.find((tag) => {
    const name = tag.name || tag;
    return normalized(name) === cleanNormalized || slugify(name) === cleanSlug;
  });

  return existingMatch?.name || clean;
}

export function categoryPromptPayload(categoryFilters = DEFAULT_CATEGORY_FILTERS, existingTags = []) {
  return {
    categoryFilters: normalizeCategoryFilters(categoryFilters),
    categoryAliases: CATEGORY_ALIASES,
    existingTags: existingTags.map((tag) => tag.name || tag).filter(Boolean)
  };
}
