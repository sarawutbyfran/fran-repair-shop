const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// กำหนด path สำหรับเก็บฐานข้อมูล (ถ้าอยู่บน Render ให้ชี้ไปที่ Render Disk เช่น /data/database.sqlite)
// ช่วงทดสอบบนเครื่องตัวเอง สามารถใช้ path ปกติได้ครับ
const dbPath = process.env.RENDER_DISK_PATH 
  ? path.join(process.env.RENDER_DISK_PATH, 'database.sqlite') 
  : path.join(__dirname, 'database.sqlite');

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
    // 1. ตารางคลังอะไหล่กลาง (Master Parts)
    db.run(`CREATE TABLE IF NOT EXISTS parts_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      part_code TEXT,
      part_name TEXT NOT NULL,
      category TEXT,
      unit_price REAL DEFAULT 0
    )`);

    // 2. ตารางบิลซ่อมหลัก (Repairs)
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

    // 3. ตารางรายการอะไหล่ในแต่ละบิล (Repair Items)
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

module.exports = db;