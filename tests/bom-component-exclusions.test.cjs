const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const names = ['bomNumber','normalizeBomUnit','bomComponentType','bomConversion','groupBomLines','recalculateBomFromStock'];
const source = names.map(name => html.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0]).join('\n');
const master = JSON.parse(html.match(/const BOM_COMPONENT_TYPES = Object.freeze\(([^]*?)\);/)[1]);
const makeContext = (bom, stock) => vm.createContext({
  BOM_COMPONENT_TYPES: master, BOM_UNIT_CONVERSIONS: [], BOMPK: bom, STOCK: stock, fgBomSearch: { value: '' },
  renderBomSummary() {}, renderFgBom() {}, renderBomPlan() {},
});
const line = (pk_code, qty_per_unit = 1) => ({ pk_code, qty_per_unit, unit:'ชิ้น', component_type: String(pk_code).trim().startsWith('5') ? 'non_packaging' : 'packaging' });
const bom = { assumptions: { excluded_warehouses: ['800', '900'] }, kpis: {}, bom_detail: {
  FG: { lines: [line('51-0021-002/1'), line(' 5999 '), line(5001), line('315-01', 2)] },
  EMPTY: { lines: [line('51-only')] },
  HOLD: { lines: [line('31-hold')] },
  UNKNOWN: { lines: [line('31-unknown', null)] },
} };
const stock = { items: [
  { code: '315-01', unit:'ชิ้น', wh: '200', qty: 20, value: 100 },
  { code: '315-01', unit:'ชิ้น', wh: '800', qty: 100, value: 500 },
  { code: '31-hold', unit:'ชิ้น', wh: '900', qty: 50, value: 50 },
  { code: '51-0021-002/1', unit:'ชิ้น', wh: '200', qty: 0, value: 0 },
] };
const stockBefore = JSON.stringify(stock);
const ctx = makeContext(bom, stock);
vm.runInContext(source, ctx);
ctx.recalculateBomFromStock();
assert.deepEqual(Array.from(bom.bom_detail.FG.lines, l => l.pk_code), ['315-01']);
assert.equal(bom.bom_detail.FG.producible, 10, 'Excluded missing stock must not block production');
assert.equal(bom.bom_detail.FG.bottleneck_code, '315-01');
assert.equal(bom.bom_detail.FG.line_count, 1);
assert.equal(bom.bom_detail.EMPTY.lines.length, 0);
assert.equal(bom.bom_detail.EMPTY.producible, null, 'An empty BOM must not imply production readiness');
assert.equal(bom.bom_detail.EMPTY.bottleneck_code, null);
assert.equal(bom.bom_detail.UNKNOWN.producible, null);
assert.equal(bom.bom_detail.HOLD.producible, 0, 'Hold/reject warehouses stay excluded');
assert.equal(bom.kpis.total_fg_with_bom, 3);
assert.equal(bom.kpis.total_bom_lines, 3);
assert.equal(bom.kpis.unique_components, 3);
assert.equal(bom.kpis.fg_available, 1);
assert.equal(bom.kpis.fg_blocked, 1);
assert.equal(JSON.stringify(stock), stockBefore, 'Stock inventory must remain unchanged');
const once = JSON.stringify(bom);
ctx.recalculateBomFromStock();
assert.equal(JSON.stringify(bom), once, 'Repeated refresh must preserve counts');
ctx.STOCK = { items: [{ code: '315-01', unit:'ชิ้น', wh: '200', qty: 6, value: 30 }] };
ctx.recalculateBomFromStock();
assert.equal(bom.bom_detail.FG.producible, 3, 'A new stock snapshot must recalculate retained components');

// BOM is now delivered through authorized API, never embedded in the public page.
const publicData = JSON.parse(html.match(/^const DATA = (.*);$/m)[1]);
assert.deepEqual(publicData.bomPk.bom_detail,{});assert.equal(publicData.stock.items.length,0);
const apiBom={assumptions:{excluded_warehouses:[]},kpis:{},bom_detail:{'QA-FG':{lines:[...Array.from({length:6},(_,i)=>({pk_code:'QA-PK-'+i,unit:'ชิ้น',qty_per_unit:2,component_type:'packaging'})),{pk_code:'QA-WIP',unit:'ชิ้น',qty_per_unit:1,component_type:'non_packaging'}]}}};
const apiStock={items:Array.from({length:6},(_,i)=>({code:'QA-PK-'+i,unit:'ชิ้น',wh:'200',qty:20,value:100}))};
const real=makeContext(apiBom,apiStock);vm.runInContext(source,real);real.recalculateBomFromStock();
assert.equal(apiBom.bom_detail['QA-FG'].line_count,6);assert.equal(apiBom.bom_detail['QA-FG'].producible,10);
assert.equal(apiBom.kpis.total_bom_lines,6);assert.equal(apiBom.kpis.unique_components,6);
console.log('PASS: API-shaped component classifications, readiness, repeated refresh and no public fallback');
