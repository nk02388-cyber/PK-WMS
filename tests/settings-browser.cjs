const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {for(const role of ['admin','user'])for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:900}});const errors=[];let lists=0;page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{sessionStorage.setItem('bcl-wms-selected-department','pk');localStorage.setItem('pk-dashboard-theme-haulix','light');});
 await page.route('**/*',route=>{
 const u=new URL(route.request().url());
 if(u.pathname.endsWith('/functions/v1/pk-user-access')){lists++;return route.fulfill({json:{users:[{id:'qa-user',username:'Worker',role:'user',menu_access:['stock']}]}});}
 if(u.hostname!=='localhost')return route.abort();const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);if(!fs.existsSync(file))return route.abort();let body=fs.readFileSync(file);
 if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js/,`<script>supabaseClient={auth:{getUser:async()=>({data:{user:{id:'qa'}}}),getSession:async()=>({data:{session:{access_token:'test'}}}),onAuthStateChange:()=>{},signOut:async()=>({})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{username:'QA',role:'${role}',active:true,menu_access:['stock','settings']}})})})}),rpc:async()=>({data:[]})};</script><script src="account-status.js`);
 route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'image/png'});
 });
 await page.goto('http://localhost/');await page.waitForFunction(()=>document.body.classList.contains('auth-ready'));
 assert.equal(await page.locator('#accountPanel #accountAdmin').count(),0);
 if(role==='admin'){
 if(width<1024)await page.locator('#sidebarToggle').click();
 await page.locator('#tab-settings').click();await page.locator('#accountUserList .account-user').waitFor();
 assert.equal(await page.locator('#pane-settings').isVisible(),true);assert.equal(await page.locator('#accountAdmin').isVisible(),true);
 assert.equal(await page.locator('#accountCreateForm input[value="settings"]').count(),0);assert.equal(await page.locator('#accountCreateForm input[value="warehouse-operations"]').count(),0);
 assert.equal(await page.locator('#accountCreateForm input[name="pin"]').isVisible(),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
 if(width<1024)await page.waitForFunction(()=>document.getElementById('tabs').getBoundingClientRect().right<=1);
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'work/settings-'+width+'.png'});assert.equal(lists,1);
 }else{assert.equal(await page.locator('#tab-settings').isHidden(),true);assert.equal(await page.evaluate(()=>window.getWmsCanAccess('settings')),false);assert.equal(await page.locator('#accountAdmin').isHidden(),true);assert.equal(lists,0);}
 assert.deepEqual(errors,[]);console.log('PASS settings '+role+' '+width);await page.close();
 }}finally{await browser.close()}
})();
