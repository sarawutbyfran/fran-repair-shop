let globalPartsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  setupInitialData();
  await loadPartsDatabase();
  loadHistory();
  addItemRow();
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
  let desc = "รายการซ่อม แอมป์";
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

async function loadPartsDatabase() {
  const res = await fetch('/api/parts');
  globalPartsData = await res.json();
  const tbody = document.getElementById('partsInventoryTable');
  if(tbody) {
    tbody.innerHTML = '';
    globalPartsData.forEach(p => {
      const profit = (p.sale_price - p.cost_price).toFixed(2);
      tbody.innerHTML += `<tr class="hover:bg-gray-50"><td class="p-2 border">${p.part_type || '-'}</td><td class="p-2 border font-bold">${p.part_name}</td><td class="p-2 border text-right text-red-600">${p.cost_price}</td><td class="p-2 border text-right text-green-600 font-bold">${p.sale_price}</td><td class="p-2 border text-right text-blue-600">${profit}</td><td class="p-2 border text-xs">${p.source || '-'}</td></tr>`;
    });
  }
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
  await fetch('/api/parts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  document.getElementById('addPartForm').reset();
  await loadPartsDatabase();
  alert('เพิ่มรายการอะไหล่สำเร็จ!');
});

async function loadHistory() {
  const res = await fetch('/api/repairs');
  let data = await res.json();
  const filterSender = document.getElementById('filter_sender')?.value;
  const filterStatus = document.getElementById('filter_status')?.value;
  if (filterSender) data = data.filter(d => d.repair_sender === filterSender);
  if (filterStatus) data = data.filter(d => (d.status || 'กำลังซ่อม') === filterStatus);

  const tbody = document.getElementById('historyTable');
  if(!tbody) return;
  tbody.innerHTML = '';

  data.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-gray-50";
    let imagesHTML = item.image_path ? `<button onclick="downloadAllImages('${item.image_path}')" class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded border font-bold hover:bg-purple-200">โหลดรูป (${item.image_path.split(',').length})</button>` : '-';
    const currentStatus = item.status || 'กำลังซ่อม';
    let statusColor = currentStatus === 'ซ่อมเสร็จ' ? 'text-green-600' : (currentStatus === 'รออะไหล่' ? 'text-red-500' : 'text-orange-500');

    tr.innerHTML = `
      <td class="p-2 border font-bold text-cyan-700">${item.bill_no}<br><span class="text-xs text-gray-500">${item.date}</span></td>
      <td class="p-2 border">${item.customer_name}</td>
      <td class="p-2 border font-bold">${item.repair_sender || '-'}<br><span class="${statusColor} text-xs">${currentStatus}</span></td>
      <td class="p-2 border text-center">${imagesHTML}</td>
      <td class="p-2 border text-center">
        <button onclick="togglePay(${item.id}, ${item.is_paid ? 0 : 1})" class="px-2 py-1 rounded text-white text-xs font-bold ${item.is_paid ? 'bg-green-500' : 'bg-red-500'} shadow">
          ${item.is_paid ? '✓ จ่ายแล้ว' : '✕ ค้างชำระ'}
        </button>
      </td>
      <td class="p-2 border text-center">
        <button onclick="editRepair(${item.id})" class="px-2 py-1 bg-yellow-400 text-yellow-900 rounded text-xs font-bold hover:bg-yellow-500 shadow">แก้ไขบิล</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function togglePay(id, status) {
  await fetch(`/api/repairs/${id}/pay`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_paid: status }) });
  loadHistory();
}

async function editRepair(id) {
  const res = await fetch(`/api/repairs/${id}`);
  const data = await res.json();
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

  if(data.items && data.items.length > 0) {
    document.querySelector('#laborRow .item-price').value = data.items[0].unit_price || 0;
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
  const submitBtn = document.querySelector('button[type="submit"]');
  submitBtn.innerText = "บันทึกบิล";
  submitBtn.classList.replace('bg-blue-600', 'bg-green-600');
}

function downloadAllImages(imagePathsStr) {
  imagePathsStr.split(',').forEach((path, index) => {
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = path;
      link.download = `repair-img-${index + 1}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, index * 400);
  });
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

function downloadBillImage() {
  const elementsToHide = document.querySelectorAll('.hide-on-print');
  elementsToHide.forEach(el => el.style.display = 'none');
  html2canvas(document.getElementById('billArea'), { scale: 2 }).then(canvas => {
    const link = document.createElement('a');
    link.download = `Bill-${document.getElementById('bill_no').value}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    elementsToHide.forEach(el => el.style.display = '');
  });
}