document.addEventListener('DOMContentLoaded', () => {
  setupInitialData();
  loadPartsToDatalist();
  for (let i = 0; i < 5; i++) addItemRow();
});

function setupInitialData() {
  // 1. รันเลขบิลอัตโนมัติ (เช่น F-260907-XXXX)
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomNo = Math.floor(1000 + Math.random() * 9000);
  document.getElementById('bill_no').value = `F-${year}${month}${day}-${randomNo}`;

  // 2. ปรับวันที่เป็น วัน/เดือน/ปี (เช่น 07/09/2026)
  document.getElementById('date_display').value = `${day}/${month}/${now.getFullYear()}`;
  document.getElementById('date').value = now.toISOString().split('T')[0];
}

async function loadPartsToDatalist() {
  try {
    const res = await fetch('/api/parts');
    const parts = await res.json();
    const dataList = document.getElementById('partsList');
    dataList.innerHTML = '';
    parts.forEach(p => {
      // เมื่อพิมพ์ จะมีตัวเลือกให้คลิก
      const option = document.createElement('option');
      option.value = p.part_name;
      option.dataset.price = p.sale_price; // แอบเก็บราคาขายไว้
      dataList.appendChild(option);
    });
  } catch(e) {}
}

function addItemRow() {
  const tbody = document.getElementById('itemsTable');
  const rowCount = tbody.children.length + 1;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="p-1 text-center font-bold">${rowCount}</td>
    <td class="p-1"><input type="text" list="partsList" class="item-name w-full p-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-cyan-400" onchange="autoFillPrice(this)"></td>
    <td class="p-1"><input type="number" class="item-qty w-full p-1.5 text-center border border-gray-200 rounded" value="1" oninput="calculateTotal()"></td>
    <td class="p-1"><input type="number" class="item-price w-full p-1.5 text-right border border-gray-200 rounded" value="0" oninput="calculateTotal()"></td>
    <td class="p-1 text-right item-total font-bold text-gray-700">0.00</td>
  `;
  tbody.appendChild(tr);
}

function autoFillPrice(inputElem) {
  const selectedName = inputElem.value;
  const options = document.getElementById('partsList').options;
  for (let i = 0; i < options.length; i++) {
    if (options[i].value === selectedName) {
      const priceInput = inputElem.parentElement.parentElement.querySelector('.item-price');
      priceInput.value = options[i].dataset.price || 0;
      calculateTotal();
      break;
    }
  }
}

function calculateTotal() {
  let grandTotal = 0;
  document.querySelectorAll('#itemsTable tr').forEach(row => {
    const qty = parseFloat(row.querySelector('.item-qty').value || 0);
    const price = parseFloat(row.querySelector('.item-price').value || 0);
    const total = qty * price;
    row.querySelector('.item-total').innerText = total.toFixed(2);
    grandTotal += total;
  });
  
  document.getElementById('grand_total').innerText = grandTotal.toFixed(2);
  document.getElementById('total_text_thai').innerText = `( ${ArabicNumberToText(grandTotal)} )`;
}

// 3. ฟังก์ชันแปลงตัวเลขเป็นอักษรไทย (Baht Text)
function ArabicNumberToText(Number) {
  let NumberStr = Number.toFixed(2).toString();
  let text = "";
  let unit = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
  let numStr = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  
  let splitParts = NumberStr.split('.');
  let baht = splitParts[0];
  let satang = splitParts[1];

  function convertProcess(str) {
    let result = "";
    let len = str.length;
    for (let i = 0; i < len; i++) {
      let n = parseInt(str.charAt(i));
      let position = len - i - 1;
      if (n !== 0) {
        if (position === 1 && n === 1) result += "สิบ";
        else if (position === 1 && n === 2) result += "ยี่สิบ";
        else if (position === 0 && n === 1 && len > 1 && str.charAt(len-2) !== '0') result += "เอ็ด";
        else result += numStr[n] + unit[position];
      }
    }
    return result;
  }

  if (baht === "0") text += "ศูนย์บาท";
  else text += convertProcess(baht) + "บาท";

  if (satang === "00") text += "ถ้วน";
  else text += convertProcess(satang) + "สตางค์";
  
  return text;
}

// 4. บันทึกข้อมูล
document.getElementById('repairForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData();
  formData.append('bill_no', document.getElementById('bill_no').value);
  formData.append('date', document.getElementById('date_display').value);
  formData.append('customer_name', document.getElementById('customer_name').value);
  formData.append('customer_address', document.getElementById('customer_address').value);
  formData.append('repair_sender', document.getElementById('repair_sender').value);
  formData.append('amp_class', document.getElementById('amp_class').value);
  formData.append('amp_brand', document.getElementById('amp_brand').value);
  formData.append('amp_power', document.getElementById('amp_power').value);
  formData.append('symptom', document.getElementById('symptom').value);

  const imageInput = document.getElementById('repair_image');
  if (imageInput.files[0]) formData.append('repair_image', imageInput.files[0]);

  const items = [];
  document.querySelectorAll('#itemsTable tr').forEach(row => {
    const name = row.querySelector('.item-name').value;
    const qty = row.querySelector('.item-qty').value;
    const price = row.querySelector('.item-price').value;
    if (name) items.push({ name, qty, price });
  });
  formData.append('items', JSON.stringify(items));

  try {
    const res = await fetch('/api/repairs', { method: 'POST', body: formData });
    if (res.ok) alert('บันทึกข้อมูลเรียบร้อยแล้ว');
    else alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
  } catch (error) {
    alert('เซิฟเวอร์ไม่ตอบสนอง');
  }
});

// 5. ดาวน์โหลดบิลโดยซ่อนกล่องข้อมูลงานซ่อมและปุ่มต่างๆ
function downloadBillImage() {
  const billArea = document.getElementById('billArea');
  const sideBox = document.getElementById('sideBox');
  const uploadBox = document.getElementById('uploadBox');
  const btnAddItem = document.getElementById('btnAddItem');
  
  // ซ่อน Element ที่ไม่ต้องการให้อยู่ในบิลภาพ
  sideBox.style.display = 'none';
  uploadBox.style.display = 'none';
  btnAddItem.style.display = 'none';

  html2canvas(billArea, { scale: 2 }).then(canvas => {
    const link = document.createElement('a');
    link.download = `Bill-${document.getElementById('bill_no').value}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    
    // คืนค่าแสดงผลกลับมา
    sideBox.style.display = 'block';
    uploadBox.style.display = 'flex';
    btnAddItem.style.display = 'block';
  });
}