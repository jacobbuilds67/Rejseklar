# Rejseklar

Rejseklar er en dansk, lokal rejsecheckliste til campingvogne. Appen udvikles som en mobilvenlig Progressive Web App til iPhone og iPad og skal fungere uden internet efter installation.

## Status

Version 1 er funktionsfærdig. Hele rejseflowet, redigerbare masterdata, historik, backup/restore og hærdet PWA/offline-drift er implementeret. Appopdateringer aktiveres først efter brugerens valg, så et igangværende Flight Check ikke afbrydes.

## Kør lokalt

1. Åbn Terminal i projektmappen.
2. Kør `python3 -m http.server 4173`.
3. Åbn `http://localhost:4173` i en browser.

Appen skal åbnes gennem en lokal webserver. Hvis `index.html` åbnes direkte som en fil, kan browserens moduler og offlinefunktion ikke virke korrekt.

## Projektstruktur

- `src/ui`: skærme og brugergrænseflade
- `src/storage`: lokal database og dataadgang
- `src/domain`: validering og forretningsregler
- `assets/styles`: farver, layout og komponentdesign
- `service-worker.js`: offline-cache
- `manifest.webmanifest`: PWA-installation
- `tests`: automatiske kontroller

## Datalagring

Data gemmes lokalt i browserens IndexedDB. Appens brugergrænseflade læser ikke databasen direkte; den bruger et særskilt storage-lag. Det gør senere synkronisering mulig uden at omskrive hele appen.

## Masterdata

Pakning, klargøring og Flight Check bliver dataobjekter i databasen. Ingen checklistpunkter bliver lagt direkte ind i skærmkoden. Standarddata indlæses kun første gang og kan derefter redigeres af brugeren.

## Backup og restore

Åbn **Indstillinger → Backup og gendannelse**. **Eksporter backup** downloader alle appens data som JSON. Ved import vises først en valideret oversigt; eksisterende data ændres ikke, før brugeren accepterer overskrivningsadvarslen. Restore sker samlet, og en sikkerhedsbackup af de nuværende data downloades først.

## Installation på iPhone eller iPad

Når appen senere ligger på en HTTPS-adresse:

1. Åbn adressen i Safari.
2. Tryk på Del.
3. Vælg **Føj til hjemmeskærm**.
4. Åbn Rejseklar fra hjemmeskærmen én gang med internet, så appens filer kan gemmes offline.

Installationsstatus og samme vejledning findes også under **Indstillinger → Installation og offline**.

## Funktioner og kendte begrænsninger

- Én aktiv tur kan oprettes og redigeres. Deltagere og tilvalgsudstyr fastlåses ved generering; selve pakkelisten kan efterfølgende tilpasses.
- Et nyt personligt standardpunkt kan oprettes under Checklistpunkter ved at vælge typen Personligt og den relevante person.
- Klargøring genereres automatisk fra aktive masterdata, gemmer hver afkrydsning og viser gennemført-status ved 100 %.
- Flight Check kræver alle aktive punkter, før status kan blive **Klar til afgang**. Tidligere kontroller overskrives ikke.
- Første gennemførte Flight Check afslutter Pakning og Klargøring som redigerbare arbejdsflows, men bevarer deres faktiske status.
- En tur kan afsluttes efter mindst ét gennemført Flight Check.
- Historikken viser deltagere, faktisk pakke-/klargøringsstatus og alle tidsstemplede Flight Checks med deres punkt-snapshots.
- Backupimport understøtter aktuelt backup- og databaseskema version 1. Fremtidige formater kræver en dokumenteret migrering.
- Den automatiske browsertest dækker offline-genstart og Flight Check uden server. Endelig installationskontrol på fysisk iPhone/iPad kræver en HTTPS-adresse og enheden i hånden.
- iOS/iPadOS kan i særlige lagersituationer rydde webstedsdata. Brug derfor regelmæssig JSON-backup.

## Test og kvalitetssikring

Kør `npm test` for automatiske kontroller. Den samlede testprotokol findes i `docs/testplan.md`. Installation på en fysisk iPhone og iPad skal fortsat kontrolleres på den konkrete HTTPS-adresse, hvor appen publiceres.

## Videreudvikling

Storage-laget er adskilt fra domæne- og UI-koden, så senere synkronisering kan tilføjes bag samme dataadgang. Det vil kræve konfliktregler, identitet og en serverkomponent, men ikke en ny checklistemodel.
