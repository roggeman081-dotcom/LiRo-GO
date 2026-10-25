# Regler för LiRo GO (gäller Codex, Claude och andra AI-verktyg)

1. **Nya lager (`*-vNN.js`) laddas med `<script src="./fil.js"></script>` i `index.html`**, före `</body>`, efter de andra lagren.
   Injicera ALDRIG skript via `sw.js`. Då saknas lagret vid första öppningen och CI stoppar (regressionsskydd).
2. Lägg samtidigt till filen i `FILES` i `sw.js` och höj `CACHE` (`lirogo-vNN`).
3. Rita inte om skärmen (`render()`) medan mikrofonen lyssnar – iOS kan då kasta det som sagts. Se `toggleDictate`.
4. `katalog-el.json` ska inte precachas i `FILES` (9 MB). Den laddas offline-först av `catalog-v60.js`.
5. Kör/kontrollera `.github/workflows/mobile-smoke.yml` – den måste vara grön innan man går vidare.

## Superpowers och Codex

Detta projekt ska utvecklas med Superpowers-arbetsflödet när pluginet är installerat i Codex.
- Kontrollera först om Superpowers finns tillgängligt. Om det saknas, förklara att det behöver installeras via Codex Plugins; påstå inte att pluginet är aktivt.
- Vid större ändringar: klarlägg behov, föreslå en kort design och invänta godkännande innan kod ändras.
- Arbeta i separat gren för riskfyllda ändringar. Dela upp arbetet, skriv tester före eller parallellt med implementering och granska ändringarna.
- Utför verkliga tester och redovisa vilka tester som körts, vad som lyckats och vad som återstår.
- Bevara befintliga funktioner, data och konfiguration. Ingen radering, publicering eller migration utan uttryckligt godkännande.
- Håll enkla ändringar enkla; undvik onödiga beroenden och ombyggnader.
- Skydda nycklar, personuppgifter och kunddata. Exponera aldrig hemligheter i kod eller loggar.

OBS: Denna AGENTS.md aktiverar inte Superpowers på egen hand. Pluginet installeras separat i Codex.

## Projektfokus

Följ särskilt befintliga regler för script-lager, cache, diktering och mobil-smoke-test. Prioritera korta arbetsflöden på iPhone och bevara flödet kund–uppdrag–arbete–tid–material–foto–kontroll–faktura.
