// mapview.js — all direct Leaflet interaction lives here.
// Nothing outside this file should touch the `L` global or the Leaflet map instance.

window.App = window.App || {};

App.MapView = (function () {
  const CAT_LABELS = { food: '食', sights: '見', hotel: '宿' };

  let map = null;
  let markers = {};
  let userLocationMarker = null; // kept separate from pin markers so renderMarkers() doesn't wipe it

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

  // Locate the user via browser Geolocation API, fly the map to them,
  // and drop a "you are here" marker. Calls back with (lat, lng) on
  // success, or (null, error) on failure, so callers can react either way.
  function locateUser({ zoom = 13, onSuccess, onError } = {}) {
    if (!navigator.geolocation) {
      if (onError) onError(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        flyTo(latitude, longitude, zoom);

        if (userLocationMarker) {
          map.removeLayer(userLocationMarker);
        }

        userLocationMarker = L.circleMarker([latitude, longitude], {
          radius: 8,
          color: '#4a90e2',
          fillColor: '#4a90e2',
          fillOpacity: 0.7,
          weight: 2,
        })
          .addTo(map)
          .bindPopup('You are here');

        if (onSuccess) onSuccess(latitude, longitude);
      },
      (error) => {
        if (onError) onError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  }

  return { CAT_LABELS, init, renderMarkers, flyTo, highlightMarker, openPopup, locateUser };
})();