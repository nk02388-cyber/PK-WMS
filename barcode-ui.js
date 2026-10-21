// Warehouse scans select context only; stock changes still require the existing reviewed form.
(() => {
  const $ = id => document.getElementById(id);
  const input = $('barcodeScanInput'), status = $('barcodeScanStatus');
  const selection = $('barcodeScanSelection'), view = $('barcodeCameraView');
  const startButton = $('barcodeCameraStart'), stopButton = $('barcodeCameraStop');
  const locations = Object.entries(ZONE_SLOTS).flatMap(([zone, slots]) => slots.map(slot => ({zone,slot:slot.code})));
  const printZone = $('barcodePrintZone'), printStatus = $('barcodePrintStatus');
  [...new Set(locations.map(loc => loc.zone))].sort((a,b) => a.localeCompare(b,'th',{numeric:true})).forEach(zone => {
    const option = document.createElement('option'); option.value = zone; option.textContent = zone; printZone.append(option);
  });
  let chosenProduct = null, camera = null, cameraRunning = false, cameraStarting = false;
  let cameraGeneration = 0, scanBusy = false, lastScanValue = '', lastScanAt = 0;
  function products() {
    return [...(STOCK.items || []), ...Object.values(SLOT_ITEMS).flatMap(slots => Object.values(slots).flat())];
  }
  function message(text, error = false) { status.textContent = text; status.dataset.error = String(error); }
  function printMessage(text, error = false) { printStatus.textContent = text; printStatus.dataset.error = String(error); }
  function showSelection() {
    selection.textContent = chosenProduct ? `สินค้า: ${chosenProduct.code} ${chosenProduct.name || ''}` : 'ยังไม่ได้เลือกสินค้า';
  }
  function clearSelection(announce = true) {
    chosenProduct = null; lastScanValue = ''; lastScanAt = 0;
    input.value = ''; showSelection();
    if (announce) message('ล้างตำแหน่งและสินค้าที่สแกนแล้ว');
  }
  function showProductLocations(product) {
    const productCode = String(product?.code || '').trim();
    const inventoryCode = Object.keys(ITEM_TO_SLOTS).find(code => code.trim().toUpperCase() === productCode.toUpperCase());
    const matches = inventoryCode ? ITEM_TO_SLOTS[inventoryCode] : [];
    floorplanSearchInput.value = productCode;
    hideSearchSuggestions();
    renderSearchMatches(matches, productCode, false);
    floorplanSearchMsg.scrollIntoView({block:'nearest'});
    return matches.length;
  }
  async function stopCamera() {
    const activeCamera = camera, wasRunning = cameraRunning;
    cameraGeneration += 1; cameraRunning = false; cameraStarting = false; camera = null;
    if (activeCamera && wasRunning) { try { await activeCamera.stop(); } catch (_) {} }
    if (activeCamera) { try { activeCamera.clear(); } catch (_) {} }
    view.hidden = true; view.replaceChildren();
    startButton.disabled = false;
    startButton.hidden = false; stopButton.hidden = true;
  }
  function openMatch(location, product) {
    if (!location || !product) return;
    const {zone,slot} = location;
    jumpToSlot(zone,slot);
    openSlotEdit(zone,slot);
    const index = slotItemsFor(zone,slot).findIndex(item => String(item.code).trim().toUpperCase() === String(product.code).trim().toUpperCase());
    if (index >= 0) {
      const row = fseItemsList.querySelectorAll('.fse-item-row')[index];
      row?.classList.add('barcode-match'); row?.scrollIntoView({block:'nearest'});
      showFseFeedback(`พบ ${product.code} ใน ${zone}/${slot} · ตรวจนับยอดที่แสดงก่อนแก้ไข`);
    } else {
      fseAddCode.value = product.code;
      autofillAddProductDetails();
      fseAddLotNo.focus();
      showFseFeedback(`ตำแหน่ง ${zone}/${slot} ยังไม่มี ${product.code} · กรอก Lot วันที่ จำนวน และเอกสารรับก่อนบันทึก`);
    }
  }
  async function openStoredTag(id) {
    if (!supabaseClient) { message('ยังไม่ได้เชื่อมต่อฐานข้อมูลรับเข้า',true); return false; }
    const {data:tag,error:tagError} = await supabaseClient.from('incoming_pallets')
      .select('id,status,zone,slot_code,product_code,receiving_no,batch_index,batch_total').eq('id',id).single();
    if (tagError || !tag) { message('ไม่พบป้ายพาเลตนี้ในทะเบียนรับเข้า',true); return false; }
    if (tag.status !== 'stored' || !tag.zone || !tag.slot_code) {
      message('ป้ายพาเลตนี้ยังรอจัดเก็บ · ไปที่เมนูรับเข้าและจัดเก็บ',true); return false;
    }
    const location = locations.find(loc => loc.zone === tag.zone && loc.slot === tag.slot_code);
    if (!location) { message('ตำแหน่งของป้ายนี้ไม่อยู่ในผัง · กรุณาตรวจข้อมูลจัดเก็บ',true); return false; }
    const {data:slot,error:slotError} = await supabaseClient.from('pallet_slots').select('*')
      .eq('zone',location.zone).eq('slot_code',location.slot).single();
    if (slotError || !slot) { message('โหลดรายการสินค้าในตำแหน่งนี้ไม่ได้ · กรุณาลองใหม่',true); return false; }
    applyRemoteSlotRow(slot,{silent:true,force:true});
    refreshAfterRemoteChange(location.zone,location.slot);
    await stopCamera(); clearSelection(false);
    jumpToSlot(location.zone,location.slot);
    openSlotEdit(location.zone,location.slot);
    const index = slotItemsFor(location.zone,location.slot).findIndex(item =>
      String(item.inboundTagId || '').toLowerCase() === id);
    if (index >= 0) {
      const row = fseItemsList.querySelectorAll('.fse-item-row')[index];
      row?.classList.add('barcode-match'); row?.scrollIntoView({block:'nearest'});
      showFseFeedback(`พบป้าย ${tag.receiving_no} · ${tag.batch_index || 1}/${tag.batch_total || 1} ที่ ${location.zone}/${location.slot} · ตรวจยอดก่อนเบิก`);
    } else {
      showFseFeedback(`ป้ายนี้เคยจัดเก็บที่ ${location.zone}/${location.slot} แต่ไม่พบสินค้าปัจจุบัน · ตรวจประวัติการเบิกหรือย้าย`, 'error');
    }
    return index >= 0;
  }
  async function apply(raw) {
    const scanValue = String(raw ?? '').trim().toUpperCase(), now = Date.now();
    if (scanBusy || (scanValue && scanValue === lastScanValue && now - lastScanAt < 1200)) return;
    scanBusy = true; lastScanValue = scanValue; lastScanAt = now;
    try {
      const match = PKBarcode.resolveScan(raw,locations,products());
      input.value = '';
      if (match.kind === 'invalid') { message(match.reason,true); return; }
      if (match.kind === 'tag') { if (await openStoredTag(match.id)) PKScanSound.success(`tag:${match.id}`); return; }
      if (match.kind === 'location') {
        const product = chosenProduct;
        await stopCamera(); clearSelection(false);
        if (product) openMatch({zone:match.zone,slot:match.slot},product);
        else {
          jumpToSlot(match.zone,match.slot); openSlotEdit(match.zone,match.slot);
          showFseFeedback(`ตำแหน่ง ${match.zone}/${match.slot} · เลือกรายการสินค้าเพื่อเบิก`);
        }
        PKScanSound.success(`location:${match.zone}/${match.slot}`);
        return;
      }
      if (match.kind === 'product') {
        chosenProduct = match.product; $('barcodePrintProductCode').value = match.product.code;
        const positionCount = showProductLocations(match.product);
        message(positionCount
          ? `พบสินค้า ${match.product.code} ใน ${positionCount} ตำแหน่ง · เลือกตำแหน่งด้านล่างหรือสแกนป้ายตำแหน่ง`
          : `อ่านสินค้า ${match.product.code} แล้ว · ยังไม่พบในพาเลต หรือสแกนป้ายตำแหน่งเพื่อเพิ่มรายการ`);
        PKScanSound.success(`product:${match.product.code}`);
      }
      showSelection();
    } catch (error) {
      message('เปิดรายการจากรหัสนี้ไม่ได้: '+(error?.message || 'กรุณาลองใหม่'),true);
    } finally { scanBusy = false; }
  }
  $('barcodeScanApply').addEventListener('click', () => { PKScanSound.arm(); apply(input.value); });
  $('barcodeScanClear').addEventListener('click', () => clearSelection());
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); PKScanSound.arm(); apply(input.value); } });
  startButton.addEventListener('click', async () => {
    if (cameraRunning || cameraStarting) return;
    PKScanSound.arm();
    const generation = ++cameraGeneration;
    cameraStarting = true; startButton.disabled = true;
    try {
      message('กำลังโหลดตัวสแกน…');
      await PKDependencies.scanner();
      if(generation !== cameraGeneration || document.hidden) return;
      const nextCamera = new Html5Qrcode('barcodeCameraView', {formatsToSupport:[0,3,4,5,6,8,9,10,11,13,14]});
      camera = nextCamera;
      view.hidden = false;
      await nextCamera.start({facingMode:'environment'},{fps:8,qrbox:(w,h)=>({width:Math.min(w-20,320),height:Math.min(h-20,220)})},decoded => apply(decoded),()=>{});
      if (generation !== cameraGeneration || camera !== nextCamera) {
        try { await nextCamera.stop(); } catch (_) {}
        try { nextCamera.clear(); } catch (_) {}
        return;
      }
      cameraRunning = true; startButton.hidden = true; stopButton.hidden = false;
      message('เล็งกล้องไปที่ QR หรือบาร์โค้ด');
      requestAnimationFrame(() => {
        if (cameraRunning && !view.hidden) view.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});
      });
    } catch (error) {
      if (generation === cameraGeneration) { await stopCamera(); message('เปิดกล้องไม่ได้ · ตรวจสิทธิ์กล้องหรือใช้เครื่องสแกน: '+error,true); }
    } finally {
      if (generation === cameraGeneration) { cameraStarting = false; startButton.disabled = false; }
    }
  });
  stopButton.addEventListener('click',stopCamera);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera(); });
  $('tabs').addEventListener('click',event => { if (event.target.closest('.tab-btn')?.dataset.tab !== 'floorplan') stopCamera(); });
  function qrMarkup(payload, margin = 2) { const qr = qrcode(0,'M'); qr.addData(payload); qr.make(); return qr.createSvgTag(3,margin); }
  function printLabels(title,labels, cycle = false) {
    const page = window.open('','_blank');
    if (!page) { printMessage('เบราว์เซอร์ปิดกั้นหน้าพิมพ์ กรุณาอนุญาตป๊อปอัป',true); return; }
    page.document.write(`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:14px Arial,sans-serif}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.label{border:1px solid #333;padding:9px;text-align:center;break-inside:avoid}.label svg{width:100px;height:100px}.label b,.label small{display:block;margin:4px}
      ${cycle ? '@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;color:#000;background:#fff;font-size:11pt}.grid{display:block}.count-sheet h1{font-size:20pt;margin:0 0 2mm}.sheet-meta{display:flex;justify-content:space-between;gap:5mm;margin:2mm 0;flex-wrap:wrap}.count-sheet table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10pt}.count-sheet thead{display:table-header-group}.count-sheet th,.count-sheet td{border:1px solid #333;padding:2mm;vertical-align:middle;overflow-wrap:anywhere}.count-sheet th{text-align:left}.count-sheet th:not([colspan]):first-child,.count-sheet td:first-child{white-space:nowrap;overflow-wrap:normal;text-align:center;padding-inline:1mm}.count-sheet tr{break-inside:avoid}.count-sheet .sheet-position{text-align:center}.sheet-position strong{display:block;font-size:11pt}.count-sheet svg{display:block;width:18mm;height:18mm;margin:auto}.count-sheet footer{margin-top:3mm;line-height:1.6;break-inside:avoid}.sheet-help{font-size:9pt;margin:2mm 0}.count-sheet td{height:25mm}@media screen{.count-sheet{min-width:950px}}@media print{body>h2{display:none}}' : ''}

      </style><h2>${escapeHtml(title)}</h2><div class="grid">${labels}</div></html>`);
    page.document.close(); page.focus(); page.print();
    printMessage('เปิดหน้าพิมพ์แล้ว · ตรวจตัวอย่างก่อนยืนยันพิมพ์');
  }
  const cycleZone = $('cycleLabelZone'), cycleSlots = $('cycleLabelSlots');
  cycleZone.innerHTML = printZone.innerHTML;
  function updateCycleSelection() {
    const count = cycleSlots.querySelectorAll('input:checked').length;
    $('cycleLabelSelection').textContent = `เลือก ${count} พาเลท`;
    $('cycleLabelPrint').disabled = count === 0;
  }
  function renderCycleSlots() {
    cycleSlots.innerHTML = locations.filter(loc => loc.zone === cycleZone.value).map(loc =>
      `<label><input type="checkbox" value="${escapeHtml(loc.slot)}" checked><span>${escapeHtml(loc.slot)}</span></label>`).join('');
    updateCycleSelection();
  }
  cycleZone.addEventListener('change', renderCycleSlots);
  cycleSlots.addEventListener('change', updateCycleSelection);
  for (const [id, checked] of [['cycleLabelSelectAll', true], ['cycleLabelClear', false]]) {
    $(id).addEventListener('click', () => {
      cycleSlots.querySelectorAll('input').forEach(input => { input.checked = checked; });
      updateCycleSelection();
    });
  }
  $('cycleCountPrintLabels').addEventListener('click', () => {
    cycleZone.value = $('cycleCountZone').value;
    renderCycleSlots();
    activateTab($('tab-print-labels'));
    cycleZone.focus();
  });
  renderCycleSlots();
  $('cycleLabelPrint').addEventListener('click', () => {
    if (!palletDataReady || !$('syncStatusBar')?.classList.contains('sync-connected')) {
      printMessage('ข้อมูลพาเลทยังไม่เชื่อมต่อ กรุณารอหรือรีเฟรชก่อนพิมพ์', true); return;
    }
    if (typeof qrcode !== 'function') { printMessage('ยังสร้าง QR ไม่ได้ กรุณารีเฟรชแล้วลองใหม่', true); return; }
    const zone = cycleZone.value;
    const selected = new Set([...cycleSlots.querySelectorAll('input:checked')].map(input => input.value));
    const slots = (ZONE_SLOTS[zone] || []).filter(slot => selected.has(slot.code));
    if (!slots.length) { printMessage('กรุณาเลือกพาเลทก่อนพิมพ์', true); return; }
    const snapshot = CycleCountCore.snapshotZone(zone, slots, SLOT_ITEMS[zone], PALLET_STATUS[zone], getRemainingQty);
    let lineNumber = 0;
    const rows = slots.flatMap(slot => {
      const items = snapshot.rows.filter(row => row.slot === slot.code);
      return (items.length ? items : [{ code: '', name: 'ไม่มีรายการสินค้าในระบบ · ตรวจพื้นที่จริง', lot: '', unit: '' }]).map(row =>
        `<tr><td>${++lineNumber}</td><td class="sheet-position"><strong>${escapeHtml(slot.code)}</strong>${qrMarkup(PKBarcode.locationPayload(zone, slot.code), 12)}</td><td><strong>${escapeHtml(row.code)}</strong><br>${escapeHtml(row.name)}</td><td>${escapeHtml(row.lot || '—')}</td><td>${escapeHtml(row.unit)}</td><td></td><td></td></tr>`);
    }).join('');
    const sheet = `<article class="count-sheet"><h1>COUNT SHEET · ใบตรวจนับสินค้า</h1>
      <div class="sheet-meta"><strong>PK WMS · โซน ${escapeHtml(zone)} · ${slots.length} ตำแหน่ง · ${lineNumber} รายการ</strong><span>เลขที่ใบตรวจนับ ____________________</span></div>
      <div class="sheet-meta"><span>วันที่ตรวจนับ __________________ เวลาเริ่ม __________ เวลาสิ้นสุด __________</span><span>ผู้ตรวจนับ ____________________</span></div>
      <p class="sheet-help">กรอกจำนวนที่นับจริงทุกแถว · พบว่าไม่มีสินค้าให้กรอก 0 · พบสินค้าอื่นให้ระบุในหมายเหตุ · QR สแกนเปิดตำแหน่งผ่านเมนูผังคลัง</p>
      <table><colgroup><col style="width:5%"><col style="width:12%"><col style="width:31%"><col style="width:12%"><col style="width:8%"><col style="width:13%"><col style="width:19%"></colgroup><thead><tr><th colspan="7">COUNT SHEET · โซน ${escapeHtml(zone)} · วันที่ตรวจนับ ______________ · เลขที่ใบตรวจนับ ______________</th></tr><tr><th>ลำดับ</th><th>ตำแหน่ง / QR</th><th>รหัส / ชื่อสินค้า</th><th>Lot</th><th>หน่วย</th><th>จำนวนที่นับจริง</th><th>หมายเหตุ</th></tr></thead><tbody>${rows}</tbody></table>
      <footer>ผู้ตรวจนับ ____________________ ผู้ตรวจสอบ ____________________ วันที่ ____________________<br><small>จดผลก่อนบันทึกในเมนู Cycle Counts · ไม่แสดงยอดในระบบ · พิมพ์ ${escapeHtml(new Date().toLocaleString('th-TH'))}</small></footer></article>`;
    printLabels(`Count Sheet · โซน ${zone} · ${slots.length} ตำแหน่ง`, sheet, true);
  });
  $('barcodePrintLocations').addEventListener('click', () => {
    const zone = printZone.value, slots = locations.filter(loc => loc.zone === zone);
    if (!slots.length || typeof qrcode !== 'function') { printMessage('ยังสร้างป้าย QR ไม่ได้',true); return; }
    const labels = slots.map(loc => {
      return `<div class="label"><div>${qrMarkup(PKBarcode.locationPayload(loc.zone,loc.slot))}</div><b>${escapeHtml(loc.zone)} / ${escapeHtml(loc.slot)}</b><small>PKLOC · ชั้น 2</small></div>`;
    }).join('');
    printLabels(`ป้ายตำแหน่งโซน ${zone}`,labels);
  });
  $('barcodePrintProduct').addEventListener('click', () => {
    const code = $('barcodePrintProductCode').value.trim();
    const product = products().find(item => String(item.code || '').trim().toUpperCase() === code.toUpperCase());
    if (!product || !code || typeof qrcode !== 'function') { printMessage('ไม่พบรหัสสินค้าแบบตรงตัว กรุณาตรวจรหัสก่อนพิมพ์',true); return; }
    printLabels(`ป้ายสินค้า ${product.code}`,`<div class="label"><div>${qrMarkup(PKBarcode.productPayload(product.code))}</div><b>${escapeHtml(product.code)}</b><small>${escapeHtml(product.name || '')}</small></div>`);
  });
})();
