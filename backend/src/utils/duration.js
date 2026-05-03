const UNIT_MINUTES = {
  min: 1,
  mins: 1,
  minute: 1,
  minutes: 1,
  h: 60,
  hr: 60,
  hrs: 60,
  hour: 60,
  hours: 60
};

export function parseIsoDurationToMinutes(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^P(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (!match) return null;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const total = hours * 60 + minutes;
  return Number.isFinite(total) && total > 0 ? total : null;
}

export function parseDurationToMinutes(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : null;

  const iso = parseIsoDurationToMinutes(value);
  if (iso !== null) return iso;

  const text = String(value).toLowerCase();
  let total = 0;
  const matches = text.matchAll(/(\d+(?:[.,]\d+)?)\s*(hours?|hrs?|hr|h|minutes?|mins?|min)\b/g);
  for (const match of matches) {
    const amount = Number(match[1].replace(',', '.'));
    const unit = UNIT_MINUTES[match[2]];
    if (Number.isFinite(amount) && unit) total += amount * unit;
  }

  if (total > 0) return Math.round(total);

  const firstNumber = text.match(/\d+/);
  return firstNumber ? Number(firstNumber[0]) : null;
}

export function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}
