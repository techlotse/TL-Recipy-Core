const ML_PER_CUP = 240;

// Volume units in milliliters.
const VOLUME_UNITS = {
  cup: ML_PER_CUP,
  cups: ML_PER_CUP,
  c: ML_PER_CUP,
  tasse: 250,
  tassen: 250,
  tablespoon: 15,
  tablespoons: 15,
  tbsp: 15,
  tbs: 15,
  tb: 15,
  el: 15,
  teaspoon: 5,
  teaspoons: 5,
  tsp: 5,
  ts: 5,
  tl: 5,
  'fl oz': 29.57,
  floz: 29.57,
  'fluid ounce': 29.57,
  'fluid ounces': 29.57,
  pint: 473,
  pints: 473,
  pt: 473,
  quart: 946,
  quarts: 946,
  qt: 946,
  gallon: 3785,
  gallons: 3785,
  gal: 3785,
  liter: 1000,
  liters: 1000,
  litre: 1000,
  litres: 1000,
  l: 1000,
  dl: 100,
  cl: 10,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  millilitre: 1,
  millilitres: 1
};

// Already-metric volume units we leave alone for non-liquids without density data.
const METRIC_VOLUME_UNITS = new Set(['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres']);

// Weight units in grams.
const WEIGHT_UNITS = {
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.6,
  lbs: 453.6,
  pound: 453.6,
  pounds: 453.6
};

const METRIC_WEIGHT_UNITS = new Set(['g', 'gram', 'grams', 'gramm', 'kg', 'kilogram', 'kilograms', 'mg']);

// Approximate densities in grams per US cup for common dry/solid ingredients.
// Order matters: more specific phrases must come before generic ones.
const DENSITIES_PER_CUP = [
  { match: ['almond flour', 'ground almond', 'almond meal', 'gemahlene mandeln'], gramsPerCup: 96 },
  { match: ['bread flour', 'brotmehl'], gramsPerCup: 127 },
  { match: ['whole wheat flour', 'wholemeal flour', 'vollkornmehl'], gramsPerCup: 130 },
  { match: ['cake flour'], gramsPerCup: 114 },
  { match: ['rye flour', 'roggenmehl'], gramsPerCup: 102 },
  { match: ['flour', 'mehl', 'meel'], gramsPerCup: 120 },
  { match: ['powdered sugar', 'icing sugar', 'confectioners', 'puderzucker', 'versiersuiker'], gramsPerCup: 120 },
  { match: ['brown sugar', 'brauner zucker', 'bruinsuiker'], gramsPerCup: 220 },
  { match: ['caster sugar', 'superfine sugar'], gramsPerCup: 225 },
  { match: ['sugar', 'zucker', 'suiker'], gramsPerCup: 200 },
  { match: ['cocoa', 'kakao'], gramsPerCup: 85 },
  { match: ['desiccated coconut', 'dried coconut', 'shredded coconut', 'coconut flakes', 'kokosraspeln', 'klapper'], gramsPerCup: 85 },
  { match: ['coconut flour', 'kokosmehl'], gramsPerCup: 112 },
  { match: ['rolled oats', 'oats', 'oatmeal', 'haferflocken', 'hawermout'], gramsPerCup: 90 },
  { match: ['cornstarch', 'corn starch', 'cornflour', 'speisestärke', 'maizena'], gramsPerCup: 120 },
  { match: ['cornmeal', 'polenta'], gramsPerCup: 160 },
  { match: ['breadcrumbs', 'bread crumbs', 'semmelbrösel', 'paneermehl', 'broodkrummels'], gramsPerCup: 110 },
  { match: ['parmesan', 'grated cheese', 'geriebener käse'], gramsPerCup: 100 },
  { match: ['shredded cheese', 'cheese'], gramsPerCup: 113 },
  { match: ['butter', 'margarine', 'botter'], gramsPerCup: 227 },
  { match: ['shortening', 'lard', 'schmalz'], gramsPerCup: 205 },
  { match: ['peanut butter', 'nut butter', 'erdnussbutter', 'grondboontjiebotter'], gramsPerCup: 258 },
  { match: ['chocolate chips', 'chocolate chunks', 'schokostückchen', 'sjokoladestukkies'], gramsPerCup: 170 },
  { match: ['raisins', 'sultanas', 'rosinen', 'rosyne'], gramsPerCup: 150 },
  { match: ['dried cranberries', 'dried fruit'], gramsPerCup: 120 },
  { match: ['walnuts', 'pecans', 'walnüsse'], gramsPerCup: 100 },
  { match: ['almonds', 'mandeln', 'amandels'], gramsPerCup: 143 },
  { match: ['cashews', 'peanuts', 'hazelnuts', 'nuts', 'nüsse', 'neute'], gramsPerCup: 130 },
  { match: ['sesame seeds', 'sesam'], gramsPerCup: 144 },
  { match: ['chia seeds', 'chiasamen'], gramsPerCup: 170 },
  { match: ['flax seeds', 'flaxseed', 'linseed', 'leinsamen'], gramsPerCup: 168 },
  { match: ['sunflower seeds', 'sonnenblumenkerne'], gramsPerCup: 140 },
  { match: ['rice', 'reis', 'rys'], gramsPerCup: 185 },
  { match: ['quinoa'], gramsPerCup: 170 },
  { match: ['couscous'], gramsPerCup: 175 },
  { match: ['lentils', 'linsen', 'lensies'], gramsPerCup: 192 },
  { match: ['dried beans', 'beans', 'bohnen', 'bone'], gramsPerCup: 184 },
  { match: ['chickpeas', 'kichererbsen'], gramsPerCup: 200 },
  { match: ['semolina', 'grieß'], gramsPerCup: 167 },
  { match: ['salt', 'salz', 'sout'], gramsPerCup: 273 },
  { match: ['baking powder', 'backpulver', 'bakpoeier'], gramsPerCup: 230 },
  { match: ['baking soda', 'bicarbonate', 'natron', 'koeksoda'], gramsPerCup: 220 },
  { match: ['yeast', 'hefe', 'gis'], gramsPerCup: 150 },
  { match: ['gelatin', 'gelatine'], gramsPerCup: 150 }
];

// Ingredients measured by volume that should stay liquid milliliters.
const LIQUID_KEYWORDS = [
  'water', 'wasser',
  'milk', 'milch', 'melk', 'buttermilk', 'buttermilch', 'karringmelk',
  'cream', 'sahne', 'rahm', 'room', 'crème',
  'oil', 'öl', 'olie',
  'juice', 'saft', 'sap',
  'broth', 'stock', 'brühe', 'bouillon', 'fond', 'aftreksel',
  'wine', 'wein', 'wyn',
  'beer', 'bier',
  'vinegar', 'essig', 'asyn',
  'honey', 'honig', 'heuning',
  'syrup', 'sirup', 'stroop', 'molasses',
  'sauce', 'soße', 'sous', 'soy', 'sojasauce',
  'coffee', 'kaffee', 'koffie',
  'tea', 'tee', 'tee',
  'liqueur', 'likör', 'rum', 'brandy', 'whisky', 'vodka',
  'coconut milk', 'kokosmilch', 'klappermelk',
  'yogurt', 'yoghurt', 'joghurt',
  'egg white', 'eiweiß',
  'extract', 'extrakt', 'essence', 'aroma'
];

const UNICODE_FRACTIONS = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875
};

export function parseQuantity(value) {
  let text = String(value ?? '').trim().toLowerCase();
  if (!text) return null;

  // Replace unicode fractions, e.g. "1½" or "½".
  let unicodeExtra = 0;
  for (const [symbol, fraction] of Object.entries(UNICODE_FRACTIONS)) {
    if (text.includes(symbol)) {
      unicodeExtra += fraction;
      text = text.replace(symbol, '').trim();
    }
  }
  if (!text) return unicodeExtra || null;

  // Ranges ("1-2", "1 to 2") are ambiguous; do not convert.
  if (/\d\s*(?:-|–|to|bis)\s*\d/.test(text)) return null;

  // Mixed fraction "1 1/2".
  const mixed = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]) + unicodeExtra;

  // Simple fraction "1/2".
  const fraction = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]) + unicodeExtra;

  // Decimal with comma or dot.
  const numeric = text.replace(',', '.');
  if (/^\d+(\.\d+)?$/.test(numeric)) return Number(numeric) + unicodeExtra;

  return null;
}

function normalizeUnit(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ');
}

export function isLiquidIngredient(name) {
  const haystack = ` ${String(name || '').toLowerCase()} `;
  return LIQUID_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

export function densityForIngredient(name) {
  const haystack = String(name || '').toLowerCase();
  if (!haystack) return null;
  for (const entry of DENSITIES_PER_CUP) {
    if (entry.match.some((keyword) => haystack.includes(keyword))) return entry.gramsPerCup;
  }
  return null;
}

export function formatMetricQuantity(value) {
  if (!Number.isFinite(value)) return '';
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return String(rounded);
}

function buildResult(ingredient, quantity, unit) {
  const changed = quantity !== ingredient.quantity || unit !== ingredient.unit;
  if (!changed) return ingredient;

  return {
    ...ingredient,
    quantity,
    unit,
    originalQuantity: ingredient.originalQuantity || ingredient.quantity,
    originalUnit: ingredient.originalUnit || ingredient.unit
  };
}

/**
 * Convert one ingredient to sensible metric units:
 * - liquid ingredients measured by volume -> milliliters
 * - dry/solid ingredients measured by volume -> grams via per-ingredient density
 * - imperial weights -> grams
 * If the source quantity cannot be parsed safely, the ingredient is returned unchanged.
 * When the import preserved the pre-conversion measurement in originalQuantity/originalUnit,
 * that source value is used so density mistakes made upstream are corrected.
 */
export function convertIngredientToMetric(ingredient) {
  if (!ingredient || typeof ingredient !== 'object') return ingredient;

  // Prefer the recorded original (pre-conversion) measurement when it is a
  // convertible volume: it lets us recompute weights with the right density.
  const originalUnit = normalizeUnit(ingredient.originalUnit);
  const originalQuantity = parseQuantity(ingredient.originalQuantity);
  const useOriginal =
    originalQuantity !== null &&
    originalUnit &&
    VOLUME_UNITS[originalUnit] !== undefined &&
    !METRIC_VOLUME_UNITS.has(originalUnit);

  const unit = useOriginal ? originalUnit : normalizeUnit(ingredient.unit);
  const quantity = useOriginal ? originalQuantity : parseQuantity(ingredient.quantity);
  if (quantity === null || !unit) return ingredient;

  // Imperial weight -> grams.
  if (WEIGHT_UNITS[unit] !== undefined) {
    const grams = quantity * WEIGHT_UNITS[unit];
    return buildResult(ingredient, formatMetricQuantity(grams), 'g');
  }

  // Metric weight stays as-is.
  if (METRIC_WEIGHT_UNITS.has(unit)) return ingredient;

  if (VOLUME_UNITS[unit] === undefined) return ingredient;

  const milliliters = quantity * VOLUME_UNITS[unit];
  const liquid = isLiquidIngredient(ingredient.name);

  if (!liquid) {
    const gramsPerCup = densityForIngredient(ingredient.name);
    if (gramsPerCup) {
      const grams = (milliliters / ML_PER_CUP) * gramsPerCup;
      return buildResult(ingredient, formatMetricQuantity(grams), 'g');
    }
  }

  // Liquids and unknown-density solids become milliliters (already-ml stays unchanged).
  if (METRIC_VOLUME_UNITS.has(unit)) return ingredient;
  return buildResult(ingredient, formatMetricQuantity(milliliters), 'ml');
}

export function convertIngredientsToMetric(ingredients) {
  return (ingredients || []).map(convertIngredientToMetric);
}
