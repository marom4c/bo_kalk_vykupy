import { CONSTANTS, getBranchPositionRow } from './constants';
import { dec, percentOf, roundMoney, toMoneyNumber } from './money';
import { buildTimeline } from './timeline';
import {
  BranchPositionRow,
  CalculationResult,
  CalculatorInputs,
  ScenarioKind,
  ScenarioResult,
  Timeline,
  Verdict,
} from './types';

/**
 * Výpočty společné pro oba scénáře (část 8) a sestavení celkového výsledku.
 */

/** 8.1 – celkové přímé náklady (zaokrouhleno na haléře). */
export function computeTotalDirectCost(inputs: CalculatorInputs, roundedMonths: number) {
  const totalMonthlyOperatingCost = dec(inputs.monthlyOperatingCost).times(roundedMonths + 1);
  const reconstructionCost = inputs.hasReconstruction ? inputs.reconstructionCost : 0;
  const totalDirectCost = dec(inputs.purchasePrice)
    .plus(inputs.buyoutCost)
    .plus(reconstructionCost)
    .plus(totalMonthlyOperatingCost);
  return {
    totalMonthlyOperatingCost: toMoneyNumber(totalMonthlyOperatingCost),
    totalDirectCost: toMoneyNumber(totalDirectCost),
  };
}

/** 8.3 – verdikt výhradně ze znaménka `totalProfit`. */
export function verdictFor(totalProfit: number): Verdict {
  return totalProfit > 0 ? 'VYCHÁZÍ' : 'NEVYCHÁZÍ';
}

export interface ScenarioParams {
  kind: ScenarioKind;
  salePrice: number;
  purchasePrice: number;
  /** Zaokrouhlené celkové přímé náklady. */
  totalDirectCost: number;
  /** Zaokrouhlené celkové finanční náklady. */
  totalFinancingCost: number;
  position: BranchPositionRow;
  brokerCommissionRatePct: number;
}

/** 8.2–8.5 – výpočet jednoho scénáře. */
export function computeScenario(p: ScenarioParams): ScenarioResult {
  const salePrice = dec(p.salePrice);

  // 8.2
  const grossBuyoutProfit = roundMoney(salePrice.minus(p.totalDirectCost));
  const buyoutProfitAfterFinancing = roundMoney(grossBuyoutProfit.minus(p.totalFinancingCost));

  // 8.3
  const brokerageCommissionInclVat = roundMoney(salePrice.times(CONSTANTS.brokerageCommissionRate));
  const brokerageCommissionExclVat = roundMoney(brokerageCommissionInclVat.div(CONSTANTS.vatCoefficient));
  const propertyProfit = roundMoney(buyoutProfitAfterFinancing.minus(brokerageCommissionInclVat));
  const realityProfit = brokerageCommissionExclVat;
  const totalProfit = roundMoney(propertyProfit.plus(realityProfit));
  const totalProfitNumber = totalProfit.toNumber();

  // 8.5 – rozdělení až z totalProfit; záporné částky se neořezávají.
  const rkShareAmount = roundMoney(totalProfit.times(p.position.rkShare));
  const investorShareAmount = roundMoney(totalProfit.minus(rkShareAmount));
  const brokerCommissionAmount = roundMoney(rkShareAmount.times(dec(p.brokerCommissionRatePct).div(100)));
  const rkAfterBrokerCommission = roundMoney(rkShareAmount.minus(brokerCommissionAmount));

  return {
    kind: p.kind,
    salePrice: toMoneyNumber(salePrice),
    purchasePrice: toMoneyNumber(p.purchasePrice),
    totalDirectCost: p.totalDirectCost,
    grossBuyoutProfit: grossBuyoutProfit.toNumber(),
    grossMarginPct: percentOf(grossBuyoutProfit, salePrice),
    totalFinancingCost: p.totalFinancingCost,
    buyoutProfitAfterFinancing: buyoutProfitAfterFinancing.toNumber(),
    brokerageCommissionInclVat: brokerageCommissionInclVat.toNumber(),
    brokerageCommissionExclVat: brokerageCommissionExclVat.toNumber(),
    propertyProfit: propertyProfit.toNumber(),
    realityProfit: realityProfit.toNumber(),
    totalProfit: totalProfitNumber,
    propertyNetMarginPct: percentOf(propertyProfit, salePrice),
    totalNetMarginPct: percentOf(totalProfit, salePrice),
    verdict: verdictFor(totalProfitNumber),
    passes: totalProfitNumber > 0,
    rkShareAmount: rkShareAmount.toNumber(),
    investorShareAmount: investorShareAmount.toNumber(),
    brokerCommissionAmount: brokerCommissionAmount.toNumber(),
    rkAfterBrokerCommission: rkAfterBrokerCommission.toNumber(),
  };
}

/** Kompletní deterministický výpočet obou scénářů z validovaných vstupů. */
export function calculate(inputs: CalculatorInputs): CalculationResult {
  const position = getBranchPositionRow(inputs.branchPosition);
  const timeline: Timeline = buildTimeline(inputs);
  const { totalMonthlyOperatingCost, totalDirectCost } = computeTotalDirectCost(inputs, timeline.roundedMonths);

  const common = {
    purchasePrice: inputs.purchasePrice,
    totalDirectCost,
    totalFinancingCost: timeline.totalFinancingCost,
    position,
    brokerCommissionRatePct: inputs.brokerCommissionRatePct,
  };

  return {
    inputs,
    position,
    timeline,
    totalMonthlyOperatingCost,
    totalDirectCost,
    guaranteed: computeScenario({ kind: 'guaranteed', salePrice: inputs.guaranteedSalePrice, ...common }),
    market: computeScenario({ kind: 'market', salePrice: inputs.marketSalePrice, ...common }),
  };
}
