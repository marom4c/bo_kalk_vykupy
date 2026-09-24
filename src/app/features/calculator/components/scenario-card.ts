import { Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideCircleX, lucideInfo, lucideShieldCheck, lucideTrendingUp } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { CalculationResult, formatCzk, formatPct, ScenarioResult } from '@core/calc';
import { buildScenarioSections, ResultRow, scenarioSubtitle, scenarioTitle } from '../scenario-rows';

/**
 * Výsledková karta scénáře (část 9.3). Garantovaný scénář má výraznější vizuální
 * prioritu a štítek `Rozhodující varianta`; tržní je barevně odlišený.
 * Stav nese vždy i text a ikona, barva není jediným nositelem informace.
 */
@Component({
  selector: 'bo-scenario-card',
  imports: [HlmCardImports, HlmBadgeImports, HlmSeparatorImports, HlmTooltipImports, NgIcon],
  providers: [provideIcons({ lucideCircleCheck, lucideCircleX, lucideInfo, lucideShieldCheck, lucideTrendingUp })],
  host: { class: 'block h-full' },
  template: `
    <section
      hlmCard
      class="h-full gap-4"
      [class]="
        isGuaranteed() ? 'border-primary/60 ring-primary/15 shadow-md ring-2' : 'border-sky-300/70 dark:border-sky-700/60'
      "
      [attr.aria-label]="title()"
    >
      <div hlmCardHeader class="gap-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 hlmCardTitle class="flex items-center gap-2 text-lg">
            <ng-icon
              [name]="isGuaranteed() ? 'lucideShieldCheck' : 'lucideTrendingUp'"
              [class]="isGuaranteed() ? '' : 'text-sky-600 dark:text-sky-400'"
              aria-hidden="true"
            />
            {{ title() }}
          </h3>
          @if (isGuaranteed()) {
            <span hlmBadge variant="secondary">Rozhodující varianta</span>
          } @else {
            <span hlmBadge variant="outline" class="border-sky-300 text-sky-700 dark:border-sky-700 dark:text-sky-300"
              >Optimistický pohled</span
            >
          }
        </div>
        <p hlmCardDescription>{{ subtitle() }}</p>
      </div>

      <div hlmCardContent class="flex flex-col gap-4">
        <!-- Verdikt -->
        <div
          class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border px-4 py-3"
          [class]="
            scenario().passes
              ? 'border-success/40 bg-success/10 text-green-800 dark:text-green-300'
              : 'border-destructive/40 bg-destructive/10 text-destructive'
          "
          role="status"
        >
          <div class="flex items-center gap-2">
            <ng-icon
              [name]="scenario().passes ? 'lucideCircleCheck' : 'lucideCircleX'"
              class="text-[length:--spacing(6)]"
              aria-hidden="true"
            />
            <div class="flex flex-col">
              <span class="text-xl font-bold tracking-tight">{{ scenario().verdict }}</span>
              <span class="text-xs opacity-80">{{
                scenario().passes ? 'Celkový zisk je větší než 0 Kč' : 'Celkový zisk je 0 Kč nebo záporný'
              }}</span>
            </div>
          </div>
          <div class="ms-auto text-end">
            <div class="text-2xl font-bold tabular-nums tracking-tight" [class.text-3xl]="isGuaranteed()">
              {{ totalProfit() }}
            </div>
            <div class="text-xs opacity-80">celkový zisk · marže {{ totalMargin() }}</div>
          </div>
        </div>

        <!-- Sekce výsledků -->
        @for (section of sections(); track section.key) {
          <div>
            <h4 class="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">{{ section.title }}</h4>
            <dl class="divide-y">
              @for (row of section.rows; track row.key) {
                <div
                  class="flex items-baseline justify-between gap-3 py-1.5 text-sm"
                  [class.font-semibold]="row.tone === 'strong'"
                >
                  <dt
                    class="text-muted-foreground flex items-center gap-1.5"
                    [class.text-foreground]="row.tone === 'strong'"
                  >
                    <span>{{ row.label }}</span>
                    @if (row.formula) {
                      <button
                        type="button"
                        class="text-muted-foreground/70 hover:text-foreground inline-flex rounded-sm focus-visible:outline-2"
                        [hlmTooltip]="row.formula"
                        [attr.aria-label]="'Vzorec: ' + row.formula"
                      >
                        <ng-icon name="lucideInfo" class="text-[length:--spacing(3.5)]" aria-hidden="true" />
                      </button>
                    }
                  </dt>
                  <dd
                    class="text-end tabular-nums"
                    [class]="toneClass(row)"
                    [hlmTooltip]="row.exact ?? ''"
                    [tooltipDisabled]="!row.exact"
                  >
                    {{ row.value }}
                  </dd>
                </div>
              }
            </dl>
          </div>
        }
      </div>
    </section>
  `,
})
export class ScenarioCard {
  readonly result = input.required<CalculationResult>();
  readonly scenario = input.required<ScenarioResult>();

  protected readonly isGuaranteed = computed(() => this.scenario().kind === 'guaranteed');
  protected readonly title = computed(() => scenarioTitle(this.scenario().kind));
  protected readonly subtitle = computed(() => scenarioSubtitle(this.scenario().kind));
  protected readonly sections = computed(() => buildScenarioSections(this.result(), this.scenario()));
  protected readonly totalProfit = computed(() => formatCzk(this.scenario().totalProfit));
  protected readonly totalMargin = computed(() => formatPct(this.scenario().totalNetMarginPct));

  protected toneClass(row: ResultRow): string {
    if (row.tone === 'strong') {
      const n = row.numeric;
      if (n !== undefined) {
        return n > 0 ? 'text-green-700 dark:text-green-400' : 'text-destructive';
      }
      return 'text-foreground';
    }
    if (row.tone === 'signed' && row.numeric !== undefined && row.numeric < 0) {
      return 'text-destructive';
    }
    return 'text-foreground';
  }
}
