# Kundspecifika materialpåslag och arbetsflöde (v152)

## Användning

Huvudnavigationen är Kunder → Uppdrag → Arbete → Fakturaunderlag. Planerat öppnar den befintliga startsidan med planering och kalender. Radar, Mer och Nytt uppdrag finns kvar som sekundära verktyg.

Öppna Kunder, sök kunden och öppna kundkortet. Aktuellt materialpåslag och dess källa visas direkt. Ändra under Prisinställningar sparar ett eget kundpåslag; Använd global standard tar bort kundens avvikelse. Standardpåslaget finns på ett enda ställe under Kunder. Den tidigare platsen i materialinställningarna länkar dit.

Uppdragets översikt och materialvy visar vilket påslag som gäller för nya rader. Pris & debitering → Prisinställningar erbjuder en uppdragsavvikelse och återställning till kundens/global standard. Kundinställningen ändras inte av ett projektpåslag. Äldre uppdrag behåller uttryckligen sitt tidigare uppdragspåslag tills användaren väljer ärvning.

Både planerade och använda materialrader visar inköpsbelopp, påslag i procent och försäljningsbelopp exklusive moms. Materialbelopp visar ören. Sparade rader behåller sina priser; samma katalogartikel vid ett senare påslag eller inköpspris kan därför bli en separat rad. En uttrycklig ändring via Ändra pris påverkar bara vald rad. Avslutade, faktureringsklara och fakturerade uppdrag skyddas från prisredigering.

## Data och kompatibilitet

IndexedDB är fortfarande **version 5** med samma sju tabeller och index. Inga tabeller, index, kundposter eller uppdrag raderas och ingen schemamigrering krävs.

| Plats | Förändring |
| --- | --- |
| `customers.materialMarkupPercent` | Nytt valfritt tal, minst 0. Saknat/null betyder ärv global standard. Återställning tar bort endast denna egenskap. |
| `jobs.markupMode` | Ny valfri metadata: `inherit` för nya uppdrag eller `project` för uttrycklig uppdragsavvikelse. Äldre jobb utan fältet använder sitt sparade `markupPercent`. |
| `jobs.markupPercent` | Befintligt fält återanvänds för projektpåslag och bakåtkompatibel prisbild. |
| `materials.unitPrice`, `markupPercent`, `customerUnitPrice`, `priceMissing` | Befintliga fält återanvänds. Nya rader fångar sitt påslag; äldre rader utan radpåslag får sin tidigare procentsats sparad atomiskt innan uppdragspåslaget ändras. |
| `lirogo_price_defaults.markupPercent` | Befintlig global standard i localStorage återanvänds. Ingen parallell standardinställning införs. |

Lagrat inköpspris används även för äldre rader och backuper. Endast en uttryckligen `priceMissing:true`-markerad rad kan få sitt första saknade inköpspris från prislistan; detta sparas före visning och behålls sedan vid senare prisimport. Godkända rader och låsta uppdrag får inte denna automatiska upplösning. Befintlig kontroll av osparade katalogförhandsvisningar mot den privata prislistan behålls.

Ändring av projektpåslag och infrysning av äldre radpåslag sker i samma transaktion. Antalsändringar läser senaste databasraden och uppdaterar minnet först efter lyckad commit. Bakomliggande kundfält, referenser och radundantag bevaras. Backup/återställning tar med de valfria fälten utan nytt backupformat.

## Ändrade filer

| Fil | Ansvar |
| --- | --- |
| `customer-pricing-v152.js` (ny) | Arvsregler, validering, transaktioner och materialprisformat. |
| `customer-workflow-v152.js` (ny) | Kundlista/kundkort/prisformulär, arbets- och fakturalistor samt återgång till ursprungsvy. |
| `index.html` | Koppling till befintliga skapande-/material-/prisvyer, stabil detaljladdning och oförändrat reseläge utan omritning. |
| `nav-v56.js` | Fyra huvudsteg, sekundära verktyg, historik och mobilnavigation. |
| `material-markup-v146.js` | Global standard utan massomräkning och uttryckliga radundantag. |
| `material-scope-v61.js` | Prisberoende artikelrader och transaktionella antalsändringar. |
| `price-engine-v105.js` | Sparade inköpspriser och beständig upplösning av saknade priser. |
| `sw.js` | Båda nya script i FILES, cache `lirogo-v152`, endast LiRos egna gamla cacheposter rensas. |
| `tests/customer-pricing.cjs` (ny) | 18 rena prisregel-/formateringsprov. |
| `tests/customer-pricing-browser.cjs` (ny) | 22 integrationsfall för pris/data/navigation/backup/samtidighet. |
| `tests/customer-workflow.cjs` (ny) | Hela kundflödet vid 320, 390 och 1280 px, stora tryckytor och överlappningskontroll. |
| `tests/service-worker-isolation.cjs` (ny) | Isolerad cacheaktivering bevarar andra appars cache. |
| `tests/job-pricing-mode.cjs` (ny i denna branch) | Två prisfältsregressioner för oförändrat/ändrat reseläge. |
| `tests/material-markup.cjs` | Befintliga material-/radprisprov anpassade till uttryckligt begärt historikbevarande. |
| `.github/workflows/mobile-smoke.yml` | Nya tester och uppdaterade navigationsförväntningar, Playwright 1.62.1. |
| `docs/superpowers/plans/2026-10-25-customer-material-markup.md` | Genomförandeplan. |
| `docs/customer-material-pricing.md` | Detta granskningsunderlag. |

## Verifiering

Samtliga 17 lokala kontrollgrupper är gröna efter riktade omkörningar av upptäckta regressionsfel. Där ingår:

- 21 Node-prov: 18 prisregler, ett cacheisoleringsprov och två reselägesprov.
- 22 integrationsfall i både WebKit och Edge/Chromium.
- Kundflödet på 320/390/1280 px i båda motorerna, inklusive bakåtnavigation, 44 px tryckytor, 16 px formulärtext och fri passage mellan sekundärverktyg och huvudnavigation.
- Den ursprungliga iPhone-liknande och desktop WebKit-smoken samt statiska JavaScript/PWA-kontroller.
- Befintliga prov för privat prisaktivering (150 119 syntetiska artiklar), prisimport, appuppdatering med bevarade priser/kunder, materialpåslag, prisparser, prisjämförelse och streckkod till material.
- Verklig export och återställning av en syntetisk backup med kundpåslag, projektläge och oförändrade materialbelopp.

Testerna använder isolerade webbläsarkontexter och testdata. Ingen produktionsdatabas eller fysisk iPhone/kamera/mikrofon har testats. Den faktiska iPhone-upplevelsen bör därför också granskas på en enhet innan produktionspublicering.

Spec- och kodgranskning hittade och fångade ytterligare pris-/navigationskonflikter med röda tester före korrigering. Återgranskningarna fann inga kvarvarande konkreta blockerare inom ändringens omfattning. Tidigare, bredare auditfynd utanför kundpris-/navigationsarbetet hanteras inte som lösta av denna PR.

Kransappen och övriga projekt är oförändrade. PR:n är för granskning; ingen merge eller produktionspublicering görs av detta arbete.
