let globalPartsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  setupInitialData();
  await loadPartsDatabase();
  loadHistory();
  addItemRow();
  
  const sideBoxContent = document.getElementById('sideBoxContent');
  if(sideBoxContent) sideBoxContent.style.display = 'none';
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
  updateLaborDesc();
}

function updateLaborDesc() {
  const ampClass = document.getElementById('amp_class').value;
  const brand = document.getElementById('amp_brand').value;
  const power = document.getElementById('amp_power').value;
  const symptom = document.getElementById('symptom').value;
  let desc = "รายการซ่อม";
  if (ampClass) desc += ` ${ampClass}`;
  if (brand) desc += ` ${brand}`;
  if (power) desc += ` ${power} W`;
  if (symptom) desc += ` อาการ${symptom}`;
  document.getElementById('labor_desc').value = desc;
}

function addItemRow() {
  const tbody = document.getElementById('itemsTable');
  const tr = document.createElement('tr');
  
  const uniqueTypes = [...new Set(globalPartsData.map(p => p.part_type).filter(t => t))];
  let typeOptions = `<option value="">- เลือกชนิด -</option>`;
  uniqueTypes.forEach(t => { typeOptions += `<option value="${t}">${t}</option>`; });

  tr.innerHTML = `
    <td class="p-1.5 text-center font-bold row-num"></td>
    <td class="p-1.5 flex gap-1">
      <select class="w-1/3 p-1 border rounded bg-white text-xs" onchange="filterPartsByType(this)">
        ${typeOptions}
      </select>
      <select class="item-name w-2/3 p-1 border rounded bg-white text-xs" onchange="autoFillPrice(this)">
        <option value="">- เลือกรายการ -</option>
      </select>
    </td>
    <td class="p-1.5"><input type="number" class="item-qty w-full p-1 text-center border rounded" value="1" oninput="calculateTotal()"></td>
    <td class="p-1.5"><input type="number" class="item-price w-full p-1 text-right border rounded" value="0" oninput="calculateTotal()"></td>
    <td class="p-1.5 text-right item-total font-bold text-gray-700">0.00</td>
    <td class="p-1.5 text-center hide-on-print"><button type="button" class="text-red-500 font-bold hover:text-red-700" onclick="deleteRow(this)">X</button></td>
  `;
  tbody.appendChild(tr);
  updateRowNumbers();
}

function updateRowNumbers() {
  const rows = document.querySelectorAll('#itemsTable tr');
  rows.forEach((row, index) => {
    const numTd = row.querySelector('.row-num');
    if (numTd) numTd.innerText = index + 1;
  });
}

function deleteRow(btn) {
  btn.closest('tr').remove();
  updateRowNumbers();
  calculateTotal();
}

function filterPartsByType(typeSelect) {
  const selectedType = typeSelect.value;
  const nameSelect = typeSelect.nextElementSibling;
  const filteredParts = globalPartsData.filter(p => p.part_type === selectedType);
  let nameOptions = `<option value="">- เลือกรายการ -</option>`;
  filteredParts.forEach(p => {
    nameOptions += `<option value="${p.part_name}" data-price="${p.sale_price}">${p.part_name}</option>`;
  });
  nameSelect.innerHTML = nameOptions;
  nameSelect.value = "";
  autoFillPrice(nameSelect);
}

function autoFillPrice(selectElem) {
  const selectedOption = selectElem.options[selectElem.selectedIndex];
  const priceInput = selectElem.closest('tr').querySelector('.item-price');
  priceInput.value = (selectedOption && selectedOption.value !== "") ? selectedOption.getAttribute('data-price') : 0;
  calculateTotal();
}

function calculateTotal() {
  let grandTotal = 0;
  document.querySelectorAll('#itemsTable tr').forEach(row => {
    const qty = parseFloat(row.querySelector('.item-qty')?.value || 0);
    const price = parseFloat(row.querySelector('.item-price')?.value || 0);
    const total = qty * price;
    const totalElem = row.querySelector('.item-total');
    if(totalElem) totalElem.innerText = total.toFixed(2);
    grandTotal += total;
  });
  document.getElementById('grand_total').innerText = grandTotal.toFixed(2);
  document.getElementById('total_text_thai').innerText = `( ${ArabicNumberToText(grandTotal)} )`;
}

function ArabicNumberToText(Number) {
  let NumberStr = Number.toFixed(2).toString();
  let text = "", unit = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"], numStr = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  let splitParts = NumberStr.split('.'), baht = splitParts[0], satang = splitParts[1];
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

// 3. แก้ปัญหาเพิ่มอะไหล่แล้วขึ้นบิลทันทีโดยไม่ต้องรีเฟรช
async function loadPartsDatabase() {
  try {
    const res = await fetch('/api/parts');
    globalPartsData = await res.json();
    const filterType = document.getElementById('filter_part_type')?.value;
    let displayData = globalPartsData;
    if (filterType) displayData = globalPartsData.filter(p => p.part_type === filterType);

    const tbody = document.getElementById('partsInventoryTable');
    if(tbody) {
      tbody.innerHTML = '';
      displayData.forEach(p => {
        const profit = (p.sale_price - p.cost_price).toFixed(2);
        tbody.innerHTML += `
          <tr class="hover:bg-gray-50">
            <td class="p-2 border">${p.part_type || '-'}</td>
            <td class="p-2 border font-bold">${p.part_name}</td>
            <td class="p-2 border text-right text-red-600">${p.cost_price}</td>
            <td class="p-2 border text-right text-green-600 font-bold">${p.sale_price}</td>
            <td class="p-2 border text-right text-blue-600">${profit}</td>
            <td class="p-2 border text-xs">${p.source || '-'}</td>
            <td class="p-2 border text-center">
              <button onclick="editPart(${p.id}, '${p.part_type}', '${p.part_name}', ${p.cost_price}, ${p.sale_price}, '${p.source || ''}')" class="bg-yellow-400 px-2 py-1 rounded text-xs font-bold">แก้ไข</button>
              <button onclick="deletePart(${p.id})" class="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">ลบ</button>
            </td>
          </tr>`;
      });
    }
  } catch (e) {
    console.error('Failed to load parts', e);
  }
}

document.getElementById('addPartForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const editId = document.getElementById('edit_part_id').value;
  const data = {
    part_type: document.getElementById('part_type').value,
    part_name: document.getElementById('part_name').value,
    cost_price: parseFloat(document.getElementById('cost_price').value || 0),
    sale_price: parseFloat(document.getElementById('sale_price').value || 0),
    profit: parseFloat(document.getElementById('sale_price').value) - parseFloat(document.getElementById('cost_price').value),
    source: document.getElementById('part_source').value
  };
  const method = editId ? 'PUT' : 'POST';
  const url = editId ? `/api/parts/${editId}` : '/api/parts';
  await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  
  resetPartForm();
  await loadPartsDatabase(); // ดึงข้อมูลคลังใหม่ทันที
  refreshAllDropdowns();   // อัปเดต Dropdown ในหน้าทำบิลทันที
  alert('บันทึกข้อมูลอะไหล่สำเร็จ!');
});

function editPart(id, type, name, cost, sale, source) {
  document.getElementById('edit_part_id').value = id;
  document.getElementById('part_type').value = type;
  document.getElementById('part_name').value = name;
  document.getElementById('cost_price').value = cost;
  document.getElementById('sale_price').value = sale;
  document.getElementById('part_source').value = source;
  document.getElementById('partSubmitBtn').innerText = "อัปเดต";
}

function resetPartForm() {
  document.getElementById('addPartForm').reset();
  document.getElementById('edit_part_id').value = '';
  document.getElementById('partSubmitBtn').innerText = "บันทึก";
}

async function deletePart(id) {
  if(confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) {
    await fetch(`/api/parts/${id}`, { method: 'DELETE' });
    await loadPartsDatabase();
    refreshAllDropdowns();
  }
}

function refreshAllDropdowns() {
  document.querySelectorAll('#itemsTable tr:not(#laborRow)').forEach(row => {
    const typeSelect = row.querySelector('select:first-child');
    if(typeSelect) {
      const currentVal = typeSelect.value;
      const uniqueTypes = [...new Set(globalPartsData.map(p => p.part_type).filter(t => t))];
      let typeOptions = `<option value="">- เลือกชนิด -</option>`;
      uniqueTypes.forEach(t => { typeOptions += `<option value="${t}" ${t===currentVal?'selected':''}>${t}</option>`; });
      typeSelect.innerHTML = typeOptions;
      if(currentVal) filterPartsByType(typeSelect);
    }
  });
}

async function loadHistory() {
  try {
    const res = await fetch('/api/repairs');
    let data = await res.json();
    
    const filterSender = document.getElementById('filter_sender')?.value;
    const filterStatus = document.getElementById('filter_status')?.value;
    const filterPay = document.getElementById('filter_pay')?.value;
    
    if (filterSender) data = data.filter(d => d.repair_sender === filterSender);
    if (filterStatus) data = data.filter(d => (d.status || 'กำลังซ่อม') === filterStatus);
    if (filterPay !== "") data = data.filter(d => String(d.is_paid) === filterPay);

    let totalDebt = 0;
    data.forEach(item => { totalDebt += parseFloat(item.grand_total || 0); });
    const debtSummaryElem = document.getElementById('debtSummary');
    if(debtSummaryElem) debtSummaryElem.innerText = totalDebt.toLocaleString('th-TH', {minimumFractionDigits: 2});

    const tbody = document.getElementById('historyTable');
    const cardsContainer = document.getElementById('historyCards');
    if(!tbody || !cardsContainer) return;
    
    tbody.innerHTML = '';
    cardsContainer.innerHTML = '';

    data.forEach(item => {
      let imagesHTMLDesktop = item.image_path ? `<button onclick="openImageModal('${item.image_path}')" class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded border font-bold hover:bg-purple-200">ดูรูป (${item.image_path.split(',').length})</button>` : '-';
      let imagesHTMLMobile = item.image_path ? `<button onclick="openImageModal('${item.image_path}')" class="text-[11px] bg-purple-100 text-purple-700 px-1 py-1 rounded border font-bold">รูป (${item.image_path.split(',').length})</button>` : `<span class="text-xs text-center text-gray-400">ไม่มีรูป</span>`;
      
      const currentStatus = item.status || 'กำลังซ่อม';
      let statusColor = currentStatus === 'ซ่อมเสร็จ' ? 'text-green-600' : (currentStatus === 'รออะไหล่' ? 'text-red-500' : 'text-orange-500');
      const billTotal = parseFloat(item.grand_total || 0).toFixed(2);
      
      let summaryText = "แอมป์";
      if(item.amp_class) summaryText += ` ${item.amp_class}`;
      if(item.amp_brand) summaryText += ` ${item.amp_brand}`;
      if(item.amp_power) summaryText += ` ${item.amp_power}W`;
      if(item.symptom) summaryText += ` อาการ${item.symptom}`;

      // 1. เรนเดอร์แบบตาราง (สำหรับคอมพิวเตอร์)
      const tr = document.createElement('tr');
      tr.className = "hover:bg-gray-50";
      tr.innerHTML = `
        <td class="p-2 border font-bold text-cyan-700">${item.bill_no}<br><span class="text-xs text-gray-500">${item.date}</span><br><span class="text-xs text-blue-900 font-semibold">🔧 ${summaryText}</span></td>
        <td class="p-2 border">${item.customer_name}</td>
        <td class="p-2 border font-bold">${item.repair_sender || '-'}<br><span class="${statusColor} text-xs">${currentStatus}</span></td>
        <td class="p-2 border text-right font-bold text-red-600">${billTotal}</td>
        <td class="p-2 border text-center">${imagesHTMLDesktop}</td>
        <td class="p-2 border text-center"><button onclick="togglePay(${item.id}, ${item.is_paid ? 0 : 1})" class="px-2 py-1 rounded text-white text-xs font-bold ${item.is_paid ? 'bg-green-500' : 'bg-red-500'} shadow">${item.is_paid ? '✓ จ่ายแล้ว' : '✕ ค้างชำระ'}</button></td>
        <td class="p-2 border text-center"><button onclick="editRepair(${item.id})" class="px-2 py-1 bg-yellow-400 text-yellow-900 rounded text-xs font-bold hover:bg-yellow-500 shadow">แก้ไขบิล</button></td>
      `;
      tbody.appendChild(tr);

      // 2. เรนเดอร์แบบการ์ด (สำหรับมือถือ)
      const card = document.createElement('div');
      card.className = "bg-white border rounded-lg shadow-sm p-3 space-y-2 relative";
      card.innerHTML = `
        <div class="flex justify-between items-start border-b pb-2">
          <div>
            <div class="font-bold text-cyan-700 text-sm">${item.bill_no}</div>
            <div class="text-[11px] text-gray-500">${item.date}</div>
          </div>
          <div class="text-right">
            <span class="${statusColor} text-[11px] font-bold bg-gray-50 border px-1.5 py-0.5 rounded">${currentStatus}</span>
            <div class="text-[11px] text-gray-600 mt-1 font-bold">ช่าง: ${item.repair_sender || '-'}</div>
          </div>
        </div>
        <div class="text-xs">
          <div><span class="font-bold text-gray-700">ลค:</span> ${item.customer_name}</div>
          <div class="text-blue-800 font-semibold mt-1">🔧 ${summaryText}</div>
        </div>
        <div class="flex justify-between items-center bg-red-50 p-1.5 rounded border border-red-100 mt-1">
          <span class="text-xs font-bold text-red-800">ยอดเงิน:</span>
          <span class="font-bold text-red-600 text-sm">${billTotal} ฿</span>
        </div>
        <div class="grid grid-cols-3 gap-1.5 mt-2">
          ${imagesHTMLMobile}
          <button onclick="togglePay(${item.id}, ${item.is_paid ? 0 : 1})" class="py-1 rounded text-white text-[11px] font-bold ${item.is_paid ? 'bg-green-500' : 'bg-red-500'} shadow">
            ${item.is_paid ? '✓ จ่ายแล้ว' : '✕ ค้างชำระ'}
          </button>
          <button onclick="editRepair(${item.id})" class="py-1 bg-yellow-400 text-yellow-900 rounded text-[11px] font-bold shadow">
            แก้ไขบิล
          </button>
        </div>
      `;
      cardsContainer.appendChild(card);
    });
  } catch(e) {
    console.error('Failed to load history', e);
  }
}

function openImageModal(imagePathsStr) {
  const container = document.getElementById('modalImagesContainer');
  container.innerHTML = '';
  const paths = imagePathsStr.split(',');
  paths.forEach((path, index) => {
    container.innerHTML += `
      <div class="border rounded p-2 flex flex-col items-center bg-gray-50 shadow-sm">
        <img src="${path}" class="h-32 object-contain mb-2 rounded border bg-white" alt="Repair Image">
        <a href="${path}" download="repair-photo-${index+1}.png" target="_blank" class="bg-blue-600 text-white text-xs px-3 py-1 rounded font-bold hover:bg-blue-700 shadow w-full text-center">📥 โหลดรูปลงเครื่อง</a>
      </div>
    `;
  });
  document.getElementById('imageModal').classList.remove('hidden');
}

function closeImageModal() {
  document.getElementById('imageModal').classList.add('hidden');
}

async function togglePay(id, status) {
  await fetch(`/api/repairs/${id}/pay`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_paid: status }) });
  loadHistory();
}

async function editRepair(id) {
  const res = await fetch(`/api/repairs/${id}`);
  const data = await res.json();
  
  switchTab('billTab');

  document.getElementById('edit_repair_id').value = data.id;
  document.getElementById('bill_no').value = data.bill_no;
  document.getElementById('date_display').value = data.date;
  document.getElementById('customer_name').value = data.customer_name;
  document.getElementById('customer_address').value = data.customer_address;
  document.getElementById('repair_sender').value = data.repair_sender;
  document.getElementById('amp_class').value = data.amp_class;
  document.getElementById('amp_brand').value = data.amp_brand;
  document.getElementById('amp_power').value = data.amp_power;
  document.getElementById('symptom').value = data.symptom;
  document.getElementById('repair_status').value = data.status || 'กำลังซ่อม';
  updateLaborDesc();

  document.querySelectorAll('#itemsTable tr:not(#laborRow)').forEach(row => row.remove());

  if(data.items && data.items.length > 0) {
    document.querySelector('#laborRow .item-price').value = data.items[0].unit_price || 0;
    
    for(let i = 1; i < data.items.length; i++) {
      addItemRow();
      const rows = document.querySelectorAll('#itemsTable tr:not(#laborRow)');
      const currentRow = rows[rows.length - 1];
      const partName = data.items[i].item_name;
      
      const foundPart = globalPartsData.find(p => p.part_name === partName);
      if(foundPart) {
        const typeSelect = currentRow.querySelector('select:first-child');
        typeSelect.value = foundPart.part_type;
        filterPartsByType(typeSelect);
        
        const nameSelect = currentRow.querySelector('.item-name');
        nameSelect.value = partName;
      }
      currentRow.querySelector('.item-qty').value = data.items[i].quantity;
      currentRow.querySelector('.item-price').value = data.items[i].unit_price;
    }
  }
  calculateTotal();

  alert(`ดึงข้อมูลบิล ${data.bill_no} มาแก้ไขเรียบร้อยแล้ว`);
  window.scrollTo(0, 0);
  const submitBtn = document.querySelector('button[type="submit"]');
  submitBtn.innerText = "อัปเดตบิลซ่อม";
  submitBtn.classList.replace('bg-green-600', 'bg-blue-600');
}

function resetForm() {
  document.getElementById('repairForm').reset();
  document.getElementById('edit_repair_id').value = '';
  setupInitialData();
  document.querySelectorAll('#itemsTable tr:not(#laborRow)').forEach(row => row.remove());
  addItemRow();
  document.getElementById('fileCount').innerText = 'ยังไม่ได้เลือกรูป';
  const submitBtn = document.querySelector('button[type="submit"]');
  submitBtn.innerText = "บันทึกบิล";
  submitBtn.classList.replace('bg-blue-600', 'bg-green-600');
}

document.getElementById('repairForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData();
  const editId = document.getElementById('edit_repair_id').value;
  
  formData.append('bill_no', document.getElementById('bill_no').value);
  formData.append('date', document.getElementById('date').value);
  formData.append('customer_name', document.getElementById('customer_name').value);
  formData.append('customer_address', document.getElementById('customer_address').value);
  formData.append('repair_sender', document.getElementById('repair_sender').value);
  formData.append('amp_class', document.getElementById('amp_class').value);
  formData.append('amp_brand', document.getElementById('amp_brand').value);
  formData.append('amp_power', document.getElementById('amp_power').value);
  formData.append('symptom', document.getElementById('symptom').value);
  formData.append('status', document.getElementById('repair_status').value);

  const imageInput = document.getElementById('repair_images');
  for (let i = 0; i < imageInput.files.length; i++) {
    formData.append('repair_images', imageInput.files[i]);
  }

  const items = [];
  items.push({
    name: document.getElementById('labor_desc').value,
    qty: 1,
    price: document.querySelector('#laborRow .item-price').value || 0
  });

  document.querySelectorAll('#itemsTable tr:not(#laborRow)').forEach(row => {
    const selectElem = row.querySelector('.item-name');
    const name = selectElem?.options[selectElem.selectedIndex]?.value;
    const qty = row.querySelector('.item-qty')?.value;
    const price = row.querySelector('.item-price')?.value;
    if (name) items.push({ name, qty, price });
  });
  formData.append('items', JSON.stringify(items));

  const method = editId ? 'PUT' : 'POST';
  const url = editId ? `/api/repairs/${editId}` : '/api/repairs';

  const res = await fetch(url, { method: method, body: formData });
  if (res.ok) {
    alert(editId ? 'อัปเดตบิลสำเร็จ!' : 'บันทึกบิลสำเร็จ!');
    resetForm();
    loadHistory();
  }
});

// ฟังก์ชันปิดหน้าต่างดูรูปบิล
function closeBillPreview() {
  document.getElementById('billPreviewModal').style.display = 'none';
}

// ฟังก์ชันดาวน์โหลดภาพบิลที่ปรับปรุงใหม่ (แปลง input เป็นข้อความก่อนแคป)
function downloadBillImage() {
  const billArea = document.getElementById('billArea');
  
  // 1. ซ่อนปุ่มและส่วนที่ไม่ต้องการพิมพ์
  const hideElements = billArea.querySelectorAll('.hide-on-print');
  hideElements.forEach(el => el.style.display = 'none');

  // 2. แปลง <input> และ <select> เป็น <div> ข้อความธรรมดา เพื่อแก้ปัญหาอักษรหลุดขอบ
  const inputs = billArea.querySelectorAll('input, select');
  const replacements = [];
  
  inputs.forEach(el => {
    // ดึงค่าข้อความออกมา
    const val = el.tagName === 'SELECT' ? (el.options[el.selectedIndex]?.text || '') : el.value;
    
    // สร้าง <div> ปลอมขึ้นมาแทนที่
    const span = document.createElement('div');
    span.innerText = val;
    span.className = el.className; // ใช้คลาสเดียวกับ input เป๊ะๆ
    
    // จัด Style ให้เหมือนกล่อง Input เดิมเพื่อรักษา Layout
    span.style.display = 'flex';
    span.style.alignItems = 'center';
    span.style.minHeight = el.offsetHeight > 0 ? el.offsetHeight + 'px' : '28px';
    if (el.classList.contains('text-right')) span.style.justifyContent = 'flex-end';
    if (el.classList.contains('text-center')) span.style.justifyContent = 'center';
    span.style.padding = '0 4px';
    span.style.background = el.style.background || (el.classList.contains('bg-white') ? '#ffffff' : 'transparent');
    
    // นำไปใส่แทนที่
    el.parentNode.insertBefore(span, el);
    
    // เก็บสถานะเดิมไว้เพื่อซ่อน input จริง
    const originalDisplay = el.style.display;
    el.style.display = 'none';
    
    replacements.push({ el, span, originalDisplay });
  });

  // 3. กำหนดคลาสล็อคความกว้างบิลให้คงที่
  billArea.classList.add('capturing-canvas');

  // 4. เริ่มทำการแคปเจอร์รูปภาพ
  html2canvas(billArea, { 
    scale: 2, 
    useCORS: true, 
    logging: false,
    backgroundColor: '#ffffff'
  }).then(canvas => {
    // 5. คืนค่าการแสดงผลทุกอย่างกลับเป็นปกติทันที
    billArea.classList.remove('capturing-canvas');
    hideElements.forEach(el => el.style.display = '');
    replacements.forEach(r => {
      r.span.remove(); // ลบ div ปลอมทิ้ง
      r.el.style.display = r.originalDisplay; // โชว์ input จริงกลับมา
    });

    // 6. ประมวลผลรูปภาพและดาวน์โหลด/โชว์ Modal
    const imageURL = canvas.toDataURL("image/png");
    
    // ตรวจสอบมือถือ หรือจอเล็ก
    const isMobile = window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // เปิด Modal โชว์รูปภาพในมือถือ
      const modal = document.getElementById('billPreviewModal');
      const imgElem = document.getElementById('billImageElement');
      imgElem.src = imageURL;
      modal.style.display = 'flex'; // บังคับโชว์ชัวร์ๆ
    } else {
      // โหลดไฟล์ลงเครื่องอัตโนมัติบน PC
      const link = document.createElement('a');
      const billNo = document.getElementById('bill_no').value || 'repair';
      link.download = `Bill-${billNo}.png`;
      link.href = imageURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }).catch(err => {
    console.error("เกิดข้อผิดพลาดในการสร้างรูป:", err);
    alert("เกิดข้อผิดพลาดในการสร้างรูปบิล กรุณาลองใหม่");
    
    // หาก Error ก็ต้องคืนค่าหน้าเว็บให้กลับมาใช้งานต่อได้
    billArea.classList.remove('capturing-canvas');
    hideElements.forEach(el => el.style.display = '');
    replacements.forEach(r => {
      r.span.remove();
      r.el.style.display = r.originalDisplay;
    });
  });
}