// search.js — geocoding via OpenStreetMap's free Nominatim API.
// Pure fetch/debounce logic; doesn't touch the DOM. ui.js renders results.

window.App = window.App || {};

App.Search = (function () {
  let debounceTimer = null;

  function debouncedSearch(query, callback, delay = 400) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => runSearch(query, callback), delay);
  }

  async function runSearch(query, callback) {
    try {
      const url =
        'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&accept-language=en&q=' +
        encodeURIComponent(query);
      const res = await fetch(url);
      const results = await res.json();
      callback(null, results);
    } catch (err) {
      callback(err, []);
    }
  }

  function shortNameFor(result) {
    if (result.address) {
      return (
        result.address.city ||
        result.address.town ||
        result.address.village ||
        result.display_name.split(',')[0]
      );
    }
    return result.display_name.split(',')[0];
  }

  return { debouncedSearch, shortNameFor };
})();
