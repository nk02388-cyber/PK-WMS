(() => {
  'use strict';
  const $=id=>document.getElementById(id), tools=$('palletBulkTools'), toggle=$('palletBulkToggle'), all=$('palletBulkAll'), remove=$('palletBulkRemove'), cancel=$('palletBulkCancel'), status=$('palletBulkStatus');
  const selected=new Map();
  let active=false, busy=false, generation=0;
  const allowed=()=>window.getWmsCanAccess?.('floorplan')===true;
  const hasData=slot=>isOccupied(currentZoomZone,slot)||slotItemsFor(currentZoomZone,slot).length>0;
  function render() {
    tools.hidden=!allowed();toggle.setAttribute('aria-pressed',String(active));
    for(const button of [all,remove,cancel])button.hidden=!active;
    toggle.disabled=busy||palletWriteBusy||!palletDataReady;
    all.disabled=busy;cancel.disabled=busy;remove.disabled=busy||palletWriteBusy||!selected.size;
    zoomSlotsLayer.querySelectorAll('.zoom-slot').forEach(el=>{
      const picked=selected.has(el.dataset.slot);
      el.classList.toggle('bulk-selected',active&&picked);
      if(active){el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-pressed',String(picked));el.setAttribute('aria-label',`${el.dataset.slot}${hasData(el.dataset.slot)?' เลือกเพื่อลบข้อมูล':' ตำแหน่งว่าง'}`);}
      else {for(const attr of ['role','tabindex','aria-pressed','aria-label'])el.removeAttribute(attr);}
    });
  }
  function describe() {
    status.textContent=active?`เลือก ${selected.size} พาเลท${selected.size?' · '+[...selected.keys()].join(', '):' · แตะพาเลทบนผังเพื่อเลือก'} · ลบข้อมูลสินค้าทั้งหมดในพาเลท ตำแหน่งและประวัติยังคงอยู่`:'';
    render();
  }
  function reset(){++generation;active=false;selected.clear();describe();}
  function tap(slot) {
    if(!active)return false;
    if(busy||palletWriteBusy||!allowed())return true;
    if(!hasData(slot)){status.textContent=`${slot} เป็นตำแหน่งว่าง`;return true;}
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
    for(const slot of ZONE_SLOTS[currentZoomZone]||[])if(hasData(slot.code)&&!selected.has(slot.code))selected.set(slot.code,palletVersions.get(JSON.stringify([currentZoomZone,slot.code]))||0);
    describe();
  });
  zoomSlotsLayer.addEventListener('keydown',event=>{
    if(!active||!['Enter',' '].includes(event.key))return;
    const slot=event.target.closest('.zoom-slot');if(!slot)return;
    event.preventDefault();event.stopPropagation();tap(slot.dataset.slot);
  });
  remove.addEventListener('click',async()=>{
    if(!active||busy||palletWriteBusy||!palletDataReady||!allowed()||!selected.size)return;
    const zone=currentZoomZone,actor=window.getWmsUsername?.(),request=generation,entries=[...selected];
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
