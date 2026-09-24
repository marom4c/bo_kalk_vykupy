import { Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInfo, lucidePlug } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { NumberField } from '@shared/components/number-field';
import { BRANCH_POSITION_TABLE, BRANCH_POSITIONS, formatPct } from '@core/calc';
import { CalculatorStore } from '../state/calculator-store';

/** Sekce `Údaje z profilu a systému` (část 5.1) s označením budoucího API napojení. */
@Component({
  selector: 'bo-profile-section',
  imports: [HlmCardImports, HlmFieldImports, HlmSelectImports, HlmTooltipImports, HlmBadgeImports, NgIcon, NumberField],
  providers: [provideIcons({ lucideInfo, lucidePlug })],
  template: `
    <section hlmCard class="h-full">
      <div hlmCardHeader>
        <h2 hlmCardTitle class="flex items-center gap-2">
          Údaje z profilu a systému
          <span hlmBadge variant="outline" class="gap-1 font-normal">
            <ng-icon name="lucidePlug" aria-hidden="true" />
            budoucí API
          </span>
        </h2>
        <p hlmCardDescription>
          V prototypu jsou hodnoty editovatelné. V budoucí integraci budou načteny z API nebo uživatelského profilu.
        </p>
      </div>
      <div hlmCardContent class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <hlm-field [forceInvalid]="!!error('branchPosition')">
          <hlm-field-label for="branchPosition" class="flex items-end sm:min-h-10">
            <span>
              Pozice pobočky dle kariéry výkupů
              <ng-icon
                name="lucideInfo"
                class="text-muted-foreground ms-1 inline-block align-[-2px] text-[length:--spacing(3.5)]"
                [hlmTooltip]="positionTable"
                aria-label="Tabulka pozic pobočky"
                tabindex="0"
              />
            </span>
          </hlm-field-label>
          <hlm-select [value]="store.values().branchPosition" (valueChange)="setPosition($event)">
            <hlm-select-trigger buttonId="branchPosition" class="w-full">
              <hlm-select-value placeholder="Vyberte pozici" />
            </hlm-select-trigger>
            <hlm-select-content *hlmSelectPortal>
              @for (pos of positions; track pos) {
                <hlm-select-item [value]="String(pos)"
                  >Pozice {{ pos }} – e {{ efficiency(pos) }}, RK {{ rkShare(pos) }}</hlm-select-item
                >
              }
            </hlm-select-content>
          </hlm-select>
          @if (error('branchPosition'); as err) {
            <hlm-field-error>{{ err }}</hlm-field-error>
          } @else {
            <hlm-field-description
              >Určuje měsíční efektivitu <em>e</em> a podíl RK / sítě <em>p</em>. Z API / profilu.</hlm-field-description
            >
          }
        </hlm-field>

        <bo-number-field
          inputId="brokerCommissionRatePct"
          label="Provize makléře dle kariérní pozice"
          suffix="%"
          placeholder="např. 29"
          hint="0 až 100 %, nejméně dvě desetinná místa. Z API / profilu."
          tooltip="Počítá se z podílu RK / sítě na celkovém zisku. Rozdělení už nemění stav obchodu."
          [value]="store.values().brokerCommissionRatePct"
          [error]="error('brokerCommissionRatePct')"
          [warning]="warning('brokerCommissionRatePct')"
          (valueChange)="store.update('brokerCommissionRatePct', $event)"
          (blurred)="store.touch('brokerCommissionRatePct')"
        />

        <div
          class="bg-muted/40 text-muted-foreground flex items-start gap-2 rounded-lg border p-3 text-xs md:col-span-2 xl:col-span-1"
        >
          <ng-icon name="lucidePlug" class="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            Tyto hodnoty jsou společné pro oba scénáře a určují cenu peněz (efektivita <em>e</em>) i rozdělení zisku (podíl
            <em>p</em>). Po napojení na systém budou předvyplněné a jen pro čtení.
          </p>
        </div>
      </div>
    </section>

    <ng-template #positionTable>
      <table class="text-xs">
        <caption class="mb-1 text-start font-medium">
          Tabulka pozic pobočky
        </caption>
        <thead>
          <tr class="text-background/80">
            <th class="pe-2 text-start font-medium">Pozice</th>
            <th class="pe-2 text-end font-medium">Efektivita e</th>
            <th class="pe-2 text-end font-medium">Podíl RK</th>
            <th class="text-end font-medium">Investor</th>
          </tr>
        </thead>
        <tbody>
          @for (row of table; track row.position) {
            <tr>
              <td class="pe-2">{{ row.position }}</td>
              <td class="pe-2 text-end tabular-nums">{{ pct(row.monthlyEfficiency, 2) }}</td>
              <td class="pe-2 text-end tabular-nums">{{ pct(row.rkShare, 1) }}</td>
              <td class="text-end tabular-nums">{{ pct(row.investorShare, 1) }}</td>
            </tr>
          }
        </tbody>
      </table>
    </ng-template>
  `,
})
export class ProfileSection {
  protected readonly store = inject(CalculatorStore);
  protected readonly positions = BRANCH_POSITIONS;
  protected readonly table = BRANCH_POSITION_TABLE;
  protected readonly String = String;

  protected error(field: 'branchPosition' | 'brokerCommissionRatePct'): string | null {
    return this.store.fieldError()(field);
  }

  protected warning(field: 'branchPosition' | 'brokerCommissionRatePct'): string | null {
    return this.store.fieldWarning()(field);
  }

  protected setPosition(value: unknown): void {
    this.store.update('branchPosition', value == null ? '' : String(value));
    this.store.touch('branchPosition');
  }

  protected pct(value: number, digits: number): string {
    return formatPct(value * 100, digits);
  }

  protected efficiency(pos: number): string {
    const row = this.table.find((r) => r.position === pos);
    return row ? this.pct(row.monthlyEfficiency, 2) : '';
  }

  protected rkShare(pos: number): string {
    const row = this.table.find((r) => r.position === pos);
    return row ? this.pct(row.rkShare, 1) : '';
  }
}
