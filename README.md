# Japan Trip Planner

A simple map tool for pinning places you want to visit, grouped into
food 食 / sights 見 / stay 宿, with notes and a search box for jumping to
any city.

## Running it

No build step needed. Just open `index.html` directly in a browser
(double-click it, or drag it into a browser window).

## Project structure

```
japan-trip-planner/
├── index.html          # Page structure only
├── css/
│   └── styles.css      # All styling
└── js/
    ├── storage.js       # Reads/writes pins to localStorage
    ├── state.js         # In-memory app state (pins, filters, map config)
    ├── mapview.js        # All Leaflet-specific map logic
    ├── search.js        # Geocoding via OpenStreetMap Nominatim
    ├── ui.js             # DOM rendering and element wiring
    └── main.js           # Wires everything together on page load
```

Each script attaches its module to a shared `App` namespace
(`App.Storage`, `App.State`, `App.MapView`, `App.Search`, `App.UI`) so
there's no global variable clutter, and no build tools are required —
they're loaded as plain `<script>` tags in order, in `index.html`.

`main.js` is the only file that "knows about" all the others — it's the
glue layer. If you want to change how pins are stored, you only touch
`storage.js`. If you want to change the map provider, you only touch
`mapview.js`. Etc.

## Important: how saving works

Pins are saved with the browser's `localStorage`, under a key like
`japan-trip-planner:pins:japan`. Keep in mind:

- **It's per-browser, per-device.** Pins won't show up if you open the
  file on your phone or in a different browser — each one has its own
  storage.
- **Clearing your browser's site data/cache will erase your pins.**
- There's no account system and no server — it's just a local file.

If you eventually want your pins to sync across devices or be shareable
with travel companions, that would need a real backend and database
(e.g. a small Node/Express API with SQLite or Postgres) instead of
localStorage — a bigger step up from this project.

## Adding another country later

`js/state.js` has a `MAPS` object with one entry (`japan`). To support
another country, you'd add a second entry with its own center/zoom, and
add a small switcher in the UI to change `currentMapId` — pins are
already stored per-map-id, so they won't mix together.
