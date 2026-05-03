export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function uniqueStrings(values) {
  const seen = new Set();
  const result = [];

  for (const value of values || []) {
    const cleaned = String(value || '').trim();
    const key = cleaned.toLowerCase();
    if (cleaned && !seen.has(key)) {
      seen.add(key);
      result.push(cleaned);
    }
  }

  return result;
}
