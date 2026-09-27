# LiRo GO – materialbeställning v65

## Första steg: mejlflöde
Målet är att materialplanering ska ske direkt efter kundbesöket utan att Roger behöver ändra sitt arbetssätt.

### Flöde
1. Öppna rätt projekt.
2. Välj **Planera material**.
3. Lägg in eller diktera materialbehov.
4. Markera varje rad som:
   - Finns i bilen
   - Behöver beställas
   - Osäkert / kontrollera
5. Spara listan på projektet.
6. Välj **Skapa beställning**.
7. LiRo GO skapar ett färdigt mejl med endast det som behöver beställas.

### Mejlet ska innehålla
- Projektnamn / kund
- Projekt- eller referensnummer om det finns
- Artikelbenämning
- Artikelnummer när det finns
- Antal
- Enhet
- Kommentar vid behov

### Status på projektet
Beställningslistan ska ligga kvar i LiRo GO och ha status:
- Ej beställt
- Beställt
- Hämtat / levererat

Mejl är endast utskicksmetoden. Projektet i LiRo GO är källan.

## Senare steg: full automation
När Allcell har lämnat besked om integrationsmöjligheter ska vi utvärdera:
- API
- EDI
- Automatisk filimport/export
- PDF/Excel/CSV-orderunderlag
- Projektreferens på ordern
- Automatisk import av artikelnummer, antal och inköpspris
- Automatisk matchning mot rätt projekt
- Direktbeställning från LiRo GO utan mejlsteg

## Princip
Bygg v65 så att mejlflödet senare kan ersättas av direktintegration utan att materiallistan eller projektstrukturen behöver göras om.
