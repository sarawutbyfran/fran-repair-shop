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

const diskPath = process.env.RENDER_DISK_PATH || path.join(__dirname, 'data');
const uploadDir = path.join(diskPath, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// API: ดึงรายการอะไหล่ไปแสดงใน Dropdown
app.get('/api/parts', (req, res) => {
  db.all("SELECT * FROM parts_inventory", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: บันทึกบิล (ป้องกัน Server Crash ด้วยการเช็ค Error อย่างรัดกุม)
app.post('/api/repairs', upload.single('repair_image'), (req, res) => {
  try {
    const {
      bill_no, date, customer_name, customer_address,
      repair_sender, amp_class, amp_brand, amp_power, symptom, items
    } = req.body;

    const image_path = req.file ? `/uploads/${req.file.filename}` : '';
    const parsedItems = items ? JSON.parse(items) : [];

    const sqlBill = `INSERT INTO repairs (bill_no, date, customer_name, customer_address, repair_sender, amp_class, amp_brand, amp_power, symptom, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sqlBill, [bill_no, date, customer_name, customer_address, repair_sender, amp_class, amp_brand, amp_power, symptom, image_path], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const repairId = this.lastID;
      const stmt = db.prepare(`INSERT INTO repair_items (repair_id, item_name, quantity, unit_price) VALUES (?, ?, ?, ?)`);
      
      parsedItems.forEach(item => {
        if (item.name) stmt.run(repairId, item.name, item.qty, item.price);
      });
      stmt.finalize();

      res.json({ success: true, id: repairId });
    });
  } catch (error) {
    res.status(500).json({ error: 'Data parsing error' });
  }
});

// API: ดึงประวัติบิล
app.get('/api/repairs', (req, res) => {
  db.all("SELECT * FROM repairs ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.listen(process.env.PORT || 10000, '0.0.0.0', () => console.log('Server is running'));