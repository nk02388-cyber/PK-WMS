const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const context = vm.createContext({ classifyStockItem: () => 'test' });
vm.runInContext(html.match(/const STOCK_WAREHOUSE_ALIASES = \{[^]*?\n\};/)[0], context);
for (const name of ['normalizeStockWarehouse', 'stockNumber', 'rowsFromMatrix']) {
  vm.runInContext(html.match(new RegExp(`function ${name}\\([^]*?\\n\\}`))[0], context);
}

test('BW header and items are excluded without leaking into adjacent warehouses', () => {
  const parsed = context.rowsFromMatrix([
    ['202', 'OEM'], ['OEM-P', 'Product', 'ใบ', '3', '30'],
    ['203', 'บรรจุภัณฑ์และแพ็คเกจจิ้ง-BW'],
    ['BW-P', 'Excluded', 'ใบ', '4', '40'],
    ['BW-NO-UNIT', 'Excluded without unit', '', '5', '50'],
    ['204', 'Customer'], ['CUSTOMER-P', 'Product', 'ใบ', '6', '0']
  ], 'daily.txt', 'Sheet1');
  assert.deepEqual(JSON.parse(JSON.stringify(parsed.rows.map(({code, wh, value}) => ({code, wh, value})))), [
    {code:'OEM-P', wh:'202', value:30}, {code:'CUSTOMER-P', wh:'204', value:0}
  ]);
});

test('standalone BW file is excluded and an included header resumes parsing', () => {
  assert.equal(context.rowsFromMatrix([['BW-P','Excluded','ใบ','4','40']], '203.txt', 'Sheet1').rows.length, 0);
  assert.equal(context.rowsFromMatrix([['203','BW'],['BW-P','Excluded','ใบ','4','40']], '202.txt', 'Sheet1').rows.length, 0);
  const rows = context.rowsFromMatrix([['201','Main'],['P','Product','ใบ','2','20']], '203.txt', 'Sheet1').rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].wh, '201');
});
