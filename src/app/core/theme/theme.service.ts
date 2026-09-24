import { computed, DestroyRef, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';

export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = 'theme-preference';

/** Světlé / tmavé / systémové téma – převzato ze Spartan admin dashboardu. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _document = inject(DOCUMENT);
  private readonly _window = this._document.defaultView;
  private readonly _mediaQuery = this._window?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly _systemPrefersDark = signal(this._mediaQuery?.matches ?? false);

  private readonly _selectedTheme = signal<Theme>('system');
  public readonly theme = this._selectedTheme.asReadonly();

  public readonly resolvedTheme = computed<'light' | 'dark'>((): 'light' | 'dark' => {
    if (this._selectedTheme() === 'system') {
      return this._systemPrefersDark() ? 'dark' : 'light';
    }
    return this._selectedTheme() === 'dark' ? 'dark' : 'light';
  });

  constructor() {
    const saved = this.readStorage();
    this._selectedTheme.set(saved && (THEMES as readonly string[]).includes(saved) ? (saved as Theme) : 'system');

    const onSystemThemeChange = (e: MediaQueryListEvent) => this._systemPrefersDark.set(e.matches);
    this._mediaQuery?.addEventListener('change', onSystemThemeChange);
    inject(DestroyRef).onDestroy(() => this._mediaQuery?.removeEventListener('change', onSystemThemeChange));

    effect(() => {
      this._document.documentElement.classList.toggle('dark', this.resolvedTheme() === 'dark');
    });
  }

  setTheme(theme: Theme): void {
    this._selectedTheme.set(theme);
    try {
      this._window?.localStorage?.setItem(STORAGE_KEY, theme);
    } catch {
      /* localStorage může být nedostupné (privátní režim) */
    }
  }

  toggle(): void {
    this.setTheme(this.resolvedTheme() === 'dark' ? 'light' : 'dark');
  }

  private readStorage(): string | null {
    try {
      return this._window?.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }
}
