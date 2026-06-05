# Poster Generator — Guida per agenti

Tool web per generare poster a griglia da librerie di immagini organizzate per categoria. Progettato per un flusso da designer: UI minimale, anteprima immediata, export per stampa.

## Stack

- **Solo HTML, CSS e JavaScript** (ES modules nativi)
- **Niente** Vite, npm, bundler o framework
- **Canvas 2D** per composizione e anteprima
- **jsPDF** caricato da CDN solo per export PDF (`js/export.js`)
- **Node** usato solo per lo script opzionale `scripts/generate-manifest.mjs`

> Non introdurre dipendenze npm o build tool a meno che l'utente non lo chieda esplicitamente.

## Avvio

Il progetto **richiede un server HTTP locale** (i moduli ES e il fetch di `manifest.json` non funzionano con `file://`).

```bash
npx serve
# oppure Live Server (estensione Cursor/VS Code)
```

Dopo aver aggiunto immagini o cartelle:

```bash
node scripts/generate-manifest.mjs
```

Poi ricaricare la pagina.

## Struttura file

```
poster-generator/
├── index.html              # Shell UI: controlli sinistra, anteprima destra
├── manifest.json           # Indice categorie/immagini (generato, non editare a mano)
├── css/styles.css          # UI minimale, colore testo #1a1a1a
├── js/
│   ├── main.js             # Stato, eventi, orchestrazione Genera/Rigenera/Esporta
│   ├── formats.js          # Formati, dimensioni px/mm, griglia densa per formato
│   ├── sampler.js          # Pool immagini da categorie selezionate + campione casuale
│   ├── layout.js           # Margini, gap, celle griglia, fascia footer
│   ├── renderer.js         # Disegno poster su canvas (griglia + footer + logo)
│   └── export.js           # Download PNG, JPG, PDF
├── immagini/
│   ├── logo.svg            # Logo in basso a destra su ogni poster
│   └── <categoria>/        # Una sottocartella = una categoria (es. disegni/)
└── scripts/
    └── generate-manifest.mjs
```

### Responsabilità dei moduli

| Modulo | Cosa fa | Non deve fare |
|--------|---------|---------------|
| `formats.js` | Definisce A3/A4 verticale/orizzontale + Web, conversione mm→px a 300 dpi | Logica UI o rendering |
| `sampler.js` | Unisce pool da categorie selezionate; campiona con ripetizione se pool < celle | Layout o disegno |
| `layout.js` | Calcola rettangoli di margini, celle, footer | Caricare immagini |
| `renderer.js` | Canvas: sfondo, griglia uniforme, immagini contained, testo + logo | Gestire controlli |
| `export.js` | Export file da canvas esistente | Rigenerare il poster |
| `main.js` | Wiring UI ↔ logica; aggiorna bottoni e stato | Calcoli geometrici |

## Comportamento del poster

### Layout

```
┌─────────────────────────────────────┐
│  margine medio (top, left, right)   │
│   ┌───┬───┬───┬───┬───┐             │
│   │   │   │   │   │   │  griglia    │
│   ├───┼───┼───┼───┼───┤  uniforme   │
│   │   │   │   │   │   │             │
│   └───┴───┴───┴───┴───┘             │
│  margine basso più ampio            │
│  descrizione (sx)         [logo]    │
└─────────────────────────────────────┘
```

### Regole visive (non negoziabili)

- **Griglia uniforme** — contact sheet, celle tutte uguali
- **Spaziatura media** tra le celle (`GAP_RATIO` in `layout.js`)
- **Immagini contained** — nessun ritaglio; bande con il colore di sfondo scelto
- **Margine basso più grande** per descrizione (sinistra) e `immagini/logo.svg` (destra)
- **Colore sfondo** scelto dall'utente ad ogni generazione
- **UI** bianca, testo `#1a1a1a`, senza decorazioni superflue

### Griglia densa per formato

| Formato | Griglia | Immagini |
|---------|---------|----------|
| A4 verticale | 5 × 7 | 35 |
| A4 orizzontale | 7 × 5 | 35 |
| A3 verticale | 6 × 9 | 54 |
| A3 orizzontale | 9 × 6 | 54 |
| Web (16:9) | 5 × 5 | 25 |

### Flusso utente

1. Seleziona una o più **categorie** (checkbox)
2. Sceglie **formato**, **colore sfondo**, **descrizione** (testo libero, opzionale)
3. Clic **Genera** → anteprima a destra
4. **Rigenera** → nuovo campione casuale, stesse impostazioni
5. **Esporta** → PNG, JPG (300 dpi) o PDF

**Importante:** cambiare formato/colore/categorie/testo **non** aggiorna l'anteprima automaticamente. Serve Genera o Rigenera.

**Genera** è disabilitato se nessuna categoria è selezionata. Categorie vuote compaiono disabilitate con etichetta "(vuota)".

### Campionamento immagini

- Pool = unione di tutte le immagini delle categorie selezionate
- Campione casuale per riempire tutte le celle della griglia
- Se le immagini disponibili sono meno delle celle, alcune vengono **ripetute a caso**

## Categorie e immagini

- Ogni **sottocartella** di `immagini/` è una categoria
- File nella root di `immagini/` (es. `logo.svg`) **non** sono categorie
- Formati supportati: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`
- Nuova categoria: creare cartella → aggiungere immagini → `node scripts/generate-manifest.mjs`

## Export

- **PNG / JPG:** risoluzione nativa del canvas (300 dpi per formati stampa)
- **PDF:** jsPDF via CDN, dimensioni in mm dal formato
- Nome file: `poster-<formato>-<data>.<ext>` (es. `poster-a4-verticale-2026-06-05.png`)

## Documentazione di riferimento

- Spec di design approvata: `docs/superpowers/specs/2026-06-05-poster-generator-design.md`
- Piano implementazione originale (Vite, superato): `docs/superpowers/plans/2026-06-05-poster-generator.md`

La spec di design è la fonte di verità per requisiti e comportamento. Il piano Vite è storico — l'implementazione attuale è vanilla HTML/CSS/JS.

## Cose fuori scope

Non aggiungere senza richiesta esplicita:

- Upload immagini dal browser
- Drag-and-drop o selezione manuale immagini
- Dimensioni griglia personalizzabili dall'utente
- Controlli tipografici avanzati (font, peso, dimensione)
- Framework (React, Vue, ecc.) o toolchain npm

## Note per modifiche

- Il proprietario è un **designer**: preferire spiegazioni visive/comportamentali, non discussioni tecniche inutili
- Mantieni **diff minimi** e rispetta la struttura modulare esistente
- Se modifichi margini, gap o griglia → aggiorna `layout.js` e/o `formats.js`, verifica tutti e 5 i formati
- Se aggiungi categorie o cambi path immagini → rigenera `manifest.json` con lo script
- Dopo modifiche sostanziali, testare con server locale: Genera, Rigenera, export PNG e PDF su almeno un formato A4
