const STYLE_URLS = {
  color: 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_col.json',
  relief: 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_top.json',
  grey: 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_gry.json',
};

const LAYER_GROUPS = [
  { key: 'Hintergrund', labels: ['Hintergrund'] },
  { key: 'Siedlung', labels: ['Siedlungsflaeche'] },
  { key: 'Vegetation', labels: ['Vegetationsflaeche'] },
  { key: 'Gewässer', labels: ['Gewaesserflaeche', 'Gewaesserlinie'] },
  { key: 'Verkehr', labels: ['Strasse', 'Bahnverkehr', 'Faehrlinie'] },
  { key: 'Verwaltungsgrenzen', labels: ['Verwaltungsgebiet', 'Verwaltungsgrenze'] },
  { key: 'Gebäude', labels: ['Gebaeude'] },
  { key: 'Höhenlinien', labels: ['Hoehenlinien'] },
];

function getLayerGroupName(layer) {
  if (layer.type === 'symbol') {
    return 'Beschriftungen';
  }
  const sourceLayer = layer['source-layer'] || layer.sourceLayer || '';
  if (!sourceLayer) {
    return 'Andere';
  }
  const matching = LAYER_GROUPS.find(group => group.labels.includes(sourceLayer));
  return matching ? matching.key : 'Andere';
}

function getStyleUrlByLabel(label) {
  switch (label) {
    case 'Farbe':
      return STYLE_URLS.color;
    case 'Relief':
      return STYLE_URLS.relief;
    case 'Grau':
      return STYLE_URLS.grey;
    default:
      return STYLE_URLS.color;
  }
}

function getLayerDisplayName(layer) {
  const sourceLayer = layer['source-layer'] || layer.sourceLayer;
  return `${layer.id}${sourceLayer ? ` · ${sourceLayer}` : ''}`;
}
