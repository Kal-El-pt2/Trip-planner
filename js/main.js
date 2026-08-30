// js/main.js
(function () {
  const { State, MapView, UI, Storage, Search } = window.App;

  let pendingLatLng = null;
  let selectedCategory = null;

  function refresh() {
    const allPins = State.getPins();
    const filteredPins = State.getFilteredPins();
    
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

  async function handleSave({ name, notes }) {
    if (!name) return UI.showStatus('Give this stop a name');
    if (!selectedCategory) return UI.showStatus('Pick a category');

    const newPin = {
      id: 'pin_' + Date.now(),
      lat: pendingLatLng.lat,
      lng: pendingLatLng.lng,
      name,
      category: selectedCategory,
      notes,
      user_id: State.getUserId(),
      user_name: State.getUserName() // Add the name here
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

  async function init() {
    State.initializeUser();
    console.log(`[App] Initializing... User ID: ${State.getUserId()}`);
    const currentMap = State.getCurrentMap();
    
    MapView.init(currentMap.center, currentMap.zoom, handleMapClick);

    UI.showStatus('Loading stops...');
    try {
      const savedPins = await Storage.loadPins(State.currentMapId());
      // Ensure savedPins is an array, otherwise default to empty array
      State.setPins(Array.isArray(savedPins) ? savedPins : []);
    } catch (err) {
      console.error(`[App] Could not load pins:`, err);
      State.setPins([]);
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