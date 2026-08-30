// mapview.js — all direct Leaflet interaction lives here.
// Nothing outside this file should touch the `L` global or the Leaflet map instance.

window.App = window.App || {};

App.MapView = (function () {
  const CAT_LABELS = { food: '食', sights: '見', hotel: '宿' };

  let map = null;
  let markers = {};

  function init(center, zoom, onMapClick) {
    map = L.map('map', { zoomControl: true }).setView(center, zoom);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS',
        maxZoom: 18,
      }
    ).addTo(map);

    map.on('click', onMapClick);
    return map;
  }

  function makeIcon(category) {
    return L.divIcon({
      className: '',
      html: `<div class="stamp-marker cat-${category}">${CAT_LABELS[category]}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  }

function openPopup(id) {
  if (markers[id]) markers[id].openPopup();
}
// Inside js/mapview.js

  function renderMarkers(pins, { onMarkerClick, onMarkerHover }) {
    // Clear existing markers
    Object.values(markers).forEach((m) => map.removeLayer(m));
    markers = {};

    pins.forEach((pin) => {
      const marker = L.marker([pin.lat, pin.lng], { 
        icon: makeIcon(pin.category),
        riseOnHover: true // Leaflet built-in to bring marker to front
      }).addTo(map);

      // 1. Details Popup on Click
      const popupContent = `
        <div class="popup-box">
          <div class="popup-meta">${pin.category} • Added by ${pin.user_name}</div>
          <div class="popup-title">${pin.name}</div>
          ${pin.notes ? `<div class="popup-notes">${pin.notes}</div>` : ''}
        </div>
      `;
      marker.bindPopup(popupContent, { offset: [0, -10] });

      // 2. Interaction Events
      marker.on('click', () => onMarkerClick(pin.id));
      
      marker.on('mouseover', () => {
        highlightMarker(pin.id, true);
        onMarkerHover(pin.id, true);
      });

      marker.on('mouseout', () => {
        highlightMarker(pin.id, false);
        onMarkerHover(pin.id, false);
      });

      markers[pin.id] = marker;
    });
  }

  function flyTo(lat, lng, zoom = 13) {
    map.flyTo([lat, lng], zoom, { duration: 0.6 });
  }

  function highlightMarker(id, active) {
    const marker = markers[id];
    if (!marker) return;
    const iconElem = marker.getElement();
    if (!iconElem) return;
    const inner = iconElem.querySelector('.stamp-marker');
    if (!inner) return;
    inner.classList.toggle('highlighted', active);
    marker.setZIndexOffset(active ? 1000 : 0);
  }

  return { CAT_LABELS, init, renderMarkers, flyTo, highlightMarker, openPopup };
})();
