import { Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInfo } from '@ng-icons/lucide';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

/**
 * Textové pole pro číselné vstupy (Kč, %, dny) s popiskem, jednotkou,
 * nápovědou, chybou a upozorněním. Používá `type="text"` + `inputmode`, aby
 * prohlížeč nevynucoval žádný lokální formát – parser přijme čárku i tečku.
 */
@Component({
  selector: 'bo-number-field',
  imports: [HlmFieldImports, HlmInputImports, HlmTooltipImports, NgIcon],
  providers: [provideIcons({ lucideInfo })],
  template: `
    <hlm-field [forceInvalid]="!!error()">
      <hlm-field-label [for]="inputId()" class="flex items-center gap-1.5">
        <span>{{ label() }}</span>
        @if (tooltip()) {
          <ng-icon
            name="lucideInfo"
            class="text-muted-foreground text-[length:--spacing(3.5)]"
            [hlmTooltip]="tooltip()!"
            aria-hidden="true"
          />
        }
      </hlm-field-label>
      <div class="relative">
        <input
          hlmInput
          type="text"
          autocomplete="off"
          class="w-full pe-12 tabular-nums"
          [id]="inputId()"
          [inputMode]="inputmode()"
          [placeholder]="placeholder()"
          [value]="value()"
          [disabled]="disabled()"
          [attr.aria-invalid]="error() ? true : null"
          [attr.aria-describedby]="describedBy()"
          (input)="valueChange.emit($any($event.target).value)"
          (blur)="blurred.emit()"
        />
        @if (suffix()) {
          <span
            class="text-muted-foreground pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm"
            aria-hidden="true"
          >
            {{ suffix() }}
          </span>
        }
      </div>
      @if (error(); as err) {
        <hlm-field-error [id]="inputId() + '-error'">{{ err }}</hlm-field-error>
      } @else if (warning(); as warn) {
        <hlm-field-description [id]="inputId() + '-warning'" class="text-amber-700 dark:text-amber-400"
          >⚠ {{ warn }}</hlm-field-description
        >
      } @else if (hint(); as h) {
        <hlm-field-description [id]="inputId() + '-hint'">{{ h }}</hlm-field-description>
      }
    </hlm-field>
  `,
})
export class NumberField {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input<string>('');
  readonly suffix = input<string>('');
  readonly placeholder = input<string>('');
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly warning = input<string | null>(null);
  readonly tooltip = input<string | null>(null);
  readonly inputmode = input<'decimal' | 'numeric'>('decimal');
  readonly disabled = input<boolean>(false);

  readonly valueChange = output<string>();
  readonly blurred = output<void>();

  protected describedBy(): string | null {
    if (this.error()) return `${this.inputId()}-error`;
    if (this.warning()) return `${this.inputId()}-warning`;
    if (this.hint()) return `${this.inputId()}-hint`;
    return null;
  }
}
