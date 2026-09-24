import { CONSTANTS, getBranchPositionRow } from './constants';
import { Dec, dec, fromCents, roundMoney, toCents, toMoneyNumber, ZERO } from './money';
import { CalculatorInputs, Timeline, TimelineMonth } from './types';

/**
 * Časový model a cena financování (část 7) – BO! model ze skrytého listu
 * `Simulace na dny` s opravou opakovaného účtování kupní ceny.
 */

/** 7.1 – katastrální lhůta podle typu vlastnictví. */
export function cadastralDaysFor(isCooperative: boolean): number {
  return isCooperative ? CONSTANTS.cadastralDaysCooperative : CONSTANTS.cadastralDaysNonCooperative;
}

/** 7.1 – celková doba a měsíce. */
export function computeDuration(inputs: Pick<CalculatorInputs, 'isCooperative' | 'reconstructionDays' | 'saleDays'>) {
  const cadastralDays = cadastralDaysFor(inputs.isCooperative);
  const totalDays = inputs.reconstructionDays + inputs.saleDays + cadastralDays;
  const actualMonths = dec(totalDays).div(CONSTANTS.daysPerMonth);
  const roundedMonths = actualMonths.ceil().toNumber();
  return { cadastralDays, totalDays, actualMonths, roundedMonths };
}

/** 7.2 – `fraction[t] = max(0, t <= actualMonths ? 1 : actualMonths - t + 1)`. */
export function fractionFor(t: number, actualMonths: Dec): Dec {
  if (actualMonths.greaterThanOrEqualTo(t)) {
    return dec(1);
  }
  const partial = actualMonths.minus(t).plus(1);
  return partial.isNegative() ? ZERO : partial;
}

/** 7.4 – `reconstructionActive[t]`. */
export function reconstructionActiveFor(t: number, reconstructionDays: number): 0 | 1 {
  if (t === 0) {
    return 0;
  }
  return CONSTANTS.daysPerMonth * t <= reconstructionDays + CONSTANTS.daysPerMonth ? 1 : 0;
}

/**
 * 7.4 – rozdělení nákladů rekonstrukce na celočíselné haléře.
 *
 * Každý aktivní měsíc kromě posledního dostane `floor(cents / n)`; poslední
 * dostane zbytek. Součet splátek se přesně rovná `reconstructionCost`.
 */
export function splitReconstructionInstallments(reconstructionCost: number, activeCount: number): Dec[] {
  if (activeCount <= 0) {
    return [];
  }
  const totalCents = toCents(reconstructionCost);
  const n = BigInt(activeCount);
  const base = totalCents / n;
  const remainder = totalCents - base * n;
  const installments: Dec[] = [];
  for (let i = 0; i < activeCount; i++) {
    const cents = i === activeCount - 1 ? base + remainder : base;
    installments.push(fromCents(cents));
  }
  return installments;
}

/** Sestaví celou časovou osu `t = 0..24` a spočítá finanční náklady. */
export function buildTimeline(inputs: CalculatorInputs): Timeline {
  const { cadastralDays, totalDays, actualMonths, roundedMonths } = computeDuration(inputs);
  const e = dec(getBranchPositionRow(inputs.branchPosition).monthlyEfficiency);
  const purchasePrice = dec(inputs.purchasePrice);
  const monthlyOperatingCost = dec(inputs.monthlyOperatingCost);
  const buyoutCost = dec(inputs.buyoutCost);

  const reconstructionCost = inputs.hasReconstruction ? inputs.reconstructionCost : 0;
  const reconstructionDays = inputs.hasReconstruction ? inputs.reconstructionDays : 0;

  // Aktivní měsíce rekonstrukce a jejich splátky v haléřích.
  const reconstructionActive: (0 | 1)[] = [];
  for (let t = 0; t <= CONSTANTS.maxMonths; t++) {
    reconstructionActive.push(inputs.hasReconstruction ? reconstructionActiveFor(t, reconstructionDays) : 0);
  }
  const reconstructionMonthCount = reconstructionActive.reduce<number>((acc, a) => acc + a, 0);
  const installments = splitReconstructionInstallments(reconstructionCost, reconstructionMonthCount);

  const months: TimelineMonth[] = [];
  let cumulativeOther = ZERO;
  let purchaseFinancingTotal = ZERO;
  let otherFinancingTotal = ZERO;
  let installmentIndex = 0;

  for (let t = 0; t <= CONSTANTS.maxMonths; t++) {
    const active: 0 | 1 = t <= roundedMonths ? 1 : 0;
    const fraction = fractionFor(t, actualMonths);

    const purchaseOutflow = t === 0 ? purchasePrice : ZERO;
    const buyoutOutflow = t === 0 ? buyoutCost : ZERO;
    const monthlyOutflow = active ? monthlyOperatingCost : ZERO;

    let reconstructionOutflow = ZERO;
    if (inputs.hasReconstruction && reconstructionActive[t] === 1) {
      reconstructionOutflow = installments[installmentIndex++] ?? ZERO;
    }

    const otherOutflow = buyoutOutflow.plus(reconstructionOutflow).plus(monthlyOutflow);
    cumulativeOther = cumulativeOther.plus(otherOutflow);

    // 7.6 – finanční náklady se v měsíci 0 neúčtují; interně s plnou přesností.
    const purchaseFinancingCost = t === 0 ? ZERO : e.times(purchasePrice).times(fraction);
    const otherFinancingCost = t === 0 ? ZERO : e.times(cumulativeOther).times(fraction);
    purchaseFinancingTotal = purchaseFinancingTotal.plus(purchaseFinancingCost);
    otherFinancingTotal = otherFinancingTotal.plus(otherFinancingCost);

    months.push({
      t,
      active,
      fraction: fraction.toNumber(),
      purchaseOutflow: toMoneyNumber(purchaseOutflow),
      buyoutOutflow: toMoneyNumber(buyoutOutflow),
      reconstructionActive: reconstructionActive[t],
      reconstructionOutflow: toMoneyNumber(reconstructionOutflow),
      monthlyOutflow: toMoneyNumber(monthlyOutflow),
      otherOutflow: toMoneyNumber(otherOutflow),
      cumulativeOtherOutflow: toMoneyNumber(cumulativeOther),
      purchaseFinancingCost: toMoneyNumber(purchaseFinancingCost),
      otherFinancingCost: toMoneyNumber(otherFinancingCost),
    });
  }

  const totalFinancing = roundMoney(purchaseFinancingTotal.plus(otherFinancingTotal));

  return {
    cadastralDays,
    totalDays,
    actualMonths: actualMonths.toNumber(),
    roundedMonths,
    chargedMonthlyCount: roundedMonths + 1,
    reconstructionMonthCount,
    months,
    purchaseFinancingCostTotal: toMoneyNumber(purchaseFinancingTotal),
    otherFinancingCostTotal: toMoneyNumber(otherFinancingTotal),
    totalFinancingCost: totalFinancing.toNumber(),
  };
}
