# Evaluacija korisničkog interfejsa
## Pathfinder Visualizer — Heuristička evaluacija i tehničke UX metrike

**Datum generisanja:** 2026-04-10

---

## Tehničke UX metrike

### Bundle i performanse

| Metrika | Vrednost |
|---------|----------|
| Main bundle (JS) | 586.41 KB (130.33 KB gzipped) |
| Styles (CSS) | 20.09 KB (4.31 KB gzipped) |
| Ukupno | 606.50 KB (134.64 KB transfer) |
| Build vreme | ~2.7s |
| Framework | Angular 19 (standalone components) |
| CSS | Tailwind CSS v4 |
| Render engine | HTML5 Canvas (DPI-aware) |

### Arhitekturne metrike

| Metrika | Vrednost |
|---------|----------|
| Stranice (Pages) | 5 (Auth, Visualize, Compare, Playground, Profile) |
| Komponente | 3 (Grid, Toolbar, HelperOverlay) |
| Servisi | 11 (Grid, GridRenderer, Visualization, AI, API, Auth, Export, Helper, Socket, Theme, Translation) |
| Algoritmi (klijentski) | 8 implementacija sa zajedničkim step-based interfejsom |
| Rute | 5 sa AuthGuard/GuestGuard zaštitom |
| Ukupno TypeScript fajlova (client) | 30+ |

### Internacionalizacija (i18n)

| Metrika | Vrednost |
|---------|----------|
| Broj jezika | 2 (srpski SR, engleski EN) |
| Ukupno i18n ključeva | ~122 |
| Kategorije ključeva | Navigation, toolbar, playback, algorithms, helpers, legend, maps, AI, auth, profile |
| Mehanizam | TranslationService sa BehaviorSubject + `t()` metoda |
| Perzistencija | localStorage (`pf-lang`) — automatski se vraća na reload |

### Tema (Light/Dark)

| Metrika | Vrednost |
|---------|----------|
| Broj tema | 2 (dark — podrazumevana, light) |
| Boja pozadine (dark) | #352B22 (topla orah) |
| Boja pozadine (light) | #F5EFE7 (topla lan) |
| Boja teksta (dark) | #EDE0D0 |
| Boja teksta (light) | #6E5A4D |
| Boje algoritama | 9 jedinstvenih boja (BFS=plava, DFS=crvena, Dijkstra=zelena, A*=ljubičasta, Greedy=narandžasta, Swarm=cijan, Conv.Swarm=roze, 0-1 BFS=žuta, User=amber) |
| Pomoćne funkcije | darkenColor(), lightenColor(), blendColors() |
| Perzistencija | localStorage — automatski se primenjuje na reload |

### Helper sistem (interaktivni vodič)

| Stranica | Koraci | Mehanizam |
|----------|--------|-----------|
| /visualize | 8 koraka | Spotlight + tooltip |
| /compare | 5 koraka | Spotlight + tooltip |
| /playground | 4 koraka | Spotlight + tooltip |
| **Ukupno** | **17 koraka** | Bilingualni, sa retry logikom za pronalaženje DOM elemenata |

### Canvas rendering

| Metrika | Vrednost |
|---------|----------|
| DPI skaliranje | Da — `devicePixelRatio` za Retina/HiDPI |
| Zaobljeni uglovi ćelija | Da — `roundRect()` sa 15% radijusom |
| Razmak između ćelija | 1px gap |
| Težinski vinjeta | Radijalni gradijent proporcionalan težini |
| Prikaz težine | Broj u ćeliji sa adaptivnom bojom teksta |
| Compare mešanje boja | Da — `blendColors()` za multi-algoritamsku teritoriju |

---

## Nielsenovih 10 heurističkih principa

### 1. Vidljivost statusa sistema (Visibility of System Status)

**Ocena: ✅ Odlično**

**Šta princip zahteva:** Sistem uvek treba da informiše korisnika o tome šta se dešava, kroz odgovarajući feedback u razumnom vremenu.

**Kako aplikacija ispunjava:**
- **Playback state machine:** Jasno prikazuje trenutno stanje — IDLE / RUNNING / PAUSED / FINISHED — sa odgovarajućim vizuelnim indikatorima (play/pause dugme se menja)
- **Step counter:** Prikazuje `trenutniKorak / ukupnoKoraka` tokom vizualizacije, dajući korisniku preciznu informaciju o progresu
- **Metrike u realnom vremenu:** Desni sidebar prikazuje Expanded Nodes, Path Cost, Path Length, Execution Time — ažuriraju se dok vizualizacija radi
- **Canvas vizualizacija:** Boje ćelija se menjaju u realnom vremenu — plava (frontier), ljubičasta (istraženo), roze (trenutni), zlatna (put) — korisnik tačno vidi gde se algoritam nalazi
- **AI loading stanja:** "AI analizira..." tekst sa animacijom dok se čeka odgovor
- **Opacity metriken panela:** 0.4 dok nema rezultata, 1.0 kada se popune — sprečava zabunu

### 2. Podudaranje sistema i stvarnog sveta (Match Between System and Real World)

**Ocena: ✅ Odlično**

**Šta princip zahteva:** Sistem treba da govori jezikom korisnika, sa rečima, frazama i konceptima koji su mu poznati.

**Kako aplikacija ispunjava:**
- **Vizuelna metafora grida:** 2D mreža koja odgovara intuitivnom razumevanju "mape" — korisnik crta zidove, postavlja start/cilj, baš kao na papiru
- **Boje sa značenjem:** Zelena = start (pozitivan), crvena/koralna = cilj (destinacija), braon = zid (prepreka), zlatna = pronađen put (uspeh) — intuitivno mapiranje
- **Dvojezičnost (SR/EN):** Korisnik koristi aplikaciju na maternjem jeziku
- **Algoritamska terminologija:** Koristi se standardna terminologija iz teorije grafova (expanded nodes, path cost, heuristic) — poznata studentima koji uče ovu materiju
- **Playground metafora:** "Pokušaj sam da nađeš put" — gamifikacija poznata iz edukativnih alata
- **Emoji ikone:** ✨ Generate, 🎓 Tutor, 📊 Recommend — vizuelni shorthand za funkcionalnost

### 3. Korisnička kontrola i sloboda (User Control and Freedom)

**Ocena: ✅ Vrlo dobro**

**Šta princip zahteva:** Korisnici često pogreše i potreban im je jasno označen "izlaz u nuždi" bez potrebe za dugačkim dijalogom.

**Kako aplikacija ispunjava:**
- **Play/Pause/Step kontrole:** Korisnik može pauzirati, koračati napred, skočiti na početak (⏮) ili kraj (⏭) vizualizacije — potpuna kontrola nad animacijom
- **jumpToStep():** Klizač za "premotavanje" — korisnik može skočiti na bilo koji korak bez čekanja
- **Reset/Clear grid:** Jednim klikom briše prepreke/težine ili kompletno resetuje mapu
- **Undo za crtanje:** Desni klik briše ćeliju tokom crtanja (erase tool)
- **Playground: desni klik briše korak** iz korisnikovog puta
- **Helper dismiss:** Interaktivni vodič se može zatvoriti bilo kad bez gubitka podataka
- **⚠️ Ograničenje:** Nakon submit-a u Playground-u, mora se resetovati (nema "undo submit")

### 4. Konzistentnost i standardi (Consistency and Standards)

**Ocena: ✅ Odlično**

**Šta princip zahteva:** Korisnici ne bi trebalo da se pitaju da li različite reči, situacije ili akcije znače istu stvar.

**Kako aplikacija ispunjava:**
- **Ista boja = isti algoritam svuda:** BFS je uvek plava (#3B82F6), A* uvek ljubičasta (#8B5CF6) — na Visualize, Compare i Playground stranici
- **Ista legenda na sve 3 stranice:** Start (zelena), Goal (koraljna), Wall (braon), Open (plava), Closed (ljubičasta), Path (zlatna)
- **Isti toolbar dizajn:** Grupiranje kontrola je identično na sve 3 stranice — Algorithm + AI | Playback | Tools + Settings | Maps
- **Isti hover efekat:** `scale(1.04)` na svim dugmadima, `scale(1.015)` na inputima — konzistentan taktilni feedback
- **Isti sidebar layout:** Legenda levo + Metrike desno — sve 3 stranice
- **Ista terminologija:** "Expanded Nodes", "Path Cost", "Path Length" — iste reči na svim mestima

### 5. Prevencija grešaka (Error Prevention)

**Ocena: ✅ Vrlo dobro**

**Šta princip zahteva:** Bolji dizajn koji sprečava problem na prvom mestu, umesto dobrih poruka o grešci.

**Kako aplikacija ispunjava:**
- **Start/Goal zaštita:** GridService odbija da postavi zid ili težinu na Start/Goal poziciju — ne može se slučajno obrisati
- **Dugmad onemogućena po stanju:** Play dugme onemogućeno dok je vizualizacija RUNNING; Step dugme onemogućeno u FINISHED stanju
- **Minimum algoritam u Compare:** Dugme "Run" onemogućeno ako nijedan algoritam nije selektovan
- **Validacija puta u Playground:** `isValidPath()` proverava da li put sadrži start i cilj, da nema zidova, i da su sve ćelije susedne — sprečava submit nevalidnog puta
- **Swarm weight** slider se automatski onemogućava (opacity 0.3) kada selektovani algoritam ne koristi swarm parametar
- **Grid dimenzije:** Validacija (min 5, max 200) sprečava kreiranje pre-malih ili pre-velikih mapa
- **Canvas desni klik:** `contextmenu` event je preventiran — sprečava slučajan browser meni umesto crtanja

### 6. Prepoznavanje umesto prisećanja (Recognition Rather Than Recall)

**Ocena: ✅ Odlično**

**Šta princip zahteva:** Minimalizovati opterećenje korisnikove memorije tako što će opcije, akcije i objekti biti vidljivi.

**Kako aplikacija ispunjava:**
- **Permanentna legenda:** Levi sidebar uvek prikazuje šta boje znače — korisnik ne mora da pamti
- **Permanentne metrike:** Desni sidebar prikazuje sve ključne metrike — nikad skrivene
- **Algoritamski opisi na hover:** Kada se preñe mišem preko algoritma u dropdown-u, pojavi se opis (npr. "A* — koristi heuristiku za optimalan put")
- **Vizuelna legenda u Compare:** Svaki algoritam ima svoju boju prikazanu uz ime — nikad ne mora da pamti "koja je boja za BFS?"
- **Helper overlay:** 17 koraka koji objašnjavaju šta svaka kontrola radi — uvek dostupno
- **Score breakdown u Playground:** Umesto samo ukupnog broja, prikazuje formulu (Cost Penalty + Invalid Moves + Speed Bonus + Match Bonus) — korisnik vidi zašto ima taj skor

### 7. Fleksibilnost i efikasnost korišćenja (Flexibility and Efficiency of Use)

**Ocena: ✅ Vrlo dobro**

**Šta princip zahteva:** Prečice — nevidljive za novog korisnika — mogu ubrzati interakciju za iskusnog korisnika.

**Kako aplikacija ispunjava:**
- **Desni klik za brisanje:** Prečica za iskusne — brzo brisanje bez menjanja alata
- **Drag & drop Start/Goal:** Iskusni korisnik može prevući start/cilj bez ponovnog selektovanja alata
- **jumpToStep klizač:** Napredni korisnik može "skrolirati" kroz vizualizaciju umesto korak-po-korak
- **Speed slider:** Od sporih edukativnih animacija (200ms) do brzih benchmark pokretanja (10ms)
- **Select All / Deselect All u Compare:** Brzo biranje svih 8 algoritama umesto pojedinačnog klika
- **Generator prečice:** Jedan klik generiše mapu umesto ručnog crtanja — ubrzava eksperimentisanje
- **AI Generate:** Tekstualni opis → automatski generisana mapa — "power user" feature

### 8. Estetski i minimalistički dizajn (Aesthetic and Minimalist Design)

**Ocena: ✅ Odlično**

**Šta princip zahteva:** Dijalozi ne bi trebalo da sadrže informacije koje su irelevantne ili retko potrebne.

**Kako aplikacija ispunjava:**
- **Warm luxury tema:** Konzistentan dizajn sa toplim braon tonovima — ne koristi "generic" bele/sive boje već prepoznatljivu estetiku
- **Progresivno otkrivanje:** AI paneli, Settings, Grid opcije su sakriveni u dropdown-ove — vidljivi samo kad su potrebni
- **Metrike opacity:** Panel ima opacity 0.4 dok nema podataka — vizuelno "nestaje" umesto da prikazuje prazne vrednosti
- **Kompaktna legenda:** Samo boja + ime — bez dugačkih opisa
- **Chip dizajn za algoritme:** U Compare modu, algoritmi su chips umesto liste — štedi prostor i izgleda modernije
- **Jedinstven grid prostor:** Canvas zauzima centralni prostor, sidebari su uski (120px) — fokus je uvek na vizualizaciji

### 9. Pomoć korisnicima da prepoznaju, dijagnostikuju i reše greške (Help Users Recognize, Diagnose, and Recover from Errors)

**Ocena: ✅ Dobro**

**Šta princip zahteva:** Poruke o greškama treba da budu izražene običnim jezikom, da precizno ukažu na problem i konstruktivno predlože rešenje.

**Kako aplikacija ispunjava:**
- **Playground validacija:** "Put mora sadržati start i cilj" — jasno kaže šta fali
- **"Popunite sva polja"** — validaciona poruka za grid dimenzije
- **Score breakdown:** Umesto samo "Skor: 45", prikazuje "-30 cost penalty, -15 invalid moves, +5 speed bonus" — korisnik tačno vidi gde gubi poene
- **AI error graceful fallback:** Ako AI ne odgovori, prikazuje se poruka umesto praznog panela
- **No path indikator:** Kada algoritam ne pronañe put, metrike prikazuju "—" umesto 0 ili prazno — jasno razlikuje "nema puta" od "nije pokrenuto"
- **⚠️ Ograničenje:** Nema detaljnih error poruka za mrežne greške (API nedostupan) — prikazuje generički error

### 10. Pomoć i dokumentacija (Help and Documentation)

**Ocena: ✅ Vrlo dobro**

**Šta princip zahteva:** Čak i ako je sistem upotrebljiv bez dokumentacije, može biti neophodno pružiti pomoć.

**Kako aplikacija ispunjava:**
- **Helper sistem (17 koraka):** Interaktivni spotlight + tooltip vodič za svaku od 3 stranice — vodi korisnika korak po korak
- **AI Tutor:** Objašnjava ključne momente algoritma na razumljivom jeziku — kontekstualna pomoć bazirana na stvarnom izvršavanju
- **AI Contextual Help:** Klik na metriku prikazuje kratko objašnjenje (npr. "A* je obradio 347 čvorova jer je heuristika usmerila pretragu ka cilju")
- **Algoritamski opisi:** Svaki algoritam ima opis na hover-u
- **Bilingualna pomoć:** Sva pomoć dostupna na oba jezika (SR/EN)

---

## Tognazzinijevi principi interakcije

### 1. Anticipacija (Anticipation)

**Ocena: ✅ Vrlo dobro**

Aplikacija anticipira potrebe korisnika: kada se selektuje algoritam koji ne koristi heuristiku (BFS, DFS), heuristički dropdown se automatski onemogućava. Kada se selektuje algoritam koji nije Swarm, weight slider nestaje. Grid se automatski prilagođava dimenzijama — veći gridovi imaju manje ćelije, manji imaju veće.

### 2. Autonomija (Autonomy)

**Ocena: ✅ Odlično**

Korisnik ima punu kontrolu: bira algoritam, crta mapu, kontroliše brzinu, pauzira kad hoće. Nema prinudnih akcija — čak i Helper može da se zatvori u bilo kom trenutku. Playground dozvoljava potpuno slobodnu konstrukciju puta.

### 3. Konzistentnost (Consistency)

**Ocena: ✅ Odlično**

Ista boja, isti layout, isti hover efekti na svim stranicama. Toolbar je identično struktuiran na Visualize, Compare i Playground. Legenda je uvek levo, metrike uvek desno.

### 4. Efikasnost (Efficiency)

**Ocena: ✅ Vrlo dobro**

Drag-and-drop za Start/Goal, desni klik za brisanje, speed slider za brzu animaciju, Select All/Deselect All u Compare. AI Generator omogućava kreiranje mape jednom rečenicom umesto ručnog crtanja.

### 5. Učivost (Learnability)

**Ocena: ✅ Odlično**

Helper sistem sa 17 koraka vodi korisnika kroz svaku funkcionalnost. Progresivno otkrivanje — napredne opcije su sakrivene u dropdown-ove. Playground nudi gamifikaciju koja motiviše učenje kroz praksu.

### 6. Čitljivost (Readability)

**Ocena: ✅ Odlično**

Cormorant Garamond za logo, Inter za body tekst. Visok kontrast u oba teme (WCAG AA). Važne metrike su prikazane velikim fontom (22px bold). Brojevi u ćelijama imaju adaptivnu boju (bela na tamnoj pozadini, tamna na svetloj).

### 7. Praćenje stanja (Track State)

**Ocena: ✅ Odlično**

Visualization state machine (IDLE → RUNNING → PAUSED → FINISHED) precizno prati gde se korisnik nalazi. Theme i Language se pamte u localStorage. Auth stanje (JWT + inactivity timeout) je transparentno.

### 8. Vidljiva navigacija (Visible Navigation)

**Ocena: ✅ Vrlo dobro**

Tab navigacija (Visualize / Compare / Playground) je uvek vidljiva. Aktivna stranica je vizuelno označena. Profile i Logout su u headeru. Toolbar grupiše kontrole logički.

### 9. Smanjenje latencije (Reduce Latency)

**Ocena: ✅ Odlično**

Vizualizacija koristi pre-computation — `prepare()` pre-izračunava sve korake, pa Play dugme reaguje instant. Canvas rendering je optimizovan sa batch applyEvents. AI pozivi imaju loading indikatore.

### 10. Zaštita korisnikovog rada (Protect Users' Work)

**Ocena: ✅ Dobro**

Mape se čuvaju u bazi (Save/Load). Run rezultati se čuvaju. Tema i jezik su persistentni. **⚠️** Grid stanje se NE čuva automatski — ako korisnik osveži stranicu, ručno nacrtana mapa se gubi (osim ako je sačuvana).

### 11. Defaulti (Defaults)

**Ocena: ✅ Vrlo dobro**

Grid: 25×50 default dimenzije. Algoritam: Dijkstra default. Heuristika: Manhattan. Brzina: 50ms. Tema: Dark. Jezik: engleski. Svi defaulti su razumni za novog korisnika i mogu se lako promeniti.

### 12. Tolerancija grešaka (Error Tolerance)

**Ocena: ✅ Vrlo dobro**

Start/Goal ne mogu biti obrisani slučajno. Validacija pre submit-a u Playground-u. Disabled dugmad sprečavaju nevalidne akcije. Canvas desni klik ne otvara browser meni.

### 13. Feedback (Feedback)

**Ocena: ✅ Odlično**

Hover scale efekti (1.04× dugmad, 1.015× inputi). Canvas boje u realnom vremenu. Score breakdown sa bojama (zelena/narandžasta/crvena). AI loading animacije. Opacity promene za "čekanje podataka" stanje.

### 14. Fittsov zakon (Fitts' Law)

**Ocena: ✅ Dobro**

Play/Pause dugme je prominentno u centru toolbar-a. Algoitam dropdown je dovoljno širok. **⚠️** AI panel ima male dugmiće za navigaciju (◀ ▶) koji mogu biti teški za klik na mobilnim uređajima.

### 15. Interfejs za istraživanje (Explorable Interface)

**Ocena: ✅ Odlično**

Korisnik može slobodno eksperimentisati: nacrtati mapu, pokrenuti algoritam, resetovati, probati drugi. Playground ohrabruje eksperimentisanje kroz gamifikaciju. Generator omogućava "šta ako" scenarije.

### 16. Undo (Undo)

**Ocena: ⚠️ Delimično**

Desni klik za brisanje prilikom crtanja. Desni klik za brisanje koraka u Playground-u. **Ali:** Nema pravog undo/redo sistema za sekvencu akcija (npr. "vrati poslednjih 5 poteza").

---

## Shneidermanovih 8 zlatnih pravila dizajna interfejsa

### 1. Težnja ka konzistentnosti (Strive for Consistency)

**Ocena: ✅ Odlično**

**Šta pravilo zahteva:** Konzistentne sekvence akcija u sličnim situacijama, identična terminologija u promptovima, menijima i help ekranima, i dosledan stil boja i layouta.

**Kako aplikacija ispunjava:**
- Ista boja za isti algoritam na sve 3 stranice (BFS=#3B82F6, A*=#8B5CF6, itd.)
- Identičan toolbar layout na Visualize, Compare i Playground — korisnik uči jednom, koristi svuda
- Isti hover efekti (scale 1.04× dugmad), isti border-radius, isti warm brown color scheme
- Terminologija je dosledna: "Expanded Nodes", "Path Cost", "Path Length" — isti termini svuda
- Legenda (levo) + Metrike (desno) — isti sidebar raspored na sve 3 stranice

### 2. Omogućiti prečice iskusnim korisnicima (Cater to Universal Usability)

**Ocena: ✅ Vrlo dobro**

**Šta pravilo zahteva:** Sistem treba da zadovolji i početnike i iskusne korisnike — prečice, skraćenice, skrivene opcije za napredne.

**Kako aplikacija ispunjava:**
- **Početnici:** Helper vodič (17 koraka), algoritamski opisi na hover, jasna legenda boja
- **Iskusni:** Desni klik za brisanje, drag-and-drop Start/Goal, jumpToStep klizač, speed slider (10-200ms), AI Generator za brzo kreiranje mapa tekstom
- **Progresivno otkrivanje:** Napredne opcije (heuristika, neighbor mode, swarm weight) sakrivene u dropdown, ne zatrpavaju početnika

### 3. Ponuditi informativan feedback (Offer Informative Feedback)

**Ocena: ✅ Odlično**

**Šta pravilo zahteva:** Za svaku korisničku akciju sistem treba dati vizuelni ili tekstualni feedback.

**Kako aplikacija ispunjava:**
- **Crtanje na gridu:** Ćelija se odmah menja u realnom vremenu — instant vizuelni feedback
- **Vizualizacija:** Boje ćelija se menjaju korak po korak (plava→ljubičasta→zlatna) — korisnik tačno vidi napredak
- **Metrike:** Desni sidebar prikazuje expanded/cost/length/time — ažurira se u realnom vremenu
- **Playground score:** Veliki broj sa bojom (zelena ≥80, narandžasta 50-79, crvena <50) + detaljan breakdown
- **AI stanja:** "AI analizira..." loading tekst, opacity 0.4→1.0 tranzicija za metrike panel
- **Hover:** Scale efekti na svim interaktivnim elementima

### 4. Dizajnirati dijaloge sa zatvaranjem (Design Dialogs to Yield Closure)

**Ocena: ✅ Vrlo dobro**

**Šta pravilo zahteva:** Sekvence akcija treba organizovati u grupe sa početkom, sredinom i krajem, uz jasnu indikaciju završetka.

**Kako aplikacija ispunjava:**
- **Vizualizacija:** IDLE → RUNNING → FINISHED — jasna sekvenca sa indikacijom kraja (dugmad se menjaju, metrike se popune)
- **Playground:** Crta put → Submit → Score prikazan + breakdown — jasno zatvaranje ciklusa
- **Compare:** Selektuj algoritme → Run → Rezultati u tabeli + AI insight — kompletna celina
- **Save Map:** Klik → modal → ime → Save → potvrda — zatvorena transakcija
- **Helper:** Korak 1/8 → ... → Korak 8/8 → automatski nestaje — jasna sekvenca

### 5. Ponuditi jednostavno rukovanje greškama (Offer Simple Error Handling)

**Ocena: ✅ Dobro**

**Šta pravilo zahteva:** Sistem treba biti dizajniran tako da korisnik ne može napraviti ozbiljnu grešku, a ako je napravi, sistem treba ponuditi jednostavno i konstruktivno rukovanje.

**Kako aplikacija ispunjava:**
- Start/Goal ne mogu biti obrisani slučajno (GridService odbija)
- Playground validacija pre submit-a (start/goal/susednost/zidovi)
- Disabled dugmad po stanju (nema Play dok je RUNNING, nema Step dok je FINISHED)
- Grid dimenzije: min 5, max 200 — sprečava nevalidne unose
- **⚠️ Ograničenje:** Mrežne greške (API nedostupan) prikazuju generičke poruke

### 6. Dozvoliti lako vraćanje akcija (Permit Easy Reversal of Actions)

**Ocena: ⚠️ Delimično**

**Šta pravilo zahteva:** Koliko god je moguće, akcije treba biti reverzibilne — ovo ohrabruje istraživanje.

**Kako aplikacija ispunjava:**
- **Clear Grid / Reset:** Jednim klikom briše sve prepreke
- **Desni klik:** Briše ćeliju tokom crtanja
- **jumpToStep / Origin:** Vraća vizualizaciju na početak
- **⚠️ Nema undo stack-a:** Ne postoji "vrati poslednjih N poteza" za crtanje na gridu
- **⚠️ Playground submit:** Jednom submitovano, mora se resetovati ceo pokušaj

### 7. Podržati interni lokus kontrole (Support Internal Locus of Control)

**Ocena: ✅ Odlično**

**Šta pravilo zahteva:** Iskusni korisnici žele osećaj da kontrolišu sistem — da su oni inicijatori akcija, ne da sistem diktira.

**Kako aplikacija ispunjava:**
- Korisnik bira algoritam, crta mapu, kontroliše brzinu, pauzira — puna kontrola
- Nema automatskih pokretanja vizualizacije — korisnik eksplicitno klikne Play
- Helper je opcionalan — nikada se ne prikazuje automatski
- AI je alat koji korisnik poziva kad hoće — nije nametljiv

### 8. Redukovati opterećenje kratkoročne memorije (Reduce Short-Term Memory Load)

**Ocena: ✅ Odlično**

**Šta pravilo zahteva:** Ljudi mogu zadržati ~7 stavki u kratkoročnoj memoriji — interfejs treba minimalizovati šta korisnik mora pamtiti.

**Kako aplikacija ispunjava:**
- **Permanentna legenda:** Korisnik nikad ne mora pamtiti šta boja znači
- **Permanentne metrike:** Expanded/Cost/Length uvek vidljivi u sidebaru
- **Algoritamski opisi na hover:** Umesto pamćenja, podsetnik na prelasku mišem
- **Score breakdown:** Umesto pamćenja formule, prikazuje svaku komponentu
- **Chip dizajn u Compare:** Svi algoritmi vidljivi — ne mora pamtiti šta je selektovano
- **Toolbar grupiranje:** Logičke celine (Algorithm|Playback|Tools|Maps) — mentalni model

---

## Normanovih 7 principa dizajna

### 1. Vidljivost (Visibility / Discoverability)

**Ocena: ✅ Odlično**

**Šta princip zahteva:** Korisnik treba da može da vidi šta su dostupne akcije i u kom stanju se sistem nalazi.

**Kako aplikacija ispunjava:**
- Toolbar prikazuje SVE dostupne akcije grupisane po kategoriji — ništa nije skriveno iza neočekivanih menija
- Playback stanje je vizuelno jasno: Play/Pause dugme se menja, step counter i speed slider su uvek vidljivi
- Canvas vizualizacija prikazuje stanje pretrage u realnom vremenu — otvoreni, zatvoreni, trenutni čvorovi su vidljivi
- Disabled dugmad imaju smanjen opacity — jasno se vidi šta je dostupno a šta nije

### 2. Feedback

**Ocena: ✅ Odlično**

**Šta princip zahteva:** Rezultat svake akcije treba biti odmah vidljiv korisniku.

**Kako aplikacija ispunjava:**
- Crtanje na canvas-u: instant promena boje ćelije
- Play/Pause: animacija se odmah pokrene/zaustavi
- Hover: scale(1.04) efekat na svim dugmadima — taktilni feedback
- Playground submit: score se prikaže odmah u velikom fontu, sa bojom koja odražava kvalitet (zelena/narandžasta/crvena)
- AI pozivi: loading indikator "AI analizira..." sa opacity tranzicijom

### 3. Konceptualni model (Conceptual Model)

**Ocena: ✅ Odlično**

**Šta princip zahteva:** Sistem treba da pruži dobar konceptualni model — korisnik treba da razume kako sistem funkcioniše.

**Kako aplikacija ispunjava:**
- **Grid metafora:** 2D mreža koju korisnik crta kao na papiru — intuitivno mapira na koncept "mape"
- **Boje kao stanja:** Plava = čeka obradu, Ljubičasta = obrađeno, Zlatna = pronađen put — mapira na algoritamske koncepte (open set, closed set, path)
- **Playback metafora:** Play/Pause/Step/Speed — poznato iz video plejera, primenjeno na algoritam
- **Playground metafora:** "Pokušaj sam da nađeš put" — kviz/igra metafora poznata studentima

### 4. Affordance (Affordance)

**Ocena: ✅ Vrlo dobro**

**Šta princip zahteva:** Dizajn objekta treba da sugeriše kako se koristi — dugme izgleda "klikabilno", slider izgleda "povlačivo".

**Kako aplikacija ispunjava:**
- Dugmad imaju zaobljene uglove, hover scale, i shadow — jasno su "klikabilna"
- Speed i density slideri koriste `<input type="range">` — standardni HTML affordance za povlačenje
- Grid ćelije menjaju cursor na `crosshair` (editor) ili `pointer` (playground) — sugeriše da su interaktivne
- Chip dizajn za algoritme u Compare ima hover highlight — sugeriše "selektabilnost"
- **⚠️** AI panel navigacioni dugmići (◀ ▶) su mali i manje uočljivi

### 5. Ograničenja (Constraints)

**Ocena: ✅ Vrlo dobro**

**Šta princip zahteva:** Ograničiti moguće akcije u datom kontekstu — sprečiti nevalidne operacije.

**Kako aplikacija ispunjava:**
- Heuristički dropdown disabled za BFS/DFS (ne koriste heuristiku) — fizičko ograničenje
- Swarm weight slider disabled za ne-Swarm algoritme — sprečava konfuziju
- Grid dimenzije ograničene na 5-200 — sprečava kreiranje neupotrebljivih mapa
- Start/Goal zaštićeni od brisanja — ne može se slučajno obrisati polazna tačka
- Minimum 1 algoritam u Compare za pokretanje — sprečava prazan run

### 6. Mapiranje (Mapping)

**Ocena: ✅ Odlično**

**Šta princip zahteva:** Odnos između kontrole i njenog efekta treba biti jasan i prirodan.

**Kako aplikacija ispunjava:**
- **Prostorno mapiranje:** Klik na ćeliju grida → ta ćelija se menja (direktno mapiranje pozicije)
- **Speed slider:** Levo = sporo, desno = brzo — prirodan smer
- **Density slider:** Levo = manje prepreka, desno = više — intuitivan smer
- **Play/Pause:** Jedno dugme koje se menja — mapira na jedno stanje
- **Step Forward/Back:** ▶ za napred, ◀ za nazad — standardno mapiranje smera
- **Boja algoritma → boja na gridu:** Ista boja u legendi i na canvas-u — direktno mapiranje

### 7. Rukovanje greškama (Error Handling)

**Ocena: ✅ Dobro**

**Šta princip zahteva:** Dizajnirati za greške — minimizovati mogućnost grešaka i olakšati oporavak.

**Kako aplikacija ispunjava:**
- **Prevencija:** Disabled dugmad, zaštićen Start/Goal, validacija pre submit-a
- **Detekcija:** Playground validacija prikazuje šta je nevalidno u putu
- **Oporavak:** Reset/Clear dugmad, desni klik za brisanje
- **⚠️ Ograničenje:** Nema undo stack-a; mrežne greške su generičke; nema auto-save

---

## Opšti zaključci — Frontend evaluacija

### Po Nielsenu (10 principa)

| # | Princip | Ocena |
|---|---------|-------|
| 1 | Vidljivost statusa | ✅ Odlično |
| 2 | Podudaranje sa stvarnim svetom | ✅ Odlično |
| 3 | Korisnička kontrola i sloboda | ✅ Vrlo dobro |
| 4 | Konzistentnost i standardi | ✅ Odlično |
| 5 | Prevencija grešaka | ✅ Vrlo dobro |
| 6 | Prepoznavanje umesto prisećanja | ✅ Odlično |
| 7 | Fleksibilnost i efikasnost | ✅ Vrlo dobro |
| 8 | Estetski i minimalistički dizajn | ✅ Odlično |
| 9 | Dijagnoza grešaka | ✅ Dobro |
| 10 | Pomoć i dokumentacija | ✅ Vrlo dobro |

**Prosečna ocena:** 4.3 / 5.0 (Odlično=5, Vrlo dobro=4, Dobro=3)

### Po Tognazziniju (16 principa)

| # | Princip | Ocena |
|---|---------|-------|
| 1 | Anticipacija | ✅ Vrlo dobro |
| 2 | Autonomija | ✅ Odlično |
| 3 | Konzistentnost | ✅ Odlično |
| 4 | Efikasnost | ✅ Vrlo dobro |
| 5 | Učivost | ✅ Odlično |
| 6 | Čitljivost | ✅ Odlično |
| 7 | Praćenje stanja | ✅ Odlično |
| 8 | Vidljiva navigacija | ✅ Vrlo dobro |
| 9 | Smanjenje latencije | ✅ Odlično |
| 10 | Zaštita rada | ✅ Dobro |
| 11 | Defaulti | ✅ Vrlo dobro |
| 12 | Tolerancija grešaka | ✅ Vrlo dobro |
| 13 | Feedback | ✅ Odlično |
| 14 | Fittsov zakon | ✅ Dobro |
| 15 | Interfejs za istraživanje | ✅ Odlično |
| 16 | Undo | ⚠️ Delimično |

**Prosečna ocena:** 4.1 / 5.0

### Po Shneidermanu (8 zlatnih pravila)

| # | Pravilo | Ocena |
|---|---------|-------|
| 1 | Konzistentnost | ✅ Odlično |
| 2 | Prečice za iskusne | ✅ Vrlo dobro |
| 3 | Informativan feedback | ✅ Odlično |
| 4 | Dijalozi sa zatvaranjem | ✅ Vrlo dobro |
| 5 | Rukovanje greškama | ✅ Dobro |
| 6 | Vraćanje akcija | ⚠️ Delimično |
| 7 | Interni lokus kontrole | ✅ Odlično |
| 8 | Redukcija memorijskog opterećenja | ✅ Odlično |

**Prosečna ocena:** 4.1 / 5.0

### Po Normanu (7 principa)

| # | Princip | Ocena |
|---|---------|-------|
| 1 | Vidljivost | ✅ Odlično |
| 2 | Feedback | ✅ Odlično |
| 3 | Konceptualni model | ✅ Odlično |
| 4 | Affordance | ✅ Vrlo dobro |
| 5 | Ograničenja | ✅ Vrlo dobro |
| 6 | Mapiranje | ✅ Odlično |
| 7 | Rukovanje greškama | ✅ Dobro |

**Prosečna ocena:** 4.3 / 5.0

### Sumarni pregled sva 4 okvira

| Okvir | Principa | Prosek |
|-------|----------|--------|
| **Nielsen** | 10 | 4.3 / 5.0 |
| **Tognazzini** | 16 | 4.1 / 5.0 |
| **Shneiderman** | 8 | 4.1 / 5.0 |
| **Norman** | 7 | 4.3 / 5.0 |
| **Ukupno** | **41 princip** | **4.2 / 5.0** |

### Identifikovane oblasti za poboljšanje

1. **Undo/Redo sistem** — Nedostatak pravog undo stack-a za sekvence akcija na gridu
2. **Auto-save grida** — Grid stanje se ne čuva automatski pri navigaciji između stranica
3. **prefers-color-scheme** — Tema se ne detektuje automatski iz OS podešavanja
4. **Mobile responsiveness** — Neki AI panel elementi i sidebar kontrole mogu biti preuski na malim ekranima
5. **Detaljne error poruke** — Mrežne greške prikazuju generičke poruke umesto specifičnih uzroka
