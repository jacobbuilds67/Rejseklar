# Arkitektur og godkendte beslutninger

## Principper

- Vanilla JavaScript og native ES-moduler
- Mobil-first og dansk brugergrænseflade
- IndexedDB som lokal, persistent database
- UI, domænelogik og storage holdes adskilt
- Masterdata kopieres til stabile tursnapshots
- Gennemførte Flight Checks er låste snapshots
- Ingen checklistpunkter hardcodes i UI eller workflowlogik

## Godkendelser fra PDF-analysen

1. Alle 102 udfyldte PDF-punkter bevares. Den tidligere optælling på 103 talte kategoriskiftet ved "Kaffemaskine" dobbelt; ingen dokumentpunkter er udeladt.
2. De 18 eksisterende Flight Check-punkter forbliver Flight Check.
3. De øvrige 84 bliver pakke-/udstyrspunkter eller personlige startskabeloner.
4. Klargøring får nye, særskilt dokumenterede standardpunkter.
5. Cykelrelaterede Flight Check-punkter kan aktiveres betinget.
6. Tøj og fodtøj kopieres som redigerbar startliste til hver person.
7. Pakkeregler understøtter "Én pr. valgt person".
8. Original ordlyd og redaktionelle ændringer bevares i en analyselog.
9. Håndskrevne PDF-afkrydsninger importeres ikke som historik.

## Dataområder i version 1

- Indstillinger
- Personer
- Kategorier
- Pakkeregler
- Personlige startskabeloner
- Masterpunkter
- Ture med indlejrede historiske snapshots og Flight Checks

Separate repositories skjuler IndexedDB for resten af appen. En fremtidig synkroniserende implementering kan dermed tilføjes bag samme grænseflade.

## Datamigrering

`seedDataVersion` styrer små, målrettede opgraderinger af standarddata. En opgradering må ikke genindlæse hele startsættet oven i brugerens ændringer. Version 2 tilføjer derfor kun det særskilte valg `Cykler medbringes` og flytter de oprindelige cykelbetingelser, hvis de stadig har den tidligere standardværdi.

Version 3 deaktiverer Flight Check-punktet om det tidligere nedslåelige bord samt de seks teltudstyrspunkter. Teltpunkterne skjules også på en igangværende pakkeliste, hvis første afgang endnu ikke er gennemført. Afsluttede eller låste snapshots berøres ikke.

Appstarten er tolerant over for ufuldstændige data fra tidlige udviklingsversioner. En opdatering af standarddata må ikke blokere adgang til eksisterende lokale ture; ved en migrationsfejl åbnes appen derfor med de eksisterende data og en tydelig status om, at masterdataopdateringen afventer.

Service Workeren forsøger at hente appfiler fra netværket, før den bruger den lokale kopi. Dermed kan en fejlrettelse erstatte en defekt cache, mens den komplette appskal fortsat fungerer som fallback uden internet.
