# CLAUDE.md – basemap.de Vektorkarten Layer-Editor

## Projektübersicht

Eine interaktive Single-Page-Anwendung (HTML + JS, kein Build-Tool) zum Visualisieren und
Live-Editieren der Darstellung aller Layer der amtlichen deutschen Vektorkarte **basemap.de Web Vektor**.
Nutzer können Sichtbarkeit, Farbe, Deckkraft und weitere Paint-Properties jedes Layers
per UI steuern – die Karte aktualisiert sich in Echtzeit.

---

## Dienst & Datenquellen

### Tile-Dienst (BKG / Geodatenzentrum)

| Ressource | URL |
|---|---|
| Style „Farbe" | `https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_col.json` |
| Style „Relief" | `https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_top.json` |
| Style „Grau" | `https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_gry.json` |
| Basis-Tiles | `https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/tiles/v2/bm_web_de_3857/bm_web_de_3857.json` |
| Höhenlinien-Tiles | `https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/tiles/v2/bm_web_hl_de_3857/bm_web_hl_de_3857.json` |
| Glyphs | `https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/fonts/v2/{fontstack}/{range}.pbf` |
| Sprites | `https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/sprites/v2/bm_web_col_sprite` |

- **Projektion:** EPSG:3857 (Web Mercator)
- **Aktualisierung:** monatlich
- **Lizenz:** © 2026 basemap.de / BKG | Datenquellen: © GeoBasis-DE
- **Attribution** muss sichtbar in der Karte erscheinen (Pflicht laut Nutzungsbedingungen)

### Nutzungsbedingungen
`https://sgx.geodatenzentrum.de/web_public/gdz/lizenz/deu/Nutzungsbedingungen_basemapde.pdf`

---

## Swipe / Compare-Funktion

### Plugin: `@maplibre/maplibre-gl-compare`

Das ist das **offizielle MapLibre-Plugin** für Swipe/Compare – ein direkter Port des ursprünglichen Mapbox-Plugins, nach dessen Lizenswechsel zu MapLibre migriert. Kein Hack, keine Eigenentwicklung nötig.

- **GitHub:** https://github.com/maplibre/maplibre-gl-compare
- **Lizenz:** ISC (vollständig Open Source)
- **CDN (unpkg):**
  ```html
  <script src="https://unpkg.com/@maplibre/maplibre-gl-compare@latest/dist/maplibre-gl-compare.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/@maplibre/maplibre-gl-compare@latest/dist/maplibre-gl-compare.css" />
  ```
  > Alternativ direkt von GitHub raw dist-Dateien, da das npm-Paket keine eigene dist-Struktur für @latest hat – im Zweifelsfall konkrete Version pinnen (z.B. `0.1.0`).

### Funktionsweise

Das Plugin instanziiert **zwei separate MapLibre-Maps** in einem gemeinsamen Container-Div und synchronisiert deren Viewport (Zoom, Center, Bearing, Pitch) automatisch. Die Swipe-Linie teilt den Container visuell.

```html
<div id="comparison-container">
  <div id="map-before" class="map"></div>
  <div id="map-after" class="map"></div>
</div>
```

```js
const beforeMap = new maplibregl.Map({
  container: 'map-before',
  style: STYLE_URL_ORIGINAL,
  center: [10, 51],
  zoom: 6,
});

const afterMap = new maplibregl.Map({
  container: 'map-after',
  style: STYLE_URL_EDITED,  // gleicher Style, aber mit angepassten Layern
  center: [10, 51],
  zoom: 6,
});

const compare = new maplibregl.Compare(beforeMap, afterMap, '#comparison-container', {
  mousemove: false,      // true = Slider folgt Maus automatisch
  orientation: 'vertical', // 'vertical' (links/rechts) oder 'horizontal' (oben/unten)
});

// Slider programmatisch setzen (Pixel vom linken Rand)
compare.setSlider(window.innerWidth / 2);

// Auf Slider-Bewegung reagieren
compare.on('slideend', (e) => {
  console.log('Position:', e.currentPosition);
});

// Plugin entfernen (z.B. beim Wechsel zurück zur Einzelkarten-Ansicht)
compare.remove();
```

### Einbindung in das Projekt

**Wichtige Designentscheidung:** Die Layer-Editor-Sidebar steuert ausschließlich die `afterMap`. Die `beforeMap` zeigt immer den unveränderten Original-Style.

```
┌──────────┬───────────────────────────────────────────┐
│  PANEL   │  beforeMap  │  afterMap                   │
│          │  (Original) │  (Bearbeitet)               │
│          │             ▲                              │
│          │          Swipe-Slider                     │
└──────────┴───────────────────────────────────────────┘
```

Beim Style-Wechsel (Farbe / Relief / Grau) müssen **beide Maps** aktualisiert werden:
- `beforeMap.setStyle(newOriginalStyle)` → Reset auf unveränderten Style
- `afterMap.setStyle(newOriginalStyle)` → dann sofort Änderungen re-applyen

**API-Methoden des Compare-Plugins:**

| Methode | Beschreibung |
|---|---|
| `new maplibregl.Compare(before, after, container, options)` | Plugin initialisieren |
| `compare.currentPosition` | Aktuelle Slider-Position in Pixeln (Getter) |
| `compare.setSlider(x)` | Slider auf x Pixel setzen |
| `compare.on('slideend', cb)` | Event: Slider losgelassen |
| `compare.remove()` | Plugin entfernen und Maps entkoppeln |

---

## Technologie-Stack

| Rolle | Bibliothek | Version / CDN |
|---|---|---|
| Kartenrendering | **MapLibre GL JS** | `https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js` (aktuell, Open Source) |
| CSS (Karte) | MapLibre GL CSS | `https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css` |
| UI-Framework | **Vanilla JS + CSS** | kein Framework – direktes DOM-Manipulation |
| Build-Tool | keines | direktes `index.html` |

> **Kein npm, kein Bundler.** Alles läuft als einzelne `index.html` im Browser.
> MapLibre bevorzugen, da kein API-Key nötig (im Gegensatz zu Mapbox GL JS v2+).

---

## Dateistruktur

```
project/
├── index.html          # Einstiegspunkt – Karte + UI
├── style-editor.js     # Layer-Panel Logik (optional ausgelagert)
├── layer-groups.js     # Gruppierung der Layer nach Thema
└── CLAUDE.md           # diese Datei
```

---

## Kern-Architektur

### 1. Karte initialisieren

```js
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_col.json',
  center: [10, 51],
  zoom: 6,
});
```

### 2. Style laden & Layer auslesen

Erst wenn `map.on('load', ...)` feuert, sind alle Layer verfügbar:

```js
map.on('load', () => {
  const layers = map.getStyle().layers;
  // layers ist Array von Layer-Objekten mit: id, type, source-layer, layout, paint
  buildLayerPanel(layers);
});
```

### 3. Layer-Sichtbarkeit steuern

```js
// Ein/Aus schalten
map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
```

### 4. Paint-Properties live ändern

```js
// Farbe
map.setPaintProperty(layerId, 'fill-color', '#ff0000');
map.setPaintProperty(layerId, 'line-color', '#0000ff');

// Deckkraft
map.setPaintProperty(layerId, 'fill-opacity', 0.5);
map.setPaintProperty(layerId, 'line-opacity', 0.8);

// Linienbreite
map.setPaintProperty(layerId, 'line-width', 2);
```

---

## Layer-Typen in basemap.de

Die Style-JSON enthält folgende MapLibre Layer-Typen:

| Typ | Typische Layer | Edit-Controls |
|---|---|---|
| `fill` | Flächen (Siedlung, Vegetation, Wasser, …) | fill-color, fill-opacity |
| `line` | Straßen, Grenzen, Gewässerlinien | line-color, line-opacity, line-width |
| `symbol` | Beschriftungen, Symbole/Icons | text-color, text-opacity, icon-opacity |
| `background` | Hintergrundfarbe | background-color |
| `raster` | Schummerung (nur Relief-Style) | raster-opacity |

---

## Layer-Gruppen (für das Panel)

Die ~200+ Layer aus der Style-JSON nach `source-layer` gruppieren:

| Gruppe | source-layer Werte |
|---|---|
| Hintergrund | `Hintergrund` |
| Siedlung | `Siedlungsflaeche` |
| Vegetation | `Vegetationsflaeche` |
| Gewässer | `Gewaesserflaeche`, `Gewaesserlinie` |
| Verkehr | `Strasse`, `Bahnverkehr`, `Faehrlinie` |
| Verwaltungsgrenzen | `Verwaltungsgebiet`, `Verwaltungsgrenze` |
| Gebäude | `Gebaeude` |
| Beschriftungen | Layer mit `type: "symbol"` |
| Höhenlinien | `Hoehenlinien` (nur Relief-Style) |

---

## UI-Panel Spezifikation

### Layout

```
┌──────────────────┬────────────────────────────────────┐
│   LAYER-PANEL    │                                    │
│  (linke Sidebar) │           KARTE (MapLibre)         │
│  ~340px breit    │           volle Breite/Höhe        │
│                  │                                    │
└──────────────────┴────────────────────────────────────┘
```

### Panel-Funktionen

1. **Style-Picker** oben: Farbe / Relief / Grau → lädt neuen Style, baut Panel neu auf
2. **Suche/Filter** für Layer-Namen
3. **Gruppen-Akkordeon** – eine Gruppe pro `source-layer`-Kategorie
4. **Pro Layer:**
   - Checkbox „Sichtbar"
   - Color-Picker (nur bei `fill`/`line`/`symbol`)
   - Opacity-Slider 0–100 %
   - (Optional) Linienbreite-Slider für `line`-Layer
5. **„Alle Ein" / „Alle Aus"** Button je Gruppe
6. **Export-Button**: aktuellen Style als JSON herunterladen (`map.getStyle()`)
7. **Reset-Button**: ursprünglichen Style neu laden

---

## Wichtige Implementierungshinweise

### Style neu laden (beim Style-Wechsel)
```js
map.setStyle(newStyleUrl);
map.once('styledata', () => {
  // Panel neu aufbauen, denn Layer-IDs können sich unterscheiden
  buildLayerPanel(map.getStyle().layers);
});
```

### Paint-Property lesen (für initialen UI-Zustand)
```js
const currentColor = map.getPaintProperty(layerId, 'fill-color');
// Achtung: kann ein Expressions-Objekt sein, nicht nur ein String!
```

### Expressions-Handling
Viele Paint-Properties sind **MapLibre Expressions** (z. B. zoom-abhängige Farben).
Wenn `typeof value === 'object'`, wird der Color-Picker deaktiviert oder zeigt `[Ausdruck]`.
Nur einfache String-Werte (`"rgb(...)"`, `"#..."`) sind direkt editierbar.

### CORS
Die BKG-Server erlauben CORS – kein Proxy nötig beim direkten Style-Laden.

### Attribution (Pflicht!)
```js
// MapLibre zeigt Attribution aus der Style-JSON automatisch an.
// Nicht deaktivieren: attributionControl muss aktiv bleiben.
```

---

## Bekannte Eigenheiten der basemap.de Style-JSON

- Viele Layer teilen denselben `source-layer`, werden aber durch `filter` unterschieden
- Manche Layer haben `minzoom`/`maxzoom` – im Panel anzeigen (Info-Icon)
- Der Relief-Style hat zusätzliche `raster`-Layer für die Schummerung
- Schriftarten: Noto Sans + Roboto (werden vom BKG-Server geliefert)
- Sprites liegen auf `sgx.geodatenzentrum.de` – Symbol-Layer brauchen diese

---

## Entwicklungshinweise für Claude Code

- **Immer** `map.on('load', ...)` oder `map.once('styledata', ...)` abwarten, bevor auf Layer zugegriffen wird
- Panel-DOM komplett neu aufbauen nach Style-Wechsel (IDs ändern sich)
- `map.getStyle().layers` liefert eine **Kopie** – Änderungen dort haben keinen Effekt; immer `setPaintProperty`/`setLayoutProperty` nutzen
- Bei Color-Inputs: `<input type="color">` erwartet `#rrggbb` – RGB-Strings vorher konvertieren
- Opacity-Slider: interne Werte 0.0–1.0, UI 0–100 skaliert darstellen
- Für flüssige Performance: Slider-Events mit `input` (nicht `change`) für Live-Preview

---

## Ressourcen & Referenzen

- [basemap.de Produktseite Web Vektor](https://basemap.de/produkte-und-dienste/web-vektor/)
- [Signaturenkatalog Farbe](https://basemap.de/data/produkte/web_vektor/meta/bm_web_vektor_col_signaturenkatalog.html)
- [Datenmodell](https://basemap.de/data/produkte/web_vektor/meta/bm_web_vektor_datenmodell.html)
- [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js/docs/)
- [MapLibre setPaintProperty](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#setpaintproperty)
- [Maputnik (visueller Style-Editor, Referenz)](https://maplibre.org/maputnik/?style=https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_top.json#6/51/10)
