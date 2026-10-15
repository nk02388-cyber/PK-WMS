# PK WMS — ทบทวนด้วย 4 สกิล

วันที่: 15 ตุลาคม 2026 · ซอร์สที่ตรวจ: `bf518e7` · repository: `nk02388-cyber/PK-WMS`

## ผลงานและขอบเขต

ปรับเอกสารเดิมให้ตรงกับระบบปัจจุบัน ใช้โครงสร้างไฟล์เดิมและไม่แยก AGENTS.md เป็นหลายไฟล์ ไม่มีการเปลี่ยนหน้าเว็บ สต็อก บัญชี API หรือ migration ในงานนี้ การแก้โค้ดที่เกี่ยวข้องมีเฉพาะตัวจำลองเหตุการณ์ในเทสต์ลากผัง เพื่อรองรับ preventDefault และยืนยันว่า gesture ปิด native selection จริง

| สกิล | นำมาใช้ | ผลงาน |
|---|---|---|
| deliver-prd | ข้อกำหนดที่ทดสอบได้ ขอบเขต เกณฑ์ผ่านและผู้ตรวจ | [PRD](../PRD.md): แก้ Sidebar/ลำดับ Dashboard เพิ่ม FR-11–15 |
| agents-md-creator | index สั้น คำสั่งที่ใช้ได้จริง รักษาข้อกำหนดผู้ใช้ | [AGENTS](../AGENTS.md): เพิ่มทางเข้าประวัติสินค้า ใช้ regression แบบ sequential |
| design-system-doc | anatomy, variants/states, tokens, examples, accessibility, changelog | [Design System](../DESIGN_SYSTEM.md): รวมบันทึกหลายรุ่นเป็นข้อกำหนดปัจจุบัน |
| software-architecture-analysis | data authority, coupling, failure boundaries, evidence classes | [Architecture](../ARCHITECTURE.md): แยก projection/authority, calendar/library lifecycle และหลักฐาน live เก่าจาก source ปัจจุบัน |

สกิลเป็นเครื่องมือทำงานของผู้พัฒนา ไม่ใช่ปลั๊กอินที่ติดตั้งเข้าเว็บ แหล่งที่มาเดิมอยู่ใน [SKILLS](SKILLS.md) และคำแนะนำเริ่มงานอยู่ใน [AGENTS](../AGENTS.md)

## บัญชีหลักฐาน

| ข้อสรุป | ประเภท | หลักฐาน / ข้อจำกัด |
|---|---|---|
| เป็น static HTML/CSS/JS ไม่มี build ที่ root | Observed | [root](../index.html), [hosting config](../vercel.json), [README](../README.md) |
| Login/เลือกแผนกกลับเป็น compact cards; ปุ่มเปลี่ยนแผนกเป็นไอคอนตาราง | Observed | [markup](../index.html), [styles](../account-login.css), [Auth](../account-status.js); auth-redesign.css ไม่ถูกโหลด |
| Hover เปิดทั้ง Sidebar ทับเนื้อหา; toggle pin ขยับเนื้อหา | Observed | [controller](../sidebar-toggle.js), [styles](../sidebar-toggle.css) |
| หมุนเต็มจอลากได้; ย่อ 10–600%; ปิด native selection | Observed | root geometry/gesture functions; [browser fixture](../tests/overview-pan-browser.cjs), [bounds test](../tests/overview-pan-bounds.test.cjs) |
| ประวัติกรองวันที่รวมขอบเขตและรักษายอดสะสมก่อนช่วง | Observed | [history](../product-history.js), [unit tests](../tests/product-history.test.cjs), [browser fixture](../tests/product-history-range-browser.cjs) |
| ปฏิทินไม่อ่านฐานข้อมูลทุก local tick | Observed | [calendar](../event-calendar.js): tick 30s, healthy threshold 15min/fallback 2min, debounce 180ms, hidden-page suppression |
| Excel/กล้อง QR โหลดเมื่อใช้ | Observed | [loader](../dependency-loader.js), [lazy fixture](../tests/lazy-dependencies-browser.cjs) |
| PIN Import ตรวจซ้ำฝั่ง DB; Export PIN ไม่ใช่สิทธิ์อ่านข้อมูลเพิ่ม | Observed in repository | [SQL](../supabase-pallet-transfer-pin.sql), [SQL fixture](../tests/pallet-transfer-pin.test.mjs); ไม่ตรวจ deployed grants ใหม่ |
| Operations ใช้ gateway ที่มี PK Admin check | Observed in source; historical migration reported | [gateway SQL](../supabase-warehouse-operations.sql), [host integration](../warehouse-operations.js), [Operations](../operations/README.md) |
| Shared root/global state เพิ่มโอกาสที่การแก้ส่วนหนึ่งกระทบหลายส่วน | Inferred | root และ feature modules ใช้ state ร่วมกัน; ไม่ใช่ผล benchmark หรือเหตุผลพอสำหรับย้าย framework |
| Live Auth/RLS/RPC/ข้อมูล migration ตรงกับ baseline เก่าในวันนี้ | Unknown | หลักฐาน live ในเอกสารเดิมลงวันที่ 9 ต.ค.; ไม่อ่าน metadata หรือเขียน production ในรอบนี้ |
| อัตราความสำเร็จของผู้ใช้จริง / load / uptime / restore guarantee / WCAG เต็มรูปแบบ | Unknown | ไม่มีการวัดหรือการรับรองในงานนี้ |

## จุดที่แก้ในเอกสาร

1. ยกเลิกคำอธิบาย split-screen Figma ในฐานะรูปแบบปัจจุบัน รักษา compact entry ตามคำขอล่าสุด
2. แก้ความเข้าใจว่า hover เปิดเพียงชื่อเมนู เป็นการเปิดทั้ง Sidebar แบบ overlay
3. ระบุวันที่กรองประวัติแยกจากวันที่ snapshot และเวลาที่บันทึก; ไม่เริ่ม running balance ใหม่จากศูนย์
4. แยกการซูม/หมุน/ลากซึ่งเป็น presentation ออกจากตำแหน่งและตัวตนของพาเลท
5. แยก authoring skills ออกจาก runtime Motion/Excel/QR และอธิบาย 30-second calendar tick ตามการอ่านข้อมูลจริง
6. เก็บข้อกำหนดที่มีเครื่องหมาย user-specified ทุกข้อใน AGENTS.md ไว้ครบ ใช้เอกสารเดิมแทนการสร้างโครงสร้าง rules ซ้ำ

## ตรวจทานและข้อจำกัด

ผลตรวจรอบนี้ ไม่มีการอ้างว่าตรวจเครื่องมือถือจริงจาก browser fixtures:

| ขั้นตรวจ | ผล | หลักฐาน |
|---|---|---|
| Regression แบบ sequential | Passed | 111/111; log: work/skills-refresh-regression-20261015.log (ignored local artifact) |
| Login | Passed | auth-flow-browser: 1440/390px, light/dark, validation, delayed response, Back, signout |
| Map | Passed | overview-pan-browser: 1920/390px, mouse/touch, rotation, zoom/reset, selection |
| Product history | Passed | range-browser: 1440/390/768px, default dates, inclusive range, invalid range, prior balance |
| เอกสาร | Passed | 6 ไฟล์, local links 60 จุด, FR-1–15, user-specified rules ครบ, git diff --check |
| AGENTS แยกไฟล์ | Not applicable | 1,903 tokens อยู่ในเกณฑ์ Good |
| Gesture fixture | Adjusted, passed | เพิ่ม native event method ใน mock และ assert ว่า default ถูก prevent; ไม่แก้ runtime |
| Mermaid | Passed structural checks only | 2 blocks/code fences; ไม่ render ภาพในงานนี้ |
| Production DB/security/load/device | Not applicable | ไม่มีการตรวจ live DB ใหม่, benchmark หรือการรับรองเครื่องจริง |

- AGENTS.md ประมาณ 1,903 tokens ด้วยตัวประเมินของสกิล อยู่ในเกณฑ์ Good (ไม่เกิน 2,000) จึงไม่ต้องแยกไฟล์
- Architecture ใช้ Mermaid และคำบรรยายระดับสถาปัตยกรรม ไม่มี source snippet ที่คัดจาก implementation
- ตรวจ Mermaid ในระดับโครงสร้าง/code fence; รอบนี้ไม่สร้างภาพ render ใหม่
- ลิงก์เว็บภายนอกที่มีอยู่เป็นแหล่งอ้างอิงเดิม ไม่ถือเป็นการตรวจเนื้อหา upstream ล่าสุด
- ไม่แก้ไฟล์ audit ที่ค้าง untracked จากงานก่อน และไม่เปลี่ยน memory ส่วนกลาง
