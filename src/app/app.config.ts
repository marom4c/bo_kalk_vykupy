import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation, withInMemoryScrolling } from '@angular/router';
import { provideNgIconsConfig } from '@ng-icons/core';
import { provideHlmSidebarConfig } from '@spartan-ng/helm/sidebar';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { routes } from './app.routes';
import { ThemeService } from './core/theme/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withHashLocation(), withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),
    provideNgIconsConfig({}),
    provideSpartanHlm(),
    provideHlmSidebarConfig({ closeMobileSidebarOnMenuButtonClick: true }),
    provideAppInitializer(() => {
      // Vytvoří ThemeService před prvním vykreslením (bez bliknutí tématu).
      inject(ThemeService);
    }),
  ],
};
