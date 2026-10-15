const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {dateNumber,defaultRange,collectUsage,summarizeUsage,previewRop} = require('../reorder-usage.js');
const {evaluate} = require('../reorder-points.js');
const row = (type,date,qty,unit='ขวด') => ({type,date,qty,unit});
test('Bangkok inclusive 56 day default and invalid dates', () => {
  const range = defaultRange(new Date('2026-10-14T18:00:00Z'));
  assert.equal(range.to,'2026-10-15');
  assert.equal((dateNumber(range.to)-dateNumber(range.from))/86400000+1,56);
  assert.equal(dateNumber('15/10/2569'),dateNumber('2026-10-15'));
  assert.equal(dateNumber('2026-02-30'),null);
  assert.equal(dateNumber('82026-01-30'),null);
});
test('gross and returns stay separate, units and calendar boundaries are preserved', () => {
  const rows = [row('withdraw','2026-10-01',100),row('return','2026-10-10',20),row('withdraw','2026-09-30',900),row('withdraw','2026-10-11',900),row('withdraw','2026-10-04',700,'กล่อง'),row('transfer_out','2026-10-02',800),row('scrap','2026-10-03',500)];
  const usage = summarizeUsage(rows,'ขวด','2026-10-01','2026-10-10');
  assert.equal(usage.withdrawn,100); assert.equal(usage.returned,20); assert.equal(usage.net,80);
  assert.equal(usage.average,10); assert.equal(usage.otherUnit,1); assert.equal(usage.count,2);
  assert.equal(previewRop(usage,'3','5'),35);
  assert.equal(previewRop(usage,'3','0'),30);
  for(const args of [['','0'],['0','0'],['1.5','0'],['2',''],['2','-1']]) assert.equal(previewRop(usage,...args),null);
  assert.equal(summarizeUsage(rows,'ขวด','2026-10-10','2026-10-01').validRange,false);
});
test('unknown date/quantity/unit blocks preview rather than understating use', () => {
  for(const bad of [row('withdraw','',100),row('withdraw','82026-01-30',100),row('withdraw','2026-10-02',null),row('withdraw','2026-10-02',-2),row('withdraw','2026-10-02',5,'')]) {
    const usage = summarizeUsage([row('withdraw','2026-10-01',10),bad],'ขวด','2026-10-01','2026-10-10');
    assert.equal(usage.average,null); assert.equal(previewRop(usage,3,5),null);
  }
  assert.equal(previewRop(summarizeUsage([],'ขวด','2026-10-01','2026-10-10'),3,5),null);
  const returnsOnly = summarizeUsage([row('return','2026-10-02',30)],'ขวด','2026-10-01','2026-10-10');
  assert.equal(returnsOnly.net,-30); assert.equal(previewRop(returnsOnly,3,0),null);
});
test('real whole/split pallet move keeps usage once and leaves snapshot ROP unchanged', () => {
  const html = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  const ctx = vm.createContext({});
  const names = ['formatMovementDate','getRemainingQty','movementNumber','movementDateKey','getStockMovement','buildSlotMovePlan'];
  vm.runInContext(names.map(name=>html.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0]).join('\n'),ctx);
  const original = {code:'A',unit:'ขวด',qty:100,remainingQty:80,receiveDate:'2026-09-01',withdrawals:[{date:'2026-10-01',qty:20}]};
  for(const selection of [{index:0,whole:true},{index:0,whole:false,qty:30}]) {
    const plan = ctx.buildSlotMovePlan({zone:'A',slot_code:'A-01',items:[original]},{zone:'B',slot_code:'B-01',items:[]},[selection],'2026-10-02','QA','MOVE-1');
    const slots = {A:{'A-01':plan.source.items},B:{'B-01':plan.destination.items}};
    const before = JSON.stringify(slots);
    const usage = summarizeUsage(collectUsage(slots,'a',ctx.getStockMovement),'ขวด','2026-10-01','2026-10-10');
    assert.equal(usage.withdrawn,20); assert.equal(usage.count,1); assert.equal(JSON.stringify(slots),before);
  }
  const points = [{code:'A',unit:'ขวด',rop:50,pattern:'สม่ำเสมอ',historyWeeks:38}];
  const stock = [{code:'A',unit:'ขวด',qty:80,wh:'201'}], before=JSON.stringify({points,stock});
  previewRop(summarizeUsage([row('withdraw','2026-10-01',20)],'ขวด','2026-10-01','2026-10-10'),3,0);
  assert.equal(evaluate(points,stock)[0].available,80);assert.equal(evaluate(points,stock)[0].rop,50);
  assert.equal(JSON.stringify({points,stock}),before);
});
