const stylePicker = document.getElementById('style-picker');
const layerSearch = document.getElementById('layer-search');
const panel = document.getElementById('panel');
const panelStatus = document.getElementById('panel-status');
const exportStyleButton = document.getElementById('export-style');
const resetStyleButton = document.getElementById('reset-style');

let map;
let currentStyleUrl = stylePicker.value;
let currentLayers = [];
let lastStyleJson = null;

function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    style: currentStyleUrl,
    center: [10, 51],
    zoom: 6,
    attributionControl: true,
  });

  map.on('load', () => {
    updateStatus('Style geladen. Layer-Panel aufbauen...');
    refreshLayerPanel();
  });

  map.on('styledata', () => {
    if (!map.loaded()) {
      return;
    }
    refreshLayerPanel();
  });
}

function refreshLayerPanel() {
  const style = map.getStyle();
  currentLayers = style.layers || [];
  lastStyleJson = style;
  buildLayerPanel();
}

function buildLayerPanel() {
  const search = layerSearch.value.trim().toLowerCase();
  panel.innerHTML = '';

  if (!currentLayers.length) {
    updateStatus('Kein Layer gefunden. Warten auf Style-Daten...');
    return;
  }

  const groups = {};
  currentLayers.forEach(layer => {
    const groupName = getLayerGroupName(layer);
    groups[groupName] = groups[groupName] || [];
    groups[groupName].push(layer);
  });

  const orderedGroupNames = [
    'Hintergrund', 'Siedlung', 'Vegetation', 'Gewässer', 'Verkehr', 'Verwaltungsgrenzen', 'Gebäude', 'Beschriftungen', 'Höhenlinien', 'Andere'
  ];

  orderedGroupNames.forEach(groupName => {
    const groupLayers = (groups[groupName] || []).filter(layer => {
      if (!search) return true;
      const layerLabel = getLayerDisplayName(layer).toLowerCase();
      return layerLabel.includes(search) || groupName.toLowerCase().includes(search);
    });
    if (groupLayers.length) {
      const groupContainer = createGroupDetails(groupName, groupLayers);
      panel.appendChild(groupContainer);
    }
  });

  if (!panel.hasChildNodes()) {
    panel.innerHTML = '<div class="panel-status">Kein Layer gefunden für die Suche.</div>';
  }

  updateStatus(`${currentLayers.length} Layer geladen. Suche: "${search || 'alle'}".`);
}

function createGroupDetails(groupName, layers) {
  const details = document.createElement('details');
  details.className = 'group-panel';
  details.open = true;

  const summary = document.createElement('summary');
  const title = document.createElement('span');
  title.className = 'summary-title';
  title.textContent = `${groupName}`;
  const count = document.createElement('span');
  count.className = 'summary-count';
  count.textContent = `${layers.length} Layer`;
  summary.appendChild(title);
  summary.appendChild(count);
  details.appendChild(summary);

  const content = document.createElement('div');
  content.className = 'group-content';

  layers.forEach(layer => {
    content.appendChild(createLayerCard(layer));
  });

  details.appendChild(content);
  return details;
}

function createLayerCard(layer) {
  const row = document.createElement('div');
  row.className = 'layer-row';

  const header = document.createElement('div');
  header.className = 'layer-header';
  const name = document.createElement('p');
  name.className = 'layer-title';
  name.textContent = layer.id;
  const info = document.createElement('div');
  info.className = 'layer-info';
  const sourceLayer = layer['source-layer'] || layer.sourceLayer;
  if (sourceLayer) {
    const source = document.createElement('span');
    source.textContent = sourceLayer;
    info.appendChild(source);
  }
  if (layer.minzoom !== undefined || layer.maxzoom !== undefined) {
    const zoomInfo = document.createElement('span');
    zoomInfo.textContent = `Zoom ${layer.minzoom ?? 0}-${layer.maxzoom ?? '∞'}`;
    info.appendChild(zoomInfo);
  }
  header.appendChild(name);
  header.appendChild(info);

  const controls = document.createElement('div');
  controls.className = 'layer-controls';

  controls.appendChild(createVisibilityControl(layer));
  const colorControl = createColorControl(layer);
  if (colorControl) controls.appendChild(colorControl);
  const opacityControl = createOpacityControl(layer);
  if (opacityControl) controls.appendChild(opacityControl);
  const widthControl = createLineWidthControl(layer);
  if (widthControl) controls.appendChild(widthControl);

  row.appendChild(header);
  row.appendChild(controls);
  return row;
}

function createVisibilityControl(layer) {
  const row = document.createElement('div');
  row.className = 'control-row';
  const label = document.createElement('label');
  label.textContent = 'Sichtbar';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  const visibility = layer.layout && layer.layout.visibility ? layer.layout.visibility : 'visible';
  checkbox.checked = visibility !== 'none';
  checkbox.addEventListener('change', () => {
    map.setLayoutProperty(layer.id, 'visibility', checkbox.checked ? 'visible' : 'none');
  });
  row.appendChild(label);
  row.appendChild(checkbox);
  return row;
}

function createColorControl(layer) {
  const paint = layer.paint || {};
  const colorProp = getColorProperty(layer.type, paint);
  if (!colorProp) {
    return null;
  }
  const row = document.createElement('div');
  row.className = 'control-row';

  const label = document.createElement('label');
  label.textContent = `${colorProp.replace('-', ' ')}:`;

  const currentColor = map.getPaintProperty(layer.id, colorProp);
  const parsedColor = parseColorForInput(currentColor);
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = parsedColor?.hex || '#888888';
  colorInput.disabled = !parsedColor || !parsedColor.editable;

  const help = document.createElement('span');
  help.textContent = parsedColor?.editable ? '' : '[Ausdruck/kein Wert]';
  help.style.fontSize = '0.8rem';
  help.style.color = '#64748b';

  colorInput.addEventListener('input', () => {
    if (!colorInput.disabled) {
      map.setPaintProperty(layer.id, colorProp, colorInput.value);
    }
  });

  const wrapper = document.createElement('div');
  wrapper.style.display = 'grid';
  wrapper.style.gap = '6px';
  wrapper.appendChild(colorInput);
  if (help.textContent) wrapper.appendChild(help);

  row.appendChild(label);
  row.appendChild(wrapper);
  return row;
}

function createOpacityControl(layer) {
  const opacityProp = getOpacityProperty(layer.type);
  if (!opacityProp) return null;
  const row = document.createElement('div');
  row.className = 'control-row';
  const label = document.createElement('label');
  label.textContent = `${opacityProp.replace('-', ' ')}:`;
  const currentOpacity = map.getPaintProperty(layer.id, opacityProp);
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = Math.round((typeof currentOpacity === 'number' ? currentOpacity : 1) * 100);
  slider.addEventListener('input', () => {
    map.setPaintProperty(layer.id, opacityProp, slider.value / 100);
  });

  const value = document.createElement('span');
  value.textContent = `${slider.value}%`;
  slider.addEventListener('input', () => {
    value.textContent = `${slider.value}%`;
  });

  const group = document.createElement('div');
  group.style.display = 'grid';
  group.style.gridTemplateColumns = '1fr auto';
  group.style.alignItems = 'center';
  group.style.gap = '8px';
  group.appendChild(slider);
  group.appendChild(value);

  row.appendChild(label);
  row.appendChild(group);
  return row;
}

function createLineWidthControl(layer) {
  if (layer.type !== 'line') return null;
  const row = document.createElement('div');
  row.className = 'control-row';
  const label = document.createElement('label');
  label.textContent = 'line-width:';
  const currentWidth = map.getPaintProperty(layer.id, 'line-width');
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '10';
  slider.step = '0.5';
  slider.value = typeof currentWidth === 'number' ? currentWidth : 1;
  slider.addEventListener('input', () => {
    map.setPaintProperty(layer.id, 'line-width', Number(slider.value));
    value.textContent = `${slider.value}`;
  });

  const value = document.createElement('span');
  value.textContent = `${slider.value}`;

  const group = document.createElement('div');
  group.style.display = 'grid';
  group.style.gridTemplateColumns = '1fr auto';
  group.style.alignItems = 'center';
  group.style.gap = '8px';
  group.appendChild(slider);
  group.appendChild(value);

  row.appendChild(label);
  row.appendChild(group);
  return row;
}

function getColorProperty(type, paint = {}) {
  switch (type) {
    case 'fill':
      return 'fill-color';
    case 'line':
      return 'line-color';
    case 'symbol':
      return paint['text-color'] ? 'text-color' : paint['icon-color'] ? 'icon-color' : 'text-color';
    case 'background':
      return 'background-color';
    case 'raster':
      return 'raster-opacity';
    default:
      return null;
  }
}

function getOpacityProperty(type) {
  switch (type) {
    case 'fill':
      return 'fill-opacity';
    case 'line':
      return 'line-opacity';
    case 'symbol':
      return 'text-opacity';
    case 'background':
      return 'background-opacity';
    case 'raster':
      return 'raster-opacity';
    default:
      return null;
  }
}

function parseColorForInput(value) {
  if (typeof value === 'string') {
    if (value.startsWith('#')) {
      return { hex: value, editable: true };
    }
    if (value.startsWith('rgb(') || value.startsWith('rgba(')) {
      const numbers = value.match(/\d+/g);
      if (numbers && numbers.length >= 3) {
        const [r, g, b] = numbers.map(Number);
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        return { hex, editable: true };
      }
    }
  }
  return { hex: '#888888', editable: false };
}

function updateStatus(text) {
  panelStatus.textContent = text;
}

function applyStyleUrl(url) {
  currentStyleUrl = url;
  if (stylePicker.value !== url) {
    stylePicker.value = url;
  }
  updateStatus('Lade Style...');
  if (!map) {
    return;
  }
  map.setStyle(url, { diff: false });
}

function downloadCurrentStyle() {
  if (!lastStyleJson) return;
  const blob = new Blob([JSON.stringify(lastStyleJson, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'basemap-style.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

stylePicker.addEventListener('change', () => applyStyleUrl(stylePicker.value));
layerSearch.addEventListener('input', () => buildLayerPanel());
exportStyleButton.addEventListener('click', downloadCurrentStyle);
resetStyleButton.addEventListener('click', () => applyStyleUrl(stylePicker.value));

window.addEventListener('load', () => {
  initMap();
});
