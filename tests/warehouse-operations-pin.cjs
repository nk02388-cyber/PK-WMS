const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const tabs=html.slice(html.indexOf('const tabButtons ='),html.indexOf("document.getElementById('tabBadgeStock').textContent"));
const fixture=`<div id="tabs"><button class="tab-btn active" data-tab="stock" id="stock">Dashboard</button><button class="tab-btn" data-tab="warehouse-operations" id="tab-warehouse-operations" hidden>ใบเบิกและผลงาน</button></div><div id="pane-stock" class="tab-pane"></div><div id="pane-warehouse-operations" class="tab-pane" hidden><iframe id="warehouseOperationsFrame"></iframe></div><div id="dashboardContent"></div>`;
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage();
  await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:fixture}));
  await page.goto('http://localhost:8787');
  await page.evaluate(()=>{window.admin=true;window.getWmsIsAdmin=()=>window.admin;window.getWmsCanAccess=()=>true});
  await page.addScriptTag({content:tabs});
  await page.addScriptTag({path:path.join(root,'warehouse-operations.js')});
  const input=page.locator('#warehousePinInput'),dialog=page.locator('dialog');
  await page.locator('#tab-warehouse-operations').click();await dialog.waitFor({state:'visible'});
  assert.equal(await input.evaluate(el=>el===document.activeElement),true);
  assert.equal(await page.locator('iframe').getAttribute('src'),null);
  await input.fill('11111');await input.press('Enter');
  await page.getByText('PIN ไม่ถูกต้อง กรุณาลองอีกครั้ง').waitFor();
  assert.equal(await page.locator('#pane-warehouse-operations').isVisible(),false);
  await page.getByRole('button',{name:'ยกเลิก',exact:true}).click();await dialog.waitFor({state:'hidden'});
  await page.locator('#tab-warehouse-operations').focus();await page.keyboard.press('Enter');
  await input.fill(process.env.PK_OPS_TEST_PIN);await input.press('Enter');
  await page.locator('#pane-warehouse-operations').waitFor({state:'visible'});
  assert.equal(await page.locator('iframe').getAttribute('src'),'/operations/');
  await page.locator('#stock').click();await page.locator('#pane-warehouse-operations').waitFor({state:'hidden'});
  assert.equal(await page.locator('iframe').getAttribute('src'),null);
  await page.locator('#stock').focus();await page.keyboard.press('ArrowRight');await dialog.waitFor({state:'visible'});
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  await page.evaluate(()=>{window.admin=false;window.dispatchEvent(new Event('wms:account-changed'))});
  assert.equal(await page.locator('#tab-warehouse-operations').isVisible(),false);
  assert.equal(await page.evaluate(()=>window.requestWarehouseOperationsPin()),false);
  console.log('PASS: wrong PIN, cancel, correct PIN, keyboard, relock, Admin-only');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
