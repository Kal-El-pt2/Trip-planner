// js/storage.js
window.App = window.App || {};

App.Storage = (function () {
  const API_URL = '/api';

  async function loadPins(mapId) {
    const response = await fetch(`${API_URL}/pins/${mapId}`);
    if (!response.ok) throw new Error('Failed to load');
    return await response.json();
  }

  async function savePin(mapId, pin) {
    const response = await fetch(`${API_URL}/pins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...pin, map_id: mapId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Server error');
    }
    return await response.json();
  }

  async function deletePin(id) {
    const response = await fetch(`${API_URL}/pins/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete');
    return await response.json();
  }

  async function updatePinDate(id, date) {
    const response = await fetch(`${API_URL}/pins/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    if (!response.ok) throw new Error('Failed to update date');
    return await response.json();
  }

  return { loadPins, savePin, deletePin, updatePinDate };
})();