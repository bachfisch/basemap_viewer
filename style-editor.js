let _map = null;
let _searchTerm = '';

// Convert any CSS color string to #rrggbb for <input type="color">
function colorToHex(color) {
  if (!color || typeof color !== 'string') return null;
  if (/^#[0-9a-fA-F]{3,8}$/.test(color)) {
    if (color.length === 4) {
      return '#' + color[1]+color[1] + color[2]+color[2] + color[3]+color[3];
    }
    return color.slice(0, 7).toLowerCase();
  }
  const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    return '#' + [rgb[1], rgb[2], rgb[3]]
      .map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  }
  // Named colors, hsl(), etc. via canvas
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return '#' + [d[0], d[1], d[2]].map(n => n.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return null;
  }
}

function getColorProp(type) {
  return { fill: 'fill-color', line: 'line-color', symbol: 'text-color', background: 'background-color' }[type] ?? null;
}

function getOpacityProp(type) {
  return {
    fill: 'fill-opacity', line: 'line-opacity', symbol: 'text-opacity',
    background: 'background-opacity', raster: 'raster-opacity',
  }[type] ?? null;
}

function buildLayerPanel(map, layers) {
  _map = map;
  const container = document.getElementById('layer-list');
  container.innerHTML = '';

  const grouped = {};
  for (const layer of layers) {
    const gid = getLayerGroup(layer);
    if (!grouped[gid]) grouped[gid] = [];
    grouped[gid].push(layer);
  }

  const orderedIds = [...LAYER_GROUPS.map(g => g.id), 'sonstige'];
  for (const gid of orderedIds) {
    const groupLayers = grouped[gid];
    if (!groupLayers?.length) continue;
    const def = LAYER_GROUPS.find(g => g.id === gid) ?? { id: 'sonstige', label: 'Sonstige' };
    container.appendChild(renderGroup(def, groupLayers));
  }

  applySearch(_searchTerm);
}

function renderGroup(group, layers) {
  const groupEl = document.createElement('div');
  groupEl.className = 'layer-group';

  const header = document.createElement('div');
  header.className = 'group-header';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'group-toggle';
  toggleBtn.textContent = '▼';
  toggleBtn.title = 'Gruppe ein-/ausklappen';

  const labelEl = document.createElement('span');
  labelEl.className = 'group-label';
  labelEl.textContent = group.label;

  const countEl = document.createElement('span');
  countEl.className = 'group-count';
  countEl.textContent = layers.length;

  const allOnBtn = document.createElement('button');
  allOnBtn.className = 'btn-group-action';
  allOnBtn.textContent = 'EIN';
  allOnBtn.title = 'Alle Layer dieser Gruppe einblenden';

  const allOffBtn = document.createElement('button');
  allOffBtn.className = 'btn-group-action';
  allOffBtn.textContent = 'AUS';
  allOffBtn.title = 'Alle Layer dieser Gruppe ausblenden';

  header.append(toggleBtn, labelEl, countEl, allOnBtn, allOffBtn);

  const body = document.createElement('div');
  body.className = 'group-body';

  for (const layer of layers) {
    body.appendChild(renderLayer(layer));
  }

  let collapsed = false;
  toggleBtn.addEventListener('click', () => {
    collapsed = !collapsed;
    body.style.display = collapsed ? 'none' : '';
    toggleBtn.textContent = collapsed ? '▶' : '▼';
  });

  allOnBtn.addEventListener('click', () => setGroupVisibility(layers, true, body));
  allOffBtn.addEventListener('click', () => setGroupVisibility(layers, false, body));

  groupEl.append(header, body);
  return groupEl;
}

function setGroupVisibility(layers, visible, bodyEl) {
  const val = visible ? 'visible' : 'none';
  for (const layer of layers) {
    try { _map.setLayoutProperty(layer.id, 'visibility', val); } catch (e) {}
  }
  bodyEl.querySelectorAll('.layer-vis-cb').forEach(cb => { cb.checked = visible; });
}

function renderLayer(layer) {
  const row = document.createElement('div');
  row.className = 'layer-row';
  row.dataset.layerName = layer.id.toLowerCase();

  const typeBadge = document.createElement('span');
  typeBadge.className = `layer-type-badge type-${layer.type}`;
  typeBadge.textContent = layer.type[0].toUpperCase();
  typeBadge.title = `Typ: ${layer.type}`;

  const visCb = document.createElement('input');
  visCb.type = 'checkbox';
  visCb.className = 'layer-vis-cb';
  visCb.title = 'Layer ein-/ausblenden';
  try {
    visCb.checked = _map.getLayoutProperty(layer.id, 'visibility') !== 'none';
  } catch (e) {
    visCb.checked = true;
  }
  visCb.addEventListener('change', () => {
    try { _map.setLayoutProperty(layer.id, 'visibility', visCb.checked ? 'visible' : 'none'); } catch (e) {}
  });

  const nameEl = document.createElement('span');
  nameEl.className = 'layer-name';
  nameEl.title = layer.id;
  nameEl.textContent = layer.id;

  if (layer.minzoom != null || layer.maxzoom != null) {
    const zoomBadge = document.createElement('span');
    zoomBadge.className = 'zoom-badge';
    zoomBadge.textContent = `z${layer.minzoom ?? 0}–${layer.maxzoom ?? 24}`;
    zoomBadge.title = `Sichtbar bei Zoom ${layer.minzoom ?? 0}–${layer.maxzoom ?? 24}`;
    nameEl.appendChild(zoomBadge);
  }

  const controls = document.createElement('div');
  controls.className = 'layer-controls';

  // Color picker
  const colorProp = getColorProp(layer.type);
  if (colorProp) {
    let currentColor;
    try { currentColor = _map.getPaintProperty(layer.id, colorProp); } catch (e) {}
    const isExpr = currentColor !== null && currentColor !== undefined && typeof currentColor === 'object';
    const hex = isExpr ? null : colorToHex(currentColor);

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'layer-color-input';
    colorInput.value = hex ?? '#888888';
    colorInput.disabled = isExpr;
    colorInput.title = isExpr ? 'Farbe per Ausdruck gesteuert (nicht editierbar)' : 'Farbe ändern';
    colorInput.dataset.layerId = layer.id;
    colorInput.dataset.colorProp = colorProp;
    colorInput.addEventListener('input', () => {
      try { _map.setPaintProperty(layer.id, colorProp, colorInput.value); } catch (e) {}
    });
    controls.appendChild(colorInput);
  }

  // Opacity slider
  const opacityProp = getOpacityProp(layer.type);
  if (opacityProp) {
    let currentOpacity;
    try { currentOpacity = _map.getPaintProperty(layer.id, opacityProp); } catch (e) {}
    const isExpr = currentOpacity !== null && currentOpacity !== undefined && typeof currentOpacity === 'object';
    const opacVal = typeof currentOpacity === 'number' ? currentOpacity : 1.0;

    const opacSlider = document.createElement('input');
    opacSlider.type = 'range';
    opacSlider.className = 'layer-opacity-slider';
    opacSlider.min = 0;
    opacSlider.max = 100;
    opacSlider.value = Math.round(opacVal * 100);
    opacSlider.disabled = isExpr;
    opacSlider.title = `Deckkraft: ${Math.round(opacVal * 100)}%`;
    opacSlider.addEventListener('input', () => {
      opacSlider.title = `Deckkraft: ${opacSlider.value}%`;
      try { _map.setPaintProperty(layer.id, opacityProp, opacSlider.value / 100); } catch (e) {}
    });
    controls.appendChild(opacSlider);
  }

  // Line width (only for non-expression line layers)
  if (layer.type === 'line') {
    let currentWidth;
    try { currentWidth = _map.getPaintProperty(layer.id, 'line-width'); } catch (e) {}
    const isExpr = currentWidth !== null && currentWidth !== undefined && typeof currentWidth === 'object';
    if (!isExpr) {
      const widthVal = typeof currentWidth === 'number' ? currentWidth : 1;
      const widthSlider = document.createElement('input');
      widthSlider.type = 'range';
      widthSlider.className = 'layer-width-slider';
      widthSlider.min = 0;
      widthSlider.max = 20;
      widthSlider.step = 0.5;
      widthSlider.value = widthVal;
      widthSlider.title = `Linienbreite: ${widthVal}px`;
      widthSlider.addEventListener('input', () => {
        widthSlider.title = `Linienbreite: ${widthSlider.value}px`;
        try { _map.setPaintProperty(layer.id, 'line-width', parseFloat(widthSlider.value)); } catch (e) {}
      });
      controls.appendChild(widthSlider);
    }
  }

  row.append(typeBadge, visCb, nameEl, controls);
  return row;
}

function applySearch(term) {
  _searchTerm = term ?? '';
  const lower = _searchTerm.toLowerCase();

  document.querySelectorAll('.layer-group').forEach(group => {
    let hasVisible = false;
    group.querySelectorAll('.layer-row').forEach(row => {
      const name = row.dataset.layerName ?? '';
      const show = !lower || name.includes(lower);
      row.style.display = show ? '' : 'none';
      if (show) hasVisible = true;
    });
    group.style.display = hasVisible ? '' : 'none';
  });
}
