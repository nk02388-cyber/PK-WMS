# PK WMS — ใช้รายงานเพื่อปรับปรุงระบบ

วันที่ 15 ตุลาคม 2026 · ต้นทาง [review ด้วย 4 สกิล](SKILL-REVIEW-2026-10-15.md) และรายงาน performance ที่ตรวจไว้ในเครื่องเมื่อ 13 ตุลาคม · ซอร์สก่อนแก้ `0d09c2d`

## ปัญหาที่แก้และหลักฐาน

### 1. ลด HTML และรูปซ้ำ

HTML เดิมมี data URI รูป JPEG 29 ตำแหน่ง (15 รูปไม่ซ้ำ) ทำให้ต้องส่ง base64 ซ้ำและ parse พร้อมหน้าเริ่มต้น ย้ายเป็น URL รูปใน assets แทน โดยรูปผังละเอียดใช้ไฟล์ floorplan-detail.jpg ที่มีอยู่แล้ว อีก 14 รูปแยกเป็นไฟล์ตาม content hash ไม่บีบอัดหรือเปลี่ยนพิกเซล ตำแหน่ง/geometry/ข้อความ/สีสถานะยังเหมือนเดิม

- ขนาดไฟล์ก่อน: **2,467,739 bytes**
- ขนาดไฟล์หลัง: **1,037,711 bytes**
- ลดลง: **1,430,028 bytes (57.95%)**
- ค่าเหล่านี้เป็น source HTML ที่ยังไม่ gzip ไม่ใช่เวลาโหลดหรือปริมาณ transfer จริงของผู้ใช้
- ไฟล์ภาพใช้ cache/revalidation ของ HTTP และหลายตำแหน่งใช้ URL เดียวกัน ไม่มีการตั้ง immutable cache ให้ HTML
- tests/fixtures/plan-assets.json เก็บ SHA-256; tests/ux-copy.test.cjs ตรวจทุกไบต์และสร้าง embedded representation กลับมาเทียบ snapshot hash เดิม ไม่ได้แก้ expected hash เพื่อให้เทสต์ผ่าน

### 2. ลดการโหลดต้นฉบับ BOM ซ้ำ

เดิม frontend โหลดต้นฉบับ BOM เต็มพร้อมสูตรที่บันทึกทุก 60 วินาทีเมื่อหน้าเว็บมองเห็น แม้ไม่ได้เปิด BOM/แผนหลาย FG ขนาด payload ราว 3 MB เป็นตัวเลขที่วัดใน audit เก่า ไม่ใช่การวัด production ใหม่รอบนี้

พฤติกรรมใหม่:

- โหลดต้นฉบับผ่าน guarded API เมื่อได้รับสิทธิ์ตามเดิม เพื่อให้ส่วนที่อ้างอิง BOM พร้อมใช้งาน
- รอบอัตโนมัติทำงานเฉพาะเมื่อเห็นเมนู BOM หรือแผนหลาย FG และ document มองเห็น
- สูตรที่บันทึกตรวจทุก 60 วินาทีเมื่อเกี่ยวข้อง ส่วนต้นฉบับใช้ cache ในหน่วยความจำอายุไม่เกิน 15 นาที
- เข้าสู่เมนูหลังไม่ได้เปิดจะตรวจความสดใหม่ และรีเฟรชเมื่อพ้นกำหนด
- ปุ่มโหลดใหม่บังคับดึงต้นฉบับและสูตรจาก API; คำขอพร้อมกันใช้ request เดียว
- เปลี่ยนบัญชี/สิทธิ์ล้าง cache และ projection; ผลตอบกลับของบัญชีเก่าไม่เติมข้อมูลกลับ การโหลดผิดพลาดล้าง cache และให้ลองใหม่
- ไม่ใช้ localStorage เก็บ BOM ไม่เพิ่ม public fallback และไม่เปลี่ยน SQL/API guards

ข้อแลกเปลี่ยน: ถ้าต้นฉบับถูกแก้จากระบบอื่นอาจรอรอบอัตโนมัติสูงสุดประมาณ 15 นาทีในเมนูที่เปิด ผู้ใช้กดโหลดใหม่ได้ทันที สูตรที่บันทึกยังมี expected-version guard ในการบันทึก การเพิ่ม version-only baseline RPC ยังไม่ได้ทำและจะต้องออกแบบ/ตรวจฝั่ง DB แยกต่างหาก

## ตรวจความสอดคล้องกับรายงาน

| ข้อเสนอในรายงาน | สถานะหลังงานนี้ |
|---|---|
| ลดต้นฉบับ BOM เต็มที่โหลดซ้ำ | แก้ frontend: view-aware polling, memory cache แบบมีอายุ, manual force, coalescing |
| ลด calendar polling ซ้ำ Realtime | มีในโค้ดก่อนงานนี้แล้ว: healthy 15min / fallback 2min, hidden-page suppression |
| โหลด Excel/QR เมื่อเริ่มใช้ | มี lazy dependency loader ก่อนงานนี้แล้ว |
| แยกรูปจาก HTML | ทำในรอบนี้และเทียบ hash ต้นฉบับ |
| Reorder rendering | มีการปรับก่อนหน้า; ไม่วัดซ้ำหรือประกาศตัวเลขใหม่รอบนี้ |
| Batch remote-change refresh / data coupling | ยังไม่ได้ refactor; ไม่มีหลักฐานการวัดใหม่พอให้สรุปประสิทธิภาพ |
| Production grants, legacy public copies, public withdrawal catalog, password protection, restore/load | ไม่เปลี่ยนในงานนี้ ต้องตรวจ provider/ผลกระทบและเงื่อนไขธุรกิจก่อนตัดสินใจ |

## การตรวจรับ

ผ่าน regression **111/111**, browser BOM refresh/private data ที่ 1440/390px, browser save/version-conflict, map pan ที่ 1920/390px และ map toolbar ที่ 430×932, 390×844, 932×430, 320×640 ไม่มีการแก้ stock/password จริงเพื่อทดสอบ ไม่อ้างว่าจำลองขนาดจอเป็นการตรวจมือถือจริง

- tests/bom-refresh-browser.cjs: hidden panes, minute tick, 15-minute expiry, manual refresh, duplicate requests, stale logout response, network failure/retry ที่ 1440/390px
- tests/private-data-browser.cjs: guarded data loading, saved overlay, logout/late response, retry ที่ 1440/390px
- tests/pk-recipes-browser.cjs: บันทึกสูตรด้วย mock, version conflict, retained draft, UI สิทธิ์และมือถือ
- tests/overview-pan-browser.cjs และ tests/map-controls-browser.cjs: gesture/rotation/zoom/reset และ toolbar หลายขนาดจอ
- Full regression แบบ sequential พร้อมการตรวจ asset byte identity

## ไฟล์หลัก

[HTML](../index.html) · [BOM](../pk-recipes.js) · [asset invariant](../tests/ux-copy.test.cjs) · [BOM refresh test](../tests/bom-refresh-browser.cjs) · [Architecture](../ARCHITECTURE.md) · [PRD](../PRD.md)
