(function (root) {
  'use strict';
  const dayMs = 86400000;
  const key = value => String(value ?? '').trim().toUpperCase();
  const number = value => (typeof value === 'number' || typeof value === 'string') && String(value).trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
  function dateNumber(value) {
    const text = String(value || '').trim();
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
    const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(text);
    if (!iso && !slash) return null;
    let year = Number(iso ? iso[1] : slash[3]);
    if (year < 100) year += 1957;
    else if (year >= 2400) year -= 543;
    const month = Number(iso ? iso[2] : slash[2]), day = Number(iso ? iso[3] : slash[1]);
    const time = Date.UTC(year, month - 1, day), date = new Date(time);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? time : null;
  }
  function defaultRange(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const get = type => parts.find(part => part.type === type).value;
    const to = `${get('year')}-${get('month')}-${get('day')}`;
    return {from:new Date(dateNumber(to) - 55 * dayMs).toISOString().slice(0,10),to};
  }
  // Read the same movement ledger as product history, once per selected product.
  // Whole moves carry history; split moves start an empty withdrawal/return ledger.
  function collectUsage(slotItems, code, getLedger) {
    const rows = [];
    for (const [zone, slots] of Object.entries(slotItems || {})) {
      for (const [slot, items] of Object.entries(slots || {})) {
        for (const item of items || []) {
          if (key(item.code) !== key(code)) continue;
          for (const row of getLedger(item).rows) {
            if (row.type === 'withdraw' || row.type === 'return') rows.push({...row,zone,slot});
          }
        }
      }
    }
    return rows;
  }
  function summarizeUsage(rows, unit, from, to) {
    const start = dateNumber(from), end = dateNumber(to);
    const result = {validRange:start != null && end != null && start <= end,days:0,withdrawn:0,returned:0,net:0,count:0,invalidDate:0,invalidQuantity:0,missingUnit:0,otherUnit:0,earliest:null,average:null};
    if (!result.validRange) return result;
    result.days = (end - start) / dayMs + 1;
    for (const row of rows || []) {
      if (row.type !== 'withdraw' && row.type !== 'return') continue;
      const rowUnit = String(row.unit || '').trim(), date = dateNumber(row.date);
      if (rowUnit && rowUnit !== String(unit || '').trim()) { result.otherUnit++; continue; }
      if (date == null) { result.invalidDate++; continue; }
      if (date > end) continue;
      if (rowUnit) result.earliest = result.earliest == null ? date : Math.min(result.earliest,date);
      if (date < start) continue;
      if (!rowUnit) { result.missingUnit++; continue; }
      const qty = number(row.qty);
      if (qty == null || qty < 0) { result.invalidQuantity++; continue; }
      if (row.type === 'withdraw') result.withdrawn += qty;
      else result.returned += qty;
      result.count++;
    }
    result.net = result.withdrawn - result.returned;
    // Gross withdrawals are explicit: returns can belong to earlier periods.
    if (!result.invalidDate && !result.invalidQuantity && !result.missingUnit && result.count) result.average = result.withdrawn / result.days;
    return result;
  }
  function previewRop(usage, leadDays, safetyQty) {
    const lead = number(leadDays), safety = number(safetyQty);
    if (usage.average == null || usage.withdrawn <= 0 || lead == null || lead <= 0 || !Number.isInteger(lead) || safety == null || safety < 0) return null;
    const value = usage.average * lead + safety;
    return Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER ? Math.ceil(value) : null;
  }
  const api = {dateNumber,defaultRange,collectUsage,summarizeUsage,previewRop};
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.PKReorderUsage = api;
  const panel = document.getElementById('reorderUsage');
  if (!panel) return;
  const from = document.getElementById('reorderUsageFrom'), to = document.getElementById('reorderUsageTo');
  const lead = document.getElementById('reorderLeadDays'), safety = document.getElementById('reorderSafetyQty');
  const output = document.getElementById('reorderUsageOutput');
  const range = defaultRange(); from.value = range.from; to.value = range.to;
  from.max = to.max = range.to;
  let selected = null;
  const fmt = value => Number(value).toLocaleString('th-TH', {maximumFractionDigits:2});
  const escape = value => escapeHtml(String(value ?? ''));
  function render() {
    if (!selected || panel.hidden) return;
    const point = root.PKReorder?.getRows().find(row => row.code === selected.code && row.unit === selected.unit);
    const invalid = !from.value || !to.value || from.value > to.value || to.value > defaultRange().to;
    from.setCustomValidity(invalid ? 'เลือกวันที่เริ่มต้นไม่เกินวันที่สิ้นสุด และไม่เกินวันนี้' : '');
    if (invalid) { output.textContent = 'กรุณาเลือกช่วงวันที่ให้ถูกต้อง'; return; }
    document.getElementById('reorderUsageTitle').textContent = `${selected.code} · การใช้จากพาเลท (${selected.unit})`;
    const failed = document.getElementById('syncStatusBar')?.classList.contains('sync-error');
    if (!palletDataReady || failed) { output.textContent = failed ? 'ข้อมูลพาเลทซิงค์ไม่สำเร็จ ยังไม่คำนวณ กรุณาเชื่อมต่อและโหลดใหม่' : 'กำลังรอข้อมูลพาเลท…'; return; }
    const usage = summarizeUsage(collectUsage(SLOT_ITEMS,selected.code,getStockMovement),selected.unit,from.value,to.value);
    const preview = previewRop(usage,lead.value,safety.value);
    const notes = [];
    if (usage.invalidDate) notes.push(`วันที่ขาดหรือไม่ถูกต้อง ${usage.invalidDate} รายการ (ยังระบุไม่ได้ว่าอยู่ในช่วงนี้หรือไม่)`);
    if (usage.invalidQuantity) notes.push(`จำนวนไม่ถูกต้อง ${usage.invalidQuantity} รายการ`);
    if (usage.missingUnit) notes.push(`ไม่ระบุหน่วย ${usage.missingUnit} รายการ`);
    if (usage.otherUnit) notes.push(`แยกออก ${usage.otherUnit} รายการที่ใช้หน่วยอื่น ไม่มีการแปลงหน่วย`);
    if (usage.net < 0) notes.push('รับคืนมากกว่าเบิก อาจเป็นของที่เบิกก่อนช่วงวันที่นี้');
    if (usage.earliest == null || usage.earliest > dateNumber(from.value)) notes.push('ไม่พบประวัติย้อนหลังถึงวันเริ่มช่วง ข้อมูลอาจยังไม่ครบ');
    output.innerHTML = `<div class="reorder-usage-metrics"><div>เบิกรวม<strong>${fmt(usage.withdrawn)}</strong></div><div>รับคืน<strong>${fmt(usage.returned)}</strong></div><div>เบิก − รับคืน<strong>${fmt(usage.net)}</strong></div><div>เบิกเฉลี่ย / วัน<strong>${usage.average == null ? '—' : fmt(usage.average)}</strong></div></div>
      <p>${fmt(usage.count)} รายการที่อ่านได้ · ${fmt(usage.days)} วันปฏิทิน · หน่วย ${escape(selected.unit)} · ตัวเลขรวมข้างต้นไม่นับรายการที่อ่านไม่ได้</p>
      ${notes.length ? `<p class="reorder-usage-warning">${notes.map(escape).join(' · ')}</p>` : ''}
      <p>ROP ที่ใช้แจ้งเตือน: <strong>${point ? fmt(point.rop) : '—'}</strong> · ROP ทดลอง: <strong>${preview == null ? 'ยังคำนวณไม่ได้' : fmt(preview)}</strong></p>
      <p>${preview == null ? 'ต้องมียอดเบิกที่อ่านได้ ไม่มีข้อผิดพลาดด้านวันที่/จำนวน/หน่วย และกรอกวันรอสินค้ากับสต็อกสำรอง (ใส่ 0 ได้)' : 'ทดลองจากเบิกเฉลี่ยต่อวัน × วันรอสินค้า + สต็อกสำรอง ปัดขึ้นเป็นหน่วยเต็ม'}</p>
      <p>ใช้ยอดเบิกรวมในสูตรทดลอง เพราะรับคืนอาจข้ามช่วง จึงอาจประเมินสูงกว่าการใช้จริง ประวัติที่แสดงไม่ยืนยันว่าบันทึกครบทุกวัน และไม่รวมการย้ายพาเลทหรือ Scrap ค่า ROP ทดลองยังไม่ถูกนำไปแจ้งเตือนหรือสั่งซื้อ</p>`;
  }
  api.open = (code,unit) => {
    selected = {code,unit}; lead.value = ''; safety.value = ''; panel.hidden = false;
    render(); panel.scrollIntoView({block:'nearest'}); document.getElementById('reorderUsageTitle').focus({preventScroll:true});
  };
  api.refresh = () => { if (!document.getElementById('pane-reorder')?.hidden) render(); };
  for (const input of [from,to,lead,safety]) input.addEventListener('input',render);
  document.getElementById('reorderUsageClose').addEventListener('click',() => {
    panel.hidden = true;
    const trigger = [...document.querySelectorAll('[data-usage-code]')].find(button => button.dataset.usageCode === selected?.code && button.dataset.usageUnit === selected?.unit);
    trigger?.focus();
  });
})(typeof window !== 'undefined' ? window : globalThis);
