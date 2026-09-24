# Produktové zadání kalkulačky výkupu BO reality

Stav dokumentu: finální zadání po analýze zdrojového XLTX, přepisu jednání, manažerského zadání, screenshotů a webarchive STING a po zapracování navazujících rozhodnutí zadavatele.

## 1 Účel a rozsah MVP

Vytvoř samostatnou responzivní webovou aplikaci v češtině, která vypočítá ekonomiku výkupu nemovitosti BO! reality ve dvou paralelních scénářích:

- garantovaný scénář používající nejnižší garantovanou prodejní cenu,
- optimistický scénář používající aktuální tržní prodejní cenu.

MVP je pouze kalkulačka. Neobsahuje přihlášení, API integrace, databázi, ukládání kalkulací, seznam kalkulací, předávání, schvalování, komentáře, notifikace, historii ani přílohy.

Primární rozhodovací výstup je pro každý scénář samostatně:

- `VYCHÁZÍ`, pokud je zisk výkupu po všech nákladech přesně větší než 0 Kč,
- `NEVYCHÁZÍ`, pokud je zisk výkupu po všech nákladech menší nebo roven 0 Kč.

Garantovaný scénář je hlavní a rozhodující. Tržní scénář je doplňkový optimistický pohled. Aplikace nesmí označit celý obchod za bezpečně vycházející jen proto, že vychází tržní scénář, pokud garantovaný scénář nevychází.

## 2 Závazná obchodní rozhodnutí

- Jediným zdrojem výpočetní logiky ceny peněz je model BO! podle pozice pobočky. STING slouží pouze jako reference způsobu práce se scénáři a prezentace výsledků.
- Celkový zisk zahrnuje výkupovou část i zprostředkování prodeje. Tato konsolidovaná částka určuje stav `VYCHÁZÍ / NEVYCHÁZÍ`.
- Zisk se následně rozdělí mezi RK/síť a investora; provize makléře se počítá z podílu RK/sítě. Rozdělení už nemění stav obchodu.
- Jednorázové náklady jsou sloučeny do jediného vstupu `Náklady na výkup`. Náklady rekonstrukce a opakované měsíční náklady zůstávají samostatné.
- Nedružstevní nemovitost přidává právě jednu katastrální lhůtu 21 dní. Družstevní nemovitost nepřidává žádnou.
- MVP obsahuje klientský export právě zobrazené kalkulace do PDF. Export nic neukládá.

## 3 Autorita zdrojů a schválené odchylky

Při rozporu používej toto pořadí:

1. explicitní rozhodnutí zadavatele v navazující komunikaci,
2. toto finální produktové zadání,
3. přepis jednání,
4. zdrojový Excel a jeho skryté listy,
5. manažerský Markdown pouze jako pomocný kontext,
6. STING pouze jako UX a scénářový vzor, pokud není výslovně převzat konkrétní vzorec.

Schválené změny oproti zdrojovému Excelu:

- kupní cena se jako peněžní výdaj započítá jen jednou, nikoliv v každém aktivním měsíci,
- odstraní se participace makléře na investici a zisk makléře z participace,
- odstraní se projektový management 6 % z rekonstrukce,
- odstraní se reklamační fond 5 % z rekonstrukce,
- přidají se dvě prodejní ceny a výpočet obou scénářů,
- přidá se jednoznačný stav `VYCHÁZÍ / NEVYCHÁZÍ`,
- pozice makléře se nahradí explicitním procentním vstupem `Provize makléře dle kariérní pozice [%]`,
- MVP neobsahuje údaje o konkrétní nemovitosti, které nevstupují do výpočtu.

## 4 Technické provedení pro Google AI Studio

V Google AI Studio Build mode vytvoř webovou aplikaci. Volba frontendu, backendu, frameworku, knihoven a testovacího nástroje není produktovým požadavkem; pro tech demo zvol nejjednodušší spolehlivé řešení. MVP nepotřebuje server, databázi, Firebase, autentizaci ani Gemini API. Pokud implementace vytvoří pomocný server, nesmí na něm záviset výpočet, ukládání ani jiná MVP funkce. Veškerá výpočetní logika musí být deterministická, čistá a testovatelná bez generativní AI.

Odděl:

- typy vstupů a výstupů,
- validační schéma,
- čisté výpočetní funkce bez UI,
- UI komponenty formuláře,
- UI komponenty výsledků,
- jednotkové testy a referenční scénáře.

Nepoužívej binární floating-point přímo pro peněžní mezivýpočty, pokud by vedl k haléřovým odchylkám. Použij buď celočíselné haléře, nebo spolehlivou decimal aritmetiku. Zaokrouhlovací pravidla jsou v části 10.

## 5 Datový model vstupů

### 5.1 Budoucí profilové vstupy

Tyto vstupy zobraz v samostatné sekci `Údaje z profilu a systému`. V prototypu jsou editovatelné. U každého zobraz text, že v budoucí integraci bude hodnota načtena z API nebo uživatelského profilu.

| Klíč | Popisek | Typ | Povinný | Pravidla |
|---|---|---:|---:|---|
| `branchPosition` | Pozice pobočky dle kariéry výkupů | celé číslo 1–6 | ano | výběr z roletky |
| `brokerCommissionRatePct` | Provize makléře dle kariérní pozice [%] | procento | ano | 0 až 100 včetně |

Jméno, pobočka, manažer, číslo zakázky, typ nemovitosti, dispozice, výměra, stav, lokalita, katastrální údaje a parcely nejsou v MVP, protože nevstupují do výpočtu.

### 5.2 Vstupy obchodu

| Klíč | Popisek | Typ | Povinný | Pravidla |
|---|---|---:|---:|---|
| `isCooperative` | Družstevní vlastnictví | boolean | ano | ano/ne |
| `purchasePrice` | Kupní cena | Kč | ano | > 0 |
| `guaranteedSalePrice` | Nejnižší garantovaná prodejní cena | Kč | ano | > 0 |
| `marketSalePrice` | Aktuální tržní prodejní cena | Kč | ano | > 0 a standardně ≥ garantovaná cena |
| `hasReconstruction` | Výpočet s rekonstrukcí | boolean | ano | výchozí ne |
| `reconstructionCost` | Náklady na rekonstrukci | Kč | podmíněně | povinné a ≥ 0 jen při rekonstrukci, jinak přesně 0 |
| `buyoutCost` | Náklady na výkup | Kč | ano | ≥ 0; jedna souhrnná částka všech jednorázových nákladů výkupu mimo kupní cenu a rekonstrukci |
| `monthlyOperatingCost` | Měsíční náklady energie nájem služby | Kč | ano | ≥ 0 |
| `reconstructionDays` | Očekávaná doba rekonstrukce | celé dny | podmíněně | při rekonstrukci ≥ 0, bez rekonstrukce 0 |
| `saleDays` | Očekávaná doba prodeje | celé dny | ano | ≥ 0 |

Volitelný vstup `Poznámka` může být součástí UI, ale nesmí ovlivňovat výpočty.

## 6 Konstanty a pomocné tabulky

### 6.1 Tabulka pozice pobočky

| Pozice | Měsíční efektivita `e` | Podíl RK nebo sítě `p` | Podíl investora `1-p` |
|---:|---:|---:|---:|
| 1 | 1,88 % | 66,6 % | 33,4 % |
| 2 | 1,82 % | 70,0 % | 30,0 % |
| 3 | 1,77 % | 75,0 % | 25,0 % |
| 4 | 1,74 % | 80,0 % | 20,0 % |
| 5 | 1,72 % | 85,0 % | 15,0 % |
| 6 | 1,70 % | 90,0 % | 10,0 % |

Tabulku zobraz v tooltipu u pozice pobočky a také v rozbalovací sekci `Podrobnosti výpočtu`.

### 6.2 Ostatní konstanty

| Konstanta | Hodnota |
|---|---:|
| DPH | 21 % |
| Koeficient pro odstranění DPH | 1,21 |
| Provize RK | 3 % z prodejní ceny scénáře |
| Délka modelového měsíce | 30 dní |
| Katastrální lhůta u nedružstevní nemovitosti | 21 dní |
| Katastrální lhůta u družstevní nemovitosti | 0 dní |
| Nejvyšší podporovaný měsíc | 24 |
| Nejvyšší podporovaná celková délka | 720 dní |

Projektový management 6 %, reklamační fond 5 % a minimální participace 5 % se nepoužívají.

## 7 Časový model a cena financování

Níže je BO! model převzatý ze skrytého listu `Simulace na dny` s opravou opakovaného účtování kupní ceny.

### 7.1 Celková doba

```text
cadastralDays = isCooperative ? 0 : 21
totalDays = reconstructionDays + saleDays + cadastralDays
actualMonths = totalDays / 30
roundedMonths = ceil(actualMonths)
```

Validace musí odmítnout `roundedMonths > 24`.

### 7.2 Časová osa

Modeluj měsíce `t = 0..24`.

```text
active[t] = t <= roundedMonths ? 1 : 0

fraction[t] = max(
  0,
  t <= actualMonths ? 1 : actualMonths - t + 1
)
```

`fraction[t]` představuje plný nebo poměrný poslední měsíc financování. Finanční náklady se v měsíci 0 neúčtují.

### 7.3 Přímé peněžní výdaje

Kupní cena se započítá pouze v měsíci 0:

```text
purchaseOutflow[0] = purchasePrice
purchaseOutflow[t > 0] = 0
```

Měsíční provozní náklad zachovává chování Excelu:

```text
monthlyOutflow[t] = monthlyOperatingCost * active[t]
```

Počet účtovaných měsíčních nákladů je tedy `roundedMonths + 1`. Například při 42 dnech jsou účtovány tři měsíční částky, protože `ceil(42/30) + 1 = 3`.

Jednorázové náklady na výkup se započítají v měsíci 0:

```text
buyoutOutflow[0] = buyoutCost
buyoutOutflow[t > 0] = 0
```

### 7.4 Rozložení rekonstrukce

Zdrojový Excel rozkládá rekonstrukci od měsíce 1 a zahrnuje jeden dodatečný třicetidenní interval:

```text
reconstructionActive[0] = 0
reconstructionActive[t >= 1] = (30 * t <= reconstructionDays + 30) ? 1 : 0
reconstructionMonthCount = sum(reconstructionActive[0..24])

reconstructionOutflow[t] =
  hasReconstruction && reconstructionActive[t] == 1
    ? reconstructionInstallment[t]
    : 0
```

Rozděl `reconstructionCost` na celočíselné haléře. Pro `n = reconstructionMonthCount` aktivních měsíců dostane každý aktivní měsíc kromě posledního `floor(reconstructionCostInCents / n)` haléřů; poslední aktivní měsíc dostane zbývající haléře. `reconstructionInstallment[t]` je právě takto vzniklá splátka. Tyto haléřové splátky, nikoli neomezeně přesné podíly, vstupují do `otherOutflow`, kumulovaných nákladů i finančních nákladů. Součet splátek se proto vždy přesně rovná `reconstructionCost`.

Pokud rekonstrukce není zapnutá, `reconstructionCost = 0` a všechny výdaje rekonstrukce jsou 0.

### 7.5 Kumulované ostatní náklady

```text
otherOutflow[t] =
  buyoutOutflow[t]
  + reconstructionOutflow[t]
  + monthlyOutflow[t]

cumulativeOtherOutflow[t] = sum(otherOutflow[0..t])
```

### 7.6 Finanční náklady

Pro pozici pobočky načti měsíční efektivitu `e` z tabulky.

```text
purchaseFinancingCost[0] = 0
purchaseFinancingCost[t >= 1] = e * purchasePrice * fraction[t]

otherFinancingCost[0] = 0
otherFinancingCost[t >= 1] = e * cumulativeOtherOutflow[t] * fraction[t]

totalFinancingCost = sum(
  purchaseFinancingCost[t] + otherFinancingCost[t]
  for t = 0..24
)
```

Tím je kupní cena financována po dobu držení, ale jako samotný výdaj je odečtena pouze jednou.

## 8 Výpočty společné pro oba scénáře

Pro každý scénář použij `salePrice`, kde:

- garantovaný scénář: `salePrice = guaranteedSalePrice`,
- tržní scénář: `salePrice = marketSalePrice`.

### 8.1 Přímé náklady

```text
totalMonthlyOperatingCost = monthlyOperatingCost * (roundedMonths + 1)

totalDirectCost =
  purchasePrice
  + buyoutCost
  + reconstructionCost
  + totalMonthlyOperatingCost
```

### 8.2 Hrubý zisk a zisk výkupu po financování

```text
grossBuyoutProfit = salePrice - totalDirectCost

buyoutProfitAfterFinancing =
  grossBuyoutProfit - totalFinancingCost
```

### 8.3 Zprostředkování prodeje a celkový zisk

Stejně jako ve STING se 3% provize současně projeví jako náklad výkupové části včetně DPH a jako výnos RK bez DPH. BO! finanční náklady z části 7 zůstávají jediným modelem ceny peněz. Samostatný vstup `Náklady na zprostředkování` v MVP není.

```text
brokerageCommissionInclVat = roundMoney(salePrice * 0.03)
brokerageCommissionExclVat = roundMoney(
  brokerageCommissionInclVat / 1.21
)

propertyProfit = roundMoney(
  buyoutProfitAfterFinancing - brokerageCommissionInclVat
)

realityProfit = brokerageCommissionExclVat

totalProfit = roundMoney(propertyProfit + realityProfit)

result = totalProfit > 0
  ? "VYCHÁZÍ"
  : "NEVYCHÁZÍ"
```

`totalProfit` je jediná částka určující verdikt. Vyjadřuje konsolidovaný zisk výkupové a realitní části po všech přímých nákladech, BO! ceně financování a DPH dopadu zprostředkovatelské provize.

### 8.4 Marže

```text
grossMarginPct = salePrice == 0
  ? null
  : grossBuyoutProfit / salePrice * 100

propertyNetMarginPct = salePrice == 0
  ? null
  : propertyProfit / salePrice * 100

totalNetMarginPct = salePrice == 0
  ? null
  : totalProfit / salePrice * 100
```

Procento marže se počítá vůči prodejní ceně scénáře stejně jako ve STING kalkulačce.

### 8.5 Rozdělení zisku podle pozice pobočky

Rozdělení se provede až z `totalProfit` a nemění verdikt:

```text
rkShareAmount = roundMoney(totalProfit * p)
investorShareAmount = roundMoney(totalProfit - rkShareAmount)
brokerCommissionAmount = roundMoney(
  rkShareAmount * (brokerCommissionRatePct / 100)
)
rkAfterBrokerCommission = roundMoney(
  rkShareAmount - brokerCommissionAmount
)
```

Záporné částky se nesmí automaticky oříznout na nulu. UI je musí ukázat jako záporné, aby byl problém auditovatelný.

### 8.6 Původní DPH logika Excelu, která se nepřenáší

Zdrojový Excel používá:

```text
rkShareWithoutVat = isCooperative
  ? rkShareAmount
  : rkShareAmount / 1.21
```

Tento vztah je zachycen pouze kvůli úplnosti auditu. Do MVP se nepřenáší, protože jej nahrazuje explicitní 3% provize včetně DPH na straně výkupu a bez DPH na straně RK podle části 8.3.

## 9 Uživatelské rozhraní

### 9.1 Struktura stránky

1. Nadpis `Kalkulačka výkupu BO! reality`.
2. Krátké vysvětlení, že garantovaná varianta je konzervativní a rozhodující.
3. Sekce `Údaje z profilu a systému` s vizuálním označením budoucího API napojení.
4. Sekce `Parametry výkupu`.
5. Přepínač `S rekonstrukcí / Bez rekonstrukce`.
6. Dva výsledkové sloupce vedle sebe na desktopu:
   - garantovaný scénář se zřetelným neutrálním štítkem `Rozhodující varianta` a výraznější vizuální prioritou,
   - barevně odlišený tržní scénář.
7. Na mobilu scénáře pod sebou, garantovaný vždy první.
8. Harmonika `Podrobnosti výpočtu`.
9. Tlačítko `Exportovat PDF`.

### 9.2 Chování scénářů

Kupní cena, vlastnictví, pozice pobočky, procento makléře, režim rekonstrukce, náklady a doby jsou společné pro oba scénáře. Liší se pouze prodejní cena a všechny výsledky na ní závislé.

Výsledky se přepočítávají okamžitě po změně validního vstupu. Pokud chybí povinný vstup, výsledky nezobrazuj jako nuly; zobraz konkrétní výzvu k doplnění.

### 9.3 Výsledková karta scénáře

Každý scénář zobrazí minimálně:

- stav `VYCHÁZÍ / NEVYCHÁZÍ`,
- prodejní cenu,
- kupní cenu,
- celkové přímé náklady,
- hrubý zisk a hrubou marži v %,
- finanční náklady,
- zisk výkupové části po financování,
- náklad 3% provize včetně DPH a výnos RK bez DPH,
- čistý zisk výkupové části, čistý zisk RK a celkový zisk po všech nákladech,
- čisté marže výkupové části a celku v %,
- rozdělení celkového zisku mezi RK/síť a investora,
- provizi makléře a zůstatek RK/sítě po této provizi.

Garantovaná varianta musí mít výraznější vizuální prioritu. Pozitivní stav použije zelenou, nulový nebo záporný červenou. Barva nesmí být jediným nositelem informace.

### 9.4 Harmonika Podrobnosti výpočtu

Obsahuje:

- tabulku všech vstupů,
- tabulku pozic pobočky,
- použité konstanty,
- odvozenou délku v dnech a měsících,
- počet účtovaných měsíčních nákladů,
- časovou osu měsíců 0–24,
- rozpis přímých výdajů po měsících,
- rozpis finančních nákladů z kupní ceny,
- rozpis finančních nákladů z kumulovaných ostatních nákladů,
- vzorce v lidsky čitelné podobě,
- mezivýsledky obou scénářů.

Harmonika je primárně auditní pomůcka pro programátora a business ownera, nikoliv skrytá implementační diagnostika.

### 9.5 Export PDF

PDF se vygeneruje na klientovi z aktuálního validního stavu bez ukládání na server. Je ve formátu A4 na šířku, aby se oba scénáře daly číst vedle sebe; pokud obsah přeteče na další stranu, výsledková karta se nesmí rozdělit uprostřed logického bloku. Obsahuje datum a čas výpočtu, verzi pravidel, všechny vstupy ovlivňující výpočet a kompletní výsledky obou scénářů včetně verdiktu. Neobsahuje ovládací prvky, harmoniku ani prázdná technická pole. Tlačítko je zakázané, dokud vstupy nejsou validní.

## 10 Přesnost a formátování

- Interně počítej minimálně na haléře.
- `roundMoney` znamená `ROUND_HALF_UP` na dvě desetinná místa, tedy na haléře; přesná polovina se zaokrouhlí od nuly.
- Měsíční splátky rekonstrukce jsou celočíselné haléře rozdělené přesně podle části 7.4. Jednotlivé finanční náklady počítej interně s plnou dostupnou přesností. Na haléře zaokrouhli až jejich součty `totalFinancingCost` a `totalDirectCost`.
- Dále samostatně zaokrouhli na haléře `grossBuyoutProfit`, `buyoutProfitAfterFinancing`, obě částky 3% provize, `propertyProfit`, `realityProfit`, `totalProfit` a všechny částky rozdělení zisku.
- Součet rekonstrukčních splátek musí přesně odpovídat zadaným nákladům rekonstrukce; případný haléřový zbytek přičti k poslední aktivní splátce podle části 7.4.
- V UI zobrazuj Kč podle českého formátu. Hlavní výsledky mohou být na celé Kč, detailní částky a kontrolní výstup na dvě desetinná místa.
- U peněžních inputů respektuj jazykové a lokální nastavení prohlížeče pro zobrazení desetinného oddělovače; český formát do nich nevynucuj. Parser musí bez ohledu na prohlížeč přijmout desetinnou čárku i tečku a před validací je jednoznačně normalizovat. Peněžní vstup dovoluje nejvýše dvě desetinná místa.
- Procenta zobrazuj standardně na jedno desetinné místo; vstup provize makléře dovol nejméně dvě desetinná místa.
- Záporné částky zobraz se znaménkem minus, nikoliv v absolutní hodnotě.
- Nulový zisk je vždy `NEVYCHÁZÍ`.

## 11 Validace

Blokující validace:

- chybí povinný vstup,
- peněžní vstup je záporný,
- kupní nebo prodejní cena je 0,
- procento makléře není v intervalu 0–100,
- pozice pobočky není 1–6,
- doba není celé nezáporné číslo,
- celková doba přesahuje 720 dní nebo zaokrouhlený měsíc přesahuje 24,
- bez rekonstrukce je zadán nenulový rozpočet nebo doba rekonstrukce.

Neblokující upozornění:

- tržní cena je nižší než garantovaná,
- garantovaná nebo tržní cena je nižší než kupní cena,
- náklady na výkup nebo měsíční náklady jsou 0,
- je zapnutá rekonstrukce s nulovým rozpočtem či nulovou dobou.

První verze nemá vynucovat neodsouhlasené minimální náklady. Příklad 15 000 Kč ze STING kalkulačky je pouze inspirace, nikoliv pravidlo BO!.

## 12 Referenční testy

### 12.1 STING referenční aritmetika

Tento test ověřuje jen převzaté základní vztahy, nikoliv BO! cenu financování:

```text
purchasePrice = 5 000 000
guaranteedSalePrice = 4 000 000
marketSalePrice = 4 700 000
combinedCost = 525 000
```

Očekávání:

```text
guaranteed gross profit = -1 525 000
guaranteed gross margin = -38,125 %
market gross profit = -825 000
market gross margin = přibližně -17,5532 %
guaranteed 3 % incl. VAT = 120 000
market 3 % incl. VAT = 141 000
guaranteed 3 % excl. VAT = 99 173,55 po zaokrouhlení
market 3 % excl. VAT = 116 528,93 po zaokrouhlení
guaranteed totalProfit před financováním BO = -1 545 826,45
market totalProfit před financováním BO = -849 471,07
```

Poslední dvě hodnoty jsou konsolidace STING způsobem bez BO finančních nákladů: hrubý zisk minus provize včetně DPH plus provize bez DPH.

### 12.2 BO časová logika a oprava kupní ceny

Vstupy:

```text
branchPosition = 1
purchasePrice = 1 000 000
reconstructionCost = 100 000
buyoutCost = 50 000
monthlyOperatingCost = 10 000
reconstructionDays = 30
saleDays = 60
isCooperative = false
guaranteedSalePrice = 1 400 000
marketSalePrice = 1 600 000
brokerCommissionRatePct = 29
```

Při jedné katastrální lhůtě 21 dní:

```text
totalDays = 111
actualMonths = 3,7
roundedMonths = 4
charged monthly costs = 5 × 10 000 = 50 000
reconstruction is distributed into months 1 and 2, 50 000 each
purchase financing cost = 69 560
other-cost financing cost = 11 844
total financing cost = 81 404
total direct cost = 1 200 000
guaranteed profit after financing = 118 596
guaranteed 3 % incl. VAT = 42 000
guaranteed 3 % excl. VAT = 34 710,74
guaranteed propertyProfit = 76 596
guaranteed totalProfit = 111 306,74
market profit after financing = 318 596
market 3 % incl. VAT = 48 000
market 3 % excl. VAT = 39 669,42
market propertyProfit = 270 596
market totalProfit = 310 265,42
both scenarios = VYCHÁZÍ
```

Kupní cena musí být v přímých nákladech přesně jednou. Test musí selhat, pokud by byla odečtena v měsících 1–4 znovu.

### 12.3 Rozdělení zisku referenčního testu

Pro pozici pobočky 1, tedy `p = 66,6 %`, a sazbu makléře 29 % musí po zaokrouhlení vyjít:

```text
garantovaný rkShareAmount = 74 130,29
garantovaný investorShareAmount = 37 176,45
garantovaný brokerCommissionAmount = 21 497,78
garantovaný rkAfterBrokerCommission = 52 632,51

tržní rkShareAmount = 206 636,77
tržní investorShareAmount = 103 628,65
tržní brokerCommissionAmount = 59 924,66
tržní rkAfterBrokerCommission = 146 712,11
```

Součet podílu RK/sítě a investora musí být po zaokrouhlení vždy přesně roven `totalProfit`.

### 12.4 Družstevní vlastnictví bez rekonstrukce

Pro pozici 1, kupní cenu 1 000 000 Kč, prodejní cenu 1 210 000 Kč, nulové ostatní náklady, nulovou dobu prodeje a vypnutou rekonstrukci:

```text
družstevní: cadastralDays = 0
družstevní: totalFinancingCost = 0
družstevní: totalProfit = 203 700

nedružstevní: cadastralDays = 21
nedružstevní: actualMonths = 0,7
nedružstevní: roundedMonths = 1
nedružstevní: totalFinancingCost = 13 160
nedružstevní: totalProfit = 190 540
```

Test prokazuje, že se 21 dní přidává pouze nedružstevní nemovitosti a že se při vypnuté rekonstrukci neúčtují žádné náklady rekonstrukce.

### 12.5 Hraniční stav

- zisk `0,01 Kč` → `VYCHÁZÍ`,
- zisk `0,00 Kč` → `NEVYCHÁZÍ`,
- zisk `-0,01 Kč` → `NEVYCHÁZÍ`.

### 12.6 Haléřové rozdělení rekonstrukce

Tento test ověřuje pořadí a přesnost rozdělení, které ovlivňuje kumulované náklady i cenu financování. Pro zapnutou rekonstrukci s `reconstructionDays = 60` jsou aktivní měsíce 1, 2 a 3. Při:

```text
reconstructionCost = 100 000,01 Kč
```

musí rozpis `reconstructionOutflow` vyjít přesně:

```text
měsíc 1 = 33 333,33 Kč
měsíc 2 = 33 333,33 Kč
měsíc 3 = 33 333,35 Kč
součet = 100 000,01 Kč
```

Test musí ověřit, že právě tento rozpis vstupuje do `cumulativeOtherOutflow` a do výpočtu `otherFinancingCost`; nesmí jej nahradit neomezeně přesným podílem ani zaokrouhlenými zobrazenými hodnotami.

## 13 Akceptační kritéria

MVP je hotové pouze tehdy, když:

1. oba scénáře reagují na společné vstupy a vlastní prodejní cenu,
2. garantovaný scénář je jednoznačně hlavní,
3. výpočet kupní ceny neopakuje chybu zdrojového Excelu,
4. tabulka pozic pobočky přesně odpovídá části 6,
5. projektový management, reklamační fond a participace nejsou nikde ve výpočtu,
6. chybějící povinné vstupy nezobrazují falešné nuly,
7. časová osa a finanční náklady lze auditovat v harmonice,
8. limit 24 měsíců je vynucen,
9. testy v části 12 procházejí včetně haléřových výsledků a rozdělení nedělitelné rekonstrukční částky,
10. desktop zobrazuje scénáře vedle sebe a mobil pod sebou,
11. aplikace funguje bez databáze, autentizace a externích API,
12. všechny výpočty jsou deterministické a jednotkově otestované,
13. PDF vznikne z aktuálního validního stavu, obsahuje oba scénáře v A4 na šířku, nedělí výsledkovou kartu uvnitř logického bloku a nic se při tom neukládá,
14. peněžní input přijme desetinnou čárku i tečku nezávisle na lokálním chování prohlížeče.

## 14 Explicitně mimo MVP

- ukládání a načítání kalkulací,
- seznam vlastních kalkulací,
- sdílení a předávání,
- schvalovací workflow,
- vracení k opravě,
- uzamykání,
- historie verzí,
- notifikace a e-maily,
- přílohy a porovnání s realitami,
- napojení na zakázku, uživatele nebo intranet,
- administrace konstant,
- automatické doporučené nebo minimální náklady,
- schvalovací formulář celého výkupu.

## 15 Instrukce pro implementující LLM

- Nezjednodušuj ani nenahrazuj vzorce heuristikou.
- Neodvozuj `VYCHÁZÍ` z barvy, marže nebo pozice pobočky; rozhoduje výhradně znaménko schváleného zisku po všech nákladech.
- Nepoužívej STING sazby ceny zdrojů. Financování se počítá výhradně BO! modelem z části 7.
- Nepřenášej ukládání ani workflow ze STINGu.
- Udržuj výpočetní jádro nezávislé na konkrétní UI technologii.
- Ke každému vzorci napiš jednotkový test.
- V UI u každého odvozeného čísla umožni zobrazit jeho vzorec a vstupní hodnoty.
- Pokud narazíš na rozpor mezi tímto zadáním a implementací, oprav implementaci; neměň potichu zadání.

## 16 Úplná mapa zdrojového Excelu

Tato příloha je normativní audit zdrojového souboru `Kalkulacka VYKUPY _ sablona v 1.3.xltx`. Jejím účelem je zabránit tomu, aby implementace vynechala skrytou logiku nebo naopak přenesla odstraněnou či chybnou část.

### 16.1 List Výpočet zakázky

| Buňka | Původní význam nebo vzorec | Rozhodnutí pro MVP |
|---|---|---|
| `C10` | pozice pobočky 1–6 | zachovat jako `branchPosition` |
| `C11` | `VLOOKUP(C10, Pomocná data!K7:O12, 2)` | zachovat jako načtení měsíční efektivity `e` |
| `C12` | `VLOOKUP(C10, Pomocná data!K7:O12, 3)` | zachovat jako načtení podílu RK/sítě `p` |
| `C13` | ručně zadané procento pozice makléře | přejmenovat na `Provize makléře dle kariérní pozice [%]` |
| `C14` | participace makléře minimálně 5 % | odstranit |
| `C15` | `C14 * C34`, korunová participace | odstranit |
| `C23` | družstevní vlastnictví ANO/NE | zachovat jako boolean |
| `C34` | kupní cena | zachovat |
| `C35` | očekávaná rekonstrukce či opravy | zachovat pouze při rekonstrukci |
| `C36` | jediná očekávaná prodejní cena | nahradit dvěma cenami a dvěma scénáři |
| `C37` | doba rekonstrukce ve dnech | zachovat |
| `C38` | doba prodeje ve dnech | zachovat |
| `C39` | `IF(C23="ANO", C37+C38, 21+C37+C38+21)` | opravit na právě jednu katastrální lhůtu 21 dní u nedružstevní nemovitosti |
| `C40` | `C39-C38-C37` | zachovat jako odvozené `cadastralDays` |
| `C43` | právní náklady | sloučit do `Náklady na výkup` |
| `C44` | 6 % rekonstrukce při checkboxu projektového managementu | odstranit včetně checkboxu a komentáře |
| `C45` | 5 % rekonstrukce při checkboxu reklamačního fondu | odstranit včetně checkboxu |
| `C46` | převodní poplatek družstva | sloučit do `Náklady na výkup` |
| `C47` | pojištění nemovitosti | sloučit do `Náklady na výkup` |
| `C48` | měsíční energie, nájem a služby | zachovat samostatně, protože se násobí časem |
| `C49` | jiné náklady za dobu investice | sloučit do jednorázových `Nákladů na výkup` v měsíci 0; schválená odchylka od původního časování |
| `C50` | součet finančních nákladů z kupní ceny a ostatních nákladů | zachovat výpočetně |
| `F10` | `Simulace!C42 * C12`, podíl RK/sítě na zisku včetně DPH | zachovat princip podílu `p`, ale aplikovat jej až na konsolidovaný `totalProfit` |
| `F11` | `IF(C23="ANO", F10, F10/1.21)` | nepřenášet; DPH je řešena explicitní 3% provizí podle části 8.3 |
| `F14` | `C13 * F10`, provize makléře | zachovat s přejmenovaným procentním vstupem |
| `F15` | zisk makléře z participace | odstranit |
| `F16` | součet provize a participace | po odstranění participace se rovná pouze provizi makléře |

### 16.2 List Simulace na dny

Zdrojový list používá měsíce v buňkách `C:AA`, tedy indexy 0–24, a součty ve sloupci `AB`.

| Řádek | Původní logika | Rozhodnutí pro MVP |
|---:|---|---|
| 5 | celkový počet dní z hlavního listu | zachovat s opravenou katastrální lhůtou |
| 6 | skutečné měsíce `dny/30` a celé měsíce `CEILING(...,1)` | zachovat |
| 7 | index měsíce 0–24 | zachovat |
| 8 | frakce plného či posledního neúplného měsíce | zachovat přesně podle části 7.2 |
| 11 | aktivní transakce pro měsíce `t <= roundedMonths` | zachovat; způsobuje `roundedMonths + 1` provozních plateb |
| 12 | rekonstrukce aktivní, pokud `30*t <= reconstructionDays+30` | zachovat přesně |
| 13 | kupní cena násobená aktivní transakcí v každém měsíci | opravit; přímý výdaj kupní ceny smí nastat pouze v měsíci 0 |
| 14 | rekonstrukce rovnoměrně rozdělená do aktivních měsíců rekonstrukce | zachovat s korekcí případného haléřového zbytku |
| 15 | právní náklady celé v měsíci 0 | zahrnout do souhrnných `Nákladů na výkup` v měsíci 0 |
| 16 | projektový management rozdělený jako rekonstrukce | odstranit |
| 17 | reklamační fond celý v měsíci 0 | odstranit |
| 18 | převodní poplatek celý v měsíci 0 | zahrnout do souhrnných `Nákladů na výkup` v měsíci 0 |
| 19 | pojištění celé v měsíci 0 | zahrnout do souhrnných `Nákladů na výkup` v měsíci 0 |
| 20 | měsíční náklad v každém aktivním měsíci | zachovat přesně |
| 21 | jiné náklady rozdělené rovnoměrně do všech aktivních měsíců | sloučit do `Nákladů na výkup` a účtovat v měsíci 0; schválená odchylka |
| 22 | celkové přímé náklady měsíce | zachovat po opravě řádku 13 |
| 23 | ostatní náklady bez kupní ceny | zachovat |
| 24 | kumulované ostatní náklady | zachovat jako základ finančních nákladů |
| 25 | kumulované veškeré vynaložené prostředky | informační mezivýsledek, není použit v dalších zdrojových vzorcích |
| 26 | `e * purchasePrice * fraction[t]`, od měsíce 1 | zachovat; opakování je zde financování, nikoliv opakovaný nákup |
| 27 | `e * cumulativeOtherCost[t] * fraction[t]`, od měsíce 1 | zachovat |
| 28 | prodejní příjem vložený v `t = roundedMonths` | zachovat pro každý scénář zvlášť |
| 29 | cash flow měsíce | přepočítat po opravě kupní ceny |
| 32 | součet finančních nákladů | zachovat |
| 33 | finanční výnos makléře z participace | odstranit |
| 34 | zbytek ceny peněz pro ostatní investory | odstranit spolu s participací, pokud není potřeba jako interní report |
| 36 | zisk po ceně peněz | zachovat jako klíčový zisk výkupu před rozdělením |
| 37 | zisk investora po odečtení podílu RK | zachovat z konsolidovaného `totalProfit` |
| 38 | podíl RK/sítě | zachovat z konsolidovaného `totalProfit` |
| 39 | provize makléře | zachovat s novým procentním vstupem |
| 41 | 30 % z uzávěrky bez DPH | odstranit; ve zdrojovém Excelu není použit v žádném dalším vzorci |
| 42 | kopie zisku z řádku 36 | zachovat jako scénářový výstup |

### 16.3 List Pomocná data

| Oblast | Obsah | Rozhodnutí |
|---|---|---|
| `B7:B14` | typy nemovitostí | nebudou v MVP, protože nevstupují do vzorců |
| `D7:D13` | dispozice | nebudou v MVP |
| `F7:F12` | stav nemovitosti | nebude v MVP |
| `H6:H15` | předpřipravené délky 0–270 dní | nepřenášet jako omezený seznam; vstup je celé číslo dní |
| `I6:I7` | ANO/NE | nahradit boolean ovládacími prvky |
| `K7:O12` | pozice, efektivita, podíl sítě, podíl investora a textové pásmo | přenést numerické sloupce přesně; textové pásmo je pouze popisné |

### 16.4 Zdrojové validace a formátování

- `C10` je seznam pozic 1–6.
- `C14 >= 5 %` patří odstraněné participaci a nepřenáší se.
- `C21`, `C24`, `C26` jsou seznamy pro údaje o nemovitosti, které se v MVP nepoužijí.
- `C23` je seznam ANO/NE pro družstevní vlastnictví.
- Peněžní vstupy byly v Excelu formátovány v Kč bez desetinných míst. Web počítá na haléře a prezentuje podle části 10.
- Růžová barva vstupních buněk a původní vizuální styl Excelu nejsou závazné; závazná je srozumitelnost dvou scénářů a vizuální priorita garantované varianty.

## 17 Přesná reference STING kalkulačky

STING je pouze srovnávací zdroj UX vzoru, dvousloupcové prezentace a struktury výkupové a realitní části. Níže uvedené vztahy dokumentují toto srovnání; výpočet financování BO! se jimi neřídí. Kód STING byl ověřen proti dodanému webarchive a screenshotům.

### 17.1 Vzorce STING

Pro scénář s prodejní cenou `S`, kupní cenou `P`, společnými náklady `C`, dobou do rekonstrukce `m1`, dobou rekonstrukce `m2`, dobou prodeje `m3`, náklady zprostředkování `Z` a sazbou obchodníka `q`:

```text
grossProperty = S - P - C
commissionInclVat = S * 0.03
commissionExclVat = commissionInclVat / 1.21
grossReality = commissionExclVat
netReality = grossReality - Z

sourceBeforeReconstruction = P * 0.015 * m1
sourceDuringReconstruction = (P + C) * 0.01 * m2
sourceDuringSale = (P + C) * 0.015 * m3

netProperty =
  grossProperty
  - commissionInclVat
  - sourceDuringReconstruction
  - sourceDuringSale

netTotal = netProperty + netReality
brokerReward = netTotal * q / 100
```

Bez rekonstrukce používá STING dva časové úseky:

```text
sourceBeforeSale = P * 0.015 * monthsTillSale
sourceDuringSaleNoReconstruction = P * 0.015 * monthsSale

netPropertyNoReconstruction =
  grossProperty
  - commissionInclVat
  - sourceBeforeSale
  - sourceDuringSaleNoReconstruction
```

### 17.2 Známá chyba STING

STING při rekonstrukci vypočítá a zobrazí `sourceBeforeReconstruction`, ale ve vzorci `netProperty` tuto částku neodečte. Screenshotový příklad proto sedí na chybnou implementaci. Tato chyba se do BO! kalkulačky nepřenáší. BO! navíc používá vlastní model financování, takže žádný STING náklad ceny zdrojů nevstupuje do produkčního výpočtu.

### 17.3 Co se ze STING nepřenáší automaticky

- ukládání,
- přehled kalkulací,
- přidělení uživateli,
- historie,
- výchozí náklady zprostředkování 15 000 Kč,
- minimální sazba obchodníka 29 %,
- STING branding a názvy STING Property či STING Reality,
- sazby ceny zdrojů STING.

## 18 Trasovatelnost požadavků

| Požadavek nebo rozhodnutí | Zdroj | Implementace v zadání |
|---|---|---|
| jednoduchá orientační kalkulačka, nikoliv schvalování | přepis a manažerské zadání | části 1 a 14 |
| dva scénáře vedle sebe | rozhodnutí zadavatele | části 1, 8 a 9 |
| garantovaná varianta rozhoduje | přepis a rozhodnutí zadavatele | části 1 a 9 |
| kladný konsolidovaný zisk vychází, nula a záporný nevychází | rozhodnutí zadavatele | části 1, 8.3 a 12.5 |
| opravit opakované účtování kupní ceny | rozhodnutí zadavatele | části 3, 7.3, 12.2 a 16.2 |
| dodržet měsíční chování Excelu | rozhodnutí zadavatele | části 7.2, 7.3 a 12.2 |
| limit 24 měsíců | rozhodnutí zadavatele a Excel | části 6.2, 7.1 a 11 |
| pozice pobočky 1–6 | Excel a rozhodnutí zadavatele | části 5.1 a 6.1 |
| tabulka pozic v tooltipu a harmonice | rozhodnutí zadavatele | části 6.1, 9.1 a 9.4 |
| ruční vstup provize makléře dle kariéry | rozhodnutí zadavatele | části 5.1 a 8.5 |
| odstranit participaci makléře | přepis, Markdown a rozhodnutí zadavatele | části 3, 6.2 a 16 |
| odstranit projektový management | rozhodnutí zadavatele | části 3, 6.2 a 16 |
| odstranit reklamační fond | rozhodnutí zadavatele | části 3, 6.2 a 16 |
| zachovat DPH | rozhodnutí zadavatele | části 6.2, 8.3 a 8.6 |
| pouze 21 dní katastru u nedružstevního vlastnictví | rozhodnutí zadavatele | části 6.2 a 7.1 |
| bez rekonstrukce bez nákladů rekonstrukce | rozhodnutí zadavatele | části 5.2, 7.4 a 11 |
| rekonstrukce jako jedna částka | rozhodnutí zadavatele | části 5.2 a 7.4 |
| jedna částka nákladů na výkup, reko a měsíčních nákladů | přepis, STING a rozhodnutí zadavatele | části 5.2, 7.3 a 7.4 |
| 3% provize ze scénářové prodejní ceny, náklad včetně DPH a výnos bez DPH | rozhodnutí zadavatele a STING | části 6.2 a 8.3 |
| konsolidovaný zisk výkupu a RK určuje verdikt | rozhodnutí zadavatele | části 2 a 8.3 |
| rozdělení zisku a provize makléře až po verdiktu | Excel a rozhodnutí zadavatele | část 8.5 |
| žádné ukládání ani sdílení v MVP | rozhodnutí zadavatele | části 1 a 14 |
| profilové vstupy mají být oddělené pro budoucí API | rozhodnutí zadavatele | část 5.1 |
| povinné jsou jen výpočetně nezbytné položky | rozhodnutí zadavatele | části 5 a 11 |
| PDF obsahuje pouze vstupy, výsledky a oba scénáře | rozhodnutí zadavatele | části 2 a 9.5 |
| UX inspirované STING | přepis, Markdown, screenshoty a webarchive | části 9 a 17 |
| kompletní audit vzorců Excelu | původní požadavek | části 7, 8 a 16 |
| zadání použitelné v Google AI Studio | původní požadavek | části 4, 13 a 15 |

## 19 Finální souhrn pravidel

1. Výpočet financování používá výhradně BO! měsíční efektivitu podle pozice pobočky.
2. Kupní cena je přímý výdaj pouze jednou v měsíci 0, ale její financování běží po dobu držení.
3. Nedružstevní nemovitost přidává 21 dní, družstevní 0 dní.
4. Vstupy nákladů tvoří jedna částka `Náklady na výkup`, jedna podmíněná částka `Náklady na rekonstrukci` a samostatné opakované `Měsíční náklady`.
5. Každý scénář odečte 3% provizi včetně DPH od výkupové části a přičte tutéž provizi bez DPH jako výnos RK.
6. Stav určuje `totalProfit`: kladný znamená `VYCHÁZÍ`, nulový nebo záporný `NEVYCHÁZÍ`.
7. Až následně se `totalProfit` rozdělí mezi RK/síť a investora a z podílu RK/sítě se vypočte provize makléře.
8. Garantovaná a tržní varianta se vždy zobrazí vedle sebe na desktopu a obě se zahrnou do PDF.
9. PDF vzniká pouze z aktuálního stavu a nic se neukládá.
