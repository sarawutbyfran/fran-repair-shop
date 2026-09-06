const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // เปิดให้เข้าถึงหน้าเว็บในโฟลเดอร์ public

// API: ดึงรายการอะไหล่ทั้งหมด (สำหรับทำ Auto-complete)
app.get('/api/parts', (req, res) => {
  db.all("SELECT * FROM parts_inventory", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: เพิ่มอะไหล่ใหม่ลงคลังกลาง
app.post('/api/parts', (req, res) => {
  const { part_code, part_name, category, unit_price } = req.body;
  const query = `INSERT INTO parts_inventory (part_code, part_name, category, unit_price) VALUES (?, ?, ?, ?)`;
  db.run(query, [part_code, part_name, category, unit_price], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Added successfully' });
  });
});

// รันเซิร์ฟเวอร์ที่ Port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});