(() => {
 'use strict';
 const approved=new WeakSet();let pending=null;
 const client=typeof supabaseClient!=='undefined'?supabaseClient:null;
 const hosted=window.parent!==window && location.origin===window.parent.location.origin;
 let dialog;
 if(!hosted){
  dialog=document.createElement('dialog');dialog.id='actionConfirmationDialog';
  dialog.innerHTML=`<form id="actionConfirmationForm"><h2>ยืนยันการดำเนินการ</h2><p id="actionConfirmationLabel"></p><p id="actionConfirmationTarget"></p><label>ชื่อผู้ใช้ที่ยืนยัน<input id="actionConfirmationUsername" readonly autocomplete="username"></label><label>PIN / รหัสผ่านของคุณ *<input id="actionConfirmationPassword" type="password" required autocomplete="off" maxlength="128"></label><label>หมายเหตุ / เหตุผล *<textarea id="actionConfirmationReason" required maxlength="1000" rows="3"></textarea></label><p id="actionConfirmationError" role="alert"></p><div class="confirmation-actions"><button type="button" data-confirmation-dismiss>กลับ</button><button type="submit">ยืนยันดำเนินการ</button></div></form>`;
  document.body.append(dialog);
  const form=dialog.querySelector('form'),password=dialog.querySelector('#actionConfirmationPassword'),reason=dialog.querySelector('#actionConfirmationReason'),error=dialog.querySelector('#actionConfirmationError');
  const finish=value=>{
   const request=pending;if(!request)return;pending=null;password.value='';reason.value='';dialog.close();request.resolve(value);request.focus?.focus();
  };
  dialog.querySelector('[data-confirmation-dismiss]').addEventListener('click',()=>{if(!pending?.busy)finish(null)});
  dialog.addEventListener('cancel',e=>{e.preventDefault();if(!pending?.busy)finish(null)});
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(!pending||pending.busy||!form.reportValidity())return;
   const current=pending;current.busy=true;error.textContent='กำลังตรวจสอบบัญชี…';
   form.querySelectorAll('button').forEach(b=>b.disabled=true);
   let temporaryToken='';
   try{
    const {data:before,error:beforeError}=await client.auth.getUser();
    if(beforeError||!before?.user||window.getWmsUsername?.()!==current.username)throw new Error('บัญชีเปลี่ยนหรือเซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    const response=await fetch(`${SUPABASE_URL}/functions/v1/pk-user-access`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_ANON_KEY},body:JSON.stringify({action:'login',username:current.username,password:password.value})});
    password.value='';
    const login=await response.json();
    if(!response.ok||!login.access_token)throw new Error('PIN / รหัสผ่านไม่ถูกต้อง');
    temporaryToken=login.access_token;
    const {data:verified,error:verifyError}=await client.auth.getUser(temporaryToken);
    const {data:after,error:afterError}=await client.auth.getUser();
    if(verifyError||afterError||verified?.user?.id!==before.user.id||after?.user?.id!==before.user.id||window.getWmsUsername?.()!==current.username)throw new Error('ต้องยืนยันด้วยบัญชีที่ล็อกอินอยู่เท่านั้น');
    const note=reason.value.trim();if(!note)throw new Error('กรุณาระบุหมายเหตุ');
    const {data:id,error:auditError}=await client.rpc('record_action_confirmation',{p_action:current.label,p_target:current.target,p_reason:note});
    if(auditError||!id)throw new Error('บันทึกการยืนยันไม่สำเร็จ ยังไม่ได้ดำเนินการ กรุณาลองใหม่');
    finish({id,username:current.username,reason:note});
   }catch(err){error.textContent=err.message||'ตรวจสอบไม่สำเร็จ ยังไม่ได้ดำเนินการ';password.value='';}
   finally{
    // This temporary password check must never replace the user's current session.
    if(temporaryToken)fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${temporaryToken}`}}).catch(()=>{});
    current.busy=false;form.querySelectorAll('button').forEach(b=>b.disabled=false);
   }
  });
 }
 function request(label,target=''){
  if(hosted)return window.parent.PKActionConfirmation?.request(label,target)||Promise.resolve(null);
  if(pending)return Promise.resolve(null);
  const username=window.getWmsUsername?.();
  if(!username||!client)return Promise.resolve(null);
  return new Promise(resolve=>{
   pending={resolve,label:label.slice(0,200),target:target.slice(0,1000),username,focus:document.activeElement,busy:false};
   dialog.querySelector('form').reset();dialog.querySelector('#actionConfirmationUsername').value=username;
   dialog.querySelector('#actionConfirmationLabel').textContent=pending.label;
   dialog.querySelector('#actionConfirmationTarget').textContent=pending.target;
   dialog.querySelector('#actionConfirmationError').textContent='';dialog.showModal();dialog.querySelector('#actionConfirmationPassword').focus();
  });
 }
 window.PKActionConfirmation={request,isConfirmed:button=>approved.has(button)};
 function targetButton(event){
  const button=event.type==='submit'?event.submitter:event.target.closest('button,input[type="submit"]');
  if(!button||button.disabled||button.closest('#actionConfirmationDialog')||approved.has(button))return null;
  const label=[button.getAttribute('aria-label'),button.textContent,button.value,button.title].map(value=>(value||'').trim()).find(value=>/ลบ|ยกเลิก/.test(value));
  return label?{button,label}:null;
 }
 async function gate(event){
  const action=targetButton(event);if(!action)return;
  event.preventDefault();event.stopImmediatePropagation();
  const {button,label}=action;
  const container=button.closest('.fse-item, tr, .account-user, .calendar-event, article, form');
  const target=container?.innerText?.trim().replace(/\s+/g,' ').slice(0,1000)||button.id||label;
  const result=await request(label,target);
  if(!result||!button.isConnected||button.disabled)return;
  approved.add(button);
  try{button.click();}finally{approved.delete(button);}
 }
 document.addEventListener('click',gate,true);
 document.addEventListener('submit',gate,true);
})();
