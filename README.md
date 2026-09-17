# Futbal Tipy – desktopová appka na štatistickú analýzu zápasov

Electron + TypeScript aplikácia, ktorá cez **football-data.org** načíta
nadchádzajúce zápasy top európskych líg, ich tabuľkové štatistiky a
vzájomné súboje, a na základe váženého štatistického modelu vypočíta
pravdepodobnosti výsledku (1 / X / 2), Over/Under 2.5 gólu a "obaja tímy
skórujú".

## Prečo football-data.org a nie API-Football

API-Football má sice bohatšie dáta, ale jeho **bezplatný plán nedáva
prístup k aktuálnej sezóne** (len k vybraným starším, dohraným sezónam) –
na skutočné nadchádzajúce zápasy je teda nepoužiteľný bez platného
predplatného. football-data.org naopak dáva zadarmo prístup presne k
**aktuálnej sezóne** pre 12 súťaží (vrátane top 5 európskych líg), len s
limitom 10 požiadaviek za minútu.

## Ako to funguje (model)

Výsledná predikcia kombinuje tri zdroje, každý s vlastnou váhou
(`src/main/predictor.ts` → `DEFAULT_WEIGHTS`):

1. **Poissonov gólový model (65 %)** – z priemerného počtu gólov, ktoré tím
   dáva/dostáva doma a vonku (odvodené z tabuľky súťaže - HOME/AWAY
   štatistiky), sa vypočíta sila útoku a obrany a z nej očakávaný počet
   gólov (xG) pre oba tímy. Z Poissonovho rozdelenia sa potom odvodí
   pravdepodobnosť každého skóre a spočíta do 1/X/2 a Over/Under 2.5.
2. **Aktuálna forma (22 %)** – posledných až 5 zápasov (pole `form` v
   tabuľke súťaže), novšie zápasy majú väčšiu váhu.
3. **Vzájomné zápasy (13 %)** – agregovaný súhrn vzájomných zápasov cez
   endpoint `/matches/{id}/head2head`.

Váhy aj konštanty (napr. ligový priemer gólov) si vieš upraviť priamo v
`src/main/predictor.ts`.

⚠️ **Toto je štatistický odhad, nie záruka výsledku.** Model je zjednodušený
(napr. nepoužíva presný ligový priemer gólov zo sezóny, len konštantu) –
slúži ako pomocný nástroj na analýzu, nie ako neomylná predikcia.

## Inštalácia

Potrebuješ nainštalovaný [Node.js](https://nodejs.org) (verzia 18+).

```bash
cd football-tips-app
npm install
```

## Spustenie

```bash
npm start
```

Pri prvom spustení ťa appka vyzve na zadanie API kľúča z
[football-data.org](https://www.football-data.org/client/register)
(registrácia je zadarmo, kľúč príde e-mailom). Kľúč sa ukladá lokálne na
tvojom počítači (cez `electron-store`), nikam sa neposiela okrem
samotného football-data.org.

Kľúč vieš kedykoľvek zmeniť cez tlačidlo **„Nastavenia API kľúča“** v
ľavom paneli.

## Používanie

1. V ľavom paneli vyber ligu (alebo zadaj vlastný kód súťaže, napr. `DED`
   pre holandskú Eredivisie, `PPL` pre portugalskú Primeira Liga) a sezónu
   (aktuálna sezóna sa označuje rokom jej začiatku, napr. sezóna 2025/26 =
   `2025`).
2. Klikni na **„Načítať zápasy“** – zobrazí sa zoznam najbližších zápasov.
3. Klikni na konkrétny zápas – appka stiahne tabuľkové štatistiky oboch
   tímov a súhrn vzájomných zápasov, spočíta predikciu a zobrazí ju v
   pravom paneli (pravdepodobnosti, formu, xG, Over/Under, BTTS a
   odporúčaný tip).

## Dostupné súťaže na bezplatnom pláne

Premier League (`PL`), Championship (`ELC`), La Liga (`PD`), Bundesliga
(`BL1`), Serie A (`SA`), Ligue 1 (`FL1`), Eredivisie (`DED`), Primeira
Liga (`PPL`), Champions League (`CL`), Brazilian Série A (`BSA`),
MS vo futbale (`WC`), ME vo futbale (`EC`). Presný zoznam si over v
[dokumentácii](https://docs.football-data.org/general/v4/resources.html).

## Štruktúra projektu

```
src/
  main/            # Electron hlavný proces (Node.js)
    main.ts        # okno appky + IPC handlery
    preload.ts      # bezpečný most medzi main a renderer procesom
    apiClient.ts    # volania na football-data.org
    predictor.ts    # štatistický model (Poisson + forma + H2H)
    config.ts       # lokálne uloženie API kľúča
    types.ts        # zdieľané TypeScript typy
  renderer/         # UI (beží v Chromium okne)
    index.html
    style.css
    renderer.ts
```

## Rozšírenia, ktoré dávajú zmysel ako ďalší krok

- Presnejší ligový priemer gólov (namiesto pevnej konštanty) – dá sa
  dopočítať z tabuľky celej súťaže.
- Ukladanie histórie vlastných tipov a spätné vyhodnotenie úspešnosti
  modelu (backtesting).
- Vlastné jednoduché keš/throttling volaní, aby sa neminul limit
  10 požiadaviek/minútu pri rýchlom prechádzaní viacerých zápasov.

## Zodpovedné stávkovanie

Táto appka je analytický nástroj, nie odporúčanie stávkovať. Ak sa
rozhodneš stávkovať, rob tak len s peniazmi, o ktoré si môžeš dovoliť
prísť, a stanov si vopred limity.
