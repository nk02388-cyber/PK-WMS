const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
  if(u.pathname==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="action-confirmation.css"><button id="remove">ลบรายการ QA</button><button id="cancel">ยกเลิกงาน QA</button><button id="normal">บันทึก</button><iframe src="/child" title="Operations"></iframe><script>const SUPABASE_URL='http://localhost',SUPABASE_ANON_KEY='test';let failAudit=false,wrongUser=false;window.actions=0;window.logs=[];window.getWmsUsername=()=> 'tester';const supabaseClient={auth:{getUser:async token=>({data:{user:{id:token&&wrongUser?'other':'tester-id'}}})},rpc:async(name,args)=>{if(failAudit)return {error:{message:'offline'}};logs.push(args);return {data:'audit-id'};}};window.fetch=async(url,options)=>{if(url.includes('/logout'))return {};const data=JSON.parse(options.body);return {ok:data.password==='123456',json:async()=>data.password==='123456'?{access_token:'verified'}:{error:'invalid'}};};</script><script src="action-confirmation.js"></script><script>for(const id of ['remove','cancel','normal'])document.getElementById(id).onclick=()=>window.actions++;</script>`});
  if(u.pathname==='/child')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<button id="childDelete">ลบใบเบิก QA</button><script src="action-confirmation.js"></script><script>window.actions=0;document.getElementById("childDelete").onclick=()=>actions++;</script>'});
  const file=path.join(root,u.pathname);return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.css')?'text/css':'text/javascript'});
 });
 await page.goto('http://localhost/');
 const popup=page.locator('#actionConfirmationDialog'),password=page.locator('#actionConfirmationPassword'),reason=page.locator('#actionConfirmationReason');
 const submit=page.getByRole('button',{name:'ยืนยันดำเนินการ',exact:true});
 await page.locator('#remove').click();assert.ok(await popup.isVisible());assert.equal(await page.locator('#actionConfirmationUsername').inputValue(),'tester');assert.equal(await page.evaluate(()=>actions),0);
 await password.fill('111111');await reason.fill('QA reason');await submit.click();await page.getByText('PIN / รหัสผ่านไม่ถูกต้อง',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>actions),0);assert.equal(await password.inputValue(),'');
 await page.evaluate(()=>wrongUser=true);await password.fill('123456');await submit.click();await page.getByText('ต้องยืนยันด้วยบัญชีที่ล็อกอินอยู่เท่านั้น',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>logs.length),0);
 await page.evaluate(()=>{wrongUser=false;failAudit=true});await password.fill('123456');await submit.click();await page.getByText('บันทึกการยืนยันไม่สำเร็จ ยังไม่ได้ดำเนินการ กรุณาลองใหม่',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>actions),0);
 await page.evaluate(()=>failAudit=false);await password.fill('123456');await reason.fill('');await submit.click();assert.ok(await popup.isVisible());assert.equal(await page.evaluate(()=>logs.length),0);
 await reason.fill('QA reason');await page.evaluate(()=>document.getElementById('actionConfirmationError').textContent='');assert.ok(await popup.evaluate(el=>el.getBoundingClientRect().width<=innerWidth-30));await page.screenshot({path:'work/action-confirmation-popup.png'});await submit.click();await popup.waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>actions),1);assert.deepEqual(await page.evaluate(()=>logs),[{p_action:'ลบรายการ QA',p_target:'remove',p_reason:'QA reason'}]);
 await page.locator('#cancel').click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>actions),1);assert.equal(await page.evaluate(()=>logs.length),1);
 await page.locator('#normal').click();assert.equal(await page.evaluate(()=>actions),2);
 await page.frameLocator('iframe').locator('#childDelete').click();await popup.waitFor({state:'visible'});await password.fill('123456');await reason.fill('QA iframe');await submit.click();await popup.waitFor({state:'hidden'});assert.equal(await page.frameLocator('iframe').locator('body').evaluate(()=>window.actions),1);
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 console.log('PASS: wrong password, own-account identity, required reason, audit failure, single replay, cancel, normal controls, iframe and mobile layout');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
