const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// ตรวจสอบเส้นทาง Render Disk ถ้าไม่มีให้ใช้โฟลเดอร์ data ท้องถิ่น
const diskPath = process.env.RENDER_DISK_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(diskPath)) {
  fs.mkdirSync(diskPath, { recursive: true });
}

const dbPath = path.join(diskPath, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error opening database', err.message);
  else {
    console.log('Database connected at:', dbPath);
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS parts_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_type TEXT,
        part_name TEXT,
        cost_price REAL,
        sale_price REAL,
        profit REAL,
        source TEXT
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
        status TEXT DEFAULT 'กำลังซ่อม',
        image_path TEXT,
        is_paid INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS repair_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repair_id INTEGER,
        item_name TEXT,
        quantity INTEGER,
        unit_price REAL,
        FOREIGN KEY(repair_id) REFERENCES repairs(id)
      )`);
    });
  }
});

module.exports = db;