require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../')));
console.log("Checking DB User:", process.env.DB_USER);

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
  },
});

// Test connection on startup
db.query('SELECT 1').then(() => {
  console.log('✅ Connected to Postgres database');
}).catch(err => {
  console.error('❌ CRITICAL: Could not connect to Postgres. Check your .env file!', err.message);
});

// API ROUTES
app.get('/api/pins/:mapId', async (req, res) => {
  console.log(`[GET] Fetching pins for map: ${req.params.mapId}`);
  try {
    const { rows } = await db.query('SELECT * FROM pins WHERE map_id = $1', [req.params.mapId]);
    console.log(`[GET] Success: Found ${rows.length} pins`);
    res.json(rows);
  } catch (err) {
    console.error(`[GET] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pins', async (req, res) => {
  const { id, map_id, lat, lng, name, category, notes, user_id, user_name } = req.body;
  console.log(`[STAMP] ${user_name} added: ${name}`);

  try {
    const sql = `INSERT INTO pins (id, map_id, lat, lng, name, category, notes, user_id, user_name)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
    await db.query(sql, [id, map_id, lat, lng, name, category, notes, user_id, user_name]);
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/pins/:id', async (req, res) => {
  console.log(`[DELETE] Request to remove pin ID: ${req.params.id}`);
  try {
    await db.query('DELETE FROM pins WHERE id = $1', [req.params.id]);
    console.log(`[DELETE] Success: Pin removed`);
    res.json({ success: true });
  } catch (err) {
    console.error(`[DELETE] Error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Local server: http://localhost:${PORT}`));
}

module.exports = app;