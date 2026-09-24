/**
 * Parsování textových vstupů z formuláře.
 *
 * Peněžní parser přijímá desetinnou čárku i tečku nezávisle na prohlížeči
 * a jednoznačně je normalizuje (část 10). Mezery a nezlomitelné mezery
 * (oddělovače tisíců) se ignorují.
 */

export type ParseFailure = 'empty' | 'invalid' | 'tooManyDecimals' | 'notInteger';

export type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: ParseFailure };

const WHITESPACE = /[\s  ']/g;

/**
 * Normalizuje číselný řetězec na tvar s tečkou jako desetinným oddělovačem.
 *
 * Pravidla:
 * - mezery a apostrofy se odstraní,
 * - pokud jsou přítomny čárka i tečka, poslední z nich je desetinný oddělovač
 *   a ostatní výskyty se považují za oddělovače tisíců,
 * - pokud je přítomen jen jeden druh oddělovače, je to desetinný oddělovač.
 */
export function normalizeDecimalString(raw: string): string {
  let s = raw.replace(WHITESPACE, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandSep = decimalSep === ',' ? '.' : ',';
    s = s.split(thousandSep).join('');
    s = s.replace(decimalSep, '.');
  } else if (lastComma >= 0) {
    if (s.indexOf(',') !== lastComma) {
      // více čárek → oddělovače tisíců
      s = s.split(',').join('');
    } else {
      s = s.replace(',', '.');
    }
  } else if (lastDot >= 0 && s.indexOf('.') !== lastDot) {
    // více teček → oddělovače tisíců
    s = s.split('.').join('');
  }

  return s;
}

const DECIMAL_RE = /^-?(\d+)(?:\.(\d*))?$/;

/** Peněžní vstup: nejvýše dvě desetinná místa. Záporné hodnoty se parsují a odmítá je až validace. */
export function parseMoney(raw: string | null | undefined): ParseResult<number> {
  return parseDecimal(raw, 2);
}

/** Procentní vstup: povoleno libovolně desetinných míst (nejméně dvě). */
export function parsePercent(raw: string | null | undefined): ParseResult<number> {
  return parseDecimal(raw, Infinity);
}

export function parseDecimal(raw: string | null | undefined, maxDecimals: number): ParseResult<number> {
  if (raw == null || raw.trim() === '') {
    return { ok: false, reason: 'empty' };
  }
  const s = normalizeDecimalString(raw);
  const m = DECIMAL_RE.exec(s);
  if (!m) {
    return { ok: false, reason: 'invalid' };
  }
  const decimals = m[2] ?? '';
  if (decimals.length > maxDecimals) {
    return { ok: false, reason: 'tooManyDecimals' };
  }
  const value = Number(s.endsWith('.') ? s.slice(0, -1) : s);
  if (!Number.isFinite(value)) {
    return { ok: false, reason: 'invalid' };
  }
  return { ok: true, value };
}

const INTEGER_RE = /^-?\d+$/;

/** Celočíselný vstup (dny). */
export function parseInteger(raw: string | null | undefined): ParseResult<number> {
  if (raw == null || raw.trim() === '') {
    return { ok: false, reason: 'empty' };
  }
  const s = raw.replace(WHITESPACE, '');
  if (!INTEGER_RE.test(s)) {
    if (DECIMAL_RE.test(normalizeDecimalString(s))) {
      return { ok: false, reason: 'notInteger' };
    }
    return { ok: false, reason: 'invalid' };
  }
  return { ok: true, value: Number(s) };
}
