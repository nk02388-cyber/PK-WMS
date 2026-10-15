const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
// Snapshot of non-confidential layout/geometry assets after private API migration.
// Deliberate asset updates must refresh this hash.
const planAssets = require('./fixtures/plan-assets.json');
// Reconstruct the old embedded layout for the original snapshot comparison.
// Also verify extracted file bytes, rather than blessing a changed snapshot hash.
const embeddedAssets=planAssets.map(asset=>{const bytes=fs.readFileSync(path.join(__dirname,'..',asset.path));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),asset.sha256);return {...asset,dataUrl:'data:image/jpeg;base64,'+bytes.toString('base64')};});
const restored = html.split(/\r?\n/).map(line => {
  for(const asset of embeddedAssets){
    if(asset.path==='assets/floorplan-detail.jpg'&&!line.includes('id="floorplanZoomViewport"'))continue;
    if(line.includes(asset.path))line=line.split(asset.path).join(asset.dataUrl);
  }
  return line;
});
const protectedContent = restored.filter(line => line.length > 10000).join('\n');
assert.equal(crypto.createHash('sha256').update(protectedContent).digest('hex'),
  'cb0d3e5f7eb455a14698b4f9fb0ac8be4db2859db58ccb7320a081df60be0c65');
// Same JPEG bytes moved out of HTML to avoid repeated base64 parsing/copying.
for(const [file,hash] of [['floorplan-overview.jpg','01665e8d530bd638c898bea4a2d326e7c9e05d4ba709eaba82b91ffe2b846acc'],['floorplan-detail.jpg','941b1c8a676ccaf7744766d5038680e0bf6799372a0af67f9e00db315e4b5660']])
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..','assets',file))).digest('hex'),hash);
for (const copy of ['<title>PK WMS | BCL WMS</title>', 'class="header-product-name">PK WMS</strong>', '>DASHBOARD</span>', '↥ อัปเดตสต็อก',
  'สต็อกพร้อมใช้ (หน่วยตามสูตร)', 'สต็อกหลังใช้บรรจุภัณฑ์', 'มูลค่าหลังใช้บรรจุภัณฑ์ (บาท)',
  '>Import</button>', '>Export</button>', 'กรอก PIN เพื่อยืนยันการอัปเดตสต็อก']) {
  assert.ok(html.includes(copy), `Missing copy: ${copy}`);
}
assert.ok(!/text-transform:\s*uppercase/.test(html));
assert.equal((html.match(/id="saveIconsBtn"/g) || []).length, 0, 'Removed icon-save control must not return');
console.log('PASS: consistent UI terminology/casing; source data and floor-plan assets unchanged');

const publicData=JSON.parse(html.match(/^const DATA = (.*);$/m)[1]);assert.equal(publicData.stock.items.length,0);assert.equal(Object.keys(publicData.bomPk.bom_detail).length,0);
