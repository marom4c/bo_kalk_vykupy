import { Component, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucideEraser, lucideFileDown, lucideFlaskConical, lucideTriangleAlert } from '@ng-icons/lucide';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { PdfExportService } from '@core/pdf/pdf-export.service';
import { CalculationDetails } from './components/calculation-details';
import { DealForm } from './components/deal-form';
import { ProfileSection } from './components/profile-section';
import { ScenarioCard } from './components/scenario-card';
import { CalculatorStore } from './state/calculator-store';

/** Stránka kalkulačky (část 9.1). */
@Component({
  selector: 'bo-calculator-page',
  imports: [
    NgIcon,
    HlmAlertImports,
    HlmButtonImports,
    HlmCardImports,
    HlmTooltipImports,
    ProfileSection,
    DealForm,
    ScenarioCard,
    CalculationDetails,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideEraser, lucideFileDown, lucideFlaskConical, lucideTriangleAlert })],
  template: `
    <div class="@container/main flex flex-col gap-6">
      <!-- 1 + 2: Nadpis a vysvětlení -->
      <header class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div class="max-w-3xl">
          <h1 class="text-3xl font-bold tracking-tight">Kalkulačka výkupu BO! reality</h1>
          <p class="text-muted-foreground mt-2 text-sm">
            Ekonomika výkupu ve dvou paralelních scénářích.
            <strong class="text-foreground">Garantovaná varianta</strong> používá nejnižší garantovanou prodejní cenu, je
            konzervativní a <strong class="text-foreground">rozhodující</strong>. Tržní varianta je jen doplňkový
            optimistický pohled – obchod nevychází bezpečně, pokud nevychází garantovaný scénář.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" hlmBtn variant="outline" size="sm" (click)="store.loadSample()">
            <ng-icon name="lucideFlaskConical" />
            Vyplnit ukázku
          </button>
          <button type="button" hlmBtn variant="ghost" size="sm" (click)="store.reset()">
            <ng-icon name="lucideEraser" />
            Vymazat
          </button>
          <button
            type="button"
            hlmBtn
            size="sm"
            [disabled]="!store.isValid() || exporting()"
            [hlmTooltip]="
              store.isValid()
                ? 'Vygeneruje PDF z aktuálního stavu (A4 na šířku, oba scénáře)'
                : 'Export je dostupný až po doplnění všech povinných vstupů'
            "
            (click)="exportPdf()"
          >
            <ng-icon name="lucideFileDown" />
            {{ exporting() ? 'Generuji…' : 'Exportovat PDF' }}
          </button>
        </div>
      </header>

      <!-- 3 + 4 + 5: Vstupy -->
      <bo-profile-section />
      <bo-deal-form />

      <!-- Upozornění -->
      @if (store.isValid() && store.warningSummary().length > 0) {
        <div
          hlmAlert
          class="border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
          role="status"
        >
          <ng-icon name="lucideTriangleAlert" />
          <h4 hlmAlertTitle>Neblokující upozornění</h4>
          <div hlmAlertDescription class="text-amber-900/80 dark:text-amber-200/80">
            <ul class="list-disc ps-4">
              @for (w of store.warningSummary(); track w.field + w.message) {
                <li>
                  <span class="font-medium">{{ w.label }}:</span> {{ w.message }}
                </li>
              }
            </ul>
          </div>
        </div>
      }

      <!-- 6 + 7: Výsledky -->
      @if (store.result(); as result) {
        <div class="grid gap-6 @4xl/main:grid-cols-2">
          <bo-scenario-card [result]="result" [scenario]="result.guaranteed" />
          <bo-scenario-card [result]="result" [scenario]="result.market" />
        </div>

        <!-- 8: Harmonika -->
        <bo-calculation-details [result]="result" />
      } @else {
        <section hlmCard class="border-dashed">
          <div hlmCardHeader>
            <h2 hlmCardTitle class="flex items-center gap-2">
              <ng-icon name="lucideCircleAlert" class="text-muted-foreground" aria-hidden="true" />
              Výsledky se zobrazí po doplnění vstupů
            </h2>
            <p hlmCardDescription>Chybějící nebo neplatné povinné vstupy. Výsledky se nezobrazují jako nuly.</p>
          </div>
          <div hlmCardContent>
            <ul class="grid gap-1.5 text-sm sm:grid-cols-2">
              @for (e of store.errorSummary(); track e.field + e.message) {
                <li class="flex gap-2">
                  <span class="text-destructive" aria-hidden="true">•</span>
                  <span
                    ><span class="font-medium">{{ e.label }}:</span> {{ e.message }}</span
                  >
                </li>
              }
            </ul>
            <button type="button" hlmBtn variant="outline" size="sm" class="mt-4" (click)="store.revealAllErrors()">
              Zvýraznit chybějící pole
            </button>
          </div>
        </section>
      }

      @if (exportError(); as err) {
        <div hlmAlert variant="destructive" role="alert">
          <ng-icon name="lucideCircleAlert" />
          <h4 hlmAlertTitle>Export PDF se nezdařil</h4>
          <div hlmAlertDescription>{{ err }}</div>
        </div>
      }
    </div>
  `,
})
export default class CalculatorPage {
  protected readonly store = inject(CalculatorStore);
  private readonly _pdf = inject(PdfExportService);

  protected readonly exporting = signal(false);
  protected readonly exportError = signal<string | null>(null);

  protected async exportPdf(): Promise<void> {
    const result = this.store.result();
    if (!result || this.exporting()) {
      return;
    }
    this.exporting.set(true);
    this.exportError.set(null);
    try {
      await this._pdf.export(result, this.store.warningSummary());
    } catch (e) {
      this.exportError.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.exporting.set(false);
    }
  }
}
