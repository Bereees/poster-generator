# Poster Generator — Design Spec

**Date:** 2026-06-05  
**Status:** Approved (brainstorming complete)

## Overview

A single-page web tool that generates posters from image categories stored in subfolders under `immagini/`. The user selects one or more categories (or mixes them), configures format and styling, and exports print-ready or web-ready posters. The tool targets a designer workflow: minimal UI, live preview, fast iteration.

## Goals

- Generate posters from categorized image libraries (`immagini/<category>/`)
- Support single-category or mixed-category posters
- Display images in a uniform contact-sheet grid
- Apply consistent margins with an enlarged bottom band for description and logo
- Export to PNG/JPG (300 dpi) and PDF at real print dimensions
- Provide a web-optimized format for screen display and site embedding

## Non-Goals

- Image upload or in-browser asset management
- Manual drag-and-drop image selection or reordering
- User-defined grid dimensions (density is fixed per format)
- Advanced typography controls (font family, size, weight)

---

## Approach

**Selected: Split-panel with live preview (Approach 1)**

- Left panel: controls
- Right panel: live poster preview scaled to fit, preserving aspect ratio
- "Genera" creates a new poster; "Rigenera" reshuffles images with the same settings
- Export uses real dimensions at 300 dpi (print) or web proportions (screen)

Rejected alternatives:
- **Step-by-step wizard** — too slow for iterative design exploration
- **Full-screen poster with overlay controls** — controls less immediately accessible

---

## Poster Composition

### Layout zones

```
┌─────────────────────────────────────┐
│  margin (medium)                    │
│   ┌───┬───┬───┬───┬───┐             │
│   │   │   │   │   │   │  uniform    │
│   ├───┼───┼───┼───┼───┤  grid       │
│   │   │   │   │   │   │             │
│   └───┴───┴───┴───┴───┘             │
│  margin (larger bottom band)        │
│  description (left)       [logo]    │
└─────────────────────────────────────┘
```

### Grid

- **Style:** Uniform contact sheet — all cells equal size
- **Spacing:** Medium gap between cells
- **Image fit:** Contain — full image visible; letterbox bands use the chosen background color (no cropping)
- **Image source:** Random sample from the pool of selected categories
- **Pool exhaustion:** If selected categories contain fewer unique images than the grid requires, randomly repeat images to fill all cells

### Grid density per format

| Format | Grid | Images |
|--------|------|--------|
| A4 vertical | 5 × 7 | 35 |
| A4 horizontal | 7 × 5 | 35 |
| A3 vertical | 6 × 9 | 54 |
| A3 horizontal | 9 × 6 | 54 |
| Web (16:9) | 5 × 5 | 25 |

### Margins

- **Top, left, right:** Medium
- **Bottom:** Larger — reserved for description text and logo
- Logo (`immagini/logo.svg`) anchored bottom-right within the bottom band
- Description text anchored bottom-left within the bottom band
- Grid and footer never overlap

### Footer band

- **Description:** Free text, user-entered, optional
- **Logo:** `immagini/logo.svg`, proportional to the bottom margin, right-aligned
- **Empty description:** Bottom band remains; only logo is shown

---

## User Interface

### Layout

Single page, two columns:

| Left (controls) | Right (preview) |
|-----------------|-----------------|
| Category checkboxes | Scaled poster preview |
| Format selector | Maintains aspect ratio of selected format |
| Background color picker | Dominant visual element |
| Description text field | |
| Genera / Rigenera buttons | |
| Export button (PNG/JPG or PDF) | |

### Controls (top to bottom)

1. **Categorie** — One checkbox per subfolder in `immagini/` (excluding `logo.svg` and non-image files). Multiple selection merges pools.
2. **Formato** — Five options: A4 ↕, A4 ↔, A3 ↕, A3 ↔, Web
3. **Sfondo** — Color picker, default white
4. **Descrizione** — Optional free-text field
5. **Genera** — Create poster with current settings
6. **Rigenera** — New random image sample, same settings
7. **Esporta** — Download as PNG/JPG or PDF

### Workflow

```
Select categories → format → background → description → Genera
                                                        ↓
                                              Preview (right panel)
                                                        ↓
                                    Unsatisfied → Rigenera
                                    Satisfied   → Esporta
```

### Update behavior

- Changing format, color, categories, or description does **not** auto-regenerate
- Preview updates only on **Genera** or **Rigenera**
- **Genera** is disabled when no category is selected

### Visual style

- White background
- Clean sans-serif typography
- Text and controls in `#1a1a1a` (matching logo color)
- Minimal controls — no decorative chrome
- Poster preview is the dominant element on the right

---

## Formats & Export

### Print formats (A3 / A4)

| Property | Value |
|----------|-------|
| A4 vertical | 210 × 297 mm |
| A4 horizontal | 297 × 210 mm |
| A3 vertical | 297 × 420 mm |
| A3 horizontal | 420 × 297 mm |
| Export resolution | 300 dpi |

### Export options

| Format | PNG/JPG | PDF |
|--------|---------|-----|
| Content | High-resolution raster at real dimensions | Logo and text vector where possible; images as high-quality raster |
| Use case | Direct print, digital sharing | Print shop, archival |

### Web format

- Aspect ratio: **16:9**
- Grid: 5 × 5 (25 images)
- Same visual rules as print formats (margins, spacing, footer, logo)
- Preview scales to fit the right panel while preserving 16:9 proportions

### File naming

Automatic: `poster-<format>-<date>.<ext>`  
Example: `poster-a3-verticale-2026-06-05.png`

---

## Data & Extensibility

### Image library structure

```
immagini/
├── logo.svg
├── disegni/
│   ├── disegno1.png
│   └── ...
├── <new-category>/
│   └── ...
```

- Each subfolder under `immagini/` (excluding root-level assets like `logo.svg`) becomes a selectable category
- Adding a new subfolder automatically exposes it in the UI — no code changes required for new categories

### Category mixing

When multiple categories are selected, all images are merged into a single pool. The random sampler draws from this combined pool with equal probability per image.

---

## Error Handling

| Condition | Behavior |
|-----------|----------|
| No category selected | Genera button disabled |
| Category folder empty | Category shown but disabled, with indication it has no images |
| Description empty | Poster generates normally; footer shows logo only |
| Fewer images than grid cells | Random repetition to fill grid |

---

## Testing Checklist

- [ ] Each format produces correct aspect ratio and grid density
- [ ] Single-category and mixed-category posters generate correctly
- [ ] Images are contained (not cropped) with background-color letterboxing
- [ ] Margins and bottom band layout are consistent across formats
- [ ] Logo appears bottom-right; description appears bottom-left
- [ ] Genera / Rigenera produce different random samples
- [ ] PNG/JPG export at 300 dpi matches preview composition
- [ ] PDF export preserves layout fidelity
- [ ] New subfolder in `immagini/` appears as a category without code changes
- [ ] Genera disabled when no category selected
