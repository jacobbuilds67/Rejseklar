# Analyse af Checkliste CV_20052023.pdf

Kildedokumentet har tre sider og 102 udfyldte checklistpunkter. Derudover indeholder det tomme formularlinjer og håndskrevne afkrydsninger. De tomme linjer er ikke datapunkter, og afkrydsningerne importeres ikke som historik, fordi dokumentet ikke har et sikkert dato- og tidsstempel for gennemførelsen.

## Sporbar fordeling

| Kildepunkter | Resultat i appen | Antal |
|---|---|---:|
| 1-66 og 79-84 | Fælles pakke-/udstyrspunkter | 72 |
| 67-78 | Personlige startskabeloner til tøj og fodtøj | 12 |
| 85-102 | Flight Check-masterpunkter | 18 |
| Nye app-punkter | Klargøring, tydeligt mærket som nye | 10 |

De 72 fælles pakkepunkter, 12 personskabeloner og 18 Flight Check-punkter giver tilsammen dokumentets 102 punkter.

## Redaktionelle ændringer

- `Opvaskebajle` er rettet til `Opvaskebalje`.
- `Adaptor` er rettet til `Adapter`.
- `Baggagerum` er rettet til `Bagagerum`.
- `Pressening` er rettet til `Presenning`.
- `Sanddaler` er rettet til `Sandaler`.
- `Ipads` er rettet til `iPads`.
- `SD card` er rettet til `SD-kort`.
- `Stole antal` er ændret til `Campingstole`; mængden beregnes pr. valgt person.
- `Foldeskabe til fortelt 2 stk` er ændret til et punkt med fast antal 2.
- `Kemi til toilet` er ændret til `Toiletkemi`.
- Flight Check-stikord er formuleret som entydige, afsluttede tilstande.
- Metoden med en bestemt grøn svamp er erstattet af rengøring efter producentens anvisninger.

Originalplaceringen bevares i hvert datapunkts `sourceReference`. Punkt-id'et følger læserækkefølgen i PDF'en.

## Betingede sikkerhedspunkter

Punkterne om låsning af cykelstativ og fastspænding af cykler aktiveres af det særskilte valgfrie udstyrspunkt `Cykler medbringes`. Dermed er sikkerhedskontrollen ikke afhængig af, om brugeren også vælger et cykelovertræk.

## Nye klargøringspunkter

PDF'en har ingen særskilt klargøringssektion. De ti klargøringspunkter i standarddata er derfor mærket med kildehenvisningen `Appens godkendte klargøringsliste` og kan skelnes fra PDF-importen.
