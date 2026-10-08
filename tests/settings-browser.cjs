const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const paeMenus=['stock','incoming','floorplan','product-history','bompk','daily-receive','daily-issue','receipt-plan'].sort();
const selectedMenus=page=>page.locator('#accountCreateForm input[name=menu_access]:checked').evaluateAll(inputs=>inputs.map(input=>input.value).sort());
(async()=>{
 const browser=await (process.env.PK_SETTINGS_BROWSER!=='edge'?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 try {for(const role of ['admin','user'])for(const width of (process.env.PK_SETTINGS_BROWSER==='edge'?[1440]:[1440,390])){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];let lists=0;const actions=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{sessionStorage.setItem('bcl-wms-selected-department','pk');localStorage.setItem('pk-dashboard-theme-haulix','light');});
 await page.route('**/*',route=>{
 const u=new URL(route.request().url());
 if(u.pathname.endsWith('/functions/v1/pk-user-access')){const input=route.request().postDataJSON(); actions.push(input); if(input.action==='list') {lists++;return route.fulfill({json:{users:[{id:'qa-admin',username:'Admin',role:'admin',login_kind:'password',menu_access:[]},{id:'qa-user',username:'Worker',role:'user',login_kind:'pin',menu_access:['stock']}]}});}return route.fulfill({json:{updated:true}});}
 if(u.hostname!=='localhost')return route.abort();const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
 if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js/,`<script>supabaseClient={auth:{getUser:async()=>({data:{user:{id:'qa'}}}),getSession:async()=>({data:{session:{access_token:'test'}}}),onAuthStateChange:()=>{},signOut:async()=>({})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{username:'QA',role:'${role}',active:true,menu_access:['stock','settings']}})})})}),rpc:async()=>({data:[]})};</script><script src="account-status.js`);
 route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'image/png'});
 });
 await page.goto('http://localhost/');await page.waitForFunction(()=>document.body.classList.contains('auth-ready'));
 assert.equal(await page.locator('#accountPanel #accountAdmin').count(),0);
 if(role==='admin'){
 if(width<1024)await page.locator('#sidebarToggle').click();
 await page.locator('#tab-settings').click();await page.locator('#accountUserList .account-user').first().waitFor();
 assert.equal(await page.locator('#pane-settings').isVisible(),true);assert.equal(await page.locator('#accountAdmin').isVisible(),true);
 assert.equal(await page.locator('#accountCreateForm input[value="settings"]').count(),0);assert.equal(await page.locator('#accountCreateForm input[value="warehouse-operations"]').count(),0);
 assert.equal(await page.locator('#accountCreateForm input[name="credential"]').isVisible(),true);
 assert.deepEqual(await selectedMenus(page),paeMenus);
 assert.deepEqual(await page.locator('.account-user').filter({has:page.getByText('Worker',{exact:true})}).locator('input[name=menu_access]:checked').evaluateAll(inputs=>inputs.map(input=>input.value)),['stock']);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 if(width<1024)await page.waitForFunction(()=>document.getElementById('tabs').getBoundingClientRect().right<=1);
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'work/settings-'+width+'.png'});assert.equal(lists,1);
 if(width<1024){await page.mouse.wheel(0,1400);await page.waitForTimeout(300);}
 const worker=page.locator('.account-user').filter({has:page.getByText('Worker',{exact:true})});
 const pinButton=worker.getByRole('button',{name:'เปลี่ยน PIN',exact:true}); if(width<1024){const b=await pinButton.boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);}else await pinButton.click();
 const fields=worker.locator('.account-credential-editor input');await fields.nth(0).fill('000456');await fields.nth(1).fill('000457');await worker.getByRole('button',{name:'บันทึก',exact:true}).click();
 assert.equal(actions.filter(a=>a.action==='set_credential').length,0);
 await fields.nth(1).fill('000456');await worker.getByRole('button',{name:'บันทึก',exact:true}).click();await worker.locator('.account-credential-editor').waitFor({state:'hidden'});
 assert.equal(actions.at(-1).credential,'000456');
 const adminRow=page.locator('.account-user').filter({has:page.getByText('Admin',{exact:true})});assert.equal(await adminRow.getByRole('button',{name:'ลบ',exact:true}).count(),0);
 await adminRow.getByRole('button',{name:'เปลี่ยนรหัสผ่าน',exact:true}).click();assert.equal(await adminRow.locator('input').first().getAttribute('minlength'),'8');
 await page.locator('#accountCreateRole').selectOption('admin');assert.equal(await page.locator('#accountCreateForm .account-permissions').isHidden(),true);
 await page.locator('#accountCreateKind').selectOption('password');await page.locator('#accountCreateForm input[name="username"]').fill('supervisor');await page.locator('#accountCreateCredential').fill('QA-password-only');await page.locator('#accountCreateForm button[type="submit"]').click();
 await page.waitForFunction(()=>!document.querySelector('#accountCreateForm button[type="submit"]').disabled);
 const created=actions.find(a=>a.action==='create');assert.equal(created.role,'admin');assert.equal(created.login_kind,'password');assert.equal(created.password,'QA-password-only');assert.deepEqual(created.menu_access,[]);
 assert.equal(await page.locator('#accountCreateRole').inputValue(),'user');
 assert.deepEqual(await selectedMenus(page),paeMenus);
 await page.locator('#accountCreateForm input[name="username"]').fill('new-worker');await page.locator('#accountCreateCredential').fill('123456');await page.locator('#accountCreateForm button[type="submit"]').click();
 await page.waitForFunction(()=>!document.querySelector('#accountCreateForm button[type=submit]').disabled);
 assert.deepEqual(actions.filter(a=>a.action==='create').at(-1).menu_access.sort(),paeMenus);assert.deepEqual(await selectedMenus(page),paeMenus);
 }else{assert.equal(await page.locator('#tab-settings').isHidden(),true);assert.equal(await page.evaluate(()=>window.getWmsCanAccess('settings')),false);assert.equal(await page.locator('#accountAdmin').isHidden(),true);assert.equal(lists,0);}
 assert.deepEqual(errors,[]);console.log('PASS settings '+role+' '+width);await page.close();
 }}finally{await browser.close()}
})();
