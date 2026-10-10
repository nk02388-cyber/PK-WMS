const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf("stockExcelInput.addEventListener('change', async () => {");
const end = html.indexOf('\nloadLatestStockFromSupabase();', start);
assert.ok(start >= 0 && end > start);
const source = html.slice(start, end);
const snapshot = {items: [{code:'QA-PK',qty:12,unit:'ชิ้น'}], warehouses:[{code:'200'}], kpis:{total_rows:1}, report_date:'QA DATE'};

function fixture({parse, rpc, pin = '123456', allowed = true} = {}) {
  let change;
  const calls = [];
  const context = vm.createContext({
    stockExcelInput:{files:[{name:'fixture.txt'}],value:'chosen',addEventListener:(_, listener)=>{change=listener;}},
    stockUpdateBtn:{disabled:false},stockUpdateStatus:{textContent:'',className:''},
    stockLoadGeneration:0,stockSnapshotState:'latest',STOCK:null,DATA:{},allowed,
    canReadPrivateStock:()=>context.allowed,
    parseStockFiles:parse || (async()=>({reportDate:'QA DATE',items:snapshot.items})),
    stockSupabaseClient:{rpc:async(...args)=>{calls.push(args);return rpc ? rpc(...args) : {data:snapshot};}},
    window:{prompt:()=>{calls.push(['prompt']);return pin;}},
    rebuildStockControls:()=>calls.push(['rebuild']),renderStockSnapshotNotice:()=>calls.push(['notice']),
    fmt0:String,
  });
  vm.runInContext(source, context);
  return {context,calls,run:()=>change()};
}
function deferred() { let resolve, reject; const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject}; }
const writes = calls => calls.filter(([name])=>name==='replace_stock_inventory');

test('successful upload uses the server result and reports success without an undefined variable or second fetch', async()=>{
  const {context,calls,run}=fixture();await run();
  assert.equal(writes(calls).length,1);
  assert.equal(context.stockLoadGeneration,1);
  assert.equal(context.STOCK,snapshot);assert.equal(context.DATA.stock,snapshot);
  assert.equal(context.stockSnapshotState,'latest');
  assert.match(context.stockUpdateStatus.textContent,/อัปเดตสำเร็จ 1 รายการ/);
  assert.equal(context.stockUpdateStatus.className,'stock-update-status success');
  assert.equal(context.stockUpdateBtn.disabled,false);
});
test('account change while parsing prevents prompting or writing with the new account', async()=>{
  const wait=deferred();const {context,calls,run}=fixture({parse:()=>wait.promise});
  const pending=run();context.stockLoadGeneration++;context.stockUpdateStatus.textContent='new account';
  wait.resolve({reportDate:'QA DATE',items:snapshot.items});await pending;
  assert.equal(calls.length,0);assert.equal(context.STOCK,null);
  assert.equal(context.stockUpdateStatus.textContent,'new account');
});
test('logout while the write is pending cannot restore private stock or overwrite the current status', async()=>{
  const wait=deferred();const {context,calls,run}=fixture({rpc:()=>wait.promise});
  const pending=run();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(writes(calls).length,1);
  context.stockLoadGeneration++;context.allowed=false;context.stockUpdateStatus.textContent='logged out';
  wait.resolve({data:snapshot});await pending;
  assert.equal(context.STOCK,null);assert.equal(context.DATA.stock,undefined);
  assert.equal(context.stockUpdateStatus.textContent,'logged out');
});
test('a late failure from the previous account does not replace the current status', async()=>{
  const wait=deferred();const {context,run}=fixture({parse:()=>wait.promise});
  const pending=run();context.stockLoadGeneration++;context.stockUpdateStatus.textContent='new account';
  wait.reject(new Error('old failure'));await pending;
  assert.equal(context.stockUpdateStatus.textContent,'new account');
});
test('cancellation and missing access never write inventory', async()=>{
  for(const options of [{pin:null},{allowed:false}]){
    const {context,calls,run}=fixture(options);await run();assert.equal(writes(calls).length,0);
    assert.equal(context.stockUpdateBtn.disabled,false);assert.equal(context.STOCK,null);
    assert.equal(context.stockLoadGeneration,0,'An aborted upload must not invalidate a stock read already in flight');
    if(options.pin===null){assert.match(context.stockUpdateStatus.textContent,/ยกเลิก/);assert.equal(context.stockUpdateStatus.className,'stock-update-status');}
  }
});
test('server rejection and incomplete responses preserve stock and give actionable feedback', async()=>{
  for(const result of [{error:{message:'PIN rejected'}},{data:{items:snapshot.items}},{data:{items:snapshot.items,kpis:snapshot.kpis}}]){
    const {context,calls,run}=fixture({rpc:async()=>result});await run();
    assert.equal(writes(calls).length,1);assert.equal(context.STOCK,null);
    assert.equal(context.stockUpdateStatus.className,'stock-update-status error');
    assert.match(context.stockUpdateStatus.textContent,result.error ? /PIN rejected/ : /โหลดหน้าใหม่/);
    assert.match(context.stockUpdateStatus.textContent,/ยังยืนยันการอัปเดตไม่ได้/);
    assert.equal(context.stockUpdateBtn.disabled,false);
  }
});
