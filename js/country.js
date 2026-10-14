// js/country.js
(function () {
  window.App = window.App || {};

  let countries = null;
  const cache = new Map(); // pin.id -> country name

  function bboxOf(polys) {
    let minX = 180, minY = 90, maxX = -180, maxY = -90;
    for (const poly of polys) for (const [x, y] of poly[0]) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return [minX, minY, maxX, maxY];
  }

  function inRing(lng, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) &&
          lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function inPolygon(lng, lat, poly) {
    if (!inRing(lng, lat, poly[0])) return false;
    for (let k = 1; k < poly.length; k++) if (inRing(lng, lat, poly[k])) return false;
    return true;
  }

  async function load() {
    if (countries) return;
    const res = await fetch('data/countries.geojson');
    const gj = await res.json();
    countries = gj.features.map((f) => {
      const polys = f.geometry.type === 'Polygon'
        ? [f.geometry.coordinates]
        : f.geometry.coordinates;
      return { name: f.properties.ADMIN || f.properties.name, polys, bbox: bboxOf(polys) };
    });
  }

  function getCountry(pin) {
    if (!countries) return 'Unknown';
    if (cache.has(pin.id)) return cache.get(pin.id);
    let result = 'Unknown';
    for (const c of countries) {
      const [minX, minY, maxX, maxY] = c.bbox;
      if (pin.lng < minX || pin.lng > maxX || pin.lat < minY || pin.lat > maxY) continue;
      if (c.polys.some((p) => inPolygon(pin.lng, pin.lat, p))) { result = c.name; break; }
    }
    cache.set(pin.id, result);
    return result;
  }

  function groupByCountry(pins) {
    const groups = {};
    for (const pin of pins) (groups[getCountry(pin)] ??= []).push(pin);
    return groups;
  }

  window.App.Country = { load, getCountry, groupByCountry };
})();