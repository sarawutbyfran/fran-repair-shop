const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// กำหนดโฟลเดอร์สำหรับเก็บรูปภาพ (ถ้าอยู่บน Render ให้เก็บที่ /data/uploads บน Disk)
const uploadDir = process.env.RENDER_DISK_PATH 
  ? path.join(process.env.RENDER_DISK_PATH, 'uploads') 
  : path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(uploadDir)){
    fs.existsSync(path.dirname(uploadDir), { recursive: true });
    fs.mkdirSync(uploadDir, { recursive: true });
}

// เปิดให้เข้าถึงไฟล์รูปภาพผ่าน URL ได้
app.use('/uploads', express.static(uploadDir));

// --- ตัวอย่าง API พื้นฐาน ---
app.get('/api/parts', (req, res) => {
  db.all("SELECT * FROM parts_inventory", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// รันเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});