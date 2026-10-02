(() => {
 const button=document.getElementById('tab-warehouse-operations');
 const pane=document.getElementById('pane-warehouse-operations');
 const frame=document.getElementById('warehouseOperationsFrame');
 // Extra menu confirmation; server-side Admin authorization remains required.
 const pinHash='70e131f7cd01f5ac496803730cd0add66baa9e72fb024bac0a61711e79b60786';
 const dialog=document.createElement('dialog');
 dialog.className='warehouse-pin-dialog';
 dialog.setAttribute('aria-labelledby','warehousePinTitle');
 dialog.innerHTML=`<form><h2 id="warehousePinTitle">ใบเบิกบรรจุภัณฑ์</h2>
 <p>กรอก PIN เพื่อเปิดเมนูนี้</p><label for="warehousePinInput">PIN</label>
 <input id="warehousePinInput" type="password" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" autocomplete="off" required>
 <p class="warehouse-pin-error" role="alert" hidden></p>
 <div class="warehouse-pin-actions"><button type="button">ยกเลิก</button><button type="submit">ปลดล็อก</button></div></form>`;
 document.body.append(dialog);
 const form=dialog.querySelector('form'),input=dialog.querySelector('input');
 const error=dialog.querySelector('[role="alert"]'),submit=dialog.querySelector('[type="submit"]');
 let initial=false,unlocked=false,pending=null,finish=null;
 function settle(value){
  const resolve=finish;finish=null;pending=null;input.value='';error.hidden=true;
  dialog.close();if(resolve)resolve(value);
 }
 dialog.querySelector('[type="button"]').addEventListener('click',()=>settle(false));
 dialog.addEventListener('cancel',event=>{event.preventDefault();settle(false)});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(submit.disabled)return;submit.disabled=true;
  try{
   const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input.value));
   const hash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
   if(!finish)return;
   if(hash===pinHash&&window.getWmsIsAdmin?.()===true){unlocked=true;settle(true)}
   else {input.value='';error.textContent='PIN ไม่ถูกต้อง กรุณาลองอีกครั้ง';error.hidden=false;input.focus()}
  }catch(_){error.textContent='ตรวจสอบ PIN ไม่สำเร็จ กรุณาลองใหม่';error.hidden=false}
  finally{submit.disabled=false}
 });
 window.requestWarehouseOperationsPin=()=>{
  if(window.getWmsIsAdmin?.()!==true)return Promise.resolve(false);
  if(unlocked&&!pane.hidden)return Promise.resolve(true);
  if(pending)return pending;
  pending=new Promise(resolve=>{finish=resolve});
  input.value='';error.hidden=true;dialog.showModal();input.focus();return pending;
 };
 function sync(){
  const allowed=window.getWmsIsAdmin?.()===true;
  button.hidden=!allowed;
  if(!allowed||pane.hidden){
   unlocked=false;frame.removeAttribute('src');
   if(!allowed){if(!pane.hidden)pane.hidden=true;if(finish)settle(false)}
  }
  if(!allowed)return;
  if(!initial){initial=true;if(new URLSearchParams(location.search).get('module')==='warehouse-operations')button.click();}
  if(!pane.hidden&&unlocked&&!frame.hasAttribute('src'))frame.src='/operations/';
 }
 window.addEventListener('wms:account-changed',sync);
 new MutationObserver(sync).observe(pane,{attributes:true,attributeFilter:['hidden']});
 sync();
})();
