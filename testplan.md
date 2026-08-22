# Testplan og frigivelseskontrol – version 1

Denne protokol dækker kravene til fase 9 og kan genbruges ved senere frigivelser.

## Automatiske kontroller

Kør `npm test`. Testpakken kontrollerer:

- databaseskema og datalagre
- sporbarhed for alle 102 punkter fra PDF'en
- dato- og mængdevalidering
- HTML-escaping af brugerdata
- alle understøttede pakkeregler
- betingede Flight Check-punkter
- backupstruktur, relationer og versionsafvisning
- PWA-manifest, ikoner og komplet offline-appskal

Alle JavaScript-filer syntakskontrolleres desuden med `node --check`, og `git diff --check` bruges til at opdage formateringsfejl.

## Funktionel browsertest

| Område | Kontrol | Forventet resultat |
|---|---|---|
| Tur | Opret og redigér navn, dato og antal dage | Turen gemmes, og regelstyrede antal genberegnes |
| Personer | Vælg deltagere med individuelle punkter | Kun valgte personers snapshots medtages |
| Tilvalg | Vælg og fravælg valgfrit udstyr | Kun valgte punkter genereres |
| Pakning | Afkryds, ret antal, tilføj og fjern punkt | Fremdrift og data opdateres straks |
| Klargøring | Afkryds punkter og genåbn appen | Status og fremdrift bevares |
| Flight Check | Forsøg at færdiggøre før alle punkter | Klar-status kan ikke opnås |
| Flight Check | Gennemfør, lås og start et nyt | Nyt snapshot nulstilles; tidligere kontrol bevares |
| Historik | Afslut og åbn turen | Tur- og Flight Check-snapshots er read-only |
| Backup | Eksportér, validér og gendan | Alle datalagre gendannes samlet |
| Fejl | Importér ugyldig eller inkompatibel fil | Data erstattes ikke; dansk fejl vises |
| Offline | Stop webserver/netværk og genåbn appen | App, data og Flight Check fungerer fortsat |
| Responsive | Kontrollér 390 px og tabletbredde | Ingen vandret scrolling; touchmål er anvendelige |

## Frigivelsesresultat

- Automatiske tests: 9 af 9 bestået den 21. august 2026.
- Lokal browser: ny person, individuelle 9-dages mængder, tur, 51 pakkepunkter, 10 klargøringspunkter og to kontroller med 18 Flight Check-punkter er gennemført. Mængden nul blev bevaret efter genindlæsning; begge Flight Checks blev låst og bevaret.
- Offline: appen blev i fase 8 genstartet uden server; Flight Check kunne fortsættes og ændringer overlevede endnu en genstart.
- Historik og backup/restore: domænevalidering og tidligere browserflow er regressionstestet; snapshots og låsning er bevaret.
- Browserkonsol: ingen fejl registreret i de gennemførte flows.
- Fysisk iPhone/iPad via HTTPS: kræver publiceret adresse og de konkrete enheder.

En fysisk enhedstest skal mindst kontrollere installation via **Føj til hjemmeskærm**, genstart i flytilstand, safe-area omkring top/bund, backup-download og backup-filvalg i Safari.
