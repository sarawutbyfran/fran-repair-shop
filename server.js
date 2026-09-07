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

// API: จัดการคลังอะไหล่
app.get('/api/parts', (req, res) => {
  db.all("SELECT * FROM parts_inventory", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/parts', (req, res) => {
  const { part_type, part_name, cost_price, sale_price, profit, source } = req.body;
  db.run(`INSERT INTO parts_inventory (part_type, part_name, cost_price, sale_price, profit, source) VALUES (?, ?, ?, ?, ?, ?)`,
    [part_type, part_name, cost_price, sale_price, profit, source], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
  });
});

// API: ดึงประวัติบิลทั้งหมด
app.get('/api/repairs', (req, res) => {
  db.all("SELECT * FROM repairs ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: ดึงบิลเดี่ยวเพื่อนำมาแก้ไข
app.get('/api/repairs/:id', (req, res) => {
  db.get("SELECT * FROM repairs WHERE id = ?", [req.params.id], (err, repair) => {
    if (err || !repair) return res.status(404).json({ error: 'Not found' });
    db.all("SELECT * FROM repair_items WHERE repair_id = ?", [req.params.id], (err, items) => {
      res.json({ ...repair, items });
    });
  });
});

// API: สร้างบิลใหม่ (รองรับหลายรูป)
app.post('/api/repairs', upload.array('repair_images', 10), (req, res) => {
  try {
    const { bill_no, date, customer_name, customer_address, repair_sender, amp_class, amp_brand, amp_power, symptom, status, items } = req.body;
    const image_path = req.files && req.files.length > 0 ? req.files.map(f => `/uploads/${f.filename}`).join(',') : '';
    const parsedItems = items ? JSON.parse(items) : [];

    const sqlBill = `INSERT INTO repairs (bill_no, date, customer_name, customer_address, repair_sender, amp_class, amp_brand, amp_power, symptom, status, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sqlBill, [bill_no, date, customer_name, customer_address, repair_sender, amp_class, amp_brand, amp_power, symptom, status || 'กำลังซ่อม', image_path], function (err) {
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
    res.status(500).json({ error: 'Server error' });
  }
});

// API: อัปเดตบิลเดิม (แก้ไขข้อมูลและเพิ่มรูปภาพสะสม)
app.put('/api/repairs/:id', upload.array('repair_images', 10), (req, res) => {
  const id = req.params.id;
  const { customer_name, customer_address, repair_sender, amp_class, amp_brand, amp_power, symptom, status, items } = req.body;
  const parsedItems = items ? JSON.parse(items) : [];

  db.get("SELECT image_path FROM repairs WHERE id = ?", [id], (err, row) => {
    let new_image_path = row ? row.image_path : '';
    if (req.files && req.files.length > 0) {
      const uploadedPaths = req.files.map(f => `/uploads/${f.filename}`).join(',');
      new_image_path = new_image_path ? `${new_image_path},${uploadedPaths}` : uploadedPaths;
    }

    const sqlBill = `UPDATE repairs SET customer_name=?, customer_address=?, repair_sender=?, amp_class=?, amp_brand=?, amp_power=?, symptom=?, status=?, image_path=? WHERE id=?`;
    db.run(sqlBill, [customer_name, customer_address, repair_sender, amp_class, amp_brand, amp_power, symptom, status, new_image_path, id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.run(`DELETE FROM repair_items WHERE repair_id=?`, [id], () => {
        const stmt = db.prepare(`INSERT INTO repair_items (repair_id, item_name, quantity, unit_price) VALUES (?, ?, ?, ?)`);
        parsedItems.forEach(item => {
          if (item.name) stmt.run(id, item.name, item.qty, item.price);
        });
        stmt.finalize();
        res.json({ success: true });
      });
    });
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
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));