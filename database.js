const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const diskPath = process.env.RENDER_DISK_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(diskPath)) {
  fs.mkdirSync(diskPath, { recursive: true });
}

const dbPath = path.join(diskPath, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error opening database', err.message);
  else {
    db.serialize(() => {
      // ตารางหลังบ้าน: คลังอะไหล่
      db.run(`CREATE TABLE IF NOT EXISTS parts_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_type TEXT,       -- ชนิด
        part_name TEXT,       -- รายการ (ชื่อเบอร์อะไหล่)
        cost_price REAL,      -- ราคาทุน
        sale_price REAL,      -- ราคาขาย
        profit REAL,          -- กำไร
        source TEXT           -- แหล่งซื้อ
      )`);
      
      // ตารางบิลซ่อมหลัก
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

      // ตารางรายการอะไหล่ในบิล
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