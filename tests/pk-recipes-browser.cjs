// Isolated browser integration: no requests to production are allowed.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),records=new Map();
let failSave=false;
const fixture=`<script>
document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');
window.getWmsIsAdmin=()=>true;window.getWmsCanAccess=()=>true;
supabaseClient={rpc:async(name,args)=>{const response=await fetch('/qa/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,args})});return response.json();}};
</script>`;
const server=http.createServer(async(req,res)=>{
  if(req.url==='/qa/rpc'){
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const {name,args}=JSON.parse(Buffer.concat(chunks));let result;
    if(name==='get_pk_recipes')result={data:[...records.values()]};
    else if(name==='get_pk_recipe_versions')result={data:[]};
    else if(name==='save_pk_recipe'){
      const old=records.get(args.p_recipe.fg_code);
      if(failSave)result={error:{message:'QA network failure'}};
      else if((old?.version||0)!==args.p_expected_version)result={error:{code:'40001',message:'สูตรมีเวอร์ชันใหม่'}};
      else {const row={...args.p_recipe,version:(old?.version||0)+1,updated_username:'QA Admin'};records.set(row.fg_code,row);result={data:row};}
    }
    res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(result));
  }
  const url=new URL(req.url,'http://localhost'),file=path.join(root,url.pathname==='/'?'index.html':url.pathname);
  if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
  let body=fs.readFileSync(file);
  if(file.endsWith('index.html'))body=body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';")
    .replace(/<script src="account-status.js[^>]*><\/script>/,fixture);
  res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(body);
});
(async()=>{
  await new Promise(resolve=>server.listen(8775,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try {
    const context=await browser.newContext();
    await context.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8775')?route.continue():route.abort());
    const a=await context.newPage(),b=await context.newPage();const errors=[];a.on('pageerror',error=>errors.push(error.message));
    for(const page of [a,b]){await page.goto('http://127.0.0.1:8775');await page.locator('#tab-bompk').click();await page.locator('#pkRecipesStatus').filter({hasText:'เชื่อมต่อฐานข้อมูลแล้ว'}).waitFor();}
    await a.locator('#pkRecipeEditor summary').first().click();
    await a.locator('#pkRecipeCode').fill('QA-FG');await a.locator('#pkRecipeName').fill('สูตรทดสอบในเครื่อง');
    await a.locator('#pkRecipeBase').fill('1000');await a.locator('#pkRecipeUnit').fill('ชิ้น');
    for(const [key,value] of [['pk_code','QA-BOX'],['pk_name','กล่องทดสอบ'],['qty','100'],['unit','ใบ']])await a.locator(`[data-field="${key}"]`).fill(value);
    await a.locator('#pkRecipeSave').click();await a.locator('#pkRecipeMessage').filter({hasText:'เวอร์ชัน 1 ลงฐานข้อมูลแล้ว'}).waitFor();
    assert.equal(await a.evaluate(()=>BOMPK.bom_detail['QA-FG'].lines[0].qty_per_unit),.1);
    assert.ok(await a.locator('#fgCodeList option[value="QA-FG"]').count());
    await b.locator('#pkRecipesRefresh').click();await b.locator('#pkRecipesList button').filter({hasText:'QA-FG'}).waitFor();
    await b.locator('#pkRecipesList button').filter({hasText:'QA-FG'}).click();
    await a.locator('#pkRecipeName').fill('เวอร์ชันใหม่');await a.locator('#pkRecipeSave').click();await a.locator('#pkRecipeMessage').filter({hasText:'เวอร์ชัน 2 ลงฐานข้อมูลแล้ว'}).waitFor();
    await b.locator('#pkRecipeSave').click();await b.locator('#pkRecipeMessage').filter({hasText:'สูตรมีเวอร์ชันใหม่'}).waitFor();
    assert.equal(await b.locator('#pkRecipeName').inputValue(),'สูตรทดสอบในเครื่อง');
    failSave=true;await a.locator('#pkRecipeName').fill('ร่างที่ยังไม่บันทึก');await a.locator('#pkRecipeSave').click();await a.locator('#pkRecipeMessage').filter({hasText:'QA network failure'}).waitFor();
    assert.equal(await a.locator('#pkRecipeName').inputValue(),'ร่างที่ยังไม่บันทึก');
    await a.setViewportSize({width:390,height:844});
    assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Mobile page must not overflow horizontally');
    await a.evaluate(()=>{window.getWmsIsAdmin=()=>false;window.dispatchEvent(new Event('wms:account-changed'));});
    await a.locator('#pkRecipeEditor').waitFor({state:'hidden'});
    assert.deepEqual(errors,[]);
    console.log('PASS: browser save, batch quantities, two-page loading, version conflicts, retained failed drafts, staff UI and 390px layout');
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
