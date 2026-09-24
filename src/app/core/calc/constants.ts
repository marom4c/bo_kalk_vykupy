import { BranchPosition, BranchPositionRow } from './types';

/** Verze pravidel výpočtu – zobrazuje se v PDF exportu a v harmonice. */
export const RULES_VERSION = 'BO! výkup v1.0 (finální zadání, 2026)';

/** Tabulka pozice pobočky (část 6.1). */
export const BRANCH_POSITION_TABLE: readonly BranchPositionRow[] = [
  { position: 1, monthlyEfficiency: 0.0188, rkShare: 0.666, investorShare: 0.334 },
  { position: 2, monthlyEfficiency: 0.0182, rkShare: 0.7, investorShare: 0.3 },
  { position: 3, monthlyEfficiency: 0.0177, rkShare: 0.75, investorShare: 0.25 },
  { position: 4, monthlyEfficiency: 0.0174, rkShare: 0.8, investorShare: 0.2 },
  { position: 5, monthlyEfficiency: 0.0172, rkShare: 0.85, investorShare: 0.15 },
  { position: 6, monthlyEfficiency: 0.017, rkShare: 0.9, investorShare: 0.1 },
];

export function getBranchPositionRow(position: BranchPosition): BranchPositionRow {
  const row = BRANCH_POSITION_TABLE.find((r) => r.position === position);
  if (!row) {
    throw new Error(`Neznámá pozice pobočky: ${position}`);
  }
  return row;
}

/** Ostatní konstanty (část 6.2). */
export const CONSTANTS = {
  /** DPH 21 %. */
  vatRate: 0.21,
  /** Koeficient pro odstranění DPH. */
  vatCoefficient: 1.21,
  /** Provize RK 3 % z prodejní ceny scénáře. */
  brokerageCommissionRate: 0.03,
  /** Délka modelového měsíce ve dnech. */
  daysPerMonth: 30,
  /** Katastrální lhůta u nedružstevní nemovitosti. */
  cadastralDaysNonCooperative: 21,
  /** Katastrální lhůta u družstevní nemovitosti. */
  cadastralDaysCooperative: 0,
  /** Nejvyšší podporovaný měsíc. */
  maxMonths: 24,
  /** Nejvyšší podporovaná celková délka ve dnech. */
  maxTotalDays: 720,
} as const;

/** Lidsky čitelný seznam konstant pro harmoniku a PDF. */
export const CONSTANTS_TABLE: readonly { label: string; value: string }[] = [
  { label: 'DPH', value: '21 %' },
  { label: 'Koeficient pro odstranění DPH', value: '1,21' },
  { label: 'Provize RK', value: '3 % z prodejní ceny scénáře' },
  { label: 'Délka modelového měsíce', value: '30 dní' },
  { label: 'Katastrální lhůta u nedružstevní nemovitosti', value: '21 dní' },
  { label: 'Katastrální lhůta u družstevní nemovitosti', value: '0 dní' },
  { label: 'Nejvyšší podporovaný měsíc', value: '24' },
  { label: 'Nejvyšší podporovaná celková délka', value: '720 dní' },
];
