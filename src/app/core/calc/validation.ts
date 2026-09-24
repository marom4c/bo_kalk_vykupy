import { CONSTANTS } from './constants';
import { parseInteger, parseMoney, parsePercent, ParseFailure } from './parse';
import { BRANCH_POSITIONS, BranchPosition, CalculatorInputs } from './types';

/**
 * Validační schéma (část 11).
 *
 * Vstupem jsou surové hodnoty formuláře (řetězce + booleany), výstupem buď
 * validované `CalculatorInputs` s neblokujícími upozorněními, nebo seznam
 * blokujících chyb. Volitelná poznámka do výpočtu nevstupuje.
 */

export interface RawFormValues {
  branchPosition: string;
  brokerCommissionRatePct: string;
  isCooperative: boolean;
  purchasePrice: string;
  guaranteedSalePrice: string;
  marketSalePrice: string;
  hasReconstruction: boolean;
  reconstructionCost: string;
  buyoutCost: string;
  monthlyOperatingCost: string;
  reconstructionDays: string;
  saleDays: string;
  note: string;
}

export type RawFieldKey = keyof RawFormValues;

export type IssueField = RawFieldKey | 'general';

export interface ValidationIssue {
  field: IssueField;
  message: string;
}

export type ValidationResult =
  | { ok: true; inputs: CalculatorInputs; warnings: ValidationIssue[]; errors: [] }
  | { ok: false; inputs: null; warnings: ValidationIssue[]; errors: ValidationIssue[] };

/** Popisky polí pro chybové hlášky. */
export const FIELD_LABELS: Record<RawFieldKey, string> = {
  branchPosition: 'Pozice pobočky dle kariéry výkupů',
  brokerCommissionRatePct: 'Provize makléře dle kariérní pozice [%]',
  isCooperative: 'Družstevní vlastnictví',
  purchasePrice: 'Kupní cena',
  guaranteedSalePrice: 'Nejnižší garantovaná prodejní cena',
  marketSalePrice: 'Aktuální tržní prodejní cena',
  hasReconstruction: 'Výpočet s rekonstrukcí',
  reconstructionCost: 'Náklady na rekonstrukci',
  buyoutCost: 'Náklady na výkup',
  monthlyOperatingCost: 'Měsíční náklady energie nájem služby',
  reconstructionDays: 'Očekávaná doba rekonstrukce',
  saleDays: 'Očekávaná doba prodeje',
  note: 'Poznámka',
};

export const EMPTY_FORM_VALUES: RawFormValues = {
  branchPosition: '',
  brokerCommissionRatePct: '',
  isCooperative: false,
  purchasePrice: '',
  guaranteedSalePrice: '',
  marketSalePrice: '',
  hasReconstruction: false,
  reconstructionCost: '',
  buyoutCost: '',
  monthlyOperatingCost: '',
  reconstructionDays: '',
  saleDays: '',
  note: '',
};

function failureMessage(reason: ParseFailure, kind: 'money' | 'percent' | 'days'): string {
  switch (reason) {
    case 'empty':
      return 'Doplňte hodnotu.';
    case 'tooManyDecimals':
      return 'Peněžní vstup dovoluje nejvýše dvě desetinná místa.';
    case 'notInteger':
      return 'Doba musí být celé číslo dní.';
    case 'invalid':
    default:
      return kind === 'days'
        ? 'Zadejte celé nezáporné číslo dní.'
        : 'Zadejte platné číslo (desetinná čárka i tečka jsou povoleny).';
  }
}

export function validateForm(raw: RawFormValues): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const err = (field: IssueField, message: string) => errors.push({ field, message });
  const warn = (field: IssueField, message: string) => warnings.push({ field, message });

  // ---- Pozice pobočky ------------------------------------------------------
  let branchPosition: BranchPosition | null = null;
  const posRaw = raw.branchPosition.trim();
  if (posRaw === '') {
    err('branchPosition', 'Vyberte pozici pobočky.');
  } else {
    const pos = Number(posRaw);
    if (!Number.isInteger(pos) || !(BRANCH_POSITIONS as readonly number[]).includes(pos)) {
      err('branchPosition', 'Pozice pobočky musí být 1 až 6.');
    } else {
      branchPosition = pos as BranchPosition;
    }
  }

  // ---- Provize makléře ----------------------------------------------------
  let brokerCommissionRatePct: number | null = null;
  const pct = parsePercent(raw.brokerCommissionRatePct);
  if (!pct.ok) {
    err('brokerCommissionRatePct', failureMessage(pct.reason, 'percent'));
  } else if (pct.value < 0 || pct.value > 100) {
    err('brokerCommissionRatePct', 'Procento makléře musí být v intervalu 0 až 100.');
  } else {
    brokerCommissionRatePct = pct.value;
  }

  // ---- Peněžní vstupy -----------------------------------------------------
  const money = (field: RawFieldKey, value: string, opts: { positive?: boolean; optionalZero?: boolean }): number | null => {
    const parsed = parseMoney(value);
    if (!parsed.ok) {
      if (parsed.reason === 'empty' && opts.optionalZero) {
        return 0;
      }
      err(field, failureMessage(parsed.reason, 'money'));
      return null;
    }
    if (parsed.value < 0) {
      err(field, 'Peněžní vstup nesmí být záporný.');
      return null;
    }
    if (opts.positive && parsed.value === 0) {
      err(field, 'Hodnota musí být větší než 0 Kč.');
      return null;
    }
    return parsed.value;
  };

  const purchasePrice = money('purchasePrice', raw.purchasePrice, { positive: true });
  const guaranteedSalePrice = money('guaranteedSalePrice', raw.guaranteedSalePrice, { positive: true });
  const marketSalePrice = money('marketSalePrice', raw.marketSalePrice, { positive: true });
  const buyoutCost = money('buyoutCost', raw.buyoutCost, {});
  const monthlyOperatingCost = money('monthlyOperatingCost', raw.monthlyOperatingCost, {});

  // ---- Rekonstrukce -------------------------------------------------------
  const hasReconstruction = raw.hasReconstruction;
  let reconstructionCost: number | null;
  let reconstructionDays: number | null;

  if (hasReconstruction) {
    reconstructionCost = money('reconstructionCost', raw.reconstructionCost, {});
    reconstructionDays = days('reconstructionDays', raw.reconstructionDays, false);
  } else {
    // Bez rekonstrukce musí být obojí přesně 0 (prázdné pole se považuje za 0).
    reconstructionCost = money('reconstructionCost', raw.reconstructionCost, { optionalZero: true });
    if (reconstructionCost !== null && reconstructionCost !== 0) {
      err('reconstructionCost', 'Bez rekonstrukce nesmí být zadán nenulový rozpočet rekonstrukce.');
      reconstructionCost = null;
    }
    reconstructionDays = days('reconstructionDays', raw.reconstructionDays, true);
    if (reconstructionDays !== null && reconstructionDays !== 0) {
      err('reconstructionDays', 'Bez rekonstrukce nesmí být zadána nenulová doba rekonstrukce.');
      reconstructionDays = null;
    }
  }

  const saleDays = days('saleDays', raw.saleDays, false);

  function days(field: RawFieldKey, value: string, optionalZero: boolean): number | null {
    const parsed = parseInteger(value);
    if (!parsed.ok) {
      if (parsed.reason === 'empty' && optionalZero) {
        return 0;
      }
      err(field, failureMessage(parsed.reason, 'days'));
      return null;
    }
    if (parsed.value < 0) {
      err(field, 'Doba nesmí být záporná.');
      return null;
    }
    return parsed.value;
  }

  // ---- Celková doba -------------------------------------------------------
  if (reconstructionDays !== null && saleDays !== null) {
    const cadastralDays = raw.isCooperative ? CONSTANTS.cadastralDaysCooperative : CONSTANTS.cadastralDaysNonCooperative;
    const totalDays = reconstructionDays + saleDays + cadastralDays;
    const roundedMonths = Math.ceil(totalDays / CONSTANTS.daysPerMonth);
    if (totalDays > CONSTANTS.maxTotalDays || roundedMonths > CONSTANTS.maxMonths) {
      err(
        'general',
        `Celková doba ${totalDays} dní (${roundedMonths} měsíců včetně katastrální lhůty ${cadastralDays} dní) přesahuje limit ${CONSTANTS.maxTotalDays} dní / ${CONSTANTS.maxMonths} měsíců.`
      );
    }
  }

  if (errors.length > 0) {
    return { ok: false, inputs: null, warnings, errors };
  }

  const inputs: CalculatorInputs = {
    branchPosition: branchPosition!,
    brokerCommissionRatePct: brokerCommissionRatePct!,
    isCooperative: raw.isCooperative,
    purchasePrice: purchasePrice!,
    guaranteedSalePrice: guaranteedSalePrice!,
    marketSalePrice: marketSalePrice!,
    hasReconstruction,
    reconstructionCost: reconstructionCost!,
    buyoutCost: buyoutCost!,
    monthlyOperatingCost: monthlyOperatingCost!,
    reconstructionDays: reconstructionDays!,
    saleDays: saleDays!,
  };

  // ---- Neblokující upozornění --------------------------------------------
  if (inputs.marketSalePrice < inputs.guaranteedSalePrice) {
    warn('marketSalePrice', 'Tržní cena je nižší než garantovaná cena.');
  }
  if (inputs.guaranteedSalePrice < inputs.purchasePrice) {
    warn('guaranteedSalePrice', 'Garantovaná prodejní cena je nižší než kupní cena.');
  }
  if (inputs.marketSalePrice < inputs.purchasePrice) {
    warn('marketSalePrice', 'Tržní prodejní cena je nižší než kupní cena.');
  }
  if (inputs.buyoutCost === 0) {
    warn('buyoutCost', 'Náklady na výkup jsou 0 Kč.');
  }
  if (inputs.monthlyOperatingCost === 0) {
    warn('monthlyOperatingCost', 'Měsíční náklady jsou 0 Kč.');
  }
  if (inputs.hasReconstruction && inputs.reconstructionCost === 0) {
    warn('reconstructionCost', 'Rekonstrukce je zapnutá s nulovým rozpočtem.');
  }
  if (inputs.hasReconstruction && inputs.reconstructionDays === 0) {
    warn('reconstructionDays', 'Rekonstrukce je zapnutá s nulovou dobou.');
  }

  return { ok: true, inputs, warnings, errors: [] };
}
