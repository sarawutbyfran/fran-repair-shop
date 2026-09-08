let globalPartsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  setupInitialData();
  await loadPartsDatabase();
  loadHistory();
  loadDashboardStats();
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

async function loadDashboardStats() {
  try {
    const resRepairs = await fetch('/api/repairs');
    const repairsData = await resRepairs.json();
    
    let totalDebt = 0;
    repairsData.forEach(item => {
      if (!item.is_paid) {
        totalDebt += parseFloat(item.grand_total || 0);
      }
    });

    document.getElementById('dashTotalDebt').innerHTML = `${totalDebt.toLocaleString('th-TH', {minimumFractionDigits: 2})} <span class="text-sm font-normal text-gray-400">บาท</span>`;
    document.getElementById('dashTotalJobs').innerHTML = `${repairsData.length} <span class="text-sm font-normal text-gray-400">รายการ</span>`;
    document.getElementById('dashTotalParts').innerHTML = `${globalPartsData.length} <span class="text-sm font-normal text-gray-400">เบอร์/รายการ</span>`;
  } catch(e) {
    console.error('Failed to load dashboard stats', e);
  }
}

// ----------------- คลังรูปภาพอิสระ (Gallery) -----------------
async function loadGlobalGallery() {
  try {
    const res = await fetch('/api/gallery');
    const images = await res.json();
    const container = document.getElementById('globalGalleryContainer');
    container.innerHTML = '';
    
    if (images.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10">ยังไม่มีรูปภาพในระบบ</div>`;
      return;
    }

    images.forEach((path, idx) => {
      const filename = path.split('/').pop();
      container.innerHTML += `
        <div class="bg-gray-800 border border-gray-700 rounded-2xl p-3 shadow-md flex flex-col items-center space-y-2">
          <img src="${path}" class="w-full h-36 object-contain rounded-xl bg-gray-900 border border-gray-700" alt="Gallery Image">
          <div class="grid grid-cols-2 gap-1 w-full pt-1">
            <a href="${path}" download="gallery-${idx}.png" target="_blank" class="bg-cyan-600 hover:bg-cyan-500 text-white text-center py-1.5 rounded-xl text-xs font-bold shadow transition-all">📥 โหลด</a>
            <button onclick="deleteGalleryImage('${filename}')" class="bg-rose-600 hover:bg-rose-500 text-white py-1.5 rounded-xl text-xs font-bold shadow transition-all">🗑️ ลบรูป</button>
          </div>
        </div>
      `;
    });
  } catch(e) {
    console.error('Failed to load gallery', e);
  }
}

async function uploadGlobalImages(inputElem) {
  if (inputElem.files.length === 0) return;
  const formData = new FormData();
  for (let i = 0; i < inputElem.files.length; i++) {
    formData.append('images', inputElem.files[i]);
  }
  const res = await fetch('/api/gallery', { method: 'POST', body: formData });
  if (res.ok) {
    alert('อัปโหลดรูปลงคลังสำเร็จ!');
    inputElem.value = '';
    loadGlobalGallery();
  }
}

async function deleteGalleryImage(filename) {
  if (!confirm('ต้องการลบรูปภาพนี้ออกจากคลังใช่หรือไม่?')) return;
  const res = await fetch(`/api/gallery/${filename}`, { method: 'DELETE' });
  if (res.ok) {
    loadGlobalGallery();
  }
}
// -----------------------------------------------------------

function updateAllTypeDropdowns() {
  const uniqueTypes = [...new Set(globalPartsData.map(p => p.part_type).filter(t => t))];
  let typeOptions = `<option value="">- เลือกชนิด -</option>`;
  uniqueTypes.forEach(t => { typeOptions += `<option value="${t}">${t}</option>`; });

  document.querySelectorAll('#itemsTable select').forEach(select => {
    const currentVal = select.value;
    select.innerHTML = typeOptions;
    select.value = currentVal;
  });
}

function addItemRow() {
  const tbody = document.getElementById('itemsTable');
  const tr = document.createElement('tr');
  
  const uniqueTypes = [...new Set(globalPartsData.map(p => p.part_type).filter(t => t))];
  let typeOptions = `<option value="">- เลือกชนิด -</option>`;
  uniqueTypes.forEach(t => { typeOptions += `<option value="${t}">${t}</option>`; });

  tr.innerHTML = `
    <td class="p-1.5 text-center font-bold row-num text-gray-900"></td>
    <td class="p-1.5 flex gap-1 relative item-row-container">
      <select class="w-1/3 p-1 border rounded bg-white text-xs text-gray-900 item-type-select" onchange="filterPartsByType(this)">
        ${typeOptions}
      </select>
      <div class="w-2/3 relative">
        <input type="text" class="item-search w-full p-1 border rounded bg-white text-xs text-gray-900 outline-none focus:ring-1 focus:ring-cyan-500" placeholder="🔍 พิมพ์ค้นหา..." oninput="filterPartInput(this)" autocomplete="off">
        <div class="suggestions-box absolute left-0 right-0 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto z-50 hidden mt-1"></div>
      </div>
    </td>
    <td class="p-1.5"><input type="number" class="item-qty w-full p-1 text-center border rounded text-xs text-gray-900" value="1" oninput="calculateTotal()"></td>
    <td class="p-1.5"><input type="number" step="any" class="item-price w-full p-1 text-right border rounded text-xs text-gray-900" value="0" oninput="calculateTotal()"></td>
    <td class="p-1.5 text-right item-total font-bold text-xs text-gray-900">0.00</td>
    <td class="p-1.5 text-center hide-on-print"><button type="button" class="text-red-500 font-bold hover:text-red-700 text-xs" onclick="deleteRow(this)">X</button></td>
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
  const row = typeSelect.closest('tr');
  const searchInput = row.querySelector('.item-search');
  const box = row.querySelector('.suggestions-box');
  
  const filtered = selectedType ? globalPartsData.filter(p => p.part_type === selectedType) : globalPartsData;
  
  let html = '';
  filtered.forEach(p => {
    html += `<div class="p-2 text-xs hover:bg-cyan-50 cursor-pointer border-b flex justify-between items-center text-gray-900" onclick="selectPartItem(this, '${p.part_name}', ${p.sale_price})">
      <span class="font-bold">${p.part_name}</span>
      <span class="text-cyan-600 font-bold">${p.sale_price} ฿</span>
    </div>`;
  });
  box.innerHTML = html;
  box.classList.remove('hidden');
  searchInput.focus();
}

function filterPartInput(inputElem) {
  const keyword = inputElem.value.toLowerCase().trim();
  const row = inputElem.closest('tr');
  const box = row.querySelector('.suggestions-box');
  
  if (keyword.length === 0) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }

  const matched = globalPartsData.filter(p => p.part_name.toLowerCase().includes(keyword) || (p.part_type && p.part_type.toLowerCase().includes(keyword)));
  
  if (matched.length === 0) {
    box.innerHTML = `<div class="p-2 text-xs text-gray-400">ไม่พบอะไหล่ที่ค้นหา</div>`;
    box.classList.remove('hidden');
    return;
  }

  let html = '';
  matched.forEach(p => {
    html += `<div class="p-2 text-xs hover:bg-cyan-50 cursor-pointer border-b flex justify-between items-center text-gray-900" onclick="selectPartItemAndType(this, '${p.part_type}', '${p.part_name}', ${p.sale_price})">
      <span class="font-bold">${p.part_name} <span class="text-[10px] text-gray-500 font-normal">(${p.part_type})</span></span>
      <span class="text-cyan-600 font-bold">${p.sale_price} ฿</span>
    </div>`;
  });
  box.innerHTML = html;
  box.classList.remove('hidden');
}

function selectPartItem(elem, name, price) {
  const td = elem.closest('td');
  td.querySelector('.item-search').value = name;
  td.querySelector('.suggestions-box').classList.add('hidden');
  
  const row = td.closest('tr');
  row.querySelector('.item-price').value = price;
  calculateTotal();
}

function selectPartItemAndType(elem, type, name, price) {
  const td = elem.closest('td');
  td.querySelector('select').value = type;
  td.querySelector('.item-search').value = name;
  td.querySelector('.suggestions-box').classList.add('hidden');
  
  const row = td.closest('tr');
  row.querySelector('.item-price').value = price;
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
          <tr class="hover:bg-gray-800">
            <td class="p-2 border-b border-gray-800 text-xs">${p.part_type || '-'}</td>
            <td class="p-2 border-b border-gray-800 font-bold text-xs text-white">${p.part_name}</td>
            <td class="p-2 border-b border-gray-800 text-right text-rose-400 text-xs">${p.cost_price}</td>
            <td class="p-2 border-b border-gray-800 text-right text-emerald-400 font-bold text-xs">${p.sale_price}</td>
            <td class="p-2 border-b border-gray-800 text-right text-cyan-400 text-xs">${profit}</td>
            <td class="p-2 border-b border-gray-800 text-xs text-gray-400">${p.source || '-'}</td>
            <td class="p-2 border-b border-gray-800 text-center">
              <button onclick="editPart(${p.id}, '${p.part_type}', '${p.part_name}', ${p.cost_price}, ${p.sale_price}, '${p.source || ''}')" class="bg-amber-500 hover:bg-amber-600 text-gray-900 px-2 py-1 rounded text-xs font-bold mr-1">แก้ไข</button>
              <button onclick="deletePart(${p.id})" class="bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded text-xs font-bold">ลบ</button>
            </td>
          </tr>`;
      });
    }
    updateAllTypeDropdowns();
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
  await loadPartsDatabase();
  alert('บันทึกข้อมูลอะไหล่สำเร็จ!');
});

function editPart(id, type, name, cost, sale, source) {
  document.getElementById('edit_part_id').value = id;
  document.getElementById('part_type').value = type;
  document.getElementById('part_name').value = name;
  document.getElementById('cost_price').value = cost;
  document.getElementById('sale_price').value = sale;
  document.getElementById('part_source').value = source;
  document.getElementById('partSubmitBtn').innerText = "อัปเดตอะไหล่";
}

function resetPartForm() {
  document.getElementById('addPartForm').reset();
  document.getElementById('edit_part_id').value = '';
  document.getElementById('partSubmitBtn').innerText = "บันทึกอะไหล่";
}

async function deletePart(id) {
  if(confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) {
    await fetch(`/api/parts/${id}`, { method: 'DELETE' });
    await loadPartsDatabase();
  }
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
      let imagesHTMLDesktop = item.image_path ? `<button onclick="openImageModal('${item.image_path}')" class="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded-lg font-bold hover:bg-purple-500/20">ดูรูป (${item.image_path.split(',').length})</button>` : '-';
      let imagesHTMLMobile = item.image_path ? `<button onclick="openImageModal('${item.image_path}')" class="text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/30 px-1.5 py-1 rounded-lg font-bold">รูป (${item.image_path.split(',').length})</button>` : `<span class="text-xs text-center text-gray-500">ไม่มีรูป</span>`;
      
      const currentStatus = item.status || 'กำลังซ่อม';
      let statusColor = currentStatus === 'ซ่อมเสร็จ' ? 'text-emerald-400' : (currentStatus === 'รออะไหล่' ? 'text-rose-400' : 'text-amber-400');
      const billTotal = parseFloat(item.grand_total || 0).toFixed(2);
      
      let summaryText = "แอมป์";
      if(item.amp_class) summaryText += ` ${item.amp_class}`;
      if(item.amp_brand) summaryText += ` ${item.amp_brand}`;
      if(item.amp_power) summaryText += ` ${item.amp_power}W`;
      if(item.symptom) summaryText += ` อาการ${item.symptom}`;

      const tr = document.createElement('tr');
      tr.className = "hover:bg-gray-800 transition-all";
      tr.innerHTML = `
        <td class="p-3 border-b border-gray-800 font-bold text-cyan-400">${item.bill_no}<br><span class="text-xs text-gray-400 font-normal">${item.date}</span><br><span class="text-xs text-gray-300 font-semibold">🔧 ${summaryText}</span></td>
        <td class="p-3 border-b border-gray-800 text-white">${item.customer_name}</td>
        <td class="p-3 border-b border-gray-800 font-bold text-gray-300">${item.repair_sender || '-'}<br><span class="${statusColor} text-xs font-semibold">${currentStatus}</span></td>
        <td class="p-3 border-b border-gray-800 text-right font-bold text-rose-400">${billTotal}</td>
        <td class="p-3 border-b border-gray-800 text-center">${imagesHTMLDesktop}</td>
        <td class="p-3 border-b border-gray-800 text-center">
          <div class="flex justify-center gap-1.5">
            <button onclick="togglePay(${item.id}, ${item.is_paid ? 0 : 1})" class="px-2.5 py-1 rounded-xl text-white text-xs font-bold ${item.is_paid ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'} shadow transition-all">${item.is_paid ? '✓ จ่ายแล้ว' : '✕ ค้าง'}</button>
            <button onclick="editRepair(${item.id})" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-gray-900 rounded-xl text-xs font-bold shadow transition-all">แก้ไข</button>
            <button onclick="deleteRepair(${item.id})" class="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow transition-all">ลบ</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);

      const card = document.createElement('div');
      card.className = "bg-gray-800 border border-gray-700 rounded-2xl shadow-lg p-4 space-y-2.5 relative";
      card.innerHTML = `
        <div class="flex justify-between items-start border-b border-gray-700 pb-2">
          <div>
            <div class="font-bold text-cyan-400 text-sm">${item.bill_no}</div>
            <div class="text-[11px] text-gray-400">${item.date}</div>
          </div>
          <div class="text-right">
            <span class="${statusColor} text-[11px] font-bold bg-gray-900 border border-gray-700 px-2 py-0.5 rounded-lg">${currentStatus}</span>
            <div class="text-[11px] text-gray-300 mt-1 font-bold">ช่าง: ${item.repair_sender || '-'}</div>
          </div>
        </div>
        <div class="text-xs">
          <div class="text-white"><span class="font-bold text-gray-400">ลูกค้า:</span> ${item.customer_name}</div>
          <div class="text-cyan-300 font-semibold mt-1">🔧 ${summaryText}</div>
        </div>
        <div class="flex justify-between items-center bg-gray-900 p-2 rounded-xl border border-gray-700 mt-1">
          <span class="text-xs font-bold text-gray-300">ยอดเงินรวม:</span>
          <span class="font-bold text-rose-400 text-sm">${billTotal} ฿</span>
        </div>
        <div class="grid grid-cols-4 gap-1.5 pt-1">
          ${imagesHTMLMobile}
          <button onclick="togglePay(${item.id}, ${item.is_paid ? 0 : 1})" class="py-1 rounded-xl text-white text-[10px] font-bold ${item.is_paid ? 'bg-emerald-600' : 'bg-rose-600'} shadow">${item.is_paid ? '✓ จ่าย' : '✕ ค้าง'}</button>
          <button onclick="editRepair(${item.id})" class="py-1 bg-amber-500 text-gray-900 rounded-xl text-[10px] font-bold shadow">แก้ไข</button>
          <button onclick="deleteRepair(${item.id})" class="py-1 bg-red-700 text-white rounded-xl text-[10px] font-bold shadow">ลบบิล</button>
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
      <div class="bg-gray-800 border border-gray-700 rounded-2xl p-3 shadow-md flex flex-col items-center">
        <span class="text-xs font-bold text-gray-300 mb-2 bg-gray-900 px-3 py-1 rounded-full border border-gray-700">รูปที่ ${index + 1} / ${paths.length}</span>
        <img src="${path}" class="w-full max-h-72 object-contain rounded-xl border border-gray-700 bg-gray-900 mb-3" alt="Repair Image">
        <a href="${path}" download="repair-photo-${index+1}.png" target="_blank" class="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-xl font-bold shadow flex justify-center items-center gap-2 transition-all">
          📥 บันทึกรูปลงเครื่อง
        </a>
      </div>
    `;
  });
  const modal = document.getElementById('imageModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeImageModal() {
  const modal = document.getElementById('imageModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function togglePay(id, status) {
  await fetch(`/api/repairs/${id}/pay`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_paid: status }) });
  loadHistory();
  loadDashboardStats();
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
      
      currentRow.querySelector('.item-search').value = partName;
      currentRow.querySelector('.item-qty').value = data.items[i].quantity;
      currentRow.querySelector('.item-price').value = data.items[i].unit_price;

      const matchedPart = globalPartsData.find(p => p.part_name === partName);
      if (matchedPart) {
        currentRow.querySelector('select').value = matchedPart.part_type;
      }
    }
  }
  calculateTotal();

  alert(`ดึงข้อมูลบิล ${data.bill_no} มาแก้ไขเรียบร้อยแล้ว`);
  window.scrollTo(0, 0);
  const submitBtn = document.querySelector('button[type="submit"]');
  submitBtn.innerText = "อัปเดตบิลซ่อม";
  submitBtn.classList.replace('bg-emerald-600', 'bg-amber-600');
}

function resetForm() {
  document.getElementById('repairForm').reset();
  document.getElementById('edit_repair_id').value = '';
  setupInitialData();
  document.querySelectorAll('#itemsTable tr:not(#laborRow)').forEach(row => row.remove());
  addItemRow();
  document.getElementById('fileCount').innerText = 'ยังไม่ได้เลือกรูป';
  const submitBtn = document.querySelector('button[type="submit"]');
  submitBtn.innerText = "บันทึกบิลซ่อม";
  submitBtn.classList.replace('bg-amber-600', 'bg-emerald-600');
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

  // บันทึกรายการอะไหล่โดยรวมชนิดและชื่อเข้าด้วยกัน เช่น "(IC) LM339"
  document.querySelectorAll('#itemsTable tr:not(#laborRow)').forEach(row => {
    const type = row.querySelector('.item-type-select')?.value;
    const name = row.querySelector('.item-search')?.value;
    const qty = row.querySelector('.item-qty')?.value;
    const price = row.querySelector('.item-price')?.value;
    if (name) {
      const combinedName = type ? `(${type}) ${name}` : name;
      items.push({ name: combinedName, qty, price });
    }
  });
  formData.append('items', JSON.stringify(items));

  const method = editId ? 'PUT' : 'POST';
  const url = editId ? `/api/repairs/${editId}` : '/api/repairs';

  const res = await fetch(url, { method: method, body: formData });
  if (res.ok) {
    alert(editId ? 'อัปเดตบิลสำเร็จ!' : 'บันทึกบิลสำเร็จ!');
    resetForm();
    loadHistory();
    loadDashboardStats();
  }
});

function closeBillPreview() {
  document.getElementById('billPreviewModal').style.display = 'none';
}

async function deleteRepair(id) {
  if (!confirm('⚠️ คำเตือน: คุณต้องการลบบิลงานซ่อมนี้ออกจากระบบใช่หรือไม่? ข้อมูลและรูปภาพทั้งหมดจะถูกลบถาวร')) return;
  const res = await fetch(`/api/repairs/${id}`, { method: 'DELETE' });
  if (res.ok) {
    alert('ลบบิลงานซ่อมสำเร็จ!');
    loadHistory();
    loadDashboardStats();
  }
}

// ----------------- ฟังก์ชันดาวน์โหลดรูปบิล (รวมชนิดและชื่อรายการให้ชิดกัน) -----------------
function downloadBillImage() {
  const billArea = document.getElementById('billArea');
  const hideElements = billArea.querySelectorAll('.hide-on-print');
  hideElements.forEach(el => el.style.display = 'none');

  // จัดการรวมข้อความ ชนิด และ ชื่ออะไหล่ ในตารางชั่วคราวก่อนแคปรูป
  const itemRows = document.querySelectorAll('#itemsTable tr:not(#laborRow)');
  const itemReplacedData = [];
  
  itemRows.forEach(row => {
    const select = row.querySelector('.item-type-select');
    const input = row.querySelector('.item-search');
    if (select && input && input.value.trim() !== '') {
      const typeVal = select.value;
      const nameVal = input.value;
      const combinedText = typeVal ? `(${typeVal}) ${nameVal}` : nameVal;
      
      const parentTd = input.closest('td');
      const tempSpan = document.createElement('div');
      tempSpan.innerText = combinedText;
      tempSpan.style.fontSize = '12px';
      tempSpan.style.padding = '0 4px';
      tempSpan.style.height = (input.offsetHeight > 0 ? input.offsetHeight : 28) + 'px';
      tempSpan.style.lineHeight = (input.offsetHeight > 0 ? input.offsetHeight : 28) + 'px';
      
      parentTd.insertBefore(tempSpan, select);
      select.style.display = 'none';
      input.style.display = 'none';
      itemReplacedData.push({ select, input, tempSpan });
    }
  });

  const inputs = billArea.querySelectorAll('input:not([type="hidden"]):not(.item-search):not(.item-qty):not(.item-price), select:not(.item-type-select)');
  const replacements = [];
  
  inputs.forEach(el => {
    let val = el.tagName === 'SELECT' ? (el.options[el.selectedIndex]?.text || '') : el.value;
    if (val.includes('- เลือก')) val = '';
    
    const span = document.createElement('div');
    span.innerText = val;
    span.style.display = 'block';
    
    const elHeight = el.offsetHeight > 0 ? el.offsetHeight : 28;
    span.style.height = elHeight + 'px';
    span.style.lineHeight = elHeight + 'px';
    span.style.width = '100%';
    span.style.fontSize = '12px';
    span.style.fontWeight = el.classList.contains('font-bold') ? 'bold' : 'normal';
    span.style.color = el.classList.contains('text-red-600') ? '#dc2626' : (el.classList.contains('text-blue-800') ? '#1e40af' : '#000');
    
    if (el.classList.contains('text-right')) span.style.textAlign = 'right';
    else if (el.classList.contains('text-center')) span.style.textAlign = 'center';
    else span.style.textAlign = 'left';
    
    span.style.background = 'transparent';
    span.style.padding = '0 4px';
    span.style.borderBottom = '1px solid #9ca3af';
    
    el.parentNode.insertBefore(span, el);
    const originalDisplay = el.style.display;
    el.style.display = 'none';
    replacements.push({ el, span, originalDisplay });
  });

  billArea.classList.add('capturing-canvas');

  html2canvas(billArea, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' }).then(canvas => {
    billArea.classList.remove('capturing-canvas');
    hideElements.forEach(el => el.style.display = '');
    
    replacements.forEach(r => {
      r.span.remove();
      r.el.style.display = r.originalDisplay;
    });

    itemReplacedData.forEach(item => {
      item.tempSpan.remove();
      item.select.style.display = '';
      item.input.style.display = '';
    });

    const imageURL = canvas.toDataURL("image/png");
    const isMobile = window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      const modal = document.getElementById('billPreviewModal');
      const imgElem = document.getElementById('billImageElement');
      imgElem.src = imageURL;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    } else {
      const link = document.createElement('a');
      const billNo = document.getElementById('bill_no').value || 'repair';
      link.download = `Bill-${billNo}.png`;
      link.href = imageURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }).catch(err => {
    console.error(err);
    billArea.classList.remove('capturing-canvas');
    hideElements.forEach(el => el.style.display = '');
    replacements.forEach(r => { r.span.remove(); r.el.style.display = r.originalDisplay; });
    itemReplacedData.forEach(item => {
      item.tempSpan.remove();
      item.select.style.display = '';
      item.input.style.display = '';
    });
  });
}