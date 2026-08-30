// js/ui.js — DOM rendering and interaction logic.
window.App = window.App || {};

App.UI = (function () {
  const el = {
    countBadge: document.getElementById('count-badge'),
    pinList: document.getElementById('pin-list'),
    statsContent: document.getElementById('stats-content'),
    tabs: document.querySelectorAll('.tab'),
    overlay: document.getElementById('overlay'),
    panelTitle: document.getElementById('panel-title'),
    panelCoords: document.getElementById('panel-coords'),
    nameInput: document.getElementById('name-input'),
    notesInput: document.getElementById('notes-input'),
    catBtns: document.querySelectorAll('.cat-btn'),
    saveBtn: document.getElementById('save-btn'),
    cancelBtn: document.getElementById('cancel-btn'),
    status: document.getElementById('status'),
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results'),
  };

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showStatus(message) {
    el.status.textContent = message;
    el.status.classList.add('show');
    setTimeout(() => el.status.classList.remove('show'), 1800);
  }

  // Updates the total count in header and the contribution list in the footer
  function updateCount(pins) {
    if (!Array.isArray(pins)) return; 
    // 1. Update Header Badge
    const total = pins.length;
    el.countBadge.textContent = `${total} stop${total === 1 ? '' : 's'}`;

    // 2. Calculate Contribution Stats
    const stats = {};
    pins.forEach(p => {
      const label = p.user_name || "Guest"; // Use user_name
      stats[label] = (stats[label] || 0) + 1;
    });

    // 3. Render Stats to the panel
    if (el.statsContent) {
      if (pins.length === 0) {
        el.statsContent.innerHTML = '<div style="color: #9a927a; font-style: italic;">No data yet</div>';
      } else {
        el.statsContent.innerHTML = Object.entries(stats)
          .map(([user, count]) => `<div class="stat-item">${user}: ${count}</div>`)
          .join('');
      }
    }
  }

  function renderPinList(pins, { onSelect, onDelete, onHover }) {
    if (pins.length === 0) {
      el.pinList.innerHTML = `<div class="empty-state">No stops here yet.<br/>Tap the map to add your first one.</div>`;
      return;
    }

    el.pinList.innerHTML = pins
      .map(
        (p) => `
      <div class="ticket" data-ticket="${p.id}">
        <div class="ticket-top">
          <div class="stamp-dot cat-${p.category}">${App.MapView.CAT_LABELS[p.category]}</div>
          <div class="ticket-name">${escapeHtml(p.name)}</div>
          <button class="ticket-del" data-id="${p.id}">✕</button>
        </div>
        <div class="ticket-meta">Added by: ${escapeHtml(p.user_name)}</div>
        ${p.notes ? `<div class="ticket-notes">${escapeHtml(p.notes)}</div>` : ''}
      </div>
    `
      )
      .join('');

    el.pinList.querySelectorAll('.ticket').forEach((ticketEl) => {
      ticketEl.addEventListener('click', (e) => {
        if (e.target.closest('.ticket-del')) return;
        onSelect(ticketEl.dataset.ticket);
      });
      ticketEl.addEventListener('mouseenter', () => onHover(ticketEl.dataset.ticket, true));
      ticketEl.addEventListener('mouseleave', () => onHover(ticketEl.dataset.ticket, false));
    });

    el.pinList.querySelectorAll('.ticket-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onDelete(btn.dataset.id);
      });
    });
  }

  function onTabChange(callback) {
    el.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        el.tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        callback(tab.dataset.cat);
      });
    });
  }

  function openAddPanel({ lat, lng, prefillName = '' }) {
    el.panelTitle.textContent = 'New stop';
    el.panelCoords.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    el.nameInput.value = prefillName;
    el.notesInput.value = '';
    el.catBtns.forEach((b) => b.classList.remove('selected'));
    el.overlay.classList.add('open');
    el.nameInput.focus();
  }

  function closeAddPanel() {
    el.overlay.classList.remove('open');
  }

  function onCategoryPick(callback) {
    el.catBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        el.catBtns.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        callback(btn.dataset.cat);
      });
    });
  }

  function onOverlayDismiss(callback) {
    el.cancelBtn.addEventListener('click', callback);
    el.overlay.addEventListener('click', (e) => {
      if (e.target === el.overlay) callback();
    });
  }

  function onSave(callback) {
    el.saveBtn.addEventListener('click', () => {
      callback({
        name: el.nameInput.value.trim(),
        notes: el.notesInput.value.trim(),
      });
    });
  }

  function highlightTicket(id, active) {
    const ticket = el.pinList.querySelector(`[data-ticket="${id}"]`);
    if (ticket) ticket.classList.toggle('highlighted', active);
  }

  function scrollToTicket(id) {
    const ticket = el.pinList.querySelector(`[data-ticket="${id}"]`);
    if (ticket) {
      ticket.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightTicket(id, true);
      setTimeout(() => highlightTicket(id, false), 2000);
    }
  }

  function onSearchInput(callback) {
    el.searchInput.addEventListener('input', () => callback(el.searchInput.value.trim()));
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#search-wrap')) closeSearchResults();
    });
  }

  function clearSearchInput() {
    el.searchInput.value = '';
  }

  function renderSearchResults(results, onPick) {
    if (results.length === 0) {
      el.searchResults.innerHTML = `<div class="search-empty">No places found</div>`;
    } else {
      el.searchResults.innerHTML = results
        .map((r, i) => `<div class="search-item" data-idx="${i}">${escapeHtml(r.display_name)}</div>`)
        .join('');
      el.searchResults.querySelectorAll('.search-item').forEach((item) => {
        item.addEventListener('click', () => onPick(results[+item.dataset.idx]));
      });
    }
    el.searchResults.classList.add('open');
  }

  function showSearchLoading() {
    el.searchResults.innerHTML = `<div class="search-empty">Searching...</div>`;
    el.searchResults.classList.add('open');
  }

  function showSearchError() {
    el.searchResults.innerHTML = `<div class="search-empty">Search failed — try again</div>`;
  }

  function closeSearchResults() {
    el.searchResults.classList.remove('open');
  }

  return {
    showStatus,
    updateCount,
    renderPinList,
    onTabChange,
    openAddPanel,
    closeAddPanel,
    onCategoryPick,
    onOverlayDismiss,
    onSave,
    onSearchInput,
    clearSearchInput,
    renderSearchResults,
    showSearchLoading,
    showSearchError,
    closeSearchResults,
    highlightTicket,
    scrollToTicket
  };
})();