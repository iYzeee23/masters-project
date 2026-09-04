# Walkthrough za nastavak rada na odbrani

## 1. Trenutni cilj

Priprema se odbrana master rada:

**Interaktivna vizualizacija grafovskih algoritama za pronalaženje puta sa podrškom veštačke inteligencije**

- kandidat: Predrag Pešić, 2024/3281;
- mentor: prof. dr Marija Punt;
- ustanova: Univerzitet u Beogradu, Elektrotehnički fakultet;
- planirano izlaganje: 10–15 minuta;
- konačna prezentacija: 15 slajdova, planirano trajanje oko 12:55.

Sledeći korak nije nova implementacija aplikacije. Treba iterirati sadržaj i izgled prezentacije na osnovu korisnikovih komentara, a zatim zajedno sa korisnikom izabrati fajlove za remote granu.

**Ne stage-ovati, commit-ovati niti push-ovati ništa bez izričitog dogovora sa korisnikom.**

## 2. Odakle početi

1. Otvori `Odbrana/Prezentacija/ODBRANA-MASTER-RADA-PREDRAG-PESIC-FINAL-V2.pptx` u PowerPoint-u.
2. Pročitaj ovaj dokument do kraja.
3. Za sadržajnu proveru koristi `Odbrana/Dokument za ucenje/PRIPREMA-ZA-ODBRANU-SUSTINA.md`.
4. Pitaj korisnika šta želi da menja u konačnoj prezentaciji ili nastavi od njegovog konkretnog komentara.
5. Menjaj generator, regeneriši PPTX i proveri ga u desktop PowerPoint-u.

## 3. Fajlovi i njihove uloge

### Prezentacija

| Fajl | Uloga | Izvor ili rezultat |
|---|---|---|
| `Prezentacija/ODBRANA-MASTER-RADA-PREDRAG-PESIC-FINAL-V2.pptx` | Konačan PowerPoint, 15 slajdova, 16:9 | generisani rezultat |
| `Prezentacija/generate-presentation-final.cjs` | Jedini izvor za konačni nativni PPTX | izvor |
| `Prezentacija/package.json` | PptxGenJS 4.0.1 i komanda `npm run generate` | izvor |
| `Prezentacija/package-lock.json` | zaključane Node zavisnosti | izvor |
| `Prezentacija/PREZENTACIJA-DRAFT.html` | Arhivski interaktivni HTML draft prethodne koncepcije | zaseban izvor |

`PREZENTACIJA-DRAFT.html` nije izvor konačnog PPTX-a i ne treba ga usklađivati sa novom pričom.

`node_modules/` je lokalna zavisnost i već je ignorisana korenskim `.gitignore` fajlom. Ne uključivati je u remote skup.

### Materijal za pripremu

| Fajl | Uloga |
|---|---|
| `Dokument za ucenje/PRIPREMA-ZA-ODBRANU-SUSTINA.md` | glavni, pristupačan izvor sadržaja; 21 poglavlje |
| `Dokument za ucenje/generate-defense-html.py` | generator samostalnog HTML vodiča |
| `Dokument za ucenje/PRIPREMA-ZA-ODBRANU.html` | generisani vodič za čitanje |
| `Dokument za ucenje/PRIPREMA-ZA-ODBRANU.md` | detaljni tehnički arhiv; nije trenutni izvor HTML-a |

Generator vodiča eksplicitno koristi:

```python
SOURCE = ROOT / "PRIPREMA-ZA-ODBRANU-SUSTINA.md"
OUTPUT = ROOT / "PRIPREMA-ZA-ODBRANU.html"
```

### Vizuelni resursi prezentacije

PPTX generator koristi postojeće slike, ne pravi kopije pored generatora:

- `Pisanje master rada/Slike/etf-logo-transparent.png` — transparentni ETF logo na naslovnom slajdu;
- `Pisanje master rada/Slike/snimak-5-2-2.png` — veliki prikaz aplikacije u prirodnoj razmeri.

## 4. Priča prezentacije

Prezentacija nije prepričavanje poglavlja rada. Tok je:

**problem učenja → objedinjeno rešenje → aplikacija → implementacija → istraživanje → rezultati → algoritamski kompromisi → evaluacija → pitanja**

| # | Slajd | Vreme | Funkcija u priči |
|---:|---|---:|---|
| 1 | Naslov | 0:30 | tema, kandidat, mentor i ETF |
| 2 | Problem i cilj | 0:50 | vizualizacija, poređenje i pokušaj često su razdvojeni |
| 3 | Tri nivoa učenja | 0:50 | vizualizacija, poređenje i Igraonica u jednom toku |
| 4 | Sistem u radu | 0:45 | jedan veliki, nedeformisan prikaz aplikacije |
| 5 | Arhitektura i tehnologije | 1:00 | klijent, server, podaci, AI i analiza |
| 6 | Sistem događaja | 1:00 | algoritam opisuje, prikaz reprodukuje |
| 7 | Veštačka inteligencija | 1:00 | program računa, AI objašnjava |
| 8 | Metodologija | 1:00 | kontrolisani scenariji, sirovi podaci i ponavljanje |
| 9 | Ključne metrike | 0:55 | rad, memorija, cena i suboptimalnost |
| 10 | Glavni rezultat | 0:55 | A* čuva kvalitet uz 62,5% manje istraživanja |
| 11 | Drugi rezultat | 0:55 | Swarm štedi 43,5% rada uz 2,97% suboptimalnosti |
| 12 | Osam algoritama | 1:10 | kratak pregled kompromisa svih implementiranih postupaka |
| 13 | Obim evaluacije | 0:45 | četiri nivoa i konkretan obim provere |
| 14 | Nielsenova evaluacija | 1:00 | deset principa i deset odgovora interfejsa |
| 15 | Hvala / pitanja | 0:20 | čista odjava i prelazak na diskusiju |

Govorne beleške postoje u oba formata:

- HTML: skriveni elementi `.speaker-notes`, prikaz tasterom `N`;
- PPTX: nativne PowerPoint Notes stranice, generisane pozivom `slide.addNotes()`.

## 5. Tvrdnje koje treba sačuvati

Ne menjati sledeće u pojednostavljene, ali netačne formulacije:

1. **Algoritmi rade i na klijentu i na serveru.** Pregledač ih lokalno izvršava radi animacije i scrubbing-a. Server ima posebne runnere za benchmark, AI kontekst i Playground proveru.
2. **REST ne prenosi svaki korak animacije.** Koristi se za mape, naloge, rezultate, AI i druge zahteve.
3. **Socket.IO ima usku ulogu.** Šalje `leaderboard:update`; klijent zatim preko REST-a ponovo učitava rang-listu.
4. **Program računa, AI objašnjava.** Jezički model ne određuje postojanje puta niti računa cenu puta.
5. **A* i Dijkstra daju nultu suboptimalnost u zbirnom eksperimentu.** A* prosečno proširuje 218,74, a Dijkstra 584,11 čvorova: 62,5% manje obrade.
6. **Swarm je kompromis.** U odnosu na A* proširuje 43,5% manje čvorova uz prosečno 2,97% suboptimalnosti.
7. **BFS nije optimalan na ponderisanom terenu.** Zbirna suboptimalnost je 18,11%, jer minimizuje broj koraka, ne zbir cena.
8. **DFS je u ovom grafovskom eksperimentu imao oko pet puta veći memorijski otisak od BFS-a.** Ne generalizovati to na svaku implementaciju i svaki model.
9. **0–1 BFS je korišćen i van svog prirodnog domena kao demonstracija ograničenja modela.** Zbirna suboptimalnost je 128,51%.
10. **AI evaluacija je pokazala promenljivu numeričku pouzdanost.** Stroga tačnost po modelima išla je približno od 35,7% do 90,0%.
11. **Nije dokazan bolji ishod učenja.** Frontend je sistematski samoevaluiran prema Nielsenovim heuristikama, a korisnički eksperiment nije sproveden.

Ako se broj ili zaključak menja, prvo ga proveriti u:

- `Pisanje master rada/Rad/08-rezultati-algoritmi.md`;
- `Pisanje master rada/Rad/09-evaluacija-ai-ux.md`;
- `Metrike/Algoritmi/EVALUATION.md`;
- `Metrike/AI/AI-EVALUATION.md`.

## 6. Vizuelna pravila prezentacije

- format 16:9;
- minimalistički akademski stil;
- Georgia za naslove, Aptos za telo;
- jedinstvena topla svetla podloga izvedena iz light teme aplikacije;
- tamnosmeđa tipografija i diskretni plavi, tirkizni, zlatni i ljubičasti akcenti;
- jedan glavni iskaz po slajdu;
- bez pasusa na platnu; detalji idu u govorne beleške;
- najviše jedan glavni dokaz ili vizuelni fokus po slajdu;
- slike se kadriraju bez razvlačenja;
- tekst, oblici i jednostavni grafikoni u PPTX-u ostaju izmenjivi;
- metodologija, metrike i dva glavna rezultata imaju odvojene, vizuelno lake slajdove;
- koristi se jedan veliki screenshot u prirodnoj razmeri, bez kolaža i sabijanja.
- svih osam algoritama ima sažet nalaz, a svih deset Nielsenovih heuristika konkretan primer.

PPTX je namerno čistiji od HTML drafta. HTML je koristan za brzo prototipovanje, ali je `.pptx` glavni format za odbranu.

## 7. Regenerisanje PowerPoint-a

Iz korena repozitorijuma:

```powershell
Push-Location '.\Odbrana\Prezentacija'
npm ci
npm run generate
Pop-Location
```

Rezultat:

```text
Odbrana/Prezentacija/ODBRANA-MASTER-RADA-PREDRAG-PESIC-FINAL-V2.pptx
```

Očekivani izlaz trenutne verzije:

```text
Kreiran ODBRANA-MASTER-RADA-PREDRAG-PESIC-FINAL-V2.pptx: 15 slajdova, približno 0.80 MB.
```

Brza provera generatora pre generisanja:

```powershell
node --check '.\Odbrana\Prezentacija\generate-presentation-final.cjs'
```

Svaki terminalski poziv agenta mora imati eksplicitan konačan timeout. Ne pokretati Angular ili serverski build; korisnik ih pokreće sam.

## 8. Obavezna provera posle izmene PPTX-a

1. Pokreni `node --check`.
2. Pokreni `npm run generate`.
3. Potvrdi da OOXML paket sadrži očekivani broj `ppt/slides/slide*.xml` i `ppt/notesSlides/notesSlide*.xml` fajlova.
4. Otvori PPTX u desktop PowerPoint-u.
5. Pregledaj sve slajdove u Slide Show ili ih privremeno izvezi u PNG na 1600×900.
6. Proveri prelom naslova, odsecanje teksta, deformaciju slika i čitljivost grafikona.
7. Ukloni privremene PNG preglede.
8. Proveri `git diff --check` za izvorne tekstualne fajlove.

Poslednja potvrđena provera konačne prezentacije:

- PowerPoint je otvorio fajl bez Repair dijaloga;
- 15 od 15 slajdova je renderovano;
- dimenzije su 960×540 pt, odnosno 16:9;
- postoji 15 nativnih govornih beleški;
- OOXML paket sadrži 2 medijska resursa;
- svih 15 renderovanih slajdova je vizuelno pregledano;
- nema uočenog sečenja teksta ili deformisanih slika;
- svi dijagrami, minijaturne ilustracije i tabela 5×2 ostaju nativno izmenjivi.

## 9. Regenerisanje vodiča za odbranu

Ovo je odvojeno od PowerPoint-a:

```powershell
python -m py_compile '.\Odbrana\Dokument za ucenje\generate-defense-html.py'
python '.\Odbrana\Dokument za ucenje\generate-defense-html.py'
```

Očekivani rezultat ima:

- 21 glavnu celinu;
- 9 tabela;
- 2 statička dijagrama;
- bez neobrađenih Mermaid blokova.

Ne menjati `PRIPREMA-ZA-ODBRANU.html` ručno. Menja se Markdown izvor ili generator, pa se HTML ponovo generiše.

## 10. Poznato stanje i namerne odluke

- `PREZENTACIJA-DRAFT.pdf` je namerno obrisan. Stari VS Code browser tab može i dalje prikazivati zastarelu lokalnu stranicu, ali fajl više nije deo radnog stabla.
- PowerPoint je napravljen pomoću `PptxGenJS 4.0.1`.
- PPTX sadrži nativni tekst, oblike i Notes; ugrađeni su samo snimci aplikacije.
- Naslov i podaci kandidata/mentora provereni su direktno iz `Мастер рад.docx`.
- Nije pravljen commit niti remote grana za ove izmene.
- Svi fajlovi vezani za odbranu trenutno su untracked.

## 11. Završna provera pred odbranu

Najpre tražiti korisnikov komentar na stvarni PPTX. Tipične odluke su:

1. da li tehnički slajd 5 treba više ili manje detalja;
2. da li treba ubaciti kratak živi demo posle slajda 4;
3. da li skratiti govorne beleške prema probnom vremenu izlaganja.

Ne dodavati tehnologije, biblioteke ili još grafikona samo zato što postoje u radu. Slajd ostaje samo ako pomera priču ili odgovara na verovatno pitanje komisije.

## 12. Budući izbor fajlova za remote

Ništa još nije izabrano. Kandidati su podeljeni u dva logička skupa.

### Skup A — prezentacija

```text
Odbrana/Prezentacija/ODBRANA-MASTER-RADA-PREDRAG-PESIC-FINAL-V2.pptx
Odbrana/Prezentacija/PREZENTACIJA-DRAFT.html
Odbrana/Prezentacija/generate-presentation-final.cjs
Odbrana/Prezentacija/package.json
Odbrana/Prezentacija/package-lock.json
Odbrana/WALKTHROUGH-ZA-SLEDECEG-AGENTA.md
```

### Skup B — priprema za odbranu

```text
Odbrana/Dokument za ucenje/PRIPREMA-ZA-ODBRANU-SUSTINA.md
Odbrana/Dokument za ucenje/PRIPREMA-ZA-ODBRANU.html
Odbrana/Dokument za ucenje/PRIPREMA-ZA-ODBRANU.md
Odbrana/Dokument za ucenje/generate-defense-html.py
```

Pre `git add` proveriti svaki skup sa:

```powershell
git status --short
git diff --no-index -- NUL '<novi-tekstualni-fajl>'
```

Za binarni PPTX proveriti veličinu i otvoriti ga u PowerPoint-u. Ne dodavati:

- `Odbrana/Prezentacija/node_modules/`;
- `__pycache__/`;
- privremene PowerPoint PNG preglede;
- obrisani `PREZENTACIJA-DRAFT.pdf`;
- druge administrativne ili nepovezane fajlove.

Konačan skup, naziv grane, commit poruka i push rade se tek posle korisnikove eksplicitne potvrde.

## 13. Kratak prompt za sledećeg agenta

> Nastavljamo završnu proveru prezentacije za odbranu master rada. Prvo pročitaj `Odbrana/WALKTHROUGH-ZA-SLEDECEG-AGENTA.md`, zatim otvori `Odbrana/Prezentacija/ODBRANA-MASTER-RADA-PREDRAG-PESIC-FINAL-V2.pptx`. PPTX se generiše iz `Odbrana/Prezentacija/generate-presentation-final.cjs`. Ne stage-uj, ne commit-uj i ne push-uj ništa dok zajedno ne izaberemo skup fajlova. Sačuvaj uniformnu toplu 16:9 temu, kratke slajdove i proverene tvrdnje iz walkthrough dokumenta. Posle svake izmene regeneriši PPTX i proveri svih 15 slajdova u desktop PowerPoint-u.