import { describe, expect, it } from 'vitest';
import { dec } from './money';
import {
  buildTimeline,
  computeDuration,
  fractionFor,
  reconstructionActiveFor,
  splitReconstructionInstallments,
} from './timeline';
import { CalculatorInputs } from './types';

const BASE: CalculatorInputs = {
  branchPosition: 1,
  brokerCommissionRatePct: 29,
  isCooperative: false,
  purchasePrice: 1_000_000,
  guaranteedSalePrice: 1_400_000,
  marketSalePrice: 1_600_000,
  hasReconstruction: true,
  reconstructionCost: 100_000.01,
  buyoutCost: 50_000,
  monthlyOperatingCost: 10_000,
  reconstructionDays: 60,
  saleDays: 60,
};

describe('7.1 celková doba', () => {
  it('nedružstevní přidává právě jednu lhůtu 21 dní', () => {
    const d = computeDuration({ isCooperative: false, reconstructionDays: 30, saleDays: 60 });
    expect(d.cadastralDays).toBe(21);
    expect(d.totalDays).toBe(111);
    expect(d.roundedMonths).toBe(4);
  });

  it('družstevní nepřidává nic', () => {
    const d = computeDuration({ isCooperative: true, reconstructionDays: 30, saleDays: 60 });
    expect(d.cadastralDays).toBe(0);
    expect(d.totalDays).toBe(90);
    expect(d.roundedMonths).toBe(3);
  });
});

describe('7.2 frakce měsíce', () => {
  it('plný měsíc, poměrný poslední a nula po konci', () => {
    const a = dec(3.7);
    expect(fractionFor(0, a).toNumber()).toBe(1);
    expect(fractionFor(3, a).toNumber()).toBe(1);
    expect(fractionFor(4, a).toNumber()).toBeCloseTo(0.7, 12);
    expect(fractionFor(5, a).toNumber()).toBe(0);
  });

  it('přesný násobek měsíce nemá poměrný zbytek', () => {
    const a = dec(3);
    expect(fractionFor(3, a).toNumber()).toBe(1);
    expect(fractionFor(4, a).toNumber()).toBe(0);
  });
});

describe('7.4 aktivní měsíce rekonstrukce', () => {
  it('měsíc 0 není aktivní a zahrnuje se jeden dodatečný interval', () => {
    expect(reconstructionActiveFor(0, 60)).toBe(0);
    expect(reconstructionActiveFor(1, 60)).toBe(1);
    expect(reconstructionActiveFor(2, 60)).toBe(1);
    expect(reconstructionActiveFor(3, 60)).toBe(1);
    expect(reconstructionActiveFor(4, 60)).toBe(0);
  });

  it('nulová doba rekonstrukce má jeden aktivní měsíc', () => {
    expect(reconstructionActiveFor(1, 0)).toBe(1);
    expect(reconstructionActiveFor(2, 0)).toBe(0);
  });
});

describe('12.6 haléřové rozdělení rekonstrukce', () => {
  it('rozdělí 100 000,01 Kč na 33 333,33 / 33 333,33 / 33 333,35', () => {
    const parts = splitReconstructionInstallments(100_000.01, 3).map((d) => d.toNumber());
    expect(parts).toEqual([33_333.33, 33_333.33, 33_333.35]);
    expect(Math.round(parts.reduce((a, b) => a + b, 0) * 100)).toBe(10_000_001);
  });

  it('rozpis vstupuje do otherOutflow, kumulovaných nákladů i finančních nákladů', () => {
    const tl = buildTimeline(BASE);
    expect(tl.reconstructionMonthCount).toBe(3);
    expect(tl.months[1].reconstructionOutflow).toBe(33_333.33);
    expect(tl.months[2].reconstructionOutflow).toBe(33_333.33);
    expect(tl.months[3].reconstructionOutflow).toBe(33_333.35);
    expect(tl.months[4].reconstructionOutflow).toBe(0);

    // otherOutflow = buyout(t0) + reko + monthly
    expect(tl.months[0].otherOutflow).toBe(60_000);
    expect(tl.months[1].otherOutflow).toBe(43_333.33);
    expect(tl.months[3].otherOutflow).toBe(43_333.35);

    // kumulace: 60 000 → 103 333,33 → 146 666,66 → 190 000,01
    expect(tl.months[1].cumulativeOtherOutflow).toBe(103_333.33);
    expect(tl.months[2].cumulativeOtherOutflow).toBe(146_666.66);
    expect(tl.months[3].cumulativeOtherOutflow).toBe(190_000.01);

    // finanční náklad z ostatních nákladů v měsíci 3 = e * 190 000,01 * fraction(3) = 0,0188 * 190 000,01
    // totalDays = 141 → 4,7 měsíce → fraction[3] = 1
    expect(tl.months[3].otherFinancingCost).toBe(3_572);
    // měsíc 2: 0,0188 * 146 666,66 = 2 757,333208 → 2 757,33 (na haléře jen pro zobrazení)
    expect(tl.months[2].otherFinancingCost).toBe(2_757.33);
  });

  it('součet splátek přesně odpovídá zadaným nákladům rekonstrukce', () => {
    for (const cost of [0.01, 0.02, 1, 99.99, 100_000.01, 123_456.78]) {
      for (const n of [1, 2, 3, 7, 24]) {
        const parts = splitReconstructionInstallments(cost, n);
        const cents = parts.reduce((acc, p) => acc + BigInt(p.times(100).toFixed(0)), 0n);
        expect(cents).toBe(BigInt(Math.round(cost * 100)));
        expect(parts.length).toBe(n);
      }
    }
  });
});

describe('7.3 měsíční náklady a kupní cena', () => {
  it('účtuje roundedMonths + 1 měsíčních nákladů (42 dní → 3 platby)', () => {
    const tl = buildTimeline({
      ...BASE,
      isCooperative: true,
      hasReconstruction: false,
      reconstructionCost: 0,
      reconstructionDays: 0,
      saleDays: 42,
    });
    expect(tl.roundedMonths).toBe(2);
    expect(tl.chargedMonthlyCount).toBe(3);
    const charged = tl.months.filter((m) => m.monthlyOutflow > 0).length;
    expect(charged).toBe(3);
  });

  it('bez rekonstrukce jsou všechny výdaje rekonstrukce 0', () => {
    const tl = buildTimeline({ ...BASE, hasReconstruction: false, reconstructionCost: 0, reconstructionDays: 0 });
    expect(tl.reconstructionMonthCount).toBe(0);
    expect(tl.months.every((m) => m.reconstructionOutflow === 0 && m.reconstructionActive === 0)).toBe(true);
  });

  it('časová osa má přesně 25 měsíců (0–24)', () => {
    const tl = buildTimeline(BASE);
    expect(tl.months.length).toBe(25);
    expect(tl.months[0].t).toBe(0);
    expect(tl.months[24].t).toBe(24);
  });
});
