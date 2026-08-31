require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') }); 
const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../')));
console.log("Checking DB User:", process.env.DB_USER);
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, 'ca.pem')),
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise();

// Test connection on startup
db.query('SELECT 1').then(() => {
  console.log('✅ Connected to MySQL database');
}).catch(err => {
  console.error('❌ CRITICAL: Could not connect to MySQL. Check your .env file!', err.message);
});

// API ROUTES
app.get('/api/pins/:mapId', async (req, res) => {
  console.log(`[GET] Fetching pins for map: ${req.params.mapId}`);
  try {
    const [rows] = await db.query('SELECT * FROM pins WHERE map_id = ?', [req.params.mapId]);
    console.log(`[GET] Success: Found ${rows.length} pins`);
    res.json(rows);
  } catch (err) { 
    console.error(`[GET] Error:`, err.message);
    res.status(500).json({ error: err.message }); 
  }
});

// backend/server.js

app.post('/api/pins', async (req, res) => {
  const { id, map_id, lat, lng, name, category, notes, user_id, user_name } = req.body;
  console.log(`[STAMP] ${user_name} added: ${name}`);
  
  try {
    const sql = `INSERT INTO pins (id, map_id, lat, lng, name, category, notes, user_id, user_name)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
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
    const [result] = await db.query('DELETE FROM pins WHERE id = ?', [req.params.id]);
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