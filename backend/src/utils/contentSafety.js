import { badRequest } from '../errors.js';

// Server-side guard for imported recipe content. The AI prompts already ask the
// model to reject non-food content, but this runs after the model (and on
// verbatim imports that never see a model) so prompt injection or a poisoned
// source page cannot smuggle dangerous "recipes" into the library.
const BLOCKED_PATTERNS = [
  // Explosives / incendiaries
  /\bexplosives?\b/,
  /\bgun\s?powder\b/,
  /\bblack\s?powder\b/,
  /\bflash\s?powder\b/,
  /\bthermite\b/,
  /\bnapalm\b/,
  /\bnitroglycerin\b/,
  /\btnt\b/,
  /\bdynamite\b/,
  /\bdetonat(?:or|ion|e)\b/,
  /\bpipe\s?bombs?\b/,
  /\bmolotov\b/,
  /\bgrenades?\b/,
  /\bammonium\s+nitrate\b/,
  /\banfo\b/,
  /\bsemtex\b/,
  /\bc-?4\s+(?:explosive|charge)\b/,
  // Weapons
  /\bsilencers?\b/,
  /\bghost\s?guns?\b/,
  /\bzip\s?guns?\b/,
  /\bfirearms?\b/,
  /\bammunition\b/,
  // Drugs / synthesis
  /\bmethamphetamine\b/,
  /\bcrystal\s?meth\b/,
  /\bcocaine\b/,
  /\bheroin\b/,
  /\bfentanyl\b/,
  /\bmdma\b/,
  /\becstasy\b/,
  /\blsd\b/,
  /\bpsilocybin\s+extraction\b/,
  /\bdmt\b/,
  /\bghb\b/,
  /\bpcp\b/,
  /\bamphetamines?\b/,
  /\bopium\b/,
  /\bdrug\s+synthesis\b/,
  // Poisons / chemical & biological agents
  /\bricin\b/,
  /\bcyanide\b/,
  /\bsarin\b/,
  /\bnerve\s+agents?\b/,
  /\bmustard\s+gas\b/,
  /\bchlorine\s+gas\b/,
  /\bphosgene\b/,
  /\banthrax\b/,
  /\bbotulinum\b/,
  /\bstrychnine\b/,
  /\barsenic\b/,
  /\bpoisons?\b/,
  // Known harmful-instruction sources
  /\banarchist\s+cookbook\b/,
  // Prompt-injection tells that survived into recipe content
  /\bignore\s+(?:all\s+)?previous\s+instructions\b/,
  /\bdisregard\s+(?:all\s+)?(?:previous|prior)\s+instructions\b/,
  /\bsystem\s+prompt\b/,
  /\byou\s+are\s+now\s+(?:a|an|in)\b/,
  /\bdo\s+anything\s+now\b/,
  /\bjailbreak\b/,
  /\breveal\s+(?:your|the)\s+(?:secret|api\s+key|prompt)\b/
];

function recipeTextForScreening(recipe) {
  const parts = [
    recipe?.title,
    recipe?.shortDescription,
    ...(recipe?.ingredients || []).flatMap((item) => [item?.name, item?.notes, item?.originalText]),
    ...(recipe?.steps || []).map((step) => step?.text),
    ...(recipe?.tags || []).map((tag) => (typeof tag === 'string' ? tag : tag?.name))
  ];

  for (const translation of Object.values(recipe?.translations || {})) {
    parts.push(translation?.title, translation?.shortDescription);
    parts.push(...(translation?.ingredients || []).flatMap((item) => [item?.name, item?.notes]));
    parts.push(...(translation?.steps || []).map((step) => step?.text));
  }

  return parts.filter(Boolean).join('\n').toLowerCase();
}

export function findUnsafeRecipeContent(recipe) {
  const text = recipeTextForScreening(recipe);
  if (!text) return null;
  const match = BLOCKED_PATTERNS.find((pattern) => pattern.test(text));
  return match ? String(match) : null;
}

export function assertRecipeContentSafety(recipe) {
  if (findUnsafeRecipeContent(recipe)) {
    throw badRequest(
      'This import was rejected: the content does not look like a safe, edible food recipe.'
    );
  }
}
