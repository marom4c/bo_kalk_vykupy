import { describe, expect, it } from 'vitest';
import { calculate, computeScenario, verdictFor } from './calculate';
import { BRANCH_POSITION_TABLE, getBranchPositionRow } from './constants';
import { CalculatorInputs } from './types';

/** Referenční vstupy z části 12.2 zadání. */
const REFERENCE_INPUTS: CalculatorInputs = {
  branchPosition: 1,
  brokerCommissionRatePct: 29,
  isCooperative: false,
  purchasePrice: 1_000_000,
  guaranteedSalePrice: 1_400_000,
  marketSalePrice: 1_600_000,
  hasReconstruction: true,
  reconstructionCost: 100_000,
  buyoutCost: 50_000,
  monthlyOperatingCost: 10_000,
  reconstructionDays: 30,
  saleDays: 60,
};

describe('6.1 tabulka pozic pobočky', () => {
  it('přesně odpovídá zadání', () => {
    expect(BRANCH_POSITION_TABLE.map((r) => [r.position, r.monthlyEfficiency, r.rkShare, r.investorShare])).toEqual([
      [1, 0.0188, 0.666, 0.334],
      [2, 0.0182, 0.7, 0.3],
      [3, 0.0177, 0.75, 0.25],
      [4, 0.0174, 0.8, 0.2],
      [5, 0.0172, 0.85, 0.15],
      [6, 0.017, 0.9, 0.1],
    ]);
  });

  it('podíl RK a investora dává vždy 100 %', () => {
    for (const row of BRANCH_POSITION_TABLE) {
      expect(Math.round((row.rkShare + row.investorShare) * 1000) / 1000).toBe(1);
    }
  });
});

describe('12.1 STING referenční aritmetika (bez BO financování)', () => {
  // Družstevní + nulová doba → cadastralDays 0, roundedMonths 0, žádné financování.
  // combinedCost 525 000 je zadán jako náklady na výkup v měsíci 0.
  const inputs: CalculatorInputs = {
    branchPosition: 1,
    brokerCommissionRatePct: 0,
    isCooperative: true,
    purchasePrice: 5_000_000,
    guaranteedSalePrice: 4_000_000,
    marketSalePrice: 4_700_000,
    hasReconstruction: false,
    reconstructionCost: 0,
    buyoutCost: 525_000,
    monthlyOperatingCost: 0,
    reconstructionDays: 0,
    saleDays: 0,
  };
  const result = calculate(inputs);

  it('nemá žádné finanční náklady', () => {
    expect(result.timeline.totalFinancingCost).toBe(0);
    expect(result.totalDirectCost).toBe(5_525_000);
  });

  it('garantovaný scénář', () => {
    const g = result.guaranteed;
    expect(g.grossBuyoutProfit).toBe(-1_525_000);
    expect(g.grossMarginPct).toBeCloseTo(-38.125, 6);
    expect(g.brokerageCommissionInclVat).toBe(120_000);
    expect(g.brokerageCommissionExclVat).toBe(99_173.55);
    expect(g.totalProfit).toBe(-1_545_826.45);
    expect(g.verdict).toBe('NEVYCHÁZÍ');
  });

  it('tržní scénář', () => {
    const m = result.market;
    expect(m.grossBuyoutProfit).toBe(-825_000);
    expect(m.grossMarginPct).toBeCloseTo(-17.5532, 4);
    expect(m.brokerageCommissionInclVat).toBe(141_000);
    expect(m.brokerageCommissionExclVat).toBe(116_528.93);
    expect(m.totalProfit).toBe(-849_471.07);
    expect(m.verdict).toBe('NEVYCHÁZÍ');
  });
});

describe('12.2 BO časová logika a oprava kupní ceny', () => {
  const result = calculate(REFERENCE_INPUTS);
  const tl = result.timeline;

  it('celková doba a měsíce', () => {
    expect(tl.cadastralDays).toBe(21);
    expect(tl.totalDays).toBe(111);
    expect(tl.actualMonths).toBeCloseTo(3.7, 12);
    expect(tl.roundedMonths).toBe(4);
    expect(tl.chargedMonthlyCount).toBe(5);
    expect(result.totalMonthlyOperatingCost).toBe(50_000);
  });

  it('rekonstrukce je rozložena do měsíců 1 a 2 po 50 000', () => {
    expect(tl.reconstructionMonthCount).toBe(2);
    expect(tl.months[0].reconstructionOutflow).toBe(0);
    expect(tl.months[1].reconstructionOutflow).toBe(50_000);
    expect(tl.months[2].reconstructionOutflow).toBe(50_000);
    expect(tl.months[3].reconstructionOutflow).toBe(0);
  });

  it('kupní cena je přímý výdaj pouze v měsíci 0', () => {
    expect(tl.months[0].purchaseOutflow).toBe(1_000_000);
    for (let t = 1; t <= 24; t++) {
      expect(tl.months[t].purchaseOutflow).toBe(0);
    }
    expect(result.totalDirectCost).toBe(1_200_000);
  });

  it('frakce měsíců', () => {
    expect(tl.months.map((m) => m.fraction).slice(0, 6)).toEqual([1, 1, 1, 1, 0.7, 0]);
  });

  it('finanční náklady', () => {
    expect(tl.purchaseFinancingCostTotal).toBe(69_560);
    expect(tl.otherFinancingCostTotal).toBe(11_844);
    expect(tl.totalFinancingCost).toBe(81_404);
  });

  it('garantovaný scénář', () => {
    const g = result.guaranteed;
    expect(g.buyoutProfitAfterFinancing).toBe(118_596);
    expect(g.brokerageCommissionInclVat).toBe(42_000);
    expect(g.brokerageCommissionExclVat).toBe(34_710.74);
    expect(g.propertyProfit).toBe(76_596);
    expect(g.totalProfit).toBe(111_306.74);
    expect(g.verdict).toBe('VYCHÁZÍ');
  });

  it('tržní scénář', () => {
    const m = result.market;
    expect(m.buyoutProfitAfterFinancing).toBe(318_596);
    expect(m.brokerageCommissionInclVat).toBe(48_000);
    expect(m.brokerageCommissionExclVat).toBe(39_669.42);
    expect(m.propertyProfit).toBe(270_596);
    expect(m.totalProfit).toBe(310_265.42);
    expect(m.verdict).toBe('VYCHÁZÍ');
  });

  it('selže, pokud by byla kupní cena odečtena znovu v měsících 1–4', () => {
    // Excelová chyba by odečetla kupní cenu v každém aktivním měsíci (5×).
    const wrongDirectCost = result.totalDirectCost + 4 * REFERENCE_INPUTS.purchasePrice;
    expect(result.totalDirectCost).not.toBe(wrongDirectCost);
    expect(result.guaranteed.grossBuyoutProfit).toBe(REFERENCE_INPUTS.guaranteedSalePrice - 1_200_000);
  });
});

describe('12.3 rozdělení zisku referenčního testu', () => {
  const result = calculate(REFERENCE_INPUTS);

  it('garantovaný scénář', () => {
    const g = result.guaranteed;
    expect(g.rkShareAmount).toBe(74_130.29);
    expect(g.investorShareAmount).toBe(37_176.45);
    expect(g.brokerCommissionAmount).toBe(21_497.78);
    expect(g.rkAfterBrokerCommission).toBe(52_632.51);
  });

  it('tržní scénář', () => {
    const m = result.market;
    expect(m.rkShareAmount).toBe(206_636.77);
    expect(m.investorShareAmount).toBe(103_628.65);
    expect(m.brokerCommissionAmount).toBe(59_924.66);
    expect(m.rkAfterBrokerCommission).toBe(146_712.11);
  });

  it('součet podílů RK a investora se přesně rovná totalProfit', () => {
    for (const s of [result.guaranteed, result.market]) {
      expect(Math.round((s.rkShareAmount + s.investorShareAmount) * 100)).toBe(Math.round(s.totalProfit * 100));
    }
  });
});

describe('12.4 družstevní vlastnictví bez rekonstrukce', () => {
  const base: CalculatorInputs = {
    branchPosition: 1,
    brokerCommissionRatePct: 29,
    isCooperative: true,
    purchasePrice: 1_000_000,
    guaranteedSalePrice: 1_210_000,
    marketSalePrice: 1_210_000,
    hasReconstruction: false,
    reconstructionCost: 0,
    buyoutCost: 0,
    monthlyOperatingCost: 0,
    reconstructionDays: 0,
    saleDays: 0,
  };

  it('družstevní', () => {
    const r = calculate(base);
    expect(r.timeline.cadastralDays).toBe(0);
    expect(r.timeline.totalFinancingCost).toBe(0);
    expect(r.guaranteed.totalProfit).toBe(203_700);
    expect(r.timeline.months.every((m) => m.reconstructionOutflow === 0)).toBe(true);
  });

  it('nedružstevní', () => {
    const r = calculate({ ...base, isCooperative: false });
    expect(r.timeline.cadastralDays).toBe(21);
    expect(r.timeline.actualMonths).toBeCloseTo(0.7, 12);
    expect(r.timeline.roundedMonths).toBe(1);
    expect(r.timeline.totalFinancingCost).toBe(13_160);
    expect(r.guaranteed.totalProfit).toBe(190_540);
  });
});

describe('12.5 hraniční stav verdiktu', () => {
  it('0,01 Kč → VYCHÁZÍ, 0 → NEVYCHÁZÍ, -0,01 → NEVYCHÁZÍ', () => {
    expect(verdictFor(0.01)).toBe('VYCHÁZÍ');
    expect(verdictFor(0)).toBe('NEVYCHÁZÍ');
    expect(verdictFor(-0.01)).toBe('NEVYCHÁZÍ');
  });

  it('scénář s totalProfit přesně 0,01 / 0,00 / -0,01', () => {
    const position = getBranchPositionRow(1);
    const make = (totalDirectCost: number) =>
      computeScenario({
        kind: 'guaranteed',
        salePrice: 1_000_000,
        purchasePrice: 900_000,
        totalDirectCost,
        totalFinancingCost: 0,
        position,
        brokerCommissionRatePct: 29,
      });
    // totalProfit = sale - direct - 30 000 + 24 793.39 = 994 793.39 - direct
    expect(make(994_793.38).totalProfit).toBe(0.01);
    expect(make(994_793.38).verdict).toBe('VYCHÁZÍ');
    expect(make(994_793.39).totalProfit).toBe(0);
    expect(make(994_793.39).verdict).toBe('NEVYCHÁZÍ');
    expect(make(994_793.4).totalProfit).toBe(-0.01);
    expect(make(994_793.4).verdict).toBe('NEVYCHÁZÍ');
  });
});

describe('8.5 záporné částky rozdělení se neořezávají', () => {
  it('záporný totalProfit se rozdělí záporně', () => {
    const r = calculate({ ...REFERENCE_INPUTS, guaranteedSalePrice: 1_000_000 });
    expect(r.guaranteed.totalProfit).toBeLessThan(0);
    expect(r.guaranteed.rkShareAmount).toBeLessThan(0);
    expect(r.guaranteed.investorShareAmount).toBeLessThan(0);
    expect(r.guaranteed.brokerCommissionAmount).toBeLessThan(0);
  });
});

describe('8.4 marže vůči prodejní ceně', () => {
  it('odpovídá poměru k prodejní ceně scénáře', () => {
    const r = calculate(REFERENCE_INPUTS);
    expect(r.guaranteed.grossMarginPct).toBeCloseTo((200_000 / 1_400_000) * 100, 10);
    expect(r.guaranteed.propertyNetMarginPct).toBeCloseTo((76_596 / 1_400_000) * 100, 10);
    expect(r.guaranteed.totalNetMarginPct).toBeCloseTo((111_306.74 / 1_400_000) * 100, 10);
  });
});
