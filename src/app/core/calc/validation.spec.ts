import { describe, expect, it } from 'vitest';
import { EMPTY_FORM_VALUES, RawFormValues, validateForm } from './validation';

const VALID: RawFormValues = {
  branchPosition: '1',
  brokerCommissionRatePct: '29',
  isCooperative: false,
  purchasePrice: '1 000 000',
  guaranteedSalePrice: '1400000',
  marketSalePrice: '1600000',
  hasReconstruction: true,
  reconstructionCost: '100000',
  buyoutCost: '50000',
  monthlyOperatingCost: '10000',
  reconstructionDays: '30',
  saleDays: '60',
  note: 'poznámka nevstupuje do výpočtu',
};

function errorFields(raw: RawFormValues): string[] {
  const r = validateForm(raw);
  return r.ok ? [] : r.errors.map((e) => e.field);
}

function warningFields(raw: RawFormValues): string[] {
  return validateForm(raw).warnings.map((w) => w.field);
}

describe('validateForm – blokující validace', () => {
  it('validní vstup projde a vrátí typované hodnoty', () => {
    const r = validateForm(VALID);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.inputs.purchasePrice).toBe(1_000_000);
      expect(r.inputs.branchPosition).toBe(1);
      expect(r.inputs.reconstructionDays).toBe(30);
      expect(r.warnings).toEqual([]);
    }
  });

  it('prázdný formulář hlásí všechny povinné vstupy', () => {
    const fields = errorFields(EMPTY_FORM_VALUES);
    expect(fields).toEqual(
      expect.arrayContaining([
        'branchPosition',
        'brokerCommissionRatePct',
        'purchasePrice',
        'guaranteedSalePrice',
        'marketSalePrice',
        'buyoutCost',
        'monthlyOperatingCost',
        'saleDays',
      ])
    );
  });

  it('záporný peněžní vstup', () => {
    expect(errorFields({ ...VALID, buyoutCost: '-1' })).toEqual(['buyoutCost']);
  });

  it('kupní nebo prodejní cena 0', () => {
    expect(errorFields({ ...VALID, purchasePrice: '0' })).toEqual(['purchasePrice']);
    expect(errorFields({ ...VALID, guaranteedSalePrice: '0' })).toEqual(['guaranteedSalePrice']);
    expect(errorFields({ ...VALID, marketSalePrice: '0,00' })).toEqual(['marketSalePrice']);
  });

  it('procento makléře mimo 0–100', () => {
    expect(errorFields({ ...VALID, brokerCommissionRatePct: '100,01' })).toEqual(['brokerCommissionRatePct']);
    expect(errorFields({ ...VALID, brokerCommissionRatePct: '-0,5' })).toEqual(['brokerCommissionRatePct']);
    expect(errorFields({ ...VALID, brokerCommissionRatePct: '100' })).toEqual([]);
    expect(errorFields({ ...VALID, brokerCommissionRatePct: '0' })).toEqual([]);
  });

  it('pozice pobočky mimo 1–6', () => {
    expect(errorFields({ ...VALID, branchPosition: '7' })).toEqual(['branchPosition']);
    expect(errorFields({ ...VALID, branchPosition: '0' })).toEqual(['branchPosition']);
    expect(errorFields({ ...VALID, branchPosition: '' })).toEqual(['branchPosition']);
  });

  it('doba není celé nezáporné číslo', () => {
    expect(errorFields({ ...VALID, saleDays: '1,5' })).toEqual(['saleDays']);
    expect(errorFields({ ...VALID, saleDays: '-1' })).toEqual(['saleDays']);
    expect(errorFields({ ...VALID, reconstructionDays: 'x' })).toEqual(['reconstructionDays']);
  });

  it('limit 720 dní / 24 měsíců', () => {
    // 699 + 21 = 720 dní = 24 měsíců → OK
    expect(errorFields({ ...VALID, reconstructionDays: '0', saleDays: '699' })).toEqual([]);
    // 700 + 21 = 721 dní → 25 měsíců → chyba
    expect(errorFields({ ...VALID, reconstructionDays: '0', saleDays: '700' })).toEqual(['general']);
    // družstevní 720 dní → OK, 721 → chyba
    expect(errorFields({ ...VALID, isCooperative: true, reconstructionDays: '0', saleDays: '720' })).toEqual([]);
    expect(errorFields({ ...VALID, isCooperative: true, reconstructionDays: '0', saleDays: '721' })).toEqual(['general']);
  });

  it('bez rekonstrukce nesmí být nenulový rozpočet ani doba', () => {
    expect(errorFields({ ...VALID, hasReconstruction: false, reconstructionCost: '1', reconstructionDays: '0' })).toEqual([
      'reconstructionCost',
    ]);
    expect(errorFields({ ...VALID, hasReconstruction: false, reconstructionCost: '0', reconstructionDays: '5' })).toEqual([
      'reconstructionDays',
    ]);
  });

  it('bez rekonstrukce jsou prázdná pole rekonstrukce považována za 0', () => {
    const r = validateForm({ ...VALID, hasReconstruction: false, reconstructionCost: '', reconstructionDays: '' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.inputs.reconstructionCost).toBe(0);
      expect(r.inputs.reconstructionDays).toBe(0);
    }
  });

  it('s rekonstrukcí jsou rozpočet i doba povinné', () => {
    expect(errorFields({ ...VALID, reconstructionCost: '', reconstructionDays: '' })).toEqual([
      'reconstructionCost',
      'reconstructionDays',
    ]);
  });

  it('více než dvě desetinná místa u peněz', () => {
    expect(errorFields({ ...VALID, purchasePrice: '1000,005' })).toEqual(['purchasePrice']);
  });
});

describe('validateForm – neblokující upozornění', () => {
  it('tržní cena nižší než garantovaná', () => {
    expect(warningFields({ ...VALID, marketSalePrice: '1300000' })).toEqual(['marketSalePrice']);
  });

  it('prodejní ceny nižší než kupní', () => {
    expect(warningFields({ ...VALID, guaranteedSalePrice: '900000', marketSalePrice: '950000' })).toEqual(
      expect.arrayContaining(['guaranteedSalePrice', 'marketSalePrice'])
    );
  });

  it('nulové náklady na výkup a měsíční náklady', () => {
    expect(warningFields({ ...VALID, buyoutCost: '0', monthlyOperatingCost: '0' })).toEqual([
      'buyoutCost',
      'monthlyOperatingCost',
    ]);
  });

  it('rekonstrukce s nulovým rozpočtem či dobou', () => {
    expect(warningFields({ ...VALID, reconstructionCost: '0', reconstructionDays: '0' })).toEqual([
      'reconstructionCost',
      'reconstructionDays',
    ]);
  });

  it('upozornění neblokují výpočet', () => {
    const r = validateForm({ ...VALID, buyoutCost: '0' });
    expect(r.ok).toBe(true);
    expect(r.warnings.length).toBe(1);
  });
});
