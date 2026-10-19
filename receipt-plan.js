(function () {
  'use strict';

  const REFRESH_MS = 5 * 60 * 1000;

  const text = value => String(value == null ? '' : value).trim();
  const number = value => {
    const parsed = Number(text(value).replace(/,/g, ''));
    return Number.isFinite(parsed) && text(value) !== '' ? parsed : null;
  };
  const sheetNameForDate = date => {
    const parts = /^\d{4}-(\d{2})-(\d{2})$/.exec(date || '');
    return parts ? `${parts[2]}.${parts[1]}` : '';
  };
  const localToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  function parseReceiptPlanSheet(matrix) {
    const headerIndex = matrix.findIndex(row => row.some(cell => text(cell) === 'รหัสสินค้า') && row.some(cell => text(cell) === 'PO'));
    if (headerIndex < 0) throw new Error('ไม่พบหัวตาราง PO / รหัสสินค้าในชีตวันที่เลือก');
    const headers = matrix[headerIndex].map(text);
    const column = label => headers.indexOf(label);
    const columns = {
      rr: column('RR No.(WH)'), company: column('ชื่อบริษัท'), period: column('ช่วงเวลา'),
      po: column('PO'), code: column('รหัสสินค้า'), item: column('รายการ'),
      quantity: column('จำนวน'), unit: column('หน่วย')
    };
    if (columns.code < 0 || columns.item < 0 || columns.quantity < 0)
      throw new Error('คอลัมน์แผนรับเข้าไม่ครบ กรุณาตรวจไฟล์ต้นทาง');
    let previousCompany = '', previousPeriod = '';
    return matrix.slice(headerIndex + 1).flatMap(row => {
      const get = key => columns[key] < 0 ? '' : text(row[columns[key]]);
      const company = get('company'), period = get('period');
      if (company && company !== '"') previousCompany = company;
      if (period && period !== '"') previousPeriod = period;
      const code = get('code'), item = get('item');
      if (!code || !item || /ไม่มีรายการ/.test(item)) return [];
      return [{rr:get('rr'),company:company === '"' || !company ? previousCompany : company,
        period:period === '"' || !period ? previousPeriod : period,
        po:get('po'),code,item,quantity:number(get('quantity')),unit:get('unit')}];
    });
  }

  function validateSnapshot(data) {
    if (!data || !Array.isArray(data.rows) || !data.imported_at || !Number.isFinite(Date.parse(data.imported_at)))
      throw new Error('ข้อมูลแผนรับเข้าไม่ถูกต้อง');
    for (const row of data.rows) {
      const day = /^\d{4}-\d{2}-\d{2}$/.test(row.date || '') && new Date(`${row.date}T00:00:00Z`);
      if (!day || !Number.isFinite(day.getTime()) || day.toISOString().slice(0,10) !== row.date ||
        !['code','item','unit','company','po'].every(key => typeof row[key] === 'string') || !row.code.trim() || !row.item.trim() ||
        typeof row.quantity !== 'number' || !Number.isFinite(row.quantity) || row.quantity < 0)
        throw new Error('รายการแผนรับเข้าไม่ถูกต้อง');
    }
    return data;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {parseReceiptPlanSheet, sheetNameForDate, validateSnapshot};
    return;
  }

  const panel = document.getElementById('pane-receipt-plan');
  if (!panel) return;
  const date = document.getElementById('receiptPlanDate');
  const query = document.getElementById('receiptPlanQuery');
  const status = document.getElementById('receiptPlanStatus');
  const summary = document.getElementById('receiptPlanSummary');
  const result = document.getElementById('receiptPlanResult');
  const badge = document.getElementById('tabBadgeReceiptPlan');
  const refreshButton = document.getElementById('receiptPlanRefresh');
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const allowed = () => window.getWmsCanAccess?.('receipt-plan') === true;
  let snapshot = null, loadedAt = null, pending = null, followToday = true, generation = 0;
  date.value = localToday();

  function keepCurrentDay() {
    if (followToday && date.value !== localToday()) date.value = localToday();
  }

  function render() {
    if (!snapshot) return;
    const selected = date.value;
    const rows = snapshot.rows.filter(row => !selected || row.date === selected);
    status.classList.remove('error');
    const stamp = loadedAt ? loadedAt.toLocaleString('th-TH') : '—';
    status.textContent = `นำเข้าจากเว็บต้นทาง ${snapshot.rows.length} รายการ · ${snapshot.source_note || ''} · นำเข้า PK WMS ${new Date(snapshot.imported_at).toLocaleString('th-TH')} · ตรวจข้อมูลใน PK WMS ล่าสุด ${stamp}`;
    badge.textContent = selected === localToday() ? `${rows.length} วันนี้` : `${rows.length} รายการ`;
    const key = query.value.trim().toLocaleLowerCase('th');
    const visible = key ? rows.filter(row => {const hay=[row.rr,row.company,row.period,row.po,row.code,row.item,row.unit].map(value=>text(value)).join(' ').normalize('NFKC').toLocaleLowerCase('th');return key.normalize('NFKC').split(/\s+/).every(term=>hay.includes(term));}) : rows;
    const distinctCodes = new Set(rows.map(row => row.code)).size;
    const distinctCompanies = new Set(rows.map(row => row.company).filter(Boolean)).size;
    const kpis = [['รายการในแผน',rows.length],['รหัสสินค้า',distinctCodes],['บริษัท',distinctCompanies],['ผลค้นหา',visible.length]];
    summary.innerHTML = kpis.map(([label,value]) => `<div class="daily-kpi"><span>${escape(label)}</span><strong>${value.toLocaleString('en-US')}</strong></div>`).join('');
    result.innerHTML = visible.length ? `<div class="daily-table-wrap"><table class="daily-table">
      <thead><tr><th>วันที่คาดว่าจะรับ</th><th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th class="num">จำนวนแผน</th><th>หน่วย</th><th>ผู้ขาย / บริษัท</th><th>PO</th></tr></thead>
      <tbody>${visible.map(row => `<tr><td>${escape(row.date.split('-').reverse().join('/'))}</td><td>${escape(row.code)}</td><td>${escape(row.item)}</td><td class="num">${row.quantity.toLocaleString('en-US',{maximumFractionDigits:3})}</td><td>${escape(row.unit || '—')}</td><td>${escape(row.company || '—')}</td><td>${escape(row.po || '—')}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="daily-empty">${key ? 'ไม่พบรายการที่ตรงกับคำค้น' : 'ยังไม่มีแผนรับเข้าในวันที่เลือก'}</div>`;
  }

  async function refresh(force = false) {
    keepCurrentDay();
    const client = typeof supabaseClient !== 'undefined' ? supabaseClient : null;
    if (!client || !allowed()) {clear(); return;}
    if (pending) return pending;
    if (!force && loadedAt && Date.now() - loadedAt.getTime() < REFRESH_MS) {render(); return;}
    refreshButton.disabled = true;
    status.classList.remove('error');
    status.textContent = 'กำลังโหลดแผนที่นำเข้าจากเว็บต้นทาง…';
    const requestGeneration = generation;
    pending = (async () => {
      try {
        const response = await client.rpc('get_pk_receipt_plan');
        if (requestGeneration !== generation || !allowed()) return;
        if (response.error?.code === '42501') {clear(); return;}
        if (response.error) throw new Error(response.error.message || 'โหลดแผนรับเข้าไม่สำเร็จ');
        snapshot = validateSnapshot(response.data);
        loadedAt = new Date();
        render();
      } catch (error) {
        if (requestGeneration !== generation) return;
        status.classList.add('error');
        status.textContent = `โหลดแผนรับเข้าไม่สำเร็จ: ${error.message}${snapshot ? ' · ข้อมูลที่โหลดก่อนหน้ายังแสดงอยู่' : ''}`;
        if (!snapshot) badge.textContent = 'โหลดไม่ได้';
      } finally {
        if (requestGeneration !== generation) return;
        refreshButton.disabled = false;
        pending = null;
      }
    })();
    return pending;
  }

  function clear() {
    ++generation; snapshot = null; loadedAt = null; pending = null;
    summary.replaceChildren(); result.replaceChildren(); badge.textContent = '—';
    refreshButton.disabled = false; status.classList.remove('error');
    status.textContent = 'เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์แผนรับเข้าเพื่อโหลดข้อมูล';
  }
  window.addEventListener('wms:account-changed', () => {clear(); if (!panel.hidden) refresh();});

  date.addEventListener('change', () => {followToday = date.value === localToday(); render();});
  query.addEventListener('input', render);
  document.getElementById('receiptPlanPrev').addEventListener('click', () => {
    const day = new Date(`${date.value || localToday()}T12:00:00`);
    day.setDate(day.getDate() - 1);
    date.value = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    followToday = false;
    render();
  });
  document.getElementById('receiptPlanToday').addEventListener('click', () => {followToday = true; date.value = localToday(); render();});
  document.getElementById('receiptPlanAll').addEventListener('click', () => {followToday = false; date.value = ''; render();});
  refreshButton.addEventListener('click', () => refresh(true));
  document.getElementById('tab-receipt-plan').addEventListener('click', () => refresh());
  document.addEventListener('visibilitychange', () => {if (!document.hidden && !panel.hidden) refresh();});
  setInterval(() => {if (!document.hidden && !panel.hidden) refresh();}, REFRESH_MS);
  if(!panel.hidden)refresh();
})();
