import Decimal from 'decimal.js';

/**
 * Decimal aritmetika pro peněžní výpočty.
 *
 * Používáme vlastní klon Decimal.js s vysokou přesností a zaokrouhlováním
 * ROUND_HALF_UP (přesná polovina se zaokrouhlí od nuly), přesně podle části 10.
 */
export const Dec = Decimal.clone({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

export type Dec = Decimal;

export type DecInput = number | string | Decimal;

export function dec(value: DecInput): Dec {
  return new Dec(value);
}

export const ZERO: Dec = new Dec(0);

/** `roundMoney` – zaokrouhlení na dvě desetinná místa (haléře), ROUND_HALF_UP. */
export function roundMoney(value: DecInput): Dec {
  return new Dec(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Převod na číslo pro zobrazení; hodnota se předem zaokrouhlí na haléře. */
export function toMoneyNumber(value: DecInput): number {
  return roundMoney(value).toNumber();
}

/** Převod na celočíselné haléře (bigint). Hodnota musí být předem na haléře. */
export function toCents(value: DecInput): bigint {
  const rounded = roundMoney(value);
  return BigInt(rounded.times(100).toFixed(0));
}

/** Převod z celočíselných haléřů zpět na Decimal. */
export function fromCents(cents: bigint): Dec {
  return new Dec(cents.toString()).div(100);
}

/** Součet Decimal hodnot. */
export function sum(values: Iterable<Dec>): Dec {
  let acc = ZERO;
  for (const v of values) {
    acc = acc.plus(v);
  }
  return acc;
}

/** Procento `part / whole * 100`, nebo `null` když `whole == 0`. Není zaokrouhleno. */
export function percentOf(part: DecInput, whole: DecInput): number | null {
  const w = new Dec(whole);
  if (w.isZero()) {
    return null;
  }
  return new Dec(part).div(w).times(100).toNumber();
}
