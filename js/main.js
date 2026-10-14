// js/main.js
(function () {
  const { State, MapView, UI, Storage, Search, Country } = window.App;

  let pendingLatLng = null;
  let selectedCategory = null;
  let activeCountry = 'all';

  function renderCountryChips(allPins) {
    const el = document.getElementById('country-chips');
    const groups = Country.groupByCountry(allPins);
    const names = Object.keys(groups).sort();

    // Selected country vanished (e.g. its last pin was deleted)
    if (activeCountry !== 'all' && !groups[activeCountry]) activeCountry = 'all';

    el.textContent = '';
    if (names.length < 2) return; // no point showing chips for a single country

    const make = (label, value) => {
      const chip = document.createElement('div');
      chip.className = 'country-chip' + (activeCountry === value ? ' active' : '');
      chip.textContent = label;
      chip.onclick = () => { activeCountry = value; refresh(); };
      el.appendChild(chip);
    };

    make(`All (${allPins.length})`, 'all');
    names.forEach((n) => make(`${n} (${groups[n].length})`, n));
  }

  // Local date as YYYY-MM-DD, built from parts so it doesn't depend on locale formatting
  function todayStr() {
    const n = new Date();
    const p = (x) => String(x).padStart(2, '0');
    return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
  }

  // 0 = upcoming (or today), 1 = past, 2 = no date
  function dateRank(pin, today) {
    if (!pin.date) return 2;
    return pin.date >= today ? 0 : 1;
  }

  function comparePins(a, b, today) {
    const ra = dateRank(a, today), rb = dateRank(b, today);
    if (ra !== rb) return ra - rb;
    if (ra === 0) return a.date.localeCompare(b.date); // soonest first
    if (ra === 1) return b.date.localeCompare(a.date); // most recent past first
    return 0;                                          // undated: keep original order
  }

  function refresh() {
    const allPins = State.getPins();
    const today = todayStr();
    renderCountryChips(allPins);
    const filteredPins = State.getFilteredPins()
      .filter((p) => activeCountry === 'all' || Country.getCountry(p) === activeCountry)
      .sort((a, b) =>
        Country.getCountry(a).localeCompare(Country.getCountry(b)) ||
        comparePins(a, b, today)
      );

    UI.updateCount(allPins);

    UI.renderPinList(filteredPins, {
      onSelect: (id) => {
        const pin = State.findPin(id);
        MapView.flyTo(pin.lat, pin.lng, 15);
        // Automatically open the popup when selected from sidebar
        MapView.openPopup(id);
      },
      onDelete: handlePinDelete,
      onHover: (id, active) => MapView.highlightMarker(id, active),
      onDateChange: handleDateChange,
    });

    MapView.renderMarkers(filteredPins, {
      onMarkerClick: (id) => {
        // Optional: Scroll the sidebar to the selected ticket
        UI.scrollToTicket(id);
      },
      onMarkerHover: (id, active) => {
        UI.highlightTicket(id, active);
      }
    });
  }

  function handleMapClick(e) {
    pendingLatLng = e.latlng;
    selectedCategory = null;
    UI.openAddPanel({ lat: e.latlng.lat, lng: e.latlng.lng });
  }

  async function handlePinDelete(id) {
    State.removePin(id);
    refresh();
    UI.showStatus('Removing...');
    try {
      await Storage.deletePin(id);
      UI.showStatus('Stop removed');
    } catch (err) {
      console.error(`[App] Delete failed:`, err);
    }
  }

  async function handleDateChange(id, date) {
    const pin = State.findPin(id);
    if (!pin) return;
    const prev = pin.date;
    pin.date = date;
    refresh();

    UI.showStatus('Updating date...');
    try {
      await Storage.updatePinDate(id, date);
      UI.showStatus('Date updated ✓');
    } catch (err) {
      console.error('[App] Date update failed:', err);
      pin.date = prev;
      refresh();
      UI.showStatus('Could not update date');
    }
  }

  async function handleSave({ name, notes, date }) {
    if (!name) return UI.showStatus('Give this stop a name');
    if (!selectedCategory) return UI.showStatus('Pick a category');

    const newPin = {
      id: 'pin_' + Date.now(),
      lat: pendingLatLng.lat,
      lng: pendingLatLng.lng,
      name,
      category: selectedCategory,
      notes,
      date,
      user_id: State.getUserId(),
      user_name: State.getUserName()
    };

    State.addPin(newPin);
    refresh();
    UI.closeAddPanel();

    UI.showStatus('Saving...');
    try {
      await Storage.savePin(State.currentMapId(), newPin);
      UI.showStatus('Stamped ✓');
    } catch (err) {
      console.error(`[App] Save failed:`, err);
      UI.showStatus('Database error - Pin saved locally only');
    }
  }

  function handleSearchInput(query) {
    if (!query) return UI.closeSearchResults();
    UI.showSearchLoading();
    Search.debouncedSearch(query, (err, results) => {
      if (err) return UI.showSearchError();
      UI.renderSearchResults(results, (item) => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        MapView.flyTo(lat, lon, 14);
        UI.closeSearchResults();
        UI.clearSearchInput();
        handleMapClick({ latlng: { lat, lng: lon } });
      });
    });
  }

  function locateUser() {
    MapView.locateUser({
      zoom: 13,
      onSuccess: () => {
        UI.showStatus('Located you 📍');
      },
      onError: (err) => {
        console.warn('[App] Geolocation failed:', err.message);
        UI.showStatus('Location unavailable - showing default view');
      },
    });
  }

  async function init() {
    State.initializeUser();
    console.log(`[App] Initializing... User ID: ${State.getUserId()}`);
    const currentMap = State.getCurrentMap();

    MapView.init(currentMap.center, currentMap.zoom, handleMapClick);
    locateUser();

    UI.showStatus('Loading stops...');
    try {
      const savedPins = await Storage.loadPins(State.currentMapId());
      // Ensure savedPins is an array, otherwise default to empty array
      State.setPins(Array.isArray(savedPins) ? savedPins : []);
    } catch (err) {
      console.error(`[App] Could not load pins:`, err);
      State.setPins([]);
    }

    try {
      await Country.load();
    } catch (err) {
      console.error('[App] Could not load countries:', err); // chips just won't show
    }

    UI.onTabChange((category) => {
      State.setActiveFilter(category);
      refresh();
    });
    UI.onCategoryPick((category) => {
      selectedCategory = category;
    });
    UI.onOverlayDismiss(() => UI.closeAddPanel());
    UI.onSave(handleSave);
    UI.onSearchInput(handleSearchInput);

    refresh();
  }

  document.addEventListener('DOMContentLoaded', init);
})();