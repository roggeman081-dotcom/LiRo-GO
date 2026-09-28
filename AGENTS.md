# Regler för LiRo GO (gäller Codex, Claude och andra AI-verktyg)

1. **Nya lager (`*-vNN.js`) laddas med `<script src="./fil.js"></script>` i `index.html`**, före `</body>`, efter de andra lagren.
   Injicera ALDRIG skript via `sw.js`. Då saknas lagret vid första öppningen och CI stoppar (regressionsskydd).
2. Lägg samtidigt till filen i `FILES` i `sw.js` och höj `CACHE` (`lirogo-vNN`).
3. Rita inte om skärmen (`render()`) medan mikrofonen lyssnar – iOS kan då kasta det som sagts. Se `toggleDictate`.
4. `katalog-el.json` ska inte precachas i `FILES` (9 MB). Den laddas offline-först av `catalog-v60.js`.
5. Kör/kontrollera `.github/workflows/mobile-smoke.yml` – den måste vara grön innan man går vidare.
