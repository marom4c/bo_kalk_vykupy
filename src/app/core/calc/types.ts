/**
 * Typy vstupů a výstupů kalkulačky výkupu BO! reality.
 *
 * Tento modul nemá žádné závislosti na UI. Všechny peněžní hodnoty ve výstupech
 * jsou již zaokrouhlené na haléře (ROUND_HALF_UP) podle části 10 zadání, pokud
 * není u položky výslovně uvedeno jinak.
 */

/** Pozice pobočky dle kariéry výkupů (1–6). */
export type BranchPosition = 1 | 2 | 3 | 4 | 5 | 6;

export const BRANCH_POSITIONS: readonly BranchPosition[] = [1, 2, 3, 4, 5, 6];

/** Řádek tabulky pozic pobočky (část 6.1). */
export interface BranchPositionRow {
  position: BranchPosition;
  /** Měsíční efektivita `e` jako desetinné číslo (1,88 % = 0.0188). */
  monthlyEfficiency: number;
  /** Podíl RK nebo sítě `p` jako desetinné číslo (66,6 % = 0.666). */
  rkShare: number;
  /** Podíl investora `1 - p` jako desetinné číslo. */
  investorShare: number;
}

/** Validované vstupy výpočtu (část 5). */
export interface CalculatorInputs {
  // 5.1 Údaje z profilu a systému
  branchPosition: BranchPosition;
  /** Provize makléře dle kariérní pozice v procentech (0–100). */
  brokerCommissionRatePct: number;

  // 5.2 Vstupy obchodu
  isCooperative: boolean;
  purchasePrice: number;
  guaranteedSalePrice: number;
  marketSalePrice: number;
  hasReconstruction: boolean;
  reconstructionCost: number;
  buyoutCost: number;
  monthlyOperatingCost: number;
  reconstructionDays: number;
  saleDays: number;
}

export type ScenarioKind = 'guaranteed' | 'market';

export type Verdict = 'VYCHÁZÍ' | 'NEVYCHÁZÍ';

/** Jeden měsíc časové osy `t = 0..24` (část 7). */
export interface TimelineMonth {
  t: number;
  /** 1 pokud `t <= roundedMonths`, jinak 0. */
  active: 0 | 1;
  /** Plný nebo poměrný poslední měsíc financování (0–1). */
  fraction: number;
  purchaseOutflow: number;
  buyoutOutflow: number;
  reconstructionActive: 0 | 1;
  reconstructionOutflow: number;
  monthlyOutflow: number;
  otherOutflow: number;
  cumulativeOtherOutflow: number;
  /** Finanční náklad z kupní ceny, interně s plnou přesností; zde na haléře jen pro zobrazení. */
  purchaseFinancingCost: number;
  /** Finanční náklad z kumulovaných ostatních nákladů; zde na haléře jen pro zobrazení. */
  otherFinancingCost: number;
}

/** Výsledek časového modelu a ceny financování (část 7). */
export interface Timeline {
  cadastralDays: number;
  totalDays: number;
  /** `totalDays / 30` – nezaokrouhlené. */
  actualMonths: number;
  /** `ceil(actualMonths)`. */
  roundedMonths: number;
  /** Počet účtovaných měsíčních nákladů = `roundedMonths + 1`. */
  chargedMonthlyCount: number;
  /** Počet aktivních měsíců rekonstrukce `n`. */
  reconstructionMonthCount: number;
  months: TimelineMonth[];
  /** Součet finančních nákladů z kupní ceny, zaokrouhlený na haléře. */
  purchaseFinancingCostTotal: number;
  /** Součet finančních nákladů z kumulovaných ostatních nákladů, zaokrouhlený na haléře. */
  otherFinancingCostTotal: number;
  /** `totalFinancingCost` – součet obou, zaokrouhlený na haléře. */
  totalFinancingCost: number;
}

/** Výsledek jednoho scénáře (část 8). */
export interface ScenarioResult {
  kind: ScenarioKind;
  salePrice: number;
  purchasePrice: number;
  totalDirectCost: number;
  grossBuyoutProfit: number;
  grossMarginPct: number | null;
  totalFinancingCost: number;
  buyoutProfitAfterFinancing: number;
  brokerageCommissionInclVat: number;
  brokerageCommissionExclVat: number;
  propertyProfit: number;
  realityProfit: number;
  totalProfit: number;
  propertyNetMarginPct: number | null;
  totalNetMarginPct: number | null;
  verdict: Verdict;
  /** `true` právě když `totalProfit > 0`. */
  passes: boolean;
  rkShareAmount: number;
  investorShareAmount: number;
  brokerCommissionAmount: number;
  rkAfterBrokerCommission: number;
}

/** Kompletní výsledek výpočtu pro oba scénáře. */
export interface CalculationResult {
  inputs: CalculatorInputs;
  position: BranchPositionRow;
  timeline: Timeline;
  /** Součet měsíčních nákladů `monthlyOperatingCost * (roundedMonths + 1)`. */
  totalMonthlyOperatingCost: number;
  totalDirectCost: number;
  guaranteed: ScenarioResult;
  market: ScenarioResult;
}
