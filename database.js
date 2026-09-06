const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// ถ้าอยู่บน Render จะใช้ path จากตัวแปรแวดล้อม RENDER_DISK_PATH
const diskPath = process.env.RENDER_DISK_PATH || path.join(__dirname, 'data');

if (!fs.existsSync(diskPath)) {
  fs.mkdirSync(diskPath, { recursive: true });
}

const dbPath = path.join(diskPath, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    createTables();
  }
});

function createTables() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS parts_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_code TEXT,
      part_name TEXT NOT NULL,
      category TEXT,
      unit_price REAL DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS repairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_no TEXT,
      date TEXT,
      customer_name TEXT,
      customer_address TEXT,
      repair_sender TEXT,
      amp_class TEXT,
      amp_brand TEXT,
      amp_power TEXT,
      symptom TEXT,
      image_path TEXT,
      is_paid INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

module.exports = db;