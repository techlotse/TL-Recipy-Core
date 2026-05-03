import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { query } from './db.js';
import { config } from './config.js';
import { ensureDefaultSettings } from './services/settingsStore.js';
import { createRecipe } from './services/recipeStore.js';

export async function runMigrations() {
  const files = (await readdir(config.migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const migration = await readFile(path.join(config.migrationsDir, file), 'utf8');
    await query(migration);
  }

  await ensureDefaultSettings();
}

export async function seedSampleRecipes() {
  if (!config.seedSampleData) return;

  const count = await query('SELECT COUNT(*)::int AS count FROM recipes');
  if (count.rows[0].count > 0) return;

  await createRecipe({
    title: 'Lemon Herb Risotto',
    shortDescription: 'Creamy risotto with lemon, parsley, and parmesan for a compact weeknight dinner.',
    imageUrl:
      'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=1200&q=80',
    activeTimeMinutes: 25,
    totalTimeMinutes: 35,
    ingredients: [
      { name: 'Arborio rice', quantity: '320', unit: 'g', notes: '' },
      { name: 'Vegetable stock', quantity: '1.1', unit: 'l', notes: 'kept warm' },
      { name: 'Parmesan', quantity: '60', unit: 'g', notes: 'finely grated' },
      { name: 'Lemon', quantity: '1', unit: '', notes: 'zest and juice' }
    ],
    steps: [
      { text: 'Soften onion in olive oil, then stir in the rice until glossy.' },
      { text: 'Add warm stock one ladle at a time, stirring until absorbed.' },
      { text: 'Fold in parmesan, lemon zest, lemon juice, and parsley before serving.' }
    ],
    tags: ['vegetarian', 'weeknight', 'metric'],
    importMode: 'manual'
  });

  await createRecipe({
    title: 'Spiced Tomato Chickpeas',
    shortDescription: 'A fast pantry recipe with warm spices, chickpeas, and tomatoes.',
    imageUrl:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
    activeTimeMinutes: 15,
    totalTimeMinutes: 25,
    ingredients: [
      { name: 'Cooked chickpeas', quantity: '480', unit: 'g', notes: 'drained' },
      { name: 'Crushed tomatoes', quantity: '400', unit: 'g', notes: '' },
      { name: 'Ground cumin', quantity: '2', unit: 'tsp', notes: '' },
      { name: 'Baby spinach', quantity: '100', unit: 'g', notes: '' }
    ],
    steps: [
      { text: 'Toast cumin and paprika in olive oil for 30 seconds.' },
      { text: 'Add tomatoes and chickpeas, then simmer until slightly thickened.' },
      { text: 'Stir through spinach and season with salt, pepper, and lemon.' }
    ],
    tags: ['vegan', 'quick', 'pantry'],
    importMode: 'manual'
  });
}
