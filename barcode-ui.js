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
  const number = value => Number(value || 0).toLocaleString('en-US');
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
          ? `พบสินค้า ${match.product.code} ใน ${number(positionCount)} ตำแหน่ง · เลือกตำแหน่งด้านล่างหรือสแกนป้ายตำแหน่ง`
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
  function printLabels(title,labels, mode = 'labels') {
    const page = window.open('','_blank');
    if (!page) { printMessage('เบราว์เซอร์ปิดกั้นหน้าพิมพ์ กรุณาอนุญาตป๊อปอัป',true); return; }
    page.document.write(`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:14px Arial,sans-serif}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.label{border:1px solid #333;padding:9px;text-align:center;break-inside:avoid}.label svg{width:100px;height:100px}.label b,.label small{display:block;margin:4px}
      ${mode === 'sheet' ? '@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;color:#000;background:#fff;font-size:11pt}.grid{display:block}.count-sheet h1{font-size:20pt;margin:0 0 2mm}.sheet-meta{display:flex;justify-content:space-between;gap:5mm;margin:2mm 0;flex-wrap:wrap}.count-sheet table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10pt}.count-sheet thead{display:table-header-group}.count-sheet th,.count-sheet td{border:1px solid #333;padding:2mm;vertical-align:middle;overflow-wrap:anywhere}.count-sheet th{text-align:left}.count-sheet th:not([colspan]):first-child,.count-sheet td:first-child{white-space:nowrap;overflow-wrap:normal;text-align:center;padding-inline:1mm}.count-sheet tr{break-inside:avoid}.count-sheet .sheet-position{text-align:center}.sheet-position strong{display:block;font-size:11pt}.count-sheet svg{display:block;width:18mm;height:18mm;margin:auto}.count-sheet footer{margin-top:3mm;line-height:1.6;break-inside:avoid}.sheet-help{font-size:9pt;margin:2mm 0}.count-sheet td{height:25mm}@media screen{.count-sheet{min-width:950px}}@media print{body>h2{display:none}}' : ''}

      ${mode === 'pallet' ? '@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{margin:0;color:#000;background:#fff}.grid{display:block}.label{min-height:130mm;margin:0 0 8mm;padding:5mm;text-align:left}.label header{display:flex;align-items:center;justify-content:space-between;gap:5mm}.label header strong{font-size:32pt}.label svg{width:32mm;height:32mm;flex-shrink:0}.label table{width:100%;table-layout:fixed;border-collapse:collapse;margin:4mm 0;font-size:11pt;overflow-wrap:break-word;word-break:normal}.label th,.label td{border:1px solid #333;padding:2mm;text-align:left;overflow-wrap:break-word;word-break:normal}.label thead th:nth-child(n+3){white-space:nowrap;word-break:keep-all}.label thead th:nth-child(-n+2){white-space:normal;word-break:normal}.label th:nth-child(n+3),.label td:nth-child(n+3){white-space:nowrap;overflow-wrap:normal;word-break:keep-all}.label td:last-child{min-width:26mm}.label .blank-entry-row td{height:12mm}.label footer{line-height:2.3}.label small{font-size:9pt}.label:nth-child(2n){break-after:page}.label:last-child{break-after:auto}@media print{body>h2{display:none}}' : ''}
      </style><h2>${escapeHtml(title)}</h2><div class="grid">${labels}</div></html>`);
    page.document.close(); page.focus(); page.print();
    printMessage('เปิดหน้าพิมพ์แล้ว · ตรวจตัวอย่างก่อนยืนยันพิมพ์');
  }
  const cycleZone = $('cycleLabelZone'), cycleSlots = $('cycleLabelSlots');
  const customerFile = $('cycleCustomerFile'), customerGroups = $('cycleLabelCustomerGroups');
  const customerStatus = $('cycleLabelCustomerStatus');
  let customerSkuMap = new Map(), customerProductMap = new Map(), selectedCustomers = new Set();
  let customerLoadState = 'empty';
  const normalizeSku = value => String(value ?? '').trim().toLocaleUpperCase('en-US');
  const normalizedHeader = value => String(value ?? '').trim().toLocaleLowerCase('en-US').replace(/[\s_./()-]+/g, '');
  const isSkuHeader = value => ['รหัสสินค้า','productcode','sku'].includes(normalizedHeader(value));
  const isCustomerHeader = value => ['ลูกค้า','ชื่อลูกค้า','customer','customername'].includes(normalizedHeader(value));
  const isNameHeader = value => ['ชื่อสินค้า','รายการ','productname','itemname'].includes(normalizedHeader(value));
  const isUnitHeader = value => /^(หน่วยนับ|หน่วย|unit|uom)$/.test(normalizedHeader(value));
  function updateCustomerActions() {
    const canPrint = customerLoadState === 'ready' && [...selectedCustomers].some(customer => customerSkuMap.has(customer));
    $('cycleCustomerPrintSheet').disabled = !canPrint;
    $('cycleCustomerPrintLabels').disabled = !canPrint;
  }
  function renderCustomerGroups() {
    const customers = [...customerSkuMap.keys()].sort((a,b) => a.localeCompare(b,'th'));
    customerGroups.innerHTML = customers.map(customer =>
      `<label><input type="checkbox" value="${escapeHtml(customer)}" ${selectedCustomers.has(customer)?'checked':''}><span>${escapeHtml(customer)} · ${number(customerSkuMap.get(customer).size)} รหัส</span></label>`).join('');
    $('cycleCustomerSelectAll').disabled = customers.length === 0;
    $('cycleCustomerClear').disabled = customers.length === 0;
    updateCustomerActions();
    updateCustomerStatus();
  }
  function updateCustomerStatus(message = '') {
    if (message) customerStatus.textContent = message;
    else if (customerLoadState === 'loading') customerStatus.textContent = 'กำลังอ่านไฟล์ Excel…';
    else if (customerLoadState !== 'ready') customerStatus.textContent = 'ยังไม่ได้อัปโหลด Excel · เลือกไฟล์รายชื่อลูกค้าเพื่อพิมพ์';
    else {
      const selected = [...selectedCustomers].filter(customer => customerSkuMap.has(customer));
      if (!selected.length) customerStatus.textContent = 'โหลดข้อมูลลูกค้าแล้ว · เลือกกลุ่มเพื่อพิมพ์สินค้าทุกโซน';
      else {
        const skuCount = new Set(selected.flatMap(customer => [...customerSkuMap.get(customer)])).size;
        customerStatus.textContent = `เลือก ${number(selected.length)} กลุ่ม · ${number(skuCount)} รหัสสินค้า · พร้อมพิมพ์ทุกโซนโดยไม่ต้องเลือกโซน`;
      }
    }
    customerStatus.dataset.error = customerLoadState === 'error' ? 'true' : 'false';
  }
  function parseCustomerWorkbook(workbook) {
    if (!Array.isArray(workbook?.SheetNames) || !workbook.SheetNames.length) throw new Error('ไม่พบชีตข้อมูลในไฟล์');
    const sheets = workbook.SheetNames.map(name => ({
      name,
      rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], {header:1, raw:false, defval:''})
    }));
    const summary = sheets.find(sheet => sheet.rows.some(row => {
      const headers = row.map(normalizedHeader);
      return headers.includes(normalizedHeader('ชื่อลูกค้า')) && headers.includes(normalizedHeader('ชื่อ Sheet'));
    }));
    const customerBySheet = new Map();
    if (summary) {
      const headerIndex = summary.rows.findIndex(row => {
        const headers = row.map(normalizedHeader);
        return headers.includes(normalizedHeader('ชื่อลูกค้า')) && headers.includes(normalizedHeader('ชื่อ Sheet'));
      });
      const headers = summary.rows[headerIndex].map(normalizedHeader);
      const customerIndex = headers.indexOf(normalizedHeader('ชื่อลูกค้า'));
      const sheetIndex = headers.indexOf(normalizedHeader('ชื่อ Sheet'));
      for (const row of summary.rows.slice(headerIndex + 1)) {
        const customer = String(row[customerIndex] ?? '').trim();
        const sheetName = String(row[sheetIndex] ?? '').trim();
        if (customer && sheetName) customerBySheet.set(sheetName, customer);
      }
    }
    const nextSkuMap = new Map(), nextProductMap = new Map();
    const addProduct = (customerValue, codeValue, nameValue, unitValue) => {
      const customer = String(customerValue ?? '').trim(), code = normalizeSku(codeValue);
      if (!customer || !code) return;
      if (!nextSkuMap.has(customer)) nextSkuMap.set(customer, new Set());
      nextSkuMap.get(customer).add(code);
      if (!nextProductMap.has(code)) nextProductMap.set(code, {
        name: String(nameValue ?? '').trim(), unit: String(unitValue ?? '').trim()
      });
    };
    let productRows = 0;
    for (const sheet of sheets) {
      if (sheet === summary) continue;
      const headerIndex = sheet.rows.findIndex(row => row.some(isSkuHeader));
      if (headerIndex < 0) continue;
      const headers = sheet.rows[headerIndex].map(value => String(value ?? '').trim());
      const skuIndex = headers.findIndex(isSkuHeader);
      const customerIndex = headers.findIndex(isCustomerHeader);
      const nameIndex = headers.findIndex(isNameHeader);
      const unitIndex = headers.findIndex(isUnitHeader);
      let sheetRows = 0;
      for (const row of sheet.rows.slice(headerIndex + 1)) {
        const code = row[skuIndex];
        if (!normalizeSku(code)) continue;
        if (customerIndex >= 0) addProduct(row[customerIndex], code, nameIndex >= 0 ? row[nameIndex] : '', unitIndex >= 0 ? row[unitIndex] : '');
        else addProduct(customerBySheet.get(sheet.name) || sheet.name, code, nameIndex >= 0 ? row[nameIndex] : '', unitIndex >= 0 ? row[unitIndex] : '');
        sheetRows++;
      }
      productRows += sheetRows;
    }
    if (!nextSkuMap.size || !productRows) throw new Error('ไม่พบหัวคอลัมน์ “รหัสสินค้า” และรายการสินค้าในชีต');
    return {skuMap:nextSkuMap, productMap:nextProductMap, productRows};
  }
  $('cycleCustomerImport').addEventListener('click', () => customerFile.click());
  customerFile.addEventListener('change', async () => {
    const file = customerFile.files?.[0];
    if (!file) return;
    customerLoadState = 'loading';
    customerStatus.dataset.error = 'false';
    updateCustomerActions();
    updateCustomerStatus();
    try {
      if (!window.PKDependencies?.excel) throw new Error('ตัวอ่าน Excel ยังไม่พร้อม กรุณารีเฟรชแล้วลองใหม่');
      await PKDependencies.excel();
      const workbook = XLSX.read(await file.arrayBuffer(), {type:'array'});
      const parsed = parseCustomerWorkbook(workbook);
      customerSkuMap = parsed.skuMap;
      customerProductMap = parsed.productMap;
      selectedCustomers = new Set();
      customerLoadState = 'ready';
      renderCustomerGroups();
      updateCustomerStatus(`โหลด ${number(customerSkuMap.size)} กลุ่ม · ${number(parsed.productRows)} รายการ จาก ${file.name} แล้ว · ข้อมูลอยู่ในเบราว์เซอร์นี้ ไม่ถูกอัปโหลด`);
    } catch (error) {
      customerLoadState = customerSkuMap.size ? 'ready' : 'error';
      customerStatus.textContent = `อ่านไฟล์ไม่ได้ · ${error?.message || error}`;
      customerStatus.dataset.error = 'true';
      updateCustomerActions();
    } finally {
      customerFile.value = '';
    }
  });
  customerGroups.addEventListener('change', event => {
    const input = event.target.closest('input[type="checkbox"]');
    if (!input) return;
    if (input.checked) selectedCustomers.add(input.value); else selectedCustomers.delete(input.value);
    updateCustomerActions();
    updateCustomerStatus();
  });
  $('cycleCustomerSelectAll').addEventListener('click', () => {
    selectedCustomers = new Set(customerSkuMap.keys());
    renderCustomerGroups();
  });
  $('cycleCustomerClear').addEventListener('click', () => {
    selectedCustomers.clear();
    renderCustomerGroups();
  });
  cycleZone.innerHTML = printZone.innerHTML;
  function updateCycleSelection() {
    const count = cycleSlots.querySelectorAll('input:checked').length;
    $('cycleLabelSelection').textContent = `เลือก ${count} พาเลท`;
    $('cycleLabelPrint').disabled = count === 0;
    $('cyclePalletLabelPrint').disabled = count === 0;
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
  function printCycleCount(mode) {
    if (!palletDataReady || !$('syncStatusBar')?.classList.contains('sync-connected')) {
      printMessage('ข้อมูลพาเลทยังไม่เชื่อมต่อ กรุณารอหรือรีเฟรชก่อนพิมพ์', true); return;
    }
    if (typeof qrcode !== 'function') { printMessage('ยังสร้าง QR ไม่ได้ กรุณารีเฟรชแล้วลองใหม่', true); return; }
    const zone = cycleZone.value;
    const selected = new Set([...cycleSlots.querySelectorAll('input:checked')].map(input => input.value));
    let slots = (ZONE_SLOTS[zone] || []).filter(slot => selected.has(slot.code));
    if (!slots.length) { printMessage('กรุณาเลือกพาเลทก่อนพิมพ์', true); return; }
    const snapshot = CycleCountCore.snapshotZone(zone, slots, SLOT_ITEMS[zone], PALLET_STATUS[zone], getRemainingQty);
    const activeCustomers = [...selectedCustomers].filter(customer => customerSkuMap.has(customer));
    const customerSkus = new Set(activeCustomers.flatMap(customer => [...customerSkuMap.get(customer)]));
    if (activeCustomers.length) {
      const matchingSlots = new Set(snapshot.rows.filter(row => customerSkus.has(normalizeSku(row.code))).map(row => row.slot));
      slots = slots.filter(slot => matchingSlots.has(slot.code));
      if (!slots.length) { printMessage('ไม่พบสินค้าในกลุ่มลูกค้าที่เลือกในพาเลทของโซนนี้', true); return; }
    }
    const customerPrintLabel = activeCustomers.length <= 3 ? activeCustomers.join(', ') : `${number(activeCustomers.length)} กลุ่ม`;
    const customerPrintNote = activeCustomers.length ? ` · ${customerPrintLabel}` : '';
    if (mode === 'pallet') {
      const blankEntryRow = '<tr class="blank-entry-row"><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>';
      const labels = slots.map(slot => {
        const rows = snapshot.rows.filter(row => row.slot === slot.code && (!activeCustomers.length || customerSkus.has(normalizeSku(row.code))));
        return `<article class="label"><header><div><b>PK WMS · CYCLE COUNT</b><strong>${escapeHtml(slot.code)}</strong><p>โซน ${escapeHtml(zone)}</p></div>${qrMarkup(PKBarcode.locationPayload(zone,slot.code),12)}</header>
          <small>QR ตำแหน่ง · สแกนผ่านเมนูผังคลัง${activeCustomers.length?` · คัดจาก ${number(activeCustomers.length)} กลุ่มลูกค้า`:''}</small><table><colgroup><col style="width:22%"><col style="width:34%"><col style="width:16%"><col style="width:14%"><col style="width:14%"></colgroup><thead><tr><th>Code</th><th>Name</th><th>Lot</th><th>หน่วย</th><th>นับจริง</th></tr></thead><tbody>${rows.length ? rows.map(row=>`<tr><td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.lot||'—')}</td><td>${escapeHtml(row.unit)}</td><td></td></tr>`).join('') : '<tr><td colspan="4">ไม่มีรายการสินค้าในระบบ · ตรวจพื้นที่จริง</td><td></td></tr>'}${blankEntryRow}</tbody></table>
          <footer>วันที่ตรวจนับ __________________ เวลา __________<br>ผู้ตรวจนับ __________________ ผู้ตรวจสอบ __________________</footer><small>จดผลก่อนบันทึกใน Cycle Counts · พิมพ์ ${escapeHtml(WmsDates.dateTime(new Date()))}</small></article>`;
      }).join('');
      printLabels(`Label Cycle Count · โซน ${zone} · ${number(slots.length)} พาเลท${customerPrintNote}`,labels,'pallet');
      return;
    }
    let lineNumber = 0;
    const rows = slots.flatMap(slot => {
      const items = snapshot.rows.filter(row => row.slot === slot.code && (!activeCustomers.length || customerSkus.has(normalizeSku(row.code))));
      return (items.length ? items : [{ code: '', name: 'ไม่มีรายการสินค้าในระบบ · ตรวจพื้นที่จริง', lot: '', unit: '' }]).map(row =>
        `<tr><td>${++lineNumber}</td><td class="sheet-position"><strong>${escapeHtml(slot.code)}</strong>${qrMarkup(PKBarcode.locationPayload(zone, slot.code), 12)}</td><td><strong>${escapeHtml(row.code)}</strong><br>${escapeHtml(row.name)}</td><td>${escapeHtml(row.lot || '—')}</td><td>${escapeHtml(row.unit)}</td><td></td><td></td></tr>`);
    }).join('');
    const sheet = `<article class="count-sheet"><h1>COUNT SHEET · ใบตรวจนับสินค้า</h1>
      <div class="sheet-meta"><strong>PK WMS · โซน ${escapeHtml(zone)} · ${number(slots.length)} ตำแหน่ง · ${number(lineNumber)} รายการ${activeCustomers.length?` · กลุ่มลูกค้า ${escapeHtml(customerPrintLabel)}`:''}</strong><span>เลขที่ใบตรวจนับ ____________________</span></div>
      <div class="sheet-meta"><span>วันที่ตรวจนับ __________________ เวลาเริ่ม __________ เวลาสิ้นสุด __________</span><span>ผู้ตรวจนับ ____________________</span></div>
      <p class="sheet-help">กรอกจำนวนที่นับจริงทุกแถว · พบว่าไม่มีสินค้าให้กรอก 0 · พบสินค้าอื่นให้ระบุในหมายเหตุ · QR สแกนเปิดตำแหน่งผ่านเมนูผังคลัง</p>
      <table><colgroup><col style="width:5%"><col style="width:12%"><col style="width:31%"><col style="width:12%"><col style="width:8%"><col style="width:13%"><col style="width:19%"></colgroup><thead><tr><th colspan="7">COUNT SHEET · โซน ${escapeHtml(zone)} · วันที่ตรวจนับ ______________ · เลขที่ใบตรวจนับ ______________</th></tr><tr><th>ลำดับ</th><th>ตำแหน่ง / QR</th><th>รหัส / ชื่อสินค้า</th><th>Lot</th><th>หน่วย</th><th>จำนวนที่นับจริง</th><th>หมายเหตุ</th></tr></thead><tbody>${rows}</tbody></table>
      <footer>ผู้ตรวจนับ ____________________ ผู้ตรวจสอบ ____________________ วันที่ ____________________<br><small>จดผลก่อนบันทึกในเมนู Cycle Counts · ไม่แสดงยอดในระบบ · พิมพ์ ${escapeHtml(WmsDates.dateTime(new Date()))}</small></footer></article>`;
    printLabels(`Count Sheet · โซน ${zone} · ${number(slots.length)} ตำแหน่ง${customerPrintNote}`, sheet, 'sheet');
  }
  $('cycleLabelPrint').addEventListener('click', () => printCycleCount('sheet'));
  $('cyclePalletLabelPrint').addEventListener('click', () => printCycleCount('pallet'));
  function customerRecordsAcrossZones(activeCustomers) {
    const customerSkus = new Set(activeCustomers.flatMap(customer => [...customerSkuMap.get(customer)]));
    const records = [];
    const locatedSkus = new Set();
    for (const [zone, slots] of Object.entries(ZONE_SLOTS)) {
      const snapshot = CycleCountCore.snapshotZone(zone, slots, SLOT_ITEMS[zone], PALLET_STATUS[zone], getRemainingQty);
      for (const row of snapshot.rows) {
        const code = normalizeSku(row.code);
        if (row.type === 'item' && customerSkus.has(code)) {
          records.push({zone,row});
          locatedSkus.add(code);
        }
      }
    }
    for (const code of customerSkus) {
      if (locatedSkus.has(code)) continue;
      const product = customerProductMap.get(code) || {};
      records.push({zone:'',row:{code,name:product.name || '',lot:'',unit:product.unit || '',slot:'',noLocation:true}});
    }
    return records;
  }
  function printCustomerCycleCount(mode) {
    if (!palletDataReady || !$('syncStatusBar')?.classList.contains('sync-connected')) {
      printMessage('ข้อมูลพาเลทยังไม่เชื่อมต่อ กรุณารอหรือรีเฟรชก่อนพิมพ์', true); return;
    }
    if (typeof qrcode !== 'function') { printMessage('ยังสร้าง QR ไม่ได้ กรุณารีเฟรชแล้วลองใหม่', true); return; }
    const activeCustomers = [...selectedCustomers].filter(customer => customerSkuMap.has(customer));
    if (!activeCustomers.length) { printMessage('กรุณาเลือกกลุ่มลูกค้าก่อนพิมพ์', true); return; }
    const records = customerRecordsAcrossZones(activeCustomers);
    if (!records.length) { printMessage('ไม่พบสินค้าในกลุ่มลูกค้าที่เลือกในทุกโซน', true); return; }
    const customerPrintLabel = activeCustomers.length <= 3 ? activeCustomers.join(', ') : `${number(activeCustomers.length)} กลุ่ม`;
    if (mode === 'pallet') {
      const blankEntryRow = '<tr class="blank-entry-row"><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>';
      const pallets = new Map();
      for (const entry of records) {
        const key = entry.row.noLocation ? `NO_LOCATION\u0000${normalizeSku(entry.row.code)}` : `${entry.zone}\u0000${entry.row.slot}`;
        if (!pallets.has(key)) pallets.set(key,{zone:entry.zone,slot:entry.row.slot,rows:[],noLocation:Boolean(entry.row.noLocation)});
        pallets.get(key).rows.push(entry.row);
      }
      const labels = [...pallets.values()].map(({zone,slot,rows,noLocation}) =>
        `<article class="label"><header><div><b>PK WMS · CYCLE COUNT</b><strong>${noLocation?'&nbsp;':escapeHtml(slot)}</strong><p>${noLocation?'โลเคชั่น: ____________________':`โซน ${escapeHtml(zone)}`}</p></div>${noLocation?'':qrMarkup(PKBarcode.locationPayload(zone,slot),12)}</header>
          <small>${noLocation?'เขียนตำแหน่งและตรวจนับ':'QR ตำแหน่ง'} · กลุ่มลูกค้า ${escapeHtml(customerPrintLabel)}</small><table><colgroup><col style="width:22%"><col style="width:34%"><col style="width:16%"><col style="width:14%"><col style="width:14%"></colgroup><thead><tr><th>Code</th><th>Name</th><th>Lot</th><th>หน่วย</th><th>นับจริง</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.lot||'—')}</td><td>${escapeHtml(row.unit)}</td><td></td></tr>`).join('')}${blankEntryRow}</tbody></table>
          <footer>วันที่ตรวจนับ __________________ เวลา __________<br>ผู้ตรวจนับ __________________ ผู้ตรวจสอบ __________________</footer><small>จดผลก่อนบันทึกใน Cycle Counts · พิมพ์ ${escapeHtml(WmsDates.dateTime(new Date()))}</small></article>`).join('');
      printLabels(`Label Cycle Count · กลุ่มลูกค้า ${customerPrintLabel} · ทุกโซน · ${number(pallets.size)} พาเลท`,labels,'pallet');
      return;
    }
    const zones = new Set(records.map(entry => entry.zone).filter(Boolean));
    const rows = records.map(({zone,row},index) =>
      `<tr><td>${index+1}</td><td class="sheet-position">${row.noLocation?'<div class="manual-location-blank" style="height:28px;border-bottom:1px solid #555" aria-label="เว้นว่างสำหรับเขียนโลเคชั่น"></div>':`<small>${escapeHtml(zone)}</small><strong>${escapeHtml(row.slot)}</strong>${qrMarkup(PKBarcode.locationPayload(zone,row.slot),12)}`}</td><td><strong>${escapeHtml(row.code)}</strong><br>${escapeHtml(row.name)}</td><td>${escapeHtml(row.lot||'—')}</td><td>${escapeHtml(row.unit)}</td><td></td><td></td></tr>`).join('');
    const sheet = `<article class="count-sheet"><h1>COUNT SHEET · ใบตรวจนับสินค้า</h1>
      <div class="sheet-meta"><strong>PK WMS · ทุกโซน · ${number(zones.size)} โซน · ${number(records.length)} รายการ · กลุ่มลูกค้า ${escapeHtml(customerPrintLabel)}</strong><span>เลขที่ใบตรวจนับ ____________________</span></div>
      <div class="sheet-meta"><span>วันที่ตรวจนับ __________________ เวลาเริ่ม __________ เวลาสิ้นสุด __________</span><span>ผู้ตรวจนับ ____________________</span></div>
      <p class="sheet-help">กรอกจำนวนที่นับจริงทุกแถว · สินค้าที่ไม่พบในโลเคชั่นจะเว้นช่องตำแหน่งไว้ให้เขียนมือ · พบสินค้าอื่นให้ระบุในหมายเหตุ · QR สแกนเปิดตำแหน่งผ่านเมนูผังคลัง</p>
      <table><colgroup><col style="width:5%"><col style="width:12%"><col style="width:31%"><col style="width:12%"><col style="width:8%"><col style="width:13%"><col style="width:19%"></colgroup><thead><tr><th colspan="7">COUNT SHEET · ทุกโซน · กลุ่มลูกค้า ${escapeHtml(customerPrintLabel)} · วันที่ตรวจนับ ______________ · เลขที่ใบตรวจนับ ______________</th></tr><tr><th>ลำดับ</th><th>ตำแหน่ง / QR / เขียนมือ</th><th>รหัส / ชื่อสินค้า</th><th>Lot</th><th>หน่วย</th><th>จำนวนที่นับจริง</th><th>หมายเหตุ</th></tr></thead><tbody>${rows}</tbody></table>
      <footer>ผู้ตรวจนับ ____________________ ผู้ตรวจสอบ ____________________ วันที่ ____________________<br><small>จดผลก่อนบันทึกในเมนู Cycle Counts · ไม่แสดงยอดในระบบ · พิมพ์ ${escapeHtml(WmsDates.dateTime(new Date()))}</small></footer></article>`;
    printLabels(`Count Sheet · กลุ่มลูกค้า ${customerPrintLabel} · ทุกโซน · ${number(records.length)} รายการ`,sheet,'sheet');
  }
  $('cycleCustomerPrintSheet').addEventListener('click', () => printCustomerCycleCount('sheet'));
  $('cycleCustomerPrintLabels').addEventListener('click', () => printCustomerCycleCount('pallet'));
  const retroZone = $('retroLabelZone'), retroList = $('retroLabelItems');
  retroZone.innerHTML = printZone.innerHTML;
  let retroSnapshot = [];
  function retroItems() {
    return (ZONE_SLOTS[retroZone.value] || []).flatMap(slot => (SLOT_ITEMS[retroZone.value]?.[slot.code] || []).flatMap((item,index) => {
      const raw = getRemainingQty(item), qty = Number(raw);
      if (raw == null || raw === '' || !Number.isFinite(qty) || qty <= 0) return [];
      return [{ key: `${slot.code}:${index}`, retrospective: true, zone: retroZone.value, slot_code: slot.code,
        receiving_no: item.receiveReference || '—', supplier_name: item.supplierName || '—',
        product_code: item.code || '—', product_name: item.name || '—', lot_no: item.lotNo || '—',
        quantity: qty, unit: item.unit || '—', received_on: item.receiveDate || '—',
        manufactured_on: item.manufacturedOn || '', expires_on: item.expiresOn || '', batch_index: 1, batch_total: 1 }];
    }));
  }
  function updateRetroSelection() { $('retroLabelPrint').disabled = !retroList.querySelector('input:checked'); }
  function renderRetroItems() {
    retroSnapshot = retroItems();
    retroList.innerHTML = retroSnapshot.length ? retroSnapshot.map(item => `<label><input type="checkbox" value="${escapeHtml(item.key)}"><span><strong>${escapeHtml(item.slot_code)} · ${escapeHtml(item.product_code)}</strong> · ${escapeHtml(item.product_name)} · Lot ${escapeHtml(item.lot_no)} · คงเหลือ ${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</span></label>`).join('') : 'ไม่มีสินค้าที่ทราบยอดคงเหลือมากกว่า 0 ในโซนนี้';
    updateRetroSelection();
  }
  retroZone.addEventListener('change', renderRetroItems);
  $('retroLabelRefresh').addEventListener('click', renderRetroItems);
  retroList.addEventListener('change', updateRetroSelection);
  for (const [id, checked] of [['retroLabelSelectAll',true],['retroLabelClear',false]]) $(id).addEventListener('click',()=>{
    retroList.querySelectorAll('input').forEach(input=>{input.checked=checked;}); updateRetroSelection();
  });
  $('tab-print-labels').addEventListener('click', renderRetroItems);
  $('retroLabelPrint').addEventListener('click',()=>{
    if (!palletDataReady || !$('syncStatusBar')?.classList.contains('sync-connected')) { printMessage('กรุณารอเชื่อมต่อข้อมูลพาเลทก่อนพิมพ์',true); return; }
    const current = retroItems();
    if (JSON.stringify(current) !== JSON.stringify(retroSnapshot)) { renderRetroItems(); printMessage('ข้อมูลคงเหลือเปลี่ยนแล้ว กรุณาตรวจรายการและเลือกใหม่ก่อนพิมพ์',true); return; }
    const keys = new Set([...retroList.querySelectorAll('input:checked')].map(input=>input.value));
    const tags = current.filter(item=>keys.has(item.key));
    if (!tags.length) { printMessage('กรุณาเลือกสินค้าที่มียอดคงเหลือก่อนพิมพ์',true); return; }
    if (typeof window.PKIncomingPrint !== 'function') { printMessage('โหลดรูปแบบป้ายไม่สำเร็จ กรุณารีเฟรช',true); return; }
    const page = window.open('','_blank');
    if (!page) { printMessage('เบราว์เซอร์ปิดกั้นหน้าพิมพ์ กรุณาอนุญาตป๊อปอัป',true); return; }
    if (window.PKIncomingPrint(tags,page,printMessage)) printMessage(`เปิดหน้าพิมพ์ ${number(tags.length)} รายการแล้ว · ไม่ได้เพิ่มหรือแก้ไขสินค้า`);
  });
  window.addEventListener('wms:account-changed',()=>{ retroSnapshot=[];retroList.replaceChildren();updateRetroSelection(); });
  renderRetroItems();
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
    printLabels(`ป้ายสินค้า ${product.code}`,`<div class="label"><div>${qrMarkup(PKBarcode.productPayload(product.code))}</div><b>${escapeHtml(product.code)}</b><small>Product Name: ${escapeHtml(product.name || '—')}</small></div>`);
  });
})();
