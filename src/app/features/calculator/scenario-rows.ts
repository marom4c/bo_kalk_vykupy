import {
  CalculationResult,
  CONSTANTS,
  formatBool,
  formatCzk,
  formatCzk2,
  formatDays,
  formatNumber,
  formatPct,
  ScenarioResult,
} from '@core/calc';

/**
 * Sestavení lidsky čitelných řádků výsledků scénáře. Jediný zdroj pro
 * výsledkovou kartu v UI i pro PDF export, včetně vzorců s dosazenými hodnotami.
 */

export type RowTone = 'default' | 'strong' | 'muted' | 'signed';

export interface ResultRow {
  key: string;
  label: string;
  /** Formátovaná hodnota (celé Kč u hlavních výsledků, haléře u detailů). */
  value: string;
  /** Přesná hodnota na haléře pro kontrolní výstup. */
  exact?: string;
  /** Vzorec s dosazenými vstupy. */
  formula?: string;
  tone?: RowTone;
  /** Číselná hodnota pro barevné odlišení znaménka (jen u `tone: 'signed'`). */
  numeric?: number;
}

export interface ResultSection {
  key: string;
  title: string;
  rows: ResultRow[];
}

const czk = formatCzk2;

export function scenarioTitle(kind: ScenarioResult['kind']): string {
  return kind === 'guaranteed' ? 'Garantovaný scénář' : 'Tržní scénář';
}

export function scenarioSubtitle(kind: ScenarioResult['kind']): string {
  return kind === 'guaranteed'
    ? 'Nejnižší garantovaná prodejní cena – konzervativní a rozhodující pohled.'
    : 'Aktuální tržní prodejní cena – doplňkový optimistický pohled.';
}

export function buildScenarioSections(result: CalculationResult, s: ScenarioResult): ResultSection[] {
  const { inputs, timeline, position } = result;
  const p = position.rkShare;
  const rate = inputs.brokerCommissionRatePct;

  return [
    {
      key: 'prices',
      title: 'Ceny',
      rows: [
        { key: 'salePrice', label: 'Prodejní cena', value: formatCzk(s.salePrice), exact: czk(s.salePrice), tone: 'strong' },
        { key: 'purchasePrice', label: 'Kupní cena', value: formatCzk(s.purchasePrice), exact: czk(s.purchasePrice) },
      ],
    },
    {
      key: 'costs',
      title: 'Náklady',
      rows: [
        {
          key: 'totalDirectCost',
          label: 'Celkové přímé náklady',
          value: formatCzk(s.totalDirectCost),
          exact: czk(s.totalDirectCost),
          formula: `kupní cena ${czk(inputs.purchasePrice)} + náklady na výkup ${czk(inputs.buyoutCost)} + rekonstrukce ${czk(
            inputs.hasReconstruction ? inputs.reconstructionCost : 0
          )} + měsíční náklady ${czk(inputs.monthlyOperatingCost)} × ${timeline.chargedMonthlyCount} = ${czk(s.totalDirectCost)}`,
        },
        {
          key: 'totalFinancingCost',
          label: 'Finanční náklady (BO! model)',
          value: formatCzk(s.totalFinancingCost),
          exact: czk(s.totalFinancingCost),
          formula: `Σ e × kupní cena × frakce[t] (${czk(timeline.purchaseFinancingCostTotal)}) + Σ e × kumulované ostatní náklady[t] × frakce[t] (${czk(
            timeline.otherFinancingCostTotal
          )}) = ${czk(s.totalFinancingCost)}; e = ${formatPct(position.monthlyEfficiency * 100, 2)} pro pozici ${position.position}`,
        },
      ],
    },
    {
      key: 'buyoutProfit',
      title: 'Zisk výkupové části',
      rows: [
        {
          key: 'grossBuyoutProfit',
          label: 'Hrubý zisk',
          value: formatCzk(s.grossBuyoutProfit),
          exact: czk(s.grossBuyoutProfit),
          tone: 'signed',
          numeric: s.grossBuyoutProfit,
          formula: `prodejní cena ${czk(s.salePrice)} − celkové přímé náklady ${czk(s.totalDirectCost)} = ${czk(s.grossBuyoutProfit)}`,
        },
        {
          key: 'grossMarginPct',
          label: 'Hrubá marže',
          value: formatPct(s.grossMarginPct),
          exact: formatPct(s.grossMarginPct, 4),
          formula: `hrubý zisk ${czk(s.grossBuyoutProfit)} / prodejní cena ${czk(s.salePrice)} × 100`,
        },
        {
          key: 'buyoutProfitAfterFinancing',
          label: 'Zisk výkupu po financování',
          value: formatCzk(s.buyoutProfitAfterFinancing),
          exact: czk(s.buyoutProfitAfterFinancing),
          tone: 'signed',
          numeric: s.buyoutProfitAfterFinancing,
          formula: `hrubý zisk ${czk(s.grossBuyoutProfit)} − finanční náklady ${czk(s.totalFinancingCost)} = ${czk(s.buyoutProfitAfterFinancing)}`,
        },
      ],
    },
    {
      key: 'brokerage',
      title: 'Zprostředkování prodeje (3 %)',
      rows: [
        {
          key: 'brokerageCommissionInclVat',
          label: 'Náklad 3% provize vč. DPH',
          value: formatCzk(s.brokerageCommissionInclVat),
          exact: czk(s.brokerageCommissionInclVat),
          formula: `prodejní cena ${czk(s.salePrice)} × ${formatPct(CONSTANTS.brokerageCommissionRate * 100, 0)} = ${czk(s.brokerageCommissionInclVat)}`,
        },
        {
          key: 'brokerageCommissionExclVat',
          label: 'Výnos RK bez DPH',
          value: formatCzk(s.brokerageCommissionExclVat),
          exact: czk(s.brokerageCommissionExclVat),
          formula: `provize vč. DPH ${czk(s.brokerageCommissionInclVat)} / ${formatNumber(CONSTANTS.vatCoefficient, 2)} = ${czk(s.brokerageCommissionExclVat)}`,
        },
      ],
    },
    {
      key: 'netProfit',
      title: 'Čistý zisk',
      rows: [
        {
          key: 'propertyProfit',
          label: 'Čistý zisk výkupové části',
          value: formatCzk(s.propertyProfit),
          exact: czk(s.propertyProfit),
          tone: 'signed',
          numeric: s.propertyProfit,
          formula: `zisk po financování ${czk(s.buyoutProfitAfterFinancing)} − provize vč. DPH ${czk(s.brokerageCommissionInclVat)} = ${czk(s.propertyProfit)}`,
        },
        {
          key: 'realityProfit',
          label: 'Čistý zisk RK',
          value: formatCzk(s.realityProfit),
          exact: czk(s.realityProfit),
          tone: 'signed',
          numeric: s.realityProfit,
          formula: `= provize bez DPH ${czk(s.brokerageCommissionExclVat)}`,
        },
        {
          key: 'totalProfit',
          label: 'Celkový zisk po všech nákladech',
          value: formatCzk(s.totalProfit),
          exact: czk(s.totalProfit),
          tone: 'strong',
          numeric: s.totalProfit,
          formula: `čistý zisk výkupu ${czk(s.propertyProfit)} + čistý zisk RK ${czk(s.realityProfit)} = ${czk(s.totalProfit)}; rozhoduje o stavu VYCHÁZÍ / NEVYCHÁZÍ`,
        },
        {
          key: 'propertyNetMarginPct',
          label: 'Čistá marže výkupové části',
          value: formatPct(s.propertyNetMarginPct),
          exact: formatPct(s.propertyNetMarginPct, 4),
          formula: `čistý zisk výkupu ${czk(s.propertyProfit)} / prodejní cena ${czk(s.salePrice)} × 100`,
        },
        {
          key: 'totalNetMarginPct',
          label: 'Čistá marže celkem',
          value: formatPct(s.totalNetMarginPct),
          exact: formatPct(s.totalNetMarginPct, 4),
          formula: `celkový zisk ${czk(s.totalProfit)} / prodejní cena ${czk(s.salePrice)} × 100`,
        },
      ],
    },
    {
      key: 'split',
      title: `Rozdělení zisku (pozice ${position.position})`,
      rows: [
        {
          key: 'rkShareAmount',
          label: `Podíl RK / sítě (${formatPct(p * 100)})`,
          value: formatCzk(s.rkShareAmount),
          exact: czk(s.rkShareAmount),
          tone: 'signed',
          numeric: s.rkShareAmount,
          formula: `celkový zisk ${czk(s.totalProfit)} × ${formatPct(p * 100)} = ${czk(s.rkShareAmount)}`,
        },
        {
          key: 'investorShareAmount',
          label: `Podíl investora (${formatPct(position.investorShare * 100)})`,
          value: formatCzk(s.investorShareAmount),
          exact: czk(s.investorShareAmount),
          tone: 'signed',
          numeric: s.investorShareAmount,
          formula: `celkový zisk ${czk(s.totalProfit)} − podíl RK ${czk(s.rkShareAmount)} = ${czk(s.investorShareAmount)}`,
        },
        {
          key: 'brokerCommissionAmount',
          label: `Provize makléře (${formatPct(rate, 2)} z podílu RK)`,
          value: formatCzk(s.brokerCommissionAmount),
          exact: czk(s.brokerCommissionAmount),
          tone: 'signed',
          numeric: s.brokerCommissionAmount,
          formula: `podíl RK ${czk(s.rkShareAmount)} × ${formatPct(rate, 2)} = ${czk(s.brokerCommissionAmount)}`,
        },
        {
          key: 'rkAfterBrokerCommission',
          label: 'Zůstatek RK / sítě po provizi',
          value: formatCzk(s.rkAfterBrokerCommission),
          exact: czk(s.rkAfterBrokerCommission),
          tone: 'signed',
          numeric: s.rkAfterBrokerCommission,
          formula: `podíl RK ${czk(s.rkShareAmount)} − provize makléře ${czk(s.brokerCommissionAmount)} = ${czk(s.rkAfterBrokerCommission)}`,
        },
      ],
    },
  ];
}

/** Tabulka vstupů ovlivňujících výpočet (pro harmoniku a PDF). */
export function buildInputRows(result: CalculationResult): { label: string; value: string }[] {
  const i = result.inputs;
  return [
    { label: 'Pozice pobočky dle kariéry výkupů', value: String(i.branchPosition) },
    { label: 'Provize makléře dle kariérní pozice', value: formatPct(i.brokerCommissionRatePct, 2) },
    { label: 'Družstevní vlastnictví', value: formatBool(i.isCooperative) },
    { label: 'Kupní cena', value: czk(i.purchasePrice) },
    { label: 'Nejnižší garantovaná prodejní cena', value: czk(i.guaranteedSalePrice) },
    { label: 'Aktuální tržní prodejní cena', value: czk(i.marketSalePrice) },
    { label: 'Výpočet s rekonstrukcí', value: formatBool(i.hasReconstruction) },
    { label: 'Náklady na rekonstrukci', value: czk(i.hasReconstruction ? i.reconstructionCost : 0) },
    { label: 'Náklady na výkup', value: czk(i.buyoutCost) },
    { label: 'Měsíční náklady energie nájem služby', value: czk(i.monthlyOperatingCost) },
    { label: 'Očekávaná doba rekonstrukce', value: formatDays(i.hasReconstruction ? i.reconstructionDays : 0) },
    { label: 'Očekávaná doba prodeje', value: formatDays(i.saleDays) },
  ];
}

/** Odvozená délka a počty (pro harmoniku a PDF). */
export function buildDurationRows(result: CalculationResult): { label: string; value: string; formula?: string }[] {
  const t = result.timeline;
  const i = result.inputs;
  return [
    {
      label: 'Katastrální lhůta',
      value: formatDays(t.cadastralDays),
      formula: i.isCooperative ? 'družstevní vlastnictví → 0 dní' : 'nedružstevní vlastnictví → 21 dní',
    },
    {
      label: 'Celková doba',
      value: formatDays(t.totalDays),
      formula: `rekonstrukce ${i.hasReconstruction ? i.reconstructionDays : 0} + prodej ${i.saleDays} + katastr ${t.cadastralDays} = ${t.totalDays} dní`,
    },
    { label: 'Skutečné měsíce', value: formatNumber(t.actualMonths, 4), formula: `${t.totalDays} / 30` },
    { label: 'Zaokrouhlené měsíce', value: String(t.roundedMonths), formula: `ceil(${formatNumber(t.actualMonths, 4)})` },
    { label: 'Počet účtovaných měsíčních nákladů', value: String(t.chargedMonthlyCount), formula: `${t.roundedMonths} + 1` },
    {
      label: 'Aktivní měsíce rekonstrukce',
      value: String(t.reconstructionMonthCount),
      formula: i.hasReconstruction ? `měsíce t ≥ 1 s 30 × t ≤ ${i.reconstructionDays} + 30` : 'rekonstrukce vypnuta',
    },
    {
      label: 'Měsíční efektivita e',
      value: formatPct(result.position.monthlyEfficiency * 100, 2),
      formula: `pozice ${result.position.position}`,
    },
    {
      label: 'Součet měsíčních nákladů',
      value: czk(result.totalMonthlyOperatingCost),
      formula: `${czk(i.monthlyOperatingCost)} × ${t.chargedMonthlyCount}`,
    },
  ];
}

/** Vzorce v lidsky čitelné podobě (část 7 a 8). */
export const FORMULAS: readonly { title: string; lines: string[] }[] = [
  {
    title: 'Celková doba',
    lines: [
      'cadastralDays = družstevní ? 0 : 21',
      'totalDays = reconstructionDays + saleDays + cadastralDays',
      'actualMonths = totalDays / 30; roundedMonths = ceil(actualMonths)',
    ],
  },
  {
    title: 'Časová osa t = 0..24',
    lines: ['active[t] = t ≤ roundedMonths ? 1 : 0', 'fraction[t] = max(0, t ≤ actualMonths ? 1 : actualMonths − t + 1)'],
  },
  {
    title: 'Přímé peněžní výdaje',
    lines: [
      'purchaseOutflow[0] = purchasePrice; purchaseOutflow[t > 0] = 0 (kupní cena jen jednou)',
      'buyoutOutflow[0] = buyoutCost',
      'monthlyOutflow[t] = monthlyOperatingCost × active[t] → roundedMonths + 1 plateb',
      'reconstructionActive[t ≥ 1] = 30 × t ≤ reconstructionDays + 30; splátky v celých haléřích, zbytek do poslední',
      'otherOutflow[t] = buyoutOutflow + reconstructionOutflow + monthlyOutflow; cumulativeOtherOutflow[t] = Σ otherOutflow[0..t]',
    ],
  },
  {
    title: 'Finanční náklady (BO! model)',
    lines: [
      'purchaseFinancingCost[t ≥ 1] = e × purchasePrice × fraction[t]',
      'otherFinancingCost[t ≥ 1] = e × cumulativeOtherOutflow[t] × fraction[t]',
      'totalFinancingCost = Σ (purchaseFinancingCost + otherFinancingCost), zaokrouhleno až součet',
    ],
  },
  {
    title: 'Scénář (salePrice = garantovaná nebo tržní cena)',
    lines: [
      'totalDirectCost = purchasePrice + buyoutCost + reconstructionCost + monthlyOperatingCost × (roundedMonths + 1)',
      'grossBuyoutProfit = salePrice − totalDirectCost',
      'buyoutProfitAfterFinancing = grossBuyoutProfit − totalFinancingCost',
      'brokerageCommissionInclVat = round(salePrice × 3 %); brokerageCommissionExclVat = round(inclVat / 1,21)',
      'propertyProfit = round(buyoutProfitAfterFinancing − brokerageCommissionInclVat); realityProfit = brokerageCommissionExclVat',
      'totalProfit = round(propertyProfit + realityProfit) → VYCHÁZÍ pokud > 0, jinak NEVYCHÁZÍ',
      'marže % = částka / salePrice × 100',
    ],
  },
  {
    title: 'Rozdělení zisku (nemění verdikt)',
    lines: [
      'rkShareAmount = round(totalProfit × p); investorShareAmount = round(totalProfit − rkShareAmount)',
      'brokerCommissionAmount = round(rkShareAmount × brokerCommissionRatePct / 100)',
      'rkAfterBrokerCommission = round(rkShareAmount − brokerCommissionAmount)',
    ],
  },
];
