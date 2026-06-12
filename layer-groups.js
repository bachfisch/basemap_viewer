const LAYER_GROUPS = [
  { id: 'hintergrund',    label: 'Hintergrund',       sourceLayers: ['Hintergrund'] },
  { id: 'siedlung',       label: 'Siedlung',           sourceLayers: ['Siedlungsflaeche'] },
  { id: 'vegetation',     label: 'Vegetation',         sourceLayers: ['Vegetationsflaeche'] },
  { id: 'gewaesser',      label: 'Gewässer',           sourceLayers: ['Gewaesserflaeche', 'Gewaesserlinie'] },
  { id: 'verkehr',        label: 'Verkehr',            sourceLayers: ['Strasse', 'Bahnverkehr', 'Faehrlinie'] },
  { id: 'verwaltung',     label: 'Verwaltungsgrenzen', sourceLayers: ['Verwaltungsgebiet', 'Verwaltungsgrenze'] },
  { id: 'gebaeude',       label: 'Gebäude',            sourceLayers: ['Gebaeude'] },
  { id: 'beschriftungen', label: 'Beschriftungen',     sourceLayers: [], symbolOnly: true },
  { id: 'hoehenlinien',   label: 'Höhenlinien',        sourceLayers: ['Hoehenlinien'] },
];

function getLayerGroup(layer) {
  if (layer.type === 'symbol') return 'beschriftungen';
  for (const group of LAYER_GROUPS) {
    if (group.symbolOnly) continue;
    if (layer['source-layer'] && group.sourceLayers.includes(layer['source-layer'])) {
      return group.id;
    }
  }
  return 'sonstige';
}
