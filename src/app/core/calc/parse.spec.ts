import { describe, expect, it } from 'vitest';
import { normalizeDecimalString, parseInteger, parseMoney, parsePercent } from './parse';

describe('parseMoney – desetinná čárka i tečka', () => {
  it('přijme čárku', () => {
    expect(parseMoney('1234,56')).toEqual({ ok: true, value: 1234.56 });
  });

  it('přijme tečku', () => {
    expect(parseMoney('1234.56')).toEqual({ ok: true, value: 1234.56 });
  });

  it('ignoruje mezery a nezlomitelné mezery jako oddělovače tisíců', () => {
    expect(parseMoney('1 000 000')).toEqual({ ok: true, value: 1_000_000 });
    expect(parseMoney('1 000 000,5')).toEqual({ ok: true, value: 1_000_000.5 });
  });

  it('rozliší oddělovač tisíců od desetinného, když jsou oba', () => {
    expect(parseMoney('1.000.000,25')).toEqual({ ok: true, value: 1_000_000.25 });
    expect(parseMoney('1,000,000.25')).toEqual({ ok: true, value: 1_000_000.25 });
  });

  it('odmítne více než dvě desetinná místa', () => {
    expect(parseMoney('10,001')).toEqual({ ok: false, reason: 'tooManyDecimals' });
    expect(parseMoney('10.001')).toEqual({ ok: false, reason: 'tooManyDecimals' });
  });

  it('odmítne prázdný a neplatný vstup', () => {
    expect(parseMoney('')).toEqual({ ok: false, reason: 'empty' });
    expect(parseMoney('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(parseMoney('abc')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseMoney('12a')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('záporné hodnoty parsuje (odmítá je validace)', () => {
    expect(parseMoney('-5')).toEqual({ ok: true, value: -5 });
  });

  it('normalizace', () => {
    expect(normalizeDecimalString('1 234,5')).toBe('1234.5');
    expect(normalizeDecimalString('1,234,567')).toBe('1234567');
    expect(normalizeDecimalString('1.234.567')).toBe('1234567');
  });
});

describe('parsePercent', () => {
  it('dovolí více desetinných míst', () => {
    expect(parsePercent('29,125')).toEqual({ ok: true, value: 29.125 });
    expect(parsePercent('0')).toEqual({ ok: true, value: 0 });
  });
});

describe('parseInteger – dny', () => {
  it('přijme celé číslo', () => {
    expect(parseInteger('60')).toEqual({ ok: true, value: 60 });
    expect(parseInteger('0')).toEqual({ ok: true, value: 0 });
  });

  it('odmítne desetinné číslo', () => {
    expect(parseInteger('1,5')).toEqual({ ok: false, reason: 'notInteger' });
    expect(parseInteger('1.5')).toEqual({ ok: false, reason: 'notInteger' });
  });

  it('odmítne prázdný a neplatný vstup', () => {
    expect(parseInteger('')).toEqual({ ok: false, reason: 'empty' });
    expect(parseInteger('x')).toEqual({ ok: false, reason: 'invalid' });
  });
});
