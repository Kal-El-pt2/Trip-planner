window.App = window.App || {};

App.State = (function () {
  const MAPS = { japan: { id: 'japan', label: 'Japan', center: [36.2048, 138.2529], zoom: 6 } };
  let currentMapId = 'japan';
  let pins = [];
  let activeFilter = 'all';

  // 1. Identify the user
  let userId = localStorage.getItem('trip_user_id');
  if (!userId) {
    userId = 'U' + Math.random().toString(36).substring(2, 6).toUpperCase();
    localStorage.setItem('trip_user_id', userId);
  }

  // 2. Identify the name (Ask once)
  let userName = localStorage.getItem('trip_user_name');
  
  function initializeUser() {
    if (!userName) {
      const name = prompt("Welcome! Please enter your name for the trip planner:");
      userName = name ? name.trim() : "Guest";
      localStorage.setItem('trip_user_name', userName);
    }
    return userName;
  }

  return {
    initializeUser,
    getUserId: () => userId,
    getUserName: () => userName,
    getCurrentMap: () => MAPS[currentMapId],
    currentMapId: () => currentMapId,
    getPins: () => pins,
    setPins: (p) => { pins = p; },
    addPin: (p) => { pins.push(p); },
    removePin: (id) => { pins = pins.filter(p => p.id !== id); },
    findPin: (id) => pins.find(p => p.id === id),
    setActiveFilter: (f) => { activeFilter = f; },
    getFilteredPins: () => activeFilter === 'all' ? pins : pins.filter(p => p.category === activeFilter),
  };
})();