const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ตั้งค่าโฟลเดอร์เก็บรูปภาพบน Render Disk
const diskPath = process.env.RENDER_DISK_PATH || path.join(__dirname, 'data');
const uploadDir = path.join(diskPath, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));

// ตั้งค่า Multer สำหรับอัปโหลดไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// API: ดึงรายการบิลทั้งหมด
app.get('/api/repairs', (req, res) => {
  const sql = `SELECT * FROM repairs ORDER BY id DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: บันทึกบิลใหม่พร้อมรูปภาพ
app.post('/api/repairs', upload.single('repair_image'), (req, res) => {
  const {
    bill_no, date, customer_name, customer_address,
    repair_sender, amp_class, amp_brand, amp_power, symptom, items
  } = req.body;

  const image_path = req.file ? `/uploads/${req.file.filename}` : '';
  const parsedItems = JSON.parse(items || '[]');

  const sqlBill = `INSERT INTO repairs 
    (bill_no, date, customer_name, customer_address, repair_sender, amp_class, amp_brand, amp_power, symptom, image_path, is_paid) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`;

  db.run(sqlBill, [bill_no, date, customer_name, customer_address, repair_sender, amp_class, amp_brand, amp_power, symptom, image_path], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const repairId = this.lastID;

    const sqlItem = `INSERT INTO repair_items (repair_id, item_name, quantity, unit_price) VALUES (?, ?, ?, ?)`;
    const stmt = db.prepare(sqlItem);
    parsedItems.forEach(item => {
      if (item.name) stmt.run(repairId, item.name, item.qty, item.price);
    });
    stmt.finalize();

    res.json({ success: true, id: repairId, image_path });
  });
});

// API: สลับสถานะการจ่ายเงิน
app.patch('/api/repairs/:id/pay', (req, res) => {
  const { is_paid } = req.body;
  db.run(`UPDATE repairs SET is_paid = ? WHERE id = ?`, [is_paid, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});