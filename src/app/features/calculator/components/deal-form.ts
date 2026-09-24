import { Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHammer, lucideHouse } from '@ng-icons/lucide';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { NumberField } from '@shared/components/number-field';
import { RawFieldKey } from '@core/calc';
import { CalculatorStore } from '../state/calculator-store';

/** Sekce `Parametry výkupu` (část 5.2) včetně přepínače `S rekonstrukcí / Bez rekonstrukce`. */
@Component({
  selector: 'bo-deal-form',
  imports: [
    HlmCardImports,
    HlmFieldImports,
    HlmLabelImports,
    HlmSeparatorImports,
    HlmSwitchImports,
    HlmInputImports,
    NgIcon,
    NumberField,
  ],
  providers: [provideIcons({ lucideHammer, lucideHouse })],
  template: `
    <section hlmCard class="h-full">
      <div hlmCardHeader>
        <h2 hlmCardTitle class="flex items-center gap-2">
          <ng-icon name="lucideHouse" aria-hidden="true" />
          Parametry výkupu
        </h2>
        <p hlmCardDescription>Společné vstupy pro oba scénáře. Liší se pouze prodejní cena.</p>
      </div>
      <div hlmCardContent class="flex flex-col gap-5">
        <!-- Vlastnictví -->
        <hlm-field orientation="horizontal" class="justify-between rounded-lg border p-3">
          <div class="flex flex-col gap-0.5">
            <label hlmFieldLabel for="isCooperative">Družstevní vlastnictví</label>
            <hlm-field-description
              >Nedružstevní nemovitost přidává jednu katastrální lhůtu 21 dní, družstevní žádnou.</hlm-field-description
            >
          </div>
          <hlm-switch
            inputId="isCooperative"
            aria-label="Družstevní vlastnictví"
            [checked]="store.values().isCooperative"
            (checkedChange)="store.update('isCooperative', $event)"
          />
        </hlm-field>

        <!-- Ceny -->
        <div class="grid gap-5 md:grid-cols-3">
          <bo-number-field
            inputId="purchasePrice"
            label="Kupní cena"
            suffix="Kč"
            placeholder="např. 1 000 000"
            [value]="store.values().purchasePrice"
            [error]="error('purchasePrice')"
            [warning]="warning('purchasePrice')"
            (valueChange)="store.update('purchasePrice', $event)"
            (blurred)="store.touch('purchasePrice')"
          />
          <bo-number-field
            inputId="guaranteedSalePrice"
            label="Nejnižší garantovaná prodejní cena"
            suffix="Kč"
            placeholder="např. 1 400 000"
            tooltip="Rozhodující varianta. Konzervativní cena, za kterou se nemovitost jistě prodá."
            [value]="store.values().guaranteedSalePrice"
            [error]="error('guaranteedSalePrice')"
            [warning]="warning('guaranteedSalePrice')"
            (valueChange)="store.update('guaranteedSalePrice', $event)"
            (blurred)="store.touch('guaranteedSalePrice')"
          />
          <bo-number-field
            inputId="marketSalePrice"
            label="Aktuální tržní prodejní cena"
            suffix="Kč"
            placeholder="např. 1 600 000"
            tooltip="Optimistický doplňkový pohled. Standardně ≥ garantovaná cena."
            [value]="store.values().marketSalePrice"
            [error]="error('marketSalePrice')"
            [warning]="warning('marketSalePrice')"
            (valueChange)="store.update('marketSalePrice', $event)"
            (blurred)="store.touch('marketSalePrice')"
          />
        </div>

        <hlm-separator />

        <!-- Rekonstrukce -->
        <hlm-field
          orientation="horizontal"
          class="justify-between rounded-lg border p-3"
          [class.bg-muted/40]="store.values().hasReconstruction"
        >
          <div class="flex flex-col gap-0.5">
            <label hlmFieldLabel for="hasReconstruction" class="flex items-center gap-2">
              <ng-icon name="lucideHammer" aria-hidden="true" />
              {{ store.values().hasReconstruction ? 'S rekonstrukcí' : 'Bez rekonstrukce' }}
            </label>
            <hlm-field-description>
              @if (store.values().hasReconstruction) {
                Rekonstrukce se rozloží do měsíců od 1. měsíce včetně jednoho dodatečného třicetidenního intervalu.
              } @else {
                Bez rekonstrukce se neúčtují žádné náklady ani doba rekonstrukce.
              }
            </hlm-field-description>
          </div>
          <hlm-switch
            inputId="hasReconstruction"
            aria-label="Výpočet s rekonstrukcí"
            [checked]="store.values().hasReconstruction"
            (checkedChange)="store.setReconstruction($event)"
          />
        </hlm-field>

        @if (store.values().hasReconstruction) {
          <div class="grid gap-5 md:grid-cols-2">
            <bo-number-field
              inputId="reconstructionCost"
              label="Náklady na rekonstrukci"
              suffix="Kč"
              placeholder="např. 100 000"
              [value]="store.values().reconstructionCost"
              [error]="error('reconstructionCost')"
              [warning]="warning('reconstructionCost')"
              (valueChange)="store.update('reconstructionCost', $event)"
              (blurred)="store.touch('reconstructionCost')"
            />
            <bo-number-field
              inputId="reconstructionDays"
              label="Očekávaná doba rekonstrukce"
              suffix="dní"
              inputmode="numeric"
              placeholder="např. 30"
              [value]="store.values().reconstructionDays"
              [error]="error('reconstructionDays')"
              [warning]="warning('reconstructionDays')"
              (valueChange)="store.update('reconstructionDays', $event)"
              (blurred)="store.touch('reconstructionDays')"
            />
          </div>
        }

        <!-- Náklady a doby -->
        <div class="grid gap-5 md:grid-cols-3">
          <bo-number-field
            inputId="buyoutCost"
            label="Náklady na výkup"
            suffix="Kč"
            placeholder="např. 50 000"
            hint="Jedna souhrnná částka všech jednorázových nákladů mimo kupní cenu a rekonstrukci."
            tooltip="Právní náklady, převodní poplatek, pojištění a jiné jednorázové náklady. Účtují se v měsíci 0."
            [value]="store.values().buyoutCost"
            [error]="error('buyoutCost')"
            [warning]="warning('buyoutCost')"
            (valueChange)="store.update('buyoutCost', $event)"
            (blurred)="store.touch('buyoutCost')"
          />
          <bo-number-field
            inputId="monthlyOperatingCost"
            label="Měsíční náklady energie nájem služby"
            suffix="Kč"
            placeholder="např. 10 000"
            hint="Účtuje se (zaokrouhlené měsíce + 1)×."
            [value]="store.values().monthlyOperatingCost"
            [error]="error('monthlyOperatingCost')"
            [warning]="warning('monthlyOperatingCost')"
            (valueChange)="store.update('monthlyOperatingCost', $event)"
            (blurred)="store.touch('monthlyOperatingCost')"
          />
          <bo-number-field
            inputId="saleDays"
            label="Očekávaná doba prodeje"
            suffix="dní"
            inputmode="numeric"
            placeholder="např. 60"
            hint="Celková doba nesmí přesáhnout 720 dní / 24 měsíců."
            [value]="store.values().saleDays"
            [error]="error('saleDays')"
            [warning]="warning('saleDays')"
            (valueChange)="store.update('saleDays', $event)"
            (blurred)="store.touch('saleDays')"
          />
        </div>

        @if (generalError(); as err) {
          <p class="text-destructive text-sm" role="alert">{{ err }}</p>
        }

        <!-- Poznámka -->
        <hlm-field>
          <hlm-field-label for="note">Poznámka (volitelné)</hlm-field-label>
          <textarea
            hlmInput
            id="note"
            rows="2"
            class="min-h-16 w-full"
            placeholder="Interní poznámka – neovlivňuje výpočet."
            [value]="store.values().note"
            (input)="store.update('note', $any($event.target).value)"
          ></textarea>
        </hlm-field>
      </div>
    </section>
  `,
})
export class DealForm {
  protected readonly store = inject(CalculatorStore);

  protected error(field: RawFieldKey): string | null {
    return this.store.fieldError()(field);
  }

  protected warning(field: RawFieldKey): string | null {
    return this.store.fieldWarning()(field);
  }

  protected generalError(): string | null {
    return this.store.errors().find((e) => e.field === 'general')?.message ?? null;
  }
}
