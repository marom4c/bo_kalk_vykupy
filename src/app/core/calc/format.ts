/**
 * Formátování pro UI a PDF (část 10): Kč v českém formátu, procenta na jedno
 * desetinné místo, záporné částky se znaménkem minus.
 */

const czk0 = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const czk2 = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const num = (digits: number) =>
  new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const num0 = num(0);
const num1 = num(1);
const num2 = num(2);
const num4 = num(4);

/** Nahrazuje typografické minus (U+2212) a pomlčky běžným znaménkem minus. */
function normalizeMinus(s: string): string {
  return s.replace(/−/g, '-');
}

/** Hlavní částky na celé Kč. */
export function formatCzk(value: number): string {
  return normalizeMinus(czk0.format(value));
}

/** Detailní částky na dvě desetinná místa. */
export function formatCzk2(value: number): string {
  return normalizeMinus(czk2.format(value));
}

/** Procenta standardně na jedno desetinné místo; `null` → pomlčka. */
export function formatPct(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) {
    return '–';
  }
  const f = digits === 1 ? num1 : digits === 2 ? num2 : digits === 4 ? num4 : num(digits);
  return `${normalizeMinus(f.format(value))} %`;
}

export function formatNumber(value: number, digits = 0): string {
  const f = digits === 0 ? num0 : digits === 1 ? num1 : digits === 2 ? num2 : digits === 4 ? num4 : num(digits);
  return normalizeMinus(f.format(value));
}

export function formatDays(value: number): string {
  return `${formatNumber(value)} ${pluralDays(value)}`;
}

export function pluralDays(n: number): string {
  if (n === 1) return 'den';
  if (n >= 2 && n <= 4) return 'dny';
  return 'dní';
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatBool(value: boolean): string {
  return value ? 'Ano' : 'Ne';
}
