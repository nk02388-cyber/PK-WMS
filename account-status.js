(() => {
  const client = typeof supabaseClient !== 'undefined' ? supabaseClient : null;
  const $ = id => document.getElementById(id);
  const form = $('authLoginForm'), error = $('authError');
  const button = $('accountToggle'), panel = $('accountPanel'), status = $('accountStatus');
  const adminPanel = $('accountAdmin'), createForm = $('accountCreateForm');
  const userList = $('accountUserList'), message = $('accountManageMessage');
  const functionUrl = `${SUPABASE_URL}/functions/v1/pk-user-access`;
  const departmentKey = 'bcl-wms-selected-department';
  let profile = null, refreshId = 0, usersLoadId = 0, loginAttempt = 0, loginBusy = false, signingOut = false;
  window.getWmsUsername = () => profile?.username || '';
  window.getWmsIsAdmin = () => profile?.role === 'admin';
  const menuButtons = [...document.querySelectorAll('#tabs .tab-btn[data-tab]')];
  const menuChoices = menuButtons.map(button => ({
    key: button.dataset.tab,
    label: button.querySelector('span:not(.tab-badge)')?.textContent.trim() || button.dataset.tab,
  }));
  const publicMenuKeys = new Set(menuButtons.filter(button => !button.hasAttribute('data-admin-only')).map(button => button.dataset.tab));
  const allowedMenus = () => profile?.role === 'admin' ? menuChoices.map(item => item.key)
    : Array.isArray(profile?.menu_access) ? profile.menu_access.filter(key => publicMenuKeys.has(key)) : [];
  window.getWmsCanAccess = key => allowedMenus().includes(key);

  // Default for new users matches pae's menu permissions verified on 2026-10-08.
  const defaultUserMenus = ['stock', 'incoming', 'floorplan', 'product-history', 'bompk', 'daily-receive', 'daily-issue', 'receipt-plan'];
  function menuFieldset(selected = defaultUserMenus) {
    const fields = document.createElement('fieldset');
    fields.className = 'account-permissions';
    const legend = document.createElement('legend'); legend.textContent = 'เมนูที่เข้าได้';
    const grid = document.createElement('div');
    for (const item of menuChoices.filter(item => publicMenuKeys.has(item.key))) {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox'; checkbox.name = 'menu_access'; checkbox.value = item.key;
      checkbox.defaultChecked = selected.includes(item.key);
      checkbox.checked = checkbox.defaultChecked;
      label.append(checkbox, document.createTextNode(item.label)); grid.append(label);
    }
    fields.append(legend, grid);
    return fields;
  }
  function applyMenuAccess() {
    const allowed = new Set(allowedMenus());
    for (const button of menuButtons) button.hidden = !allowed.has(button.dataset.tab);
    const active = menuButtons.find(button => button.classList.contains('active'));
    if (active && !active.hidden) return;
    const first = menuButtons.find(button => !button.hidden);
    if (first) first.click();
    else for (const pane of document.querySelectorAll('.tab-pane')) pane.hidden = true;
  }
  $('accountCreateMenus').parentElement.replaceWith(menuFieldset());

  function avatarPicture(username, source) {
    const circle = document.createElement('span'); circle.className='profile-avatar';
    circle.textContent=(username || '?').slice(0,2).toUpperCase(); circle.setAttribute('aria-hidden','true');
    if (typeof source === 'string' && source.startsWith(SUPABASE_URL+'/storage/v1/object/public/profile-avatars/')) {
      const image=document.createElement('img');image.alt='';image.decoding='async';
      image.addEventListener('error',()=>image.remove(),{once:true});image.src=source;circle.append(image);
    }
    return circle;
  }
  function showAccountAvatar() {
    button.querySelector('.profile-avatar')?.remove();button.classList.toggle('with-avatar',!!profile);
    if (profile) button.prepend(avatarPicture(profile.username,profile.avatar_url));

  }
  async function resizeAvatar(file) {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('เลือกรูป JPG, PNG หรือ WebP');
    if (file.size>10*1024*1024) throw new Error('เลือกรูปขนาดไม่เกิน 10 MB');
    const image=new Image(), objectUrl=URL.createObjectURL(file);
    try {
      image.src=objectUrl;try{await image.decode();}catch{throw new Error('อ่านรูปไม่สำเร็จ กรุณาเลือกรูป JPG, PNG หรือ WebP ใหม่');}
      const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,256,256);
      const size=Math.min(image.naturalWidth,image.naturalHeight);
      if (!size) throw new Error('ไม่สามารถอ่านรูปนี้ได้');
      ctx.drawImage(image,(image.naturalWidth-size)/2,(image.naturalHeight-size)/2,size,size,0,0,256,256);
      return canvas.toDataURL('image/jpeg',.85);
    } finally {URL.revokeObjectURL(objectUrl);}
  }
  function photoControl(username, id, feedback) {
    const wrap=document.createElement('div');wrap.className='profile-photo-control';
    const picker=document.createElement('input');picker.type='file';picker.accept='image/jpeg,image/png,image/webp';picker.hidden=true;
    const choose=document.createElement('button');choose.type='button';choose.textContent='เปลี่ยนรูปโปรไฟล์';
    choose.setAttribute('aria-label','เปลี่ยนรูปโปรไฟล์ '+username);
    choose.addEventListener('click',()=>picker.click());
    picker.addEventListener('change',async()=>{
      const file=picker.files[0];if(!file)return;
      const actor=profile?.username;choose.disabled=true;feedback.textContent='กำลังอัปโหลดรูป…';
      try {
        const image=await resizeAvatar(file);
        if (!actor || profile?.username!==actor) throw new Error('กรุณาเข้าสู่ระบบใหม่');
        await adminCall('set_avatar',{...(id?{id}:{}),image});
        if(profile?.username!==actor)return;
        await refresh();if(profile?.role==='admin'&&!$('pane-settings').hidden)await loadUsers();
        feedback.textContent='บันทึกรูปโปรไฟล์แล้ว';
      } catch(err){feedback.textContent=err.message||'อ่านรูปไม่สำเร็จ กรุณาเลือกรูปใหม่';}
      finally{choose.disabled=false;picker.value='';}
    });wrap.append(choose,picker);return wrap;
  }

  function showError(text) { error.textContent = text || ''; error.hidden = !text; }
  $('authTogglePassword').addEventListener('click', () => {
    const visible = $('authPassword').type === 'password';
    $('authPassword').type = visible ? 'text' : 'password';
    $('authTogglePassword').textContent = visible ? 'ซ่อน' : 'แสดง';
    $('authTogglePassword').setAttribute('aria-label', visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
    $('authTogglePassword').setAttribute('aria-pressed', String(visible));
  });
  function savedDepartment() {
    try { return sessionStorage.getItem(departmentKey); } catch (_) { return null; }
  }
  function saveDepartment(value) {
    try { value ? sessionStorage.setItem(departmentKey, value) : sessionStorage.removeItem(departmentKey); } catch (_) {}
  }
  function showStage(stage) {
    $('authLoading').hidden = true;
    if (document.body.classList.contains(stage)) return;
    document.body.classList.remove('auth-ready', 'auth-pending', 'department-choosing');
    document.body.classList.add(stage);
    $('authLoading').hidden = true;
    if (stage === 'auth-pending') $('authUsername').focus();
  }
  function showDepartment() {
    let selected = savedDepartment();
    if (selected === 'rm' || selected === 'fg') { saveDepartment(null); selected = null; }
    if (selected === 'pk') {
      showStage(profile ? 'auth-ready' : 'auth-pending');
    } else {
      const changed = !document.body.classList.contains('department-choosing');
      $('departmentWelcome').textContent = 'เลือกแผนกก่อนเข้าสู่ระบบเพื่อดำเนินการต่อ';
      showStage('department-choosing');
      if (changed) document.querySelector('.department-option').focus();
    }
  }
  async function call(action, data = {}, token = '') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(functionUrl, {
        method: 'POST', signal: controller.signal,
        headers: { 'content-type': 'application/json', apikey: SUPABASE_ANON_KEY,
          ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action, ...data }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'ไม่สามารถติดต่อระบบบัญชีได้');
      return result;
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('การเชื่อมต่อใช้เวลานาน กรุณาลองใหม่');
      if (err instanceof TypeError) throw new Error('ติดต่อระบบบัญชีไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่');
      throw err;
    } finally { clearTimeout(timeout); }
  }
  function clearAccount() {
    const changed = !!profile; profile = null; usersLoadId++;showAccountAvatar();
    adminPanel.hidden = true; userList.replaceChildren(); createForm.reset(); updateCreateForm();
    message.textContent = ''; panel.hidden = true; button.setAttribute('aria-expanded','false');
    button.classList.remove('is-logged-in'); status.textContent = 'ยังไม่ได้เข้าสู่ระบบ';
    applyMenuAccess();
    if (changed) window.dispatchEvent(new Event('wms:account-changed'));
  }
  async function adminCall(action, data = {}) {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData?.session?.access_token) throw new Error('กรุณาเข้าสู่ระบบใหม่');
    return call(action, data, sessionData.session.access_token);
  }
  async function refresh() {
    if(signingOut)return;
    const id = ++refreshId;
    if (!client) { showError('ระบบเข้าสู่ระบบยังไม่พร้อม กรุณาโหลดหน้าใหม่'); return; }
    try {
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (id !== refreshId) return;
      if (userError || !user) { clearAccount(); showDepartment(); return; }
      const { data, error: profileError } = await client.from('app_users').select('username,role,active,menu_access,avatar_url').eq('id', user.id).single();
      if (id !== refreshId) return;
      if (profileError || !data?.active || !['admin', 'user'].includes(data.role)) {
        await client.auth.signOut({ scope: 'local' });
        clearAccount(); showDepartment(); showError('บัญชีนี้ไม่ได้รับสิทธิ์เข้าใช้งาน'); return;
      }
      const changed = JSON.stringify(profile) !== JSON.stringify(data);
      if (profile && (profile.username !== data.username || profile.role !== data.role)) {
        usersLoadId++; userList.replaceChildren(); createForm.reset(); updateCreateForm();
      }
      profile = data;showAccountAvatar();
      if (changed) window.dispatchEvent(new Event('wms:account-changed'));
      status.textContent = `${data.username} · ${data.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้'}`;
      button.classList.add('is-logged-in');
      adminPanel.hidden = data.role !== 'admin';
      if (adminPanel.hidden) userList.replaceChildren();
      applyMenuAccess();
      showError(''); showDepartment();
    } catch (_) { if (id === refreshId) { clearAccount(); showDepartment(); showError('ตรวจสอบบัญชีไม่สำเร็จ กรุณาลองใหม่'); } }
  }
  async function loadUsers() {
    if (profile?.role !== 'admin') return;
    const loadId = ++usersLoadId, actor = profile.username;
    message.textContent = 'กำลังโหลดรายชื่อ…';
    try {
      const { users } = await adminCall('list');
      if (profile?.role !== 'admin' || profile.username !== actor || loadId !== usersLoadId) return;
      userList.replaceChildren();
      for (const user of users.filter(item => ['admin','user'].includes(item.role) && !item.username.startsWith('legacy-disabled-'))) {
        const row = document.createElement('div'); row.className = 'account-user';
        const info = document.createElement('div');info.className='account-user-info';
        const copy = document.createElement('div');
        const name = document.createElement('strong'); name.textContent = user.username;
        const badge = document.createElement('span'); badge.className = 'account-role-badge'; badge.textContent = user.role === 'admin' ? 'Admin · ทุกเมนู' : 'ผู้ใช้';
        copy.append(name,badge);info.append(avatarPicture(user.username,user.avatar_url),copy);
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'ลบ';
        remove.dataset.confirmDestructive = `ลบผู้ใช้ ${user.username}`;
        remove.setAttribute('aria-label', `ลบผู้ใช้ ${user.username}`);
        remove.addEventListener('click', async () => {
          if (!window.PKActionConfirmation?.isConfirmed(remove)) return;
          remove.disabled = true;
          try { await adminCall('delete', { id: user.id }); await loadUsers(); message.textContent = `ลบ ${user.username} แล้ว`; }
          catch (err) { remove.disabled = false; message.textContent = err.message; }
        });
        const permissions = menuFieldset(user.menu_access || []);
        permissions.hidden = true;
        const actions = document.createElement('div'); actions.className = 'account-actions';
        const manage = document.createElement('button'); manage.type = 'button'; manage.textContent = 'สิทธิ์เมนู';
        manage.setAttribute('aria-expanded', 'false');
        manage.addEventListener('click', () => {
          permissions.hidden = !permissions.hidden;
          manage.setAttribute('aria-expanded', String(!permissions.hidden));
        });
        const save = document.createElement('button'); save.type = 'button';
        save.className = 'account-save-access'; save.textContent = 'บันทึกสิทธิ์';
        save.addEventListener('click', async () => {
          save.disabled = true;
          try {
            const menu_access = [...permissions.querySelectorAll('input:checked')].map(input => input.value);
            await adminCall('set_menu_access', { id: user.id, menu_access });
            message.textContent = `บันทึกสิทธิ์ของ ${user.username} แล้ว`;
            permissions.hidden = true; manage.setAttribute('aria-expanded', 'false');
          } catch (err) { message.textContent = err.message; }
          finally { save.disabled = false; }
        });
        permissions.append(save);
        const editCredential = document.createElement('button'); editCredential.type = 'button';
        const usesPin = user.login_kind !== 'password';
        editCredential.textContent = usesPin ? 'เปลี่ยน PIN' : 'เปลี่ยนรหัสผ่าน';
        editCredential.setAttribute('aria-expanded','false');
        const editor = document.createElement('form'); editor.className = 'account-credential-editor'; editor.hidden = true;
        const fields = [];
        for (const text of [usesPin ? 'PIN ใหม่ · 6 หลัก' : 'รหัสผ่านใหม่ · 8–128 ตัวอักษร', usesPin ? 'ยืนยัน PIN ใหม่' : 'ยืนยันรหัสผ่านใหม่']) {
          const label = document.createElement('label'); label.textContent = text;
          const input = document.createElement('input'); input.type = 'password'; input.required = true; input.autocomplete = 'new-password';
          input.minLength = usesPin ? 6 : 8; input.maxLength = usesPin ? 6 : 128;
          if (usesPin) { input.inputMode = 'numeric'; input.pattern = '[0-9]{6}'; }
          fields.push(input); label.append(input); editor.append(label);
        }
        const feedback = document.createElement('p'); feedback.setAttribute('role','status');
        const buttons = document.createElement('div'); buttons.className = 'account-actions';
        const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'ยกเลิก';
        const submitCredential = document.createElement('button'); submitCredential.type = 'submit'; submitCredential.textContent = 'บันทึก';
        const closeEditor = () => { editor.reset(); editor.hidden = true; feedback.textContent = ''; editCredential.setAttribute('aria-expanded','false'); };
        cancel.addEventListener('click',closeEditor);
        editCredential.addEventListener('click', () => { if (!editor.hidden) closeEditor(); else { editor.hidden = false; editCredential.setAttribute('aria-expanded','true'); fields[0].focus(); } });
        editor.addEventListener('submit', async event => {
          event.preventDefault();
          if (fields[0].value !== fields[1].value) { feedback.textContent = 'รหัสยืนยันไม่ตรงกัน'; fields[1].focus(); return; }
          submitCredential.disabled = true; cancel.disabled = true; editCredential.disabled = true;
          try { await adminCall('set_credential', {id: user.id, credential: fields[0].value}); closeEditor(); message.textContent = 'เปลี่ยนรหัสของ ' + user.username + ' แล้ว'; }
          catch(err) { feedback.textContent = err.message; }
          finally { submitCredential.disabled = false; cancel.disabled = false; editCredential.disabled = false; }
        });
        buttons.append(cancel,submitCredential); editor.append(feedback,buttons);
        const rename = document.createElement('button'); rename.type='button'; rename.textContent='เปลี่ยนชื่อ'; rename.setAttribute('aria-expanded','false');
        const nameEditor=document.createElement('form');nameEditor.className='account-name-editor';nameEditor.hidden=true;
        const nameLabel=document.createElement('label');nameLabel.textContent='ชื่อผู้ใช้ใหม่';
        const nameInput=document.createElement('input');nameInput.required=true;nameInput.minLength=3;nameInput.maxLength=32;nameInput.pattern='[a-zA-Z][a-zA-Z0-9._-]{2,31}';nameInput.autocomplete='off';nameInput.value=user.username;nameInput.defaultValue=user.username;
        nameLabel.append(nameInput);
        const nameHint=document.createElement('p');nameHint.textContent='ใช้ชื่อใหม่เข้าสู่ระบบได้ทันที โดยใช้ PIN / รหัสผ่านเดิม · ภาษาอังกฤษ 3–32 ตัวอักษร ใช้ตัวเลข . _ - ได้';
        const nameError=document.createElement('p');nameError.setAttribute('role','status');
        const nameActions=document.createElement('div');nameActions.className='account-actions';
        const nameCancel=document.createElement('button');nameCancel.type='button';nameCancel.textContent='ยกเลิก';
        const nameSave=document.createElement('button');nameSave.type='submit';nameSave.textContent='บันทึกชื่อ';
        const closeName=()=>{nameEditor.hidden=true;nameEditor.reset();nameError.textContent='';rename.setAttribute('aria-expanded','false');rename.focus();};
        nameCancel.addEventListener('click',closeName);
        rename.addEventListener('click',()=>{if(!nameEditor.hidden)closeName();else{nameEditor.hidden=false;rename.setAttribute('aria-expanded','true');nameInput.focus();nameInput.select();}});
        nameEditor.addEventListener('submit',async event=>{
          event.preventDefault();nameSave.disabled=true;nameCancel.disabled=true;rename.disabled=true;
          try{await adminCall('set_username',{id:user.id,username:nameInput.value.trim()});await refresh();await loadUsers();message.textContent='เปลี่ยนชื่อผู้ใช้แล้ว';}
          catch(err){nameError.textContent=err.message;}
          finally{nameSave.disabled=false;nameCancel.disabled=false;rename.disabled=false;}
        });
        nameActions.append(nameCancel,nameSave);nameEditor.append(nameLabel,nameHint,nameError,nameActions);
        if (user.role === 'user') actions.append(manage,remove);
        actions.append(rename,editCredential,photoControl(user.username,user.id,message));
        row.append(info, actions); if (user.role === 'user') row.append(permissions); row.append(nameEditor,editor); userList.append(row);
      }
      message.textContent = userList.children.length ? '' : 'ยังไม่มีผู้ใช้';
    } catch (err) { if (loadId === usersLoadId && profile?.role === 'admin') message.textContent = err.message; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();if(loginBusy||signingOut)return;loginBusy=true;const attempt=++loginAttempt;showError('');
    const submit = $('authSubmit'); submit.disabled = true;
    submit.textContent = 'กำลังเข้าสู่ระบบ…';
    try {
      const username = $('authUsername').value.trim();
      const password = $('authPassword').value;
      const tokens = await call('login', { username, password });
      if(attempt!==loginAttempt)return;
      $('authChangeDepartment').disabled=true;
      if(!client)throw new Error('ระบบเข้าสู่ระบบยังไม่พร้อม กรุณาโหลดหน้าใหม่');
      const { error: sessionError } = await client.auth.setSession(tokens);
      if (sessionError) throw sessionError;
      $('authPassword').value = '';
      saveDepartment('pk');
      location.reload();
    } catch (err) { if(attempt===loginAttempt)showError(err.message || 'เข้าสู่ระบบไม่สำเร็จ'); }
    finally { if(attempt===loginAttempt){loginBusy=false;submit.disabled=false;submit.textContent='เข้าสู่ระบบ';$('authChangeDepartment').disabled=false;} }
  });
  function updateCreateForm() {
    const admin = $('accountCreateRole').value === 'admin';
    const pin = $('accountCreateKind').value === 'pin';
    const credential = $('accountCreateCredential');
    createForm.querySelector('.account-permissions').hidden = admin;
    createForm.querySelectorAll('.account-permissions input').forEach(input => input.disabled = admin);
    $('accountAdminAccessNote').hidden = !admin;
    $('accountCredentialLabel').textContent = pin ? 'PIN 6 หลัก' : 'รหัสผ่าน · 8–128 ตัวอักษร';
    credential.removeAttribute('minlength'); credential.removeAttribute('maxlength');
    credential.minLength = pin ? 6 : 8; credential.maxLength = pin ? 6 : 128;
    if (pin) { credential.pattern = '[0-9]{6}'; credential.inputMode = 'numeric'; }
    else { credential.removeAttribute('pattern'); credential.removeAttribute('inputmode'); }
  }
  $('accountCreateRole').addEventListener('change', updateCreateForm);
  $('accountCreateKind').addEventListener('change', () => { $('accountCreateCredential').value = ''; updateCreateForm(); });
  updateCreateForm();
  createForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = createForm.querySelector('button[type=submit]'); submit.disabled = true;
    try {
      const formData = new FormData(createForm);
      const values = { username: formData.get('username'), role: formData.get('role'), login_kind: formData.get('login_kind'), menu_access: formData.getAll('menu_access') };
      values[values.login_kind === 'pin' ? 'pin' : 'password'] = formData.get('credential');
      await adminCall('create', values);
      createForm.reset(); updateCreateForm(); await loadUsers(); message.textContent = `เพิ่ม ${values.username} แล้ว`;
    } catch (err) { message.textContent = err.message; }
    finally { submit.disabled = false; }
  });
  async function signOut() {
    if(signingOut)return;signingOut=true;++loginAttempt;++refreshId;loginBusy=false;
    const logout=$('accountLogout');logout.disabled=true;
    try {
      if(!client)throw new Error('ระบบบัญชียังไม่พร้อม');
      const {error} = await client.auth.signOut({scope:'local'}) || {};
      if(error)throw error;
      saveDepartment(null);clearAccount();location.reload();
    } catch(err) {
      const message='ออกจากระบบไม่สำเร็จ กรุณาลองใหม่';
      if(document.body.classList.contains('department-choosing')){$('departmentError').textContent=message;$('departmentError').hidden=false;}
      else{panel.hidden=false;button.setAttribute('aria-expanded','true');status.textContent=message;}
    } finally{signingOut=false;logout.disabled=false;}
  }
  $('accountLogout').addEventListener('click', signOut);
  $('accountChangeDepartment').addEventListener('click', () => {
    panel.hidden = true; button.setAttribute('aria-expanded', 'false');
    saveDepartment(null); showDepartment();
  });
  $('authChangeDepartment').addEventListener('click', () => {
    ++loginAttempt;loginBusy=false;$('authSubmit').disabled=false;$('authSubmit').textContent='เข้าสู่ระบบ';
    saveDepartment(null); showError(''); $('authPassword').value = '';
    $('authPassword').type = 'password'; $('authTogglePassword').textContent = 'แสดง';
    $('authTogglePassword').setAttribute('aria-label', 'แสดงรหัสผ่าน');
    $('authTogglePassword').setAttribute('aria-pressed', 'false'); showDepartment();
  });
  document.querySelectorAll('button.department-option').forEach(option => option.addEventListener('click', () => {
    $('departmentError').hidden=true;saveDepartment(option.dataset.department); showDepartment();
  }));
  button.addEventListener('click', () => {
    const opening = panel.hidden; panel.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
  });
  $('tab-settings').addEventListener('click', () => {
    if (profile?.role === 'admin' && !$('pane-settings').hidden) loadUsers();
  });
  document.addEventListener('click', event => {
    if (panel.hidden || event.target.closest('.account-anchor')) return;
    panel.hidden = true; button.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || panel.hidden) return;
    panel.hidden = true; button.setAttribute('aria-expanded', 'false'); button.focus();
  });
  client?.auth.onAuthStateChange(() => {if(!signingOut)setTimeout(refresh,0);});
  setInterval(() => { if (!document.hidden && profile) refresh(); }, 60_000);
  refresh();
})();
