# Kundpriser och arbetsflöde – implementation

Goal: Kunder → Kundkort → Prisinställningar styr ärvda materialpåslag, med uppdragsavvikelser och stabila historiska materialbelopp.
Architecture: Befintlig IndexedDB v5 behålls. customers.materialMarkupPercent är valfri. jobs.markupPercent återanvänds med valfri markupMode (inherit/project). materials.unitPrice, markupPercent och customerUnitPrice återanvänds; lagrade inköpspriser behålls. Äldre jobb utan markupMode behåller sitt tidigare uppdragspåslag. Global standard använder lirogo_price_defaults.markupPercent.
Tech stack: Befintlig JavaScript/PWA, IndexedDB, Node test runner, Playwright WebKit/Chromium.

Användarens tio krav utgör den godkända funktionella utformningen; genomförande och pull request är uttryckligen begärda. Ingen produktionspublicering, dataradering, ändring av andra appar eller schema-versionering ingår.

- [x] Baseline: kör befintliga pris-/materialtester och ursprungligt mobile-smoke på origin/main i isolerad branch.
- [x] Prisregler: skriv tests/customer-pricing.cjs först. Förväntningar: resolve({markupMode:'inherit'}, {materialMarkupPercent:0}, 15).percent === 0; ändrad global/kund ändrar inte sparade radpriser. Implementera customer-pricing-v152.js med rena resolverfunktioner och IndexedDB-transaktioner.
- [x] Integration: createJob får ärvningsläge, addMaterial fångar gällande påslag och inköpspris. Befintliga rader fryses i samma transaktion före uppdragspåslagsändring. Prisimport och katalogkvantiteter respekterar sparade rader; samma artikel vid nytt påslag ger ny rad. Avslutade/faktureringsklara/fakturerade jobb skyddas från prisredigering.
- [x] Kundflöde: skriv browserprov som först misslyckas på nav-customers. Implementera customer-workflow-v152.js och nav-v56.js: kundlista, nytt kundkort via createCustomer, kundkort med aktuellt påslag och Ändra, global standard på ett ställe, återställ ärvning, kundens uppdrag, arbetslista och fakturaunderlagslista. Planerat behåller befintlig startsida/kalender. Radar och inställningar nås som sekundära verktyg. Minst 44px tryckytor och 16px formulärtext.
- [x] Placering: ta bort påslagsformuläret från materialets Planerat-flik. Visa uppdragets effektiva källa/värde och lägg projektavvikelsen under Pris & debitering → Prisinställningar. Visa inköpspris, radens procent och försäljningspris exkl. moms i både planerade och använda rader. Global formulärinställning flyttas till Kunder, med länk från gamla platsen.
- [x] Verifiering: nya Node-regler, browserflöden på 320/390/1280px, befintliga kund-/material-/offert-/faktura-/prisaktivering-/uppdateringsprov och mobile-smoke. Revidera gamla tester endast där användaren avsiktligen ändrat beteendet. Kontrollera gamla databasposter och backup/återställning, 0 %, ärvning, avvikelser, samma artikel efter prisändring, skyddade jobb och felfall.
- [x] PWA: båda nya lager laddas direkt av index.html efter befintliga lager, finns i sw.js FILES, CACHE höjs till lirogo-v152. Stor katalog precachas inte. Ingen render under diktering.
Slutförande: Granska specifikation, därefter kodkvalitet; åtgärda verifierade brister och testa på nytt. Dokumentera additiva fält och legacybeteende. Commit endast avsedda filer, push featurebranch, skapa och bifoga PR. Kontrollera GitHub CI och rapportera faktisk status.


