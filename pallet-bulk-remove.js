(() => {
  'use strict';
  const $=id=>document.getElementById(id), tools=$('palletBulkTools'), toggle=$('palletBulkToggle'), all=$('palletBulkAll'), remove=$('palletBulkRemove'), cancel=$('palletBulkCancel'), status=$('palletBulkStatus');
  const selected=new Map();
  const move=$('palletBulkMove'),form=$('palletBulkMoveForm'),zoneInput=$('palletBulkMoveZone'),pairsList=$('palletBulkMovePairs');
  let destinationVersions=new Map();
  let active=false, busy=false, generation=0;
  const allowed=()=>window.getWmsCanAccess?.('floorplan')===true;
  const hasData=slot=>isOccupied(currentZoomZone,slot)||slotItemsFor(currentZoomZone,slot).length>0;
  function render() {
    tools.hidden=!allowed();toggle.setAttribute('aria-pressed',String(active));
    for(const button of [all,remove,move,cancel])button.hidden=!active;
    toggle.disabled=busy||palletWriteBusy||!palletDataReady;
    all.disabled=busy;cancel.disabled=busy;remove.disabled=busy||palletWriteBusy||!selected.size;
    move.disabled=remove.disabled;
    zoomSlotsLayer.querySelectorAll('.zoom-slot').forEach(el=>{
      const picked=selected.has(el.dataset.slot);
      el.classList.toggle('bulk-selected',active&&picked);
      if(active){el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-pressed',String(picked));el.setAttribute('aria-label',`${el.dataset.slot}${hasData(el.dataset.slot)?' เลือกพาเลท':' ตำแหน่งว่าง'}`);}
      else {for(const attr of ['role','tabindex','aria-pressed','aria-label'])el.removeAttribute(attr);}
    });
  }
  function describe() {
    status.textContent=active?`เลือก ${selected.size} พาเลท${selected.size?' · '+[...selected.keys()].join(', '):' · แตะพาเลทบนผังเพื่อเลือก'} · เลือกคำสั่งย้ายทั้งพาเลท หรือลบข้อมูลสินค้าให้ตำแหน่งว่าง`:'';
    render();
  }
  function closeMove(){form.hidden=true;destinationVersions.clear();}
  function reset(){++generation;active=false;selected.clear();closeMove();describe();}
  function tap(slot) {
    if(!active)return false;
    if(busy||palletWriteBusy||!allowed())return true;
    if(!hasData(slot)){status.textContent=`${slot} เป็นตำแหน่งว่าง`;return true;}
    closeMove();
    if(selected.has(slot))selected.delete(slot);
    else selected.set(slot,palletVersions.get(JSON.stringify([currentZoomZone,slot]))||0);
    describe();return true;
  }
  toggle.addEventListener('click',()=>{
    if(busy||palletWriteBusy||!palletDataReady||!allowed())return;
    if(active){reset();return;}
    closeSlotEdit();active=true;describe();
  });
  cancel.addEventListener('click',reset);
  all.addEventListener('click',()=>{
    if(busy||palletWriteBusy||!allowed())return;
    closeMove();
    for(const slot of ZONE_SLOTS[currentZoomZone]||[])if(hasData(slot.code)&&!selected.has(slot.code))selected.set(slot.code,palletVersions.get(JSON.stringify([currentZoomZone,slot.code]))||0);
    describe();
  });
  function populateDestinations() {
    destinationVersions=new Map();
    const zone=zoneInput.value;
    const slots=(ZONE_SLOTS[zone]||[]).filter(s=>!(zone===currentZoomZone&&selected.has(s.code))&&!isOccupied(zone,s.code)&&!slotItemsFor(zone,s.code).length);
    for(const slot of slots)destinationVersions.set(JSON.stringify([zone,slot.code]),palletVersions.get(JSON.stringify([zone,slot.code]))||0);
    pairsList.replaceChildren(...[...selected.keys()].map(slot=>{
      const label=document.createElement('label');label.textContent=`${currentZoomZone}/${slot} → `;
      const select=document.createElement('select');select.dataset.source=slot;select.required=true;select.setAttribute('aria-label',`ปลายทางของ ${slot}`);
      const empty=document.createElement('option');empty.value='';empty.textContent=slots.length?'เลือกตำแหน่งว่าง':'ไม่มีตำแหน่งว่างในโซนนี้';select.append(empty);
      for(const s of slots){const option=document.createElement('option');option.value=s.code;option.textContent=s.code;select.append(option);}
      label.append(select);return label;
    }));
  }
  move.addEventListener('click',()=>{
    if(busy||palletWriteBusy||!allowed()||!selected.size)return;
    describe();
    form.reset();form.hidden=false;
    zoneInput.replaceChildren(...Object.keys(ZONE_SLOTS).filter(z=>ZONE_SLOTS[z].length).map(z=>{const option=document.createElement('option');option.value=z;option.textContent=`โซน ${z}`;return option;}));
    zoneInput.value=currentZoomZone;
    $('palletBulkMoveDate').value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    populateDestinations();zoneInput.focus();
  });
  zoneInput.addEventListener('change',populateDestinations);
  $('palletBulkMoveBack').addEventListener('click',()=>{closeMove();describe();});
  function moveRows() {
    const zone=currentZoomZone,destinationZone=zoneInput.value;
    const pairs=[...pairsList.querySelectorAll('select')].map(select=>{
      const slot=select.dataset.source,destination=select.value,key=JSON.stringify([destinationZone,destination]);
      if(!selected.has(slot)||!(ZONE_SLOTS[zone]||[]).some(s=>s.code===slot)||!(ZONE_SLOTS[destinationZone]||[]).some(s=>s.code===destination))throw new Error('กรุณาเลือกตำแหน่งปลายทางให้ครบ');
      const sourceVersion=selected.get(slot),destinationVersion=destinationVersions.get(key);
      if((palletVersions.get(JSON.stringify([zone,slot]))||0)!==sourceVersion||destinationVersion===undefined||(palletVersions.get(key)||0)!==destinationVersion)throw new Error('พาเลทต้นทางหรือปลายทางมีข้อมูลใหม่ กรุณาเปิดคำสั่งย้ายใหม่');
      return {source:buildSlotRow(zone,slot),destination:buildSlotRow(destinationZone,destination),sourceVersion,destinationVersion};
    });
    if(pairs.length!==selected.size)throw new Error('รายการที่เลือกเปลี่ยน กรุณาเปิดคำสั่งย้ายใหม่');
    return buildBulkSlotMovePlan(pairs,$('palletBulkMoveDate').value,window.getWmsUsername?.(),$('palletBulkMoveReference').value.trim());
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||palletWriteBusy||!active||!allowed()||!palletDataReady)return;
    const actor=window.getWmsUsername?.(),request=generation,sourceZone=currentZoomZone;
    let ownsWrite=false;
    try {
      moveRows();
      const mapping=[...pairsList.querySelectorAll('select')].map(s=>`${s.dataset.source} → ${zoneInput.value}/${s.value}`).join(', ');
      busy=true;zoomModal.inert=true;render();
      const approval=await window.PKActionConfirmation?.request('ย้ายหลายพาเลท',`${mapping} · เอกสาร ${$('palletBulkMoveReference').value.trim()}`);
      if(!approval)return;
      if(request!==generation||actor!==window.getWmsUsername?.()||!allowed()||!palletDataReady||palletWriteBusy)throw new Error('บัญชีหรือข้อมูลเปลี่ยน กรุณาเลือกพาเลทใหม่');
      const rows=moveRows(),count=selected.size;
      palletWriteBusy=true;ownsWrite=true;
      await savePalletBatch(rows,[],{action:'transfer',document_no:`ย้ายหลายพาเลท · ยืนยัน ${approval.id}`});
      reset();refreshAfterRemoteChange(null,null);status.textContent=`ย้าย ${count} พาเลทจากโซน ${sourceZone} แล้ว · ต้นทางว่างพร้อมใช้งาน`;
      setSyncStatus('connected','บันทึกการย้ายหลายพาเลทแล้ว');
    }catch(error){status.textContent=error.message;setSyncStatus('error',error.message);}
    finally{if(ownsWrite)palletWriteBusy=false;busy=false;zoomModal.inert=false;render();}
  });
  zoomSlotsLayer.addEventListener('keydown',event=>{
    if(!active||!['Enter',' '].includes(event.key))return;
    const slot=event.target.closest('.zoom-slot');if(!slot)return;
    event.preventDefault();event.stopPropagation();tap(slot.dataset.slot);
  });
  remove.addEventListener('click',async()=>{
    if(!active||busy||palletWriteBusy||!palletDataReady||!allowed()||!selected.size)return;
    const zone=currentZoomZone,actor=window.getWmsUsername?.(),request=generation,entries=[...selected];
    closeMove();
    let ownsWrite=false;
    busy=true;zoomModal.inert=true;render();
    try {
      const approval=await window.PKActionConfirmation?.request('ลบข้อมูลพาเลทที่เลือกทั้งหมด',`${zone} · ${entries.map(([slot])=>slot).join(', ')} · ล้างรายการสินค้าให้เป็นตำแหน่งว่าง`);
      if(!approval)return;
      if(request!==generation||actor!==window.getWmsUsername?.()||!allowed()||!palletDataReady||palletWriteBusy)throw new Error('บัญชีหรือข้อมูลเปลี่ยน กรุณาเลือกพาเลทใหม่');
      const rows=entries.map(([slot,version])=>{
        if(!(ZONE_SLOTS[zone]||[]).some(s=>s.code===slot)||(palletVersions.get(JSON.stringify([zone,slot]))||0)!==version)throw new Error('พาเลทที่เลือกมีข้อมูลใหม่ กรุณายกเลิกเลือกและเลือกใหม่');
        return {zone,slot_code:slot,occupied:false,items:[],expected_version:version};
      });
      palletWriteBusy=true;ownsWrite=true;
      await savePalletBatch(rows,[],{action:'remove',document_no:`ลบหลายพาเลท · ยืนยัน ${approval.id}`});
      reset();refreshAfterRemoteChange(zone,null);status.textContent=`ลบข้อมูล ${rows.length} พาเลทแล้ว · ตำแหน่งว่างพร้อมใช้งาน`;
      setSyncStatus('connected','บันทึกการลบหลายพาเลทแล้ว');
    } catch(error) {status.textContent=error.message;setSyncStatus('error',error.message);}
    finally {if(ownsWrite)palletWriteBusy=false;busy=false;zoomModal.inert=false;render();}
  });
  window.PKBulkRemove={tap,render,reset};
  window.addEventListener('wms:account-changed',reset);
  render();
})();
