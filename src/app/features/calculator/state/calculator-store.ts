import { computed, Injectable, signal } from '@angular/core';
import {
  calculate,
  CalculationResult,
  EMPTY_FORM_VALUES,
  FIELD_LABELS,
  IssueField,
  RawFieldKey,
  RawFormValues,
  validateForm,
  ValidationIssue,
  ValidationResult,
} from '@core/calc';

/** Ukázková data = referenční test 12.2 ze zadání. */
export const SAMPLE_FORM_VALUES: RawFormValues = {
  branchPosition: '1',
  brokerCommissionRatePct: '29',
  isCooperative: false,
  purchasePrice: '1000000',
  guaranteedSalePrice: '1400000',
  marketSalePrice: '1600000',
  hasReconstruction: true,
  reconstructionCost: '100000',
  buyoutCost: '50000',
  monthlyOperatingCost: '10000',
  reconstructionDays: '30',
  saleDays: '60',
  note: '',
};

/**
 * Výchozí stav prototypu: profilové hodnoty jsou „načtené ze systému“,
 * vstupy obchodu jsou prázdné, aby se nezobrazovaly falešné nuly.
 */
export const INITIAL_FORM_VALUES: RawFormValues = {
  ...EMPTY_FORM_VALUES,
  branchPosition: '1',
  brokerCommissionRatePct: '29',
};

/**
 * Stav kalkulačky založený na signálech. Výsledky se přepočítávají okamžitě
 * po každé změně validního vstupu; veškerá logika je v čistém jádru `@core/calc`.
 */
@Injectable({ providedIn: 'root' })
export class CalculatorStore {
  private readonly _values = signal<RawFormValues>(INITIAL_FORM_VALUES);
  private readonly _touched = signal<ReadonlySet<RawFieldKey>>(new Set());
  private readonly _showAllErrors = signal(false);

  readonly values = this._values.asReadonly();
  readonly touched = this._touched.asReadonly();
  readonly showAllErrors = this._showAllErrors.asReadonly();

  readonly validation = computed<ValidationResult>(() => validateForm(this._values()));
  readonly isValid = computed(() => this.validation().ok);
  readonly errors = computed<ValidationIssue[]>(() => this.validation().errors);
  readonly warnings = computed<ValidationIssue[]>(() => this.validation().warnings);

  readonly result = computed<CalculationResult | null>(() => {
    const v = this.validation();
    return v.ok ? calculate(v.inputs) : null;
  });

  private readonly _errorsByField = computed(() => {
    const map = new Map<IssueField, string>();
    for (const e of this.errors()) {
      if (!map.has(e.field)) {
        map.set(e.field, e.message);
      }
    }
    return map;
  });

  private readonly _warningsByField = computed(() => {
    const map = new Map<IssueField, string>();
    for (const w of this.warnings()) {
      if (!map.has(w.field)) {
        map.set(w.field, w.message);
      }
    }
    return map;
  });

  /** Chybová hláška pole – zobrazuje se jen u „dotčených“ polí nebo po vyžádání všech chyb. */
  readonly fieldError = computed(() => {
    const errors = this._errorsByField();
    const touched = this._touched();
    const showAll = this._showAllErrors();
    return (field: RawFieldKey): string | null => {
      if (!showAll && !touched.has(field)) {
        return null;
      }
      return errors.get(field) ?? null;
    };
  });

  readonly fieldWarning = computed(() => {
    const warnings = this._warningsByField();
    return (field: RawFieldKey): string | null => warnings.get(field) ?? null;
  });

  /** Chyby s lidským popiskem pole pro výzvu k doplnění. */
  readonly errorSummary = computed(() =>
    this.errors().map((e) => ({
      field: e.field,
      label: e.field === 'general' ? 'Celková doba' : FIELD_LABELS[e.field],
      message: e.message,
    }))
  );

  readonly warningSummary = computed(() =>
    this.warnings().map((w) => ({
      field: w.field,
      label: w.field === 'general' ? 'Obecné' : FIELD_LABELS[w.field],
      message: w.message,
    }))
  );

  update<K extends RawFieldKey>(field: K, value: RawFormValues[K]): void {
    this._values.update((v) => ({ ...v, [field]: value }));
  }

  touch(field: RawFieldKey): void {
    this._touched.update((set) => {
      if (set.has(field)) {
        return set;
      }
      const next = new Set(set);
      next.add(field);
      return next;
    });
  }

  setReconstruction(on: boolean): void {
    this._values.update((v) => ({
      ...v,
      hasReconstruction: on,
      // Bez rekonstrukce musí být rozpočet i doba přesně 0 – pole se vyprázdní.
      reconstructionCost: on ? v.reconstructionCost : '',
      reconstructionDays: on ? v.reconstructionDays : '',
    }));
  }

  revealAllErrors(): void {
    this._showAllErrors.set(true);
  }

  loadSample(): void {
    this._values.set(SAMPLE_FORM_VALUES);
    this._showAllErrors.set(false);
    this._touched.set(new Set());
  }

  reset(): void {
    this._values.set(INITIAL_FORM_VALUES);
    this._showAllErrors.set(false);
    this._touched.set(new Set());
  }
}
