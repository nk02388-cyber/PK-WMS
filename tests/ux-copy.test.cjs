const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
// Snapshot of embedded inventory/BOM data, product catalogs and floor-plan assets.
// Deliberate asset updates must refresh this hash.
const protectedContent = html.split(/\r?\n/).filter(line => line.length > 10000).join('\n');
assert.equal(crypto.createHash('sha256').update(protectedContent).digest('hex'),
  'b93907b2a48b52dc9f782848b37c5c65511d4f205b3965eefb5787eb6cb10f95');
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
