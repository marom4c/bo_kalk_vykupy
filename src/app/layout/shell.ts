import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBookOpen, lucideCalculator, lucideDatabase, lucideFileText, lucideSigma } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { ThemeSwitch } from '@shared/components/theme-switch';
import { RULES_VERSION } from '@core/calc';

/**
 * Aplikační shell ve stylu Spartan admin dashboardu: postranní navigace,
 * horní lišta s přepínačem tématu a obsah stránky.
 */
@Component({
  selector: 'bo-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgIcon,
    HlmSidebarImports,
    HlmSeparatorImports,
    HlmTooltipImports,
    HlmBadgeImports,
    ThemeSwitch,
  ],
  providers: [provideIcons({ lucideCalculator, lucideSigma, lucideBookOpen, lucideDatabase, lucideFileText })],
  template: `
    <div hlmSidebarWrapper>
      <hlm-sidebar collapsible="icon" srOnlySheetTitle="Navigace" srOnlySheetDescription="Zobrazí navigaci aplikace.">
        <hlm-sidebar-header>
          <ul hlmSidebarMenu>
            <li hlmSidebarMenuItem>
              <a hlmSidebarMenuButton size="lg" routerLink="/">
                <img
                  class="me-2 aspect-square size-8 dark:hidden"
                  src="/images/logo/logo.svg"
                  width="32"
                  height="32"
                  alt=""
                />
                <img
                  class="me-2 hidden aspect-square size-8 dark:inline-block"
                  src="/images/logo/logo-white.svg"
                  width="32"
                  height="32"
                  alt=""
                />
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-medium">BO! reality</span>
                  <span class="truncate text-xs">Kalkulačky výkupů</span>
                </div>
              </a>
            </li>
          </ul>
        </hlm-sidebar-header>

        <hlm-sidebar-content>
          <hlm-sidebar-group>
            <div hlmSidebarGroupLabel>Aplikace</div>
            <div hlmSidebarGroupContent>
              <ul hlmSidebarMenu>
                <li hlmSidebarMenuItem>
                  <a
                    hlmSidebarMenuButton
                    routerLink="/kalkulacka"
                    routerLinkActive="bg-primary/10 text-primary font-semibold"
                    tooltip="Kalkulačka výkupu"
                    aria-label="Kalkulačka výkupu"
                  >
                    <ng-icon name="lucideCalculator" />
                    <span>Kalkulačka výkupu</span>
                  </a>
                </li>
              </ul>
            </div>
          </hlm-sidebar-group>

          <hlm-sidebar-group>
            <div hlmSidebarGroupLabel>Audit výpočtu</div>
            <div hlmSidebarGroupContent>
              <ul hlmSidebarMenu>
                <li hlmSidebarMenuItem>
                  <a
                    hlmSidebarMenuButton
                    routerLink="/kalkulacka"
                    fragment="podrobnosti"
                    tooltip="Podrobnosti výpočtu"
                    aria-label="Podrobnosti výpočtu"
                  >
                    <ng-icon name="lucideSigma" />
                    <span>Podrobnosti výpočtu</span>
                  </a>
                </li>
                <li hlmSidebarMenuItem>
                  <a
                    hlmSidebarMenuButton
                    href="https://github.com/marom4c/bo_kalk_vykupy/blob/main/docs/PRODUCT_ASSIGNMENT.md"
                    target="_blank"
                    rel="noopener"
                    tooltip="Produktové zadání"
                    aria-label="Produktové zadání"
                  >
                    <ng-icon name="lucideBookOpen" />
                    <span>Produktové zadání</span>
                  </a>
                </li>
              </ul>
            </div>
          </hlm-sidebar-group>

          <hlm-sidebar-group class="mt-auto group-data-[collapsible=icon]:hidden">
            <div hlmSidebarGroupLabel>Připraveno pro integraci</div>
            <div hlmSidebarGroupContent>
              <ul hlmSidebarMenu>
                <li hlmSidebarMenuItem>
                  <button type="button" hlmSidebarMenuButton disabled aria-disabled="true">
                    <ng-icon name="lucideDatabase" />
                    <span>Profil a systém</span>
                    <span hlmBadge variant="outline" class="ms-auto text-[10px]">API</span>
                  </button>
                </li>
                <li hlmSidebarMenuItem>
                  <button type="button" hlmSidebarMenuButton disabled aria-disabled="true">
                    <ng-icon name="lucideFileText" />
                    <span>Uložené kalkulace</span>
                    <span hlmBadge variant="outline" class="ms-auto text-[10px]">mimo MVP</span>
                  </button>
                </li>
              </ul>
            </div>
          </hlm-sidebar-group>
        </hlm-sidebar-content>

        <hlm-sidebar-footer>
          <p class="text-muted-foreground px-2 text-xs group-data-[collapsible=icon]:hidden">
            Verze pravidel: {{ rulesVersion }}
          </p>
        </hlm-sidebar-footer>
        <button type="button" hlmSidebarRail><span class="sr-only">Přepnout navigaci</span></button>
      </hlm-sidebar>

      <main hlmSidebarInset class="min-w-0">
        <header
          class="bg-background/95 sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between gap-2 border-b px-4 backdrop-blur sm:px-6"
        >
          <div class="flex items-center gap-2">
            <button type="button" hlmSidebarTrigger>
              <span class="sr-only">Přepnout navigaci</span>
            </button>
            <hlm-separator orientation="vertical" class="me-2 h-4!" />
            <nav aria-label="Drobečková navigace" class="text-muted-foreground flex items-center gap-1.5 text-sm">
              <span>Kalkulačky</span>
              <span aria-hidden="true">/</span>
              <span class="text-foreground font-medium">Výkup BO! reality</span>
            </nav>
          </div>
          <div class="flex items-center gap-3">
            <span hlmBadge variant="secondary" class="hidden sm:inline-flex">Prototyp MVP</span>
            <bo-theme-switch />
          </div>
        </header>
        <div class="min-w-0 flex-1 p-4 sm:p-6">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class Shell {
  protected readonly rulesVersion = RULES_VERSION;
}
