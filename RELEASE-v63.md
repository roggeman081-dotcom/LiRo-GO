# LiRo GO v63 – stabilitetsuppdatering

Fixar som ingår:

- Break-even laddar om materialdata när startsidan visas och när appen återfår fokus.
- Avslutsflödet rensar korrekt `finishConfirmV55` för aktuellt uppdrag.
- Kundrapport använder konfigurerad rapportadress när sådan finns, med `roger@liroelteknik.se` som reserv.
- PDF/Excel-export cachelagrar jsPDF och XLSX lokalt för offline-användning efter första online-laddningen.

Kvar för separat uppdatering:

- Projektbilder direkt inbäddade i kund-PDF.
- Verkligt Safari/PWA-test på iPhone: dela PDF/XLSX, flygplansläge, återanslutning och avbruten export.
