import { Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSigma } from '@ng-icons/lucide';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { BRANCH_POSITION_TABLE, CalculationResult, CONSTANTS_TABLE, formatCzk2, formatNumber, formatPct } from '@core/calc';
import { buildDurationRows, buildInputRows, buildScenarioSections, FORMULAS } from '../scenario-rows';

/**
 * Harmonika `Podrobnosti výpočtu` (část 9.4) – auditní pomůcka pro programátora
 * a business ownera: vstupy, tabulky, konstanty, časová osa, vzorce a mezivýsledky.
 */
@Component({
  selector: 'bo-calculation-details',
  imports: [HlmAccordionImports, HlmCardImports, HlmTableImports, NgIcon],
  providers: [provideIcons({ lucideSigma })],
  host: { class: 'block' },
  template: `
    <section hlmCard id="podrobnosti" class="scroll-mt-20">
      <div hlmCardHeader>
        <h2 hlmCardTitle class="flex items-center gap-2">
          <ng-icon name="lucideSigma" aria-hidden="true" />
          Podrobnosti výpočtu
        </h2>
        <p hlmCardDescription>Auditní rozpad všech vstupů, konstant, časové osy a vzorců. Částky na haléře.</p>
      </div>
      <div hlmCardContent>
        <hlm-accordion type="multiple">
          <!-- Vstupy -->
          <hlm-accordion-item>
            <hlm-accordion-trigger>Vstupy výpočtu</hlm-accordion-trigger>
            <hlm-accordion-content>
              <div hlmTableContainer>
                <table hlmTable>
                  <tbody hlmTBody>
                    @for (row of inputRows(); track row.label) {
                      <tr hlmTr>
                        <td hlmTd class="text-muted-foreground">{{ row.label }}</td>
                        <td hlmTd class="text-end tabular-nums">{{ row.value }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </hlm-accordion-content>
          </hlm-accordion-item>

          <!-- Pozice pobočky -->
          <hlm-accordion-item>
            <hlm-accordion-trigger>Tabulka pozic pobočky</hlm-accordion-trigger>
            <hlm-accordion-content>
              <div hlmTableContainer>
                <table hlmTable>
                  <thead hlmTHead>
                    <tr hlmTr>
                      <th hlmTh>Pozice</th>
                      <th hlmTh class="text-end">Měsíční efektivita e</th>
                      <th hlmTh class="text-end">Podíl RK nebo sítě p</th>
                      <th hlmTh class="text-end">Podíl investora 1 − p</th>
                    </tr>
                  </thead>
                  <tbody hlmTBody>
                    @for (row of positionTable; track row.position) {
                      <tr
                        hlmTr
                        [class.bg-muted/50]="row.position === result().position.position"
                        [class.font-semibold]="row.position === result().position.position"
                      >
                        <td hlmTd>
                          {{ row.position }}{{ row.position === result().position.position ? ' (použito)' : '' }}
                        </td>
                        <td hlmTd class="text-end tabular-nums">{{ pct(row.monthlyEfficiency, 2) }}</td>
                        <td hlmTd class="text-end tabular-nums">{{ pct(row.rkShare, 1) }}</td>
                        <td hlmTd class="text-end tabular-nums">{{ pct(row.investorShare, 1) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </hlm-accordion-content>
          </hlm-accordion-item>

          <!-- Konstanty -->
          <hlm-accordion-item>
            <hlm-accordion-trigger>Použité konstanty</hlm-accordion-trigger>
            <hlm-accordion-content>
              <div hlmTableContainer>
                <table hlmTable>
                  <tbody hlmTBody>
                    @for (row of constants; track row.label) {
                      <tr hlmTr>
                        <td hlmTd class="text-muted-foreground">{{ row.label }}</td>
                        <td hlmTd class="text-end tabular-nums">{{ row.value }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <p class="text-muted-foreground mt-2 text-xs">
                Projektový management 6 %, reklamační fond 5 % a minimální participace 5 % se nepoužívají.
              </p>
            </hlm-accordion-content>
          </hlm-accordion-item>

          <!-- Délka -->
          <hlm-accordion-item>
            <hlm-accordion-trigger>Odvozená délka a počty měsíců</hlm-accordion-trigger>
            <hlm-accordion-content>
              <div hlmTableContainer>
                <table hlmTable>
                  <tbody hlmTBody>
                    @for (row of durationRows(); track row.label) {
                      <tr hlmTr>
                        <td hlmTd class="text-muted-foreground">{{ row.label }}</td>
                        <td hlmTd class="text-end tabular-nums">{{ row.value }}</td>
                        <td hlmTd class="text-muted-foreground hidden text-xs sm:table-cell">{{ row.formula }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </hlm-accordion-content>
          </hlm-accordion-item>

          <!-- Časová osa -->
          <hlm-accordion-item>
            <hlm-accordion-trigger>Časová osa měsíců 0–24, přímé výdaje a finanční náklady</hlm-accordion-trigger>
            <hlm-accordion-content>
              <div hlmTableContainer class="scrollbar-thin">
                <table hlmTable class="text-xs">
                  <thead hlmTHead>
                    <tr hlmTr>
                      <th hlmTh>t</th>
                      <th hlmTh class="text-end">Aktivní</th>
                      <th hlmTh class="text-end">Frakce</th>
                      <th hlmTh class="text-end">Kupní cena</th>
                      <th hlmTh class="text-end">Výkup</th>
                      <th hlmTh class="text-end">Reko akt.</th>
                      <th hlmTh class="text-end">Rekonstrukce</th>
                      <th hlmTh class="text-end">Měsíční</th>
                      <th hlmTh class="text-end">Ostatní</th>
                      <th hlmTh class="text-end">Kumul. ostatní</th>
                      <th hlmTh class="text-end">Fin. z kupní ceny</th>
                      <th hlmTh class="text-end">Fin. z ostatních</th>
                    </tr>
                  </thead>
                  <tbody hlmTBody>
                    @for (m of result().timeline.months; track m.t) {
                      <tr hlmTr [class.text-muted-foreground]="!m.active">
                        <td hlmTd>{{ m.t }}</td>
                        <td hlmTd class="text-end">{{ m.active }}</td>
                        <td hlmTd class="text-end tabular-nums">{{ num(m.fraction, 4) }}</td>
                        <td hlmTd class="text-end tabular-nums">{{ czk(m.purchaseOutflow) }}</td>
                        <td hlmTd class="text-end tabular-nums">{{ czk(m.buyoutOutflow) }}</td>
                        <td hlmTd class="text-end">{{ m.reconstructionActive }}</td>
                        <td hlmTd class="text-end tabular-nums">{{ czk(m.reconstructionOutflow) }}</td>
                        <td hlmTd class="text-end tabular-nums">{{ czk(m.monthlyOutflow) }}</td>
                        <td hlmTd class="text-end tabular-nums">{{ czk(m.otherOutflow) }}</td>
                        <td hlmTd class="text-end tabular-nums">{{ czk(m.cumulativeOtherOutflow) }}</td>
                        <td hlmTd class="text-end tabular-nums">{{ czk(m.purchaseFinancingCost) }}</td>
                        <td hlmTd class="text-end tabular-nums">{{ czk(m.otherFinancingCost) }}</td>
                      </tr>
                    }
                  </tbody>
                  <tfoot hlmTFoot>
                    <tr hlmTr class="font-semibold">
                      <td hlmTd colspan="3">Součty</td>
                      <td hlmTd class="text-end tabular-nums">{{ czk(result().inputs.purchasePrice) }}</td>
                      <td hlmTd class="text-end tabular-nums">{{ czk(result().inputs.buyoutCost) }}</td>
                      <td hlmTd class="text-end">{{ result().timeline.reconstructionMonthCount }}</td>
                      <td hlmTd class="text-end tabular-nums">
                        {{ czk(result().inputs.hasReconstruction ? result().inputs.reconstructionCost : 0) }}
                      </td>
                      <td hlmTd class="text-end tabular-nums">{{ czk(result().totalMonthlyOperatingCost) }}</td>
                      <td hlmTd colspan="2"></td>
                      <td hlmTd class="text-end tabular-nums">{{ czk(result().timeline.purchaseFinancingCostTotal) }}</td>
                      <td hlmTd class="text-end tabular-nums">{{ czk(result().timeline.otherFinancingCostTotal) }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p class="text-muted-foreground mt-2 text-xs">
                Finanční náklady se počítají interně s plnou přesností; na haléře jsou zde zaokrouhleny jen pro zobrazení.
                Zaokrouhlují se až součty: celkem {{ czk(result().timeline.totalFinancingCost) }}.
              </p>
            </hlm-accordion-content>
          </hlm-accordion-item>

          <!-- Vzorce -->
          <hlm-accordion-item>
            <hlm-accordion-trigger>Vzorce v lidsky čitelné podobě</hlm-accordion-trigger>
            <hlm-accordion-content>
              <div class="grid gap-4 md:grid-cols-2">
                @for (group of formulas; track group.title) {
                  <div>
                    <h4 class="mb-1 font-medium">{{ group.title }}</h4>
                    <ul class="text-muted-foreground list-disc space-y-0.5 ps-5 font-mono text-xs">
                      @for (line of group.lines; track line) {
                        <li>{{ line }}</li>
                      }
                    </ul>
                  </div>
                }
              </div>
            </hlm-accordion-content>
          </hlm-accordion-item>

          <!-- Mezivýsledky -->
          <hlm-accordion-item>
            <hlm-accordion-trigger>Mezivýsledky obou scénářů (na haléře)</hlm-accordion-trigger>
            <hlm-accordion-content>
              <div hlmTableContainer>
                <table hlmTable>
                  <thead hlmTHead>
                    <tr hlmTr>
                      <th hlmTh>Položka</th>
                      <th hlmTh class="text-end">Garantovaný</th>
                      <th hlmTh class="text-end">Tržní</th>
                    </tr>
                  </thead>
                  <tbody hlmTBody>
                    @for (row of comparisonRows(); track row.key) {
                      <tr hlmTr [class.font-semibold]="row.strong">
                        <td hlmTd [class.text-muted-foreground]="!row.strong">
                          <span>{{ row.label }}</span>
                          @if (row.formula) {
                            <span class="text-muted-foreground block text-xs font-normal">{{ row.formula }}</span>
                          }
                        </td>
                        <td hlmTd class="text-end align-top tabular-nums">{{ row.guaranteed }}</td>
                        <td hlmTd class="text-end align-top tabular-nums">{{ row.market }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </hlm-accordion-content>
          </hlm-accordion-item>
        </hlm-accordion>
      </div>
    </section>
  `,
})
export class CalculationDetails {
  readonly result = input.required<CalculationResult>();

  protected readonly positionTable = BRANCH_POSITION_TABLE;
  protected readonly constants = CONSTANTS_TABLE;
  protected readonly formulas = FORMULAS;

  protected readonly inputRows = computed(() => buildInputRows(this.result()));
  protected readonly durationRows = computed(() => buildDurationRows(this.result()));

  protected readonly comparisonRows = computed(() => {
    const r = this.result();
    const g = buildScenarioSections(r, r.guaranteed).flatMap((s) => s.rows);
    const m = buildScenarioSections(r, r.market).flatMap((s) => s.rows);
    const rows: { key: string; label: string; formula?: string; guaranteed: string; market: string; strong: boolean }[] = [
      { key: 'verdict', label: 'Stav', guaranteed: r.guaranteed.verdict, market: r.market.verdict, strong: true },
    ];
    for (let i = 0; i < g.length; i++) {
      rows.push({
        key: g[i].key,
        label: g[i].label,
        formula: g[i].formula,
        guaranteed: g[i].exact ?? g[i].value,
        market: m[i].exact ?? m[i].value,
        strong: g[i].tone === 'strong',
      });
    }
    return rows;
  });

  protected czk(v: number): string {
    return formatCzk2(v);
  }

  protected num(v: number, digits: number): string {
    return formatNumber(v, digits);
  }

  protected pct(v: number, digits: number): string {
    return formatPct(v * 100, digits);
  }
}
