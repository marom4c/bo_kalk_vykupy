import { Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { ThemeService } from '@core/theme/theme.service';

@Component({
  selector: 'bo-theme-switch',
  imports: [NgIcon, HlmButtonImports, HlmTooltipImports],
  providers: [provideIcons({ lucideMoon, lucideSun })],
  template: `
    <button type="button" variant="outline" hlmBtn size="icon" hlmTooltip="Přepnout světlý / tmavý režim" (click)="toggle()">
      <span class="sr-only">Přepnout téma</span>
      <ng-icon name="lucideSun" class="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <ng-icon name="lucideMoon" class="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </button>
  `,
})
export class ThemeSwitch {
  private readonly _theme = inject(ThemeService);

  protected toggle(): void {
    this._theme.toggle();
  }
}
