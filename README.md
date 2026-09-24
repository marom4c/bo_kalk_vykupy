# Kalkulačka výkupu BO! reality

Samostatná responzivní webová aplikace (MVP), která vypočítá ekonomiku výkupu nemovitosti ve dvou paralelních scénářích – **garantovaném** (rozhodující) a **tržním** (optimistický). Implementuje [produktové zadání](docs/PRODUCT_ASSIGNMENT.md) včetně referenčních testů z části 12.

Postaveno na [Spartan UI](https://spartan.ng) (helm komponenty vendorované v `src/app/libs`), Angular 22 (standalone, signály, zoneless) a Tailwind CSS 4 – ve stejném stylu a struktuře jako [spartan-admin-dashboard](https://github.com/Oussemasahbeni/spartan-admin-dashboard), aby šel prototyp snadno integrovat do stávajících systémů.

## Spuštění

> Vyžaduje Node 22.22.3+ nebo 24+ a npm.

```bash
npm install
npm start          # dev server na http://localhost:4200
npm test           # jednotkové testy výpočetního jádra (Vitest)
npm run build      # produkční build do dist/bo-kalk-vykupy
```

Aplikace nepotřebuje server, databázi, autentizaci ani externí API. Veškerý výpočet i export PDF běží na klientovi a nic se neukládá.

## Struktura

```
src/app/
├── core/
│   ├── calc/        # čisté výpočetní jádro bez UI (typy, konstanty, validace, časová osa, scénáře, formátování) + testy
│   ├── pdf/         # klientský export PDF (pdfmake, A4 na šířku, karty scénářů nedělitelné)
│   └── theme/       # světlé / tmavé téma
├── layout/          # aplikační shell (sidebar, hlavička) ve stylu Spartan admin dashboardu
├── features/calculator/
│   ├── state/       # signálový store formuláře, validace a výsledků
│   ├── components/  # sekce profilu, formulář výkupu, karta scénáře, harmonika Podrobnosti výpočtu
│   └── scenario-rows.ts  # jediný zdroj řádků výsledků a vzorců pro UI i PDF
├── libs/            # vendorované Spartan UI (helm) komponenty – generované přes @spartan-ng/cli
└── shared/          # znovupoužitelné prvky (číselné pole, přepínač tématu)
```

## Výpočetní jádro (`src/app/core/calc`)

- Peněžní aritmetika běží na `decimal.js` s `ROUND_HALF_UP`; rekonstrukce se dělí na celočíselné haléře, zbytek jde do poslední splátky.
- Kupní cena je přímý výdaj jen v měsíci 0, ale financuje se po celou dobu držení (oprava chyby zdrojového Excelu).
- Verdikt `VYCHÁZÍ / NEVYCHÁZÍ` určuje výhradně znaménko `totalProfit` (konsolidovaný zisk výkupové a realitní části). Nula je vždy `NEVYCHÁZÍ`.
- Rozdělení mezi RK/síť a investora a provize makléře se počítají až z `totalProfit` a verdikt nemění; záporné částky se neořezávají.
- Vstup: `validateForm(raw)` → `CalculatorInputs` nebo blokující chyby + neblokující upozornění. Výstup: `calculate(inputs)` → `CalculationResult` s časovou osou 0–24 a oběma scénáři.

Testy v `*.spec.ts` pokrývají referenční scénáře 12.1–12.6 ze zadání (STING aritmetika, BO časová logika, rozdělení zisku, družstevní vlastnictví, hraniční stav 0,01 Kč a haléřové rozdělení rekonstrukce), parser desetinné čárky/tečky a validační pravidla.

## Integrace do systémů

- Sekce `Údaje z profilu a systému` (`branchPosition`, `brokerCommissionRatePct`) je připravená pro načtení z API nebo profilu – stačí nahradit počáteční hodnoty v `CalculatorStore`.
- Výpočetní jádro nemá závislost na Angularu a lze jej použít i na serveru nebo v jiném frontendu.
- Další helm komponenty se přidávají příkazem `npx ng g @spartan-ng/cli:ui <název>`.
