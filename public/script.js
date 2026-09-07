let globalPartsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  setupInitialData();
  await loadPartsDatabase();
  loadHistory();
  for (let i = 0; i < 5; i++) addItemRow();
});

function setupInitialData() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomNo = Math.floor(1000 + Math.random() * 9000);
  document.getElementById('bill_no').value = `F-${year}${month}${day}-${randomNo}`;
  document.getElementById('date_display').value = `${day}/${month}/${now.getFullYear()}`;
  document.getElementById('date').value = now.toISOString().split('T')[0];
}

// ----------------- ระบบบิล -----------------
function addItemRow() {
  const tbody = document.getElementById('itemsTable');
  const rowCount = tbody.children.length + 1;
  const tr = document.createElement('tr');
  
  // สร้าง Dropdown จากข้อมูลอะไหล่
  let optionsHTML = `<option value="">-- เลือกอะไหล่ --</option>`;
  globalPartsData.forEach(p => {
    optionsHTML += `<option value="${p.part_name}" data-price="${p.sale_price}">${p.part_name}</option>`;
  });

  tr.innerHTML = `
    <td class="p-1 text-center font-bold">${rowCount}</td>
    <td class="p-1">
      <select class="item-name w-full p-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-cyan-400" onchange="autoFillPrice(this)">
        ${optionsHTML}
      </select>
    </td>
    <td class="p-1"><input type="number" class="item-qty w-full p-1.5 text-center border border-gray-200 rounded" value="1" oninput="calculateTotal()"></td>
    <td class="p-1"><input type="number" class="item-price w-full p-1.5 text-right border border-gray-200 rounded" value="0" oninput="calculateTotal()"></td>
    <td class="p-1 text-right item-total font-bold text-gray-700">0.00</td>
  `;
  tbody.appendChild(tr);
}

function autoFillPrice(selectElem) {
  const selectedOption = selectElem.options[selectElem.selectedIndex];
  if (selectedOption && selectedOption.value !== "") {
    const priceInput = selectElem.closest('tr').querySelector('.item-price');
    priceInput.value = selectedOption.getAttribute('data-price');
    calculateTotal();
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

// โค้ดแปลงตัวเลขเป็นภาษาไทย (เหมือนเดิม)
function ArabicNumberToText(Number) {
  let NumberStr = Number.toFixed(2).toString();
  let text = "";
  let unit = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
  let numStr = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  let splitParts = NumberStr.split('.');
  let baht = splitParts[0], satang = splitParts[1];

  function convertProcess(str) {
    let result = "", len = str.length;
    for (let i = 0; i < len; i++) {
      let n = parseInt(str.charAt(i)), position = len - i - 1;
      if (n !== 0) {
        if (position === 1 && n === 1) result += "สิบ";
        else if (position === 1 && n === 2) result += "ยี่สิบ";
        else if (position === 0 && n === 1 && len > 1 && str.charAt(len-2) !== '0') result += "เอ็ด";
        else result += numStr[n] + unit[position];
      }
    }
    return result;
  }
  if (baht === "0") text += "ศูนย์บาท"; else text += convertProcess(baht) + "บาท";
  if (satang === "00") text += "ถ้วน"; else text += convertProcess(satang) + "สตางค์";
  return text;
}

// ----------------- ประวัติงานซ่อม -----------------
async function loadHistory() {
  const res = await fetch('/api/repairs');
  const data = await res.json();
  const tbody = document.getElementById('historyTable');
  tbody.innerHTML = '';

  data.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-gray-50";
    tr.innerHTML = `
      <td class="p-2 border font-bold text-cyan-700">${item.bill_no}</td>
      <td class="p-2 border text-xs">${item.date}</td>
      <td class="p-2 border">${item.customer_name}</td>
      <td class="p-2 border">${item.symptom || '-'}</td>
      <td class="p-2 border text-center">
        ${item.image_path ? `<a href="${item.image_path}" target="_blank" class="text-blue-600 underline">คลิกดูรูป</a>` : '-'}
      </td>
      <td class="p-2 border text-center">
        <button onclick="togglePay(${item.id}, ${item.is_paid ? 0 : 1})" class="px-2 py-1 rounded text-white text-xs font-bold ${item.is_paid ? 'bg-green-500' : 'bg-red-500'} shadow">
          ${item.is_paid ? '✓ จ่ายแล้ว' : '✕ ค้างชำระ'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function togglePay(id, status) {
  await fetch(`/api/repairs/${id}/pay`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_paid: status })
  });
  loadHistory();
}

// ----------------- ระบบจัดการอะไหล่ -----------------
async function loadPartsDatabase() {
  const res = await fetch('/api/parts');
  globalPartsData = await res.json();
  
  const tbody = document.getElementById('partsInventoryTable');
  tbody.innerHTML = '';
  
  globalPartsData.forEach(p => {
    const profit = (p.sale_price - p.cost_price).toFixed(2);
    tbody.innerHTML += `
      <tr class="hover:bg-gray-50">
        <td class="p-2 border">${p.part_type || '-'}</td>
        <td class="p-2 border font-bold">${p.part_name}</td>
        <td class="p-2 border text-right text-red-600">${p.cost_price}</td>
        <td class="p-2 border text-right text-green-600 font-bold">${p.sale_price}</td>
        <td class="p-2 border text-right text-blue-600">${profit}</td>
        <td class="p-2 border text-xs">${p.source || '-'}</td>
      </tr>
    `;
  });
}

document.getElementById('addPartForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    part_type: document.getElementById('part_type').value,
    part_name: document.getElementById('part_name').value,
    cost_price: parseFloat(document.getElementById('cost_price').value || 0),
    sale_price: parseFloat(document.getElementById('sale_price').value || 0),
    profit: parseFloat(document.getElementById('sale_price').value) - parseFloat(document.getElementById('cost_price').value),
    source: document.getElementById('part_source').value
  };

  await fetch('/api/parts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  // ล้างค่าฟอร์มและโหลดข้อมูลใหม่
  document.getElementById('addPartForm').reset();
  await loadPartsDatabase();
  
  // อัปเดต Dropdown ในบิลทั้งหมด
  document.getElementById('itemsTable').innerHTML = '';
  for (let i = 0; i < 5; i++) addItemRow();
  alert('เพิ่มรายการอะไหล่สำเร็จ!');
});

// ----------------- ฟังก์ชันบันทึกและดาวน์โหลด -----------------
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
    const selectElem = row.querySelector('.item-name');
    const name = selectElem.options[selectElem.selectedIndex]?.value;
    const qty = row.querySelector('.item-qty').value;
    const price = row.querySelector('.item-price').value;
    if (name) items.push({ name, qty, price });
  });
  formData.append('items', JSON.stringify(items));

  const res = await fetch('/api/repairs', { method: 'POST', body: formData });
  if (res.ok) {
    alert('บันทึกข้อมูลและอัปโหลดรูปเรียบร้อยแล้ว');
    loadHistory(); // โหลดประวัติใหม่
    setupInitialData(); // รันเลขบิลใหม่
  }
});

function downloadBillImage() {
  const billArea = document.getElementById('billArea');
  const sideBox = document.getElementById('sideBox');
  const uploadBox = document.getElementById('uploadBox');
  const btnAddItem = document.getElementById('btnAddItem');
  
  sideBox.style.display = 'none';
  uploadBox.style.display = 'none';
  if(btnAddItem) btnAddItem.style.display = 'none';

  html2canvas(billArea, { scale: 2 }).then(canvas => {
    const link = document.createElement('a');
    link.download = `Bill-${document.getElementById('bill_no').value}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    
    sideBox.style.display = 'block';
    uploadBox.style.display = 'flex';
    if(btnAddItem) btnAddItem.style.display = 'block';
  });
}