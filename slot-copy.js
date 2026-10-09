(() => {
 'use strict';
 const $=id=>document.getElementById(id),form=$('fseCopyForm'),toggle=$('fseCopyToggle'),status=$('fseCopyStatus'),save=$('fseCopySave'),destList=$('fseCopyDestinations'),itemList=$('fseCopyItems');
 let source=null,versions=new Map();
 function close(){form.hidden=true;toggle.setAttribute('aria-expanded','false');source=null;status.textContent='';}
 window.PKSlotCopy={close};
 function plan(){
  if(!source||!editingSlot||editingSlot.zone!==source.zone||editingSlot.slot!==source.slot_code||editingSlot.version!==source.version)throw new Error('ต้นทางมีข้อมูลใหม่ กรุณาปิดแล้วเปิดคัดลอกอีกครั้ง');
  if((palletVersions.get(JSON.stringify([source.zone,source.slot_code]))||0)!==source.version)throw new Error('ต้นทางมีข้อมูลใหม่ กรุณาปิดแล้วเปิดคัดลอกอีกครั้ง');
  if(!palletDataReady)throw new Error('กรุณารอโหลดข้อมูลพาเลตให้ครบ');
  const destinations=[...destList.querySelectorAll('input:checked')].map(check=>{
   const zone=$('fseCopyZone').value,slot=check.value,key=JSON.stringify([zone,slot]),expected=versions.get(key);
   if((palletVersions.get(key)||0)!==expected)throw new Error('ปลายทางมีข้อมูลใหม่ กรุณาปิดแล้วเปิดคัดลอกอีกครั้ง');
   if(!(ZONE_SLOTS[zone]||[]).some(s=>s.code===slot))throw new Error('ไม่พบตำแหน่งปลายทาง');
   return {...buildSlotRow(zone,slot),expected_version:expected};
  });
  const selections=[...itemList.querySelectorAll('.slot-copy-check:checked')].map(check=>({index:Number(check.dataset.index),qty:itemList.querySelector(`input[data-qty="${check.dataset.index}"]`).value}));
  return window.PKSlotCopyCore.build(source,destinations,selections,$('fseCopyDate').value,$('fseCopyReference').value,window.getWmsUsername?.());
 }
 function update(){if(form.hidden)return;try{const rows=plan();save.disabled=palletWriteBusy;status.className='';const same=rows.some(row=>row.zone===source.zone&&row.slot_code===source.slot_code);status.textContent=`เพิ่มรายการรับเข้าใหม่ใน ${rows.length} พาเลต · จำนวนที่กรอกใช้ต่อพาเลต · ${same?'รวมพาเลทต้นทาง โดยเก็บรายการต้นฉบับไว้':'ต้นทางคงเดิม'}`;}catch(error){save.disabled=true;status.className='error';status.textContent=error.message;}}
 function populate(){
  if(!source||form.hidden)return;
  if(!source||form.hidden)return;
  const zone=$('fseCopyZone').value;versions=new Map();
  destList.innerHTML=(ZONE_SLOTS[zone]||[]).map(s=>{const key=JSON.stringify([zone,s.code]);versions.set(key,palletVersions.get(key)||0);const count=slotItemsFor(zone,s.code).length;return `<label><input type="checkbox" value="${escapeHtml(s.code)}"><span>${escapeHtml(s.code)}${zone===source.zone&&s.code===source.slot_code?' · ต้นทาง (เพิ่มรายการใหม่)':count?` · มี ${count} รายการ`:''}</span></label>`;}).join('');update();
 }
 toggle.addEventListener('click',()=>{
  if(!form.hidden){close();return;}
  if(!editingSlot||!palletDataReady||palletWriteBusy){showFseFeedback('กรุณารอโหลดข้อมูลก่อนคัดลอก','error');return;}
  source=JSON.parse(JSON.stringify({...buildSlotRow(editingSlot.zone,editingSlot.slot),version:editingSlot.version}));
  if(!source.items.length){source=null;showFseFeedback('พาเลตนี้ไม่มีรายการให้คัดลอก','error');return;}
  closeSlotMoveForm();form.reset();form.hidden=false;toggle.setAttribute('aria-expanded','true');
  $('fseCopySource').textContent=`คัดลอกจาก ${source.zone}/${source.slot_code}`;
  $('fseCopyZone').innerHTML=Object.keys(ZONE_SLOTS).filter(z=>ZONE_SLOTS[z].length).map(z=>`<option value="${escapeHtml(z)}">โซน ${escapeHtml(z)}</option>`).join('');$('fseCopyZone').value=source.zone;
  const date=movementDateKey(source.items[0].receiveDate),now=new Date();$('fseCopyDate').value=date?`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  $('fseCopyReference').value=source.items[0].receiveReference||'';
  itemList.innerHTML=source.items.map((item,i)=>{const qty=movementNumber(getRemainingQty(item));return `<div class="slot-copy-item"><label><input type="checkbox" class="slot-copy-check" data-index="${i}" checked><span><strong>${escapeHtml(item.code||'')}</strong> ${escapeHtml(item.name||'')}<small>Lot ${escapeHtml(item.lotNo||'—')} · ${escapeHtml(item.unit||'')}</small></span></label><input type="number" data-qty="${i}" min="0.000000001" step="any" value="${qty>0?qty:''}" aria-label="จำนวนรับต่อพาเลต ${escapeHtml(item.code||'')}" placeholder="จำนวนต่อพาเลต"></div>`;}).join('');
  populate();form.tabIndex=-1;form.focus({preventScroll:true});requestAnimationFrame(()=>{if(form.hidden||slotEditPanel.hidden)return;const head=slotEditPanel.querySelector('.fse-head').getBoundingClientRect().height;slotEditPanel.scrollTo({top:Math.max(0,slotEditPanel.scrollTop+form.getBoundingClientRect().top-slotEditPanel.getBoundingClientRect().top-head-12),behavior:'auto'});});
 });
 $('fseCopyZone').addEventListener('change',populate);form.addEventListener('input',update);form.addEventListener('change',event=>{if(event.target.matches('.slot-copy-check'))itemList.querySelector(`input[data-qty="${event.target.dataset.index}"]`).disabled=!event.target.checked;update();});$('fseCopyCancel').addEventListener('click',close);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(palletWriteBusy)return;let rows;
  try{rows=plan();}catch(error){status.className='error';status.textContent=error.message;return;}
  palletWriteBusy=true;slotEditPanel.inert=true;save.disabled=true;status.className='';status.textContent='กำลังบันทึกพาเลตปลายทาง…';
  try{await savePalletBatch(rows,[],{action:'receive',document_no:$('fseCopyReference').value.trim()});close();syncAfterSlotEdit();showFseFeedback(`คัดลอกไป ${rows.length} พาเลตแล้ว`);setSyncStatus('connected','บันทึกการคัดลอกพาเลตแล้ว');}
  catch(error){status.className='error';status.textContent=error.message;setSyncStatus('error',error.message);}
  finally{palletWriteBusy=false;slotEditPanel.inert=false;if(!form.hidden)save.disabled=false;}
 });
})();
