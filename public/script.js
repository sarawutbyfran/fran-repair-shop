document.addEventListener('DOMContentLoaded', () => {
  for (let i = 0; i < 3; i++) addItemRow();
  loadHistory();
  document.getElementById('date').valueAsDate = new Date();
});

function addItemRow() {
  const tbody = document.getElementById('itemsTable');
  const rowCount = tbody.children.length + 1;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="border border-cyan-400 p-1 text-center">${rowCount}</td>
    <td class="border border-cyan-400 p-1"><input type="text" class="item-name w-full p-1 border-none focus:outline-none"></td>
    <td class="border border-cyan-400 p-1"><input type="number" class="item-qty w-full p-1 text-center border-none focus:outline-none" value="1" oninput="calculateTotal()"></td>
    <td class="border border-cyan-400 p-1"><input type="number" class="item-price w-full p-1 text-right border-none focus:outline-none" value="0" oninput="calculateTotal()"></td>
    <td class="border border-cyan-400 p-1 text-right item-total">0.00</td>
  `;
  tbody.appendChild(tr);
}

function calculateTotal() {
  const rows = document.querySelectorAll('#itemsTable tr');
  rows.forEach(row => {
    const qty = parseFloat(row.querySelector('.item-qty')?.value || 0);
    const price = parseFloat(row.querySelector('.item-price')?.value || 0);
    const total = qty * price;
    row.querySelector('.item-total').innerText = total.toFixed(2);
  });
}

document.getElementById('repairForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData();
  
  formData.append('bill_no', document.getElementById('bill_no').value);
  formData.append('date', document.getElementById('date').value);
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

  const res = await fetch('/api/repairs', { method: 'POST', body: formData });
  if (res.ok) {
    alert('บันทึกข้อมูลเรียบร้อยแล้ว');
    loadHistory();
  }
});

async function loadHistory() {
  const res = await fetch('/api/repairs');
  const data = await res.json();
  const tbody = document.getElementById('historyTable');
  tbody.innerHTML = '';

  data.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = "border-b hover:bg-gray-50";
    tr.innerHTML = `
      <td class="p-2 font-bold">${item.bill_no}</td>
      <td class="p-2">${item.date}</td>
      <td class="p-2">${item.customer_name}</td>
      <td class="p-2">${item.symptom || '-'}</td>
      <td class="p-2">
        ${item.image_path ? `<a href="${item.image_path}" target="_blank" class="text-blue-600 underline">ดูรูป</a>` : 'ไม่มี'}
      </td>
      <td class="p-2">
        <button onclick="togglePay(${item.id}, ${item.is_paid ? 0 : 1})" class="px-3 py-1 rounded text-white text-xs font-bold ${item.is_paid ? 'bg-green-600' : 'bg-red-500'}">
          ${item.is_paid ? '✓ ชำระแล้ว' : '✕ ยังไม่ชำระ'}
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

function downloadBillImage() {
  const billElement = document.getElementById('billArea');
  html2canvas(billElement).then(canvas => {
    const link = document.createElement('a');
    link.download = `bill-${document.getElementById('bill_no').value || 'repair'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  });
}