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

// ตั้งค่า Path สำหรับ Persistent Disk
const fallbackDir = fs.existsSync('/data') ? '/data' : path.join(__dirname, 'data');
const diskPath = process.env.RENDER_DISK_PATH || fallbackDir;
const uploadDir = path.join(diskPath, 'uploads');
const galleryDir = path.join(diskPath, 'gallery'); // โฟลเดอร์แยกสำหรับคลังรูปภาพทั่วไป

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });

app.use('/uploads', express.static(uploadDir));
app.use('/gallery', express.static(galleryDir)); // เสิร์ฟไฟล์จากโฟลเดอร์คลังรูป

// ตัวจัดการอัปโหลดสำหรับรูปบิลซ่อม
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ตัวจัดการอัปโหลดสำหรับคลังรูปภาพอิสระ (Gallery)
const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, galleryDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});
const uploadGallery = multer({ storage: galleryStorage });

// ================= API คลังรูปภาพอิสระ (Gallery) =================
app.get('/api/gallery', (req, res) => {
  fs.readdir(galleryDir, (err, files) => {
    if (err) return res.status(500).json([]);
    res.json(files.map(f => `/gallery/${f}`));
  });
});

app.post('/api/gallery', uploadGallery.array('images', 20), (req, res) => {
  res.json({ success: true });
});

app.delete('/api/gallery/:filename', (req, res) => {
  const filepath = path.join(galleryDir, req.params.filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
  res.json({ success: true });
});

// ================= API คลังอะไหล่ =================
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

app.put('/api/parts/:id', (req, res) => {
  const { part_type, part_name, cost_price, sale_price, profit, source } = req.body;
  db.run(`UPDATE parts_inventory SET part_type=?, part_name=?, cost_price=?, sale_price=?, profit=?, source=? WHERE id=?`,
    [part_type, part_name, cost_price, sale_price, profit, source, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
  });
});

app.delete('/api/parts/:id', (req, res) => {
  db.run(`DELETE FROM parts_inventory WHERE id=?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ================= API ประวัติบิล =================
app.get('/api/repairs', (req, res) => {
  const query = `
    SELECT r.*, 
    (SELECT SUM(quantity * unit_price) FROM repair_items WHERE repair_id = r.id) as grand_total 
    FROM repairs r ORDER BY r.id DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/repairs/:id', (req, res) => {
  db.get("SELECT * FROM repairs WHERE id = ?", [req.params.id], (err, repair) => {
    if (err || !repair) return res.status(404).json({ error: 'Not found' });
    db.all("SELECT * FROM repair_items WHERE repair_id = ?", [req.params.id], (err, items) => {
      res.json({ ...repair, items });
    });
  });
});

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

app.put('/api/repairs/:id', upload.array('repair_images', 10), (req, res) => {
  const id = req.params.id;
  const { customer_name, customer_address, repair_sender, amp_class, amp_brand, amp_power, symptom, status, items, existing_image_path } = req.body;
  const parsedItems = items ? JSON.parse(items) : [];

  db.get("SELECT image_path FROM repairs WHERE id = ?", [id], (err, row) => {
    let final_image_path = existing_image_path !== undefined ? existing_image_path : (row ? row.image_path : '');
    
    if (req.files && req.files.length > 0) {
      const uploadedPaths = req.files.map(f => `/uploads/${f.filename}`).join(',');
      final_image_path = final_image_path ? `${final_image_path},${uploadedPaths}` : uploadedPaths;
    }

    const sqlBill = `UPDATE repairs SET customer_name=?, customer_address=?, repair_sender=?, amp_class=?, amp_brand=?, amp_power=?, symptom=?, status=?, image_path=? WHERE id=?`;
    db.run(sqlBill, [customer_name, customer_address, repair_sender, amp_class, amp_brand, amp_power, symptom, status, final_image_path, id], (err) => {
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

// API สำหรับลบรูปภาพเฉพาะรูปออกจากบิลงานซ่อม
app.delete('/api/repairs/:id/image', (req, res) => {
  const repairId = req.params.id;
  const { image_path } = req.body; // path ของรูปที่ต้องการลบ เช่น /uploads/12345.png

  db.get("SELECT image_path FROM repairs WHERE id = ?", [repairId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Repair not found' });

    let paths = row.image_path ? row.image_path.split(',') : [];
    // กรองรูปที่ต้องการลบออก
    const updatedPaths = paths.filter(p => p !== image_path);
    const newImagePathStr = updatedPaths.join(',');

    // ลบไฟล์จริงออกจากโฟลเดอร์ uploads
    const filename = path.basename(image_path);
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // อัปเดตฐานข้อมูลใหม่
    db.run("UPDATE repairs SET image_path = ? WHERE id = ?", [newImagePathStr, repairId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, image_path: newImagePathStr });
    });
  });
});

app.delete('/api/repairs/:id', (req, res) => {
  const id = req.params.id;
  db.get("SELECT image_path FROM repairs WHERE id = ?", [id], (err, row) => {
    if (row && row.image_path) {
      const paths = row.image_path.split(',');
      paths.forEach(p => {
        const filePath = path.join(uploadDir, path.basename(p));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      });
    }
    db.run(`DELETE FROM repair_items WHERE repair_id = ?`, [id], () => {
      db.run(`DELETE FROM repairs WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    });
  });
});

app.patch('/api/repairs/:id/pay', (req, res) => {
  const { is_paid } = req.body;
  db.run(`UPDATE repairs SET is_paid = ? WHERE id = ?`, [is_paid, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));