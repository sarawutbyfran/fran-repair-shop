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

// ... (โค้ดส่วนบนเหมือนเดิม) ...

// แก้ไข Multer ให้รับไฟล์ได้สูงสุด 10 รูป
app.post('/api/repairs', upload.array('repair_images', 10), (req, res) => {
  try {
    const {
      bill_no, date, customer_name, customer_address,
      repair_sender, amp_class, amp_brand, amp_power, symptom, items
    } = req.body;

    // รวมพาทรูปภาพทั้งหมดคั่นด้วยคอมม่า
    const image_path = req.files && req.files.length > 0 
      ? req.files.map(f => `/uploads/${f.filename}`).join(',') 
      : '';
    
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

// ... (โค้ดส่วนอื่นเหมือนเดิม) ...
// API: ดึงประวัติบิล
app.get('/api/repairs', (req, res) => {
  db.all("SELECT * FROM repairs ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
// API: เพิ่มรายการอะไหล่เข้าระบบหลังบ้าน
app.post('/api/parts', (req, res) => {
  const { part_type, part_name, cost_price, sale_price, profit, source } = req.body;
  db.run(`INSERT INTO parts_inventory (part_type, part_name, cost_price, sale_price, profit, source) VALUES (?, ?, ?, ?, ?, ?)`,
    [part_type, part_name, cost_price, sale_price, profit, source], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
  });
});

// API: อัปเดตสถานะการจ่ายเงิน
app.patch('/api/repairs/:id/pay', (req, res) => {
  const { is_paid } = req.body;
  db.run(`UPDATE repairs SET is_paid = ? WHERE id = ?`, [is_paid, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(process.env.PORT || 10000, '0.0.0.0', () => console.log('Server is running'));