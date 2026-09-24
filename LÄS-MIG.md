# LiRo GO – så lägger du ut appen

Appen är fem filer: `index.html`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`.
De måste ligga på en https-adress för att offline ska fungera. GitHub Pages är gratis.

## 1. Lägg ut på GitHub Pages (ca 10 min)
1. Skapa konto på github.com (om du inte redan har ett från MT-byte).
2. Tryck **New repository**. Döp det till `liro-go`. Välj **Public**. Skapa.
3. Tryck **uploading an existing file**. Dra in alla fem filerna. Tryck **Commit changes**.
4. Gå till **Settings → Pages**. Under *Branch* välj `main` och `/ (root)`. Spara.
5. Efter en minut finns appen på `https://DITTNAMN.github.io/liro-go/`.

Koden blir publik, men dina kunder, uppdrag och tid ligger bara i din telefon. Inget laddas upp.

## 2. Installera på telefonen
- **iPhone:** Öppna adressen i Safari → Dela → *Lägg till på hemskärmen*.
- **Android:** Öppna i Chrome → meny → *Installera app*.

Öppna appen en gång med täckning. Sen fungerar den helt utan nät.

## 3. Uppdatera appen
1. Ladda upp de nya filerna till samma repository (eller pusha till branchen på GitHub).
2. Öppna `sw.js` och höj `lirogo-v1` till `lirogo-v2` (v3 nästa gång osv).
3. Öppna appen med täckning, stäng den och öppna igen.

Dina sparade kunder och uppdrag påverkas inte av uppdateringar.

## Nuvarande status
- Skärm 0 (öppning), skärm 1 (startvy) och skärm 2–5 (nytt uppdrag-flödet) är byggda.
- Uppdrags-detaljvyn (vad som händer när du trycker på ett kort) är inte byggd än.
- Ingen molnsynk – allt sparas i telefonens lokala lagring (IndexedDB), precis som MT-byte.
