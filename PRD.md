---
artifact: prd
version: "1.1"
created: 2026-10-09
status: current-baseline-with-proposed-follow-ups
---

# PRD — PK WMS

## Overview

### Problem Statement

เจ้าหน้าที่คลังต้องดูสต็อก รับเข้า จัดเก็บ เบิก รับคืน และติดตามการเคลื่อนไหวจากข้อมูลเดียวกัน ทั้งบนคอมพิวเตอร์และมือถือ ระบบต้องค้นหาสินค้าได้จากคำที่ผู้ใช้จำได้ และป้องกันการแก้ไขข้อมูลโดยผู้ไม่มีสิทธิ์ การแก้ UI หลายรอบทำให้เอกสารดีไซน์เดิมไม่ตรงกับ CSS ปัจจุบัน จึงต้องมีข้อกำหนดที่ตรวจเทียบกับโค้ดได้

### Solution Summary

ใช้ PK WMS เดิมต่อบน Vercel/Supabase จัดทำเอกสารผลิตภัณฑ์ สถาปัตยกรรม และดีไซน์เพื่อกำกับงานถัดไป เอกสารนี้แยกพฤติกรรมที่มีแล้วออกจากงานที่เสนอ การย้าย BOM และถอด fallback ของเว็บไซต์ปัจจุบันทำแล้ว; ไม่ได้ประกาศว่าความปลอดภัยทั้งหมดเสร็จแล้ว

### Target Users

- เจ้าหน้าที่คลัง: บัญชีผู้ใช้ที่ได้รับสิทธิ์เมนู ใช้ PIN ตามบัญชี
- Admin: จัดการบัญชี สิทธิ์ สูตร และงานดูแลระบบตามการตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์
- ผู้ใช้ RM/FG: เลือกแผนกเพื่อเปิดระบบแยก ไม่ถือว่าบัญชี PK ให้อำนาจในระบบอื่น

## Goals & Success Metrics

| เป้าหมาย | Baseline ที่มีหลักฐาน | เกณฑ์งานถัดไป | จุดตรวจ |
|---|---|---|---|
| รักษาพฤติกรรมเดิม | Audit 9 ต.ค. 2026: 96 tests ผ่าน | ชุดทดสอบที่เกี่ยวข้องผ่าน ไม่มี regression ใหม่ | ก่อนส่ง release |
| ใช้งานมือถือได้ | Audit: Login/settings ที่ 390px และเมนูที่ 390/768/1440px ผ่าน | ไม่มี page overflow หรือ toolbar บังแผนผังใน viewport ที่ทดสอบ | เมื่อแก้ layout |
| ข้อมูลและสิทธิ์เชื่อถือได้ | สต็อกและ BOM โหลดผ่าน API ที่ตรวจสิทธิ์ ถอดข้อมูลสำรองจาก static assets ของเว็บปัจจุบันแล้ว | ทดสอบปฏิเสธผู้ไม่มีสิทธิ์ และรักษาจำนวน/หน่วย/เวอร์ชัน | เมื่อแก้ข้อมูล/API |
| เอกสารพร้อมส่งต่องาน | จัดทำ baseline ใน release นี้ | ลิงก์ภายในครบ แยก observed/proposed/unknown ชัด | เมื่อเปลี่ยนข้อกำหนด |

ตัวเลขข้างต้นเป็นหลักฐานจากชุดทดสอบ ไม่ใช่อัตราความสำเร็จของผู้ใช้จริง เป้าหมาย latency, uptime, RPO/RTO และ load capacity ยังไม่มี baseline ที่วัดได้ จึงไม่กำหนดตัวเลขสมมุติ

## User Stories

| ID | ความต้องการ | Priority |
|---|---|---|
| US-1 | ผู้ใช้เลือก PK แล้ว Login และเห็นเมนูที่ได้รับสิทธิ์ | P0 |
| US-2 | เจ้าหน้าที่ค้นหาคำบางส่วนของรหัส ชื่อสินค้า หรือข้อมูลที่เกี่ยวข้องได้ | P0 |
| US-3 | เจ้าหน้าที่เปิดแผนผังบนมือถือ ซูม หมุน และเลือกปลายทางคัดลอกพาเลทได้ | P0 |
| US-4 | Admin เปลี่ยนชื่อ PIN/รหัส รูปโปรไฟล์ และสิทธิ์จาก Settings | P0 |
| US-5 | ผู้ดูคลังเห็นความจุ อายุสินค้า และแนวโน้มจากข้อมูลจริง | P1 |

## Scope

### In Scope

ข้อกำหนดระบบ PK ปัจจุบัน: Login, Dashboard, stock/floorplan, incoming/putaway, movement history, BOM/planning, reconciliation, count/scrap, printing, calendar, receipt plan, settings และ Operations ตามเมนูที่มีอยู่ การใช้สกิลในงานนี้คือจัดทำเอกสารอ้างอิงและแก้คำอธิบายดีไซน์ที่ล้าสมัย

### Out of Scope

ไม่เปลี่ยนเป็น React/Next.js ไม่ย้าย hosting และไม่รวมบัญชี RM/FG โดยอัตโนมัติ ไม่เพิ่ม AI ให้ระบบคลัง และไม่เขียน stock/password จริงเพื่อทดสอบเอกสาร

### Future Considerations

BOM เดิมย้ายครบและ stock/BOM โหลดผ่าน API หลัง Login แล้ว ดู [หลักฐานการย้าย](docs/PRIVATE-DATA-MIGRATION-2026-10-09.md); งานต่อคือสำเนาในประวัติ Git/hosting เก่า และประเมิน rate limiting, backup restoration และ monitoring ตาม [รายงาน Audit](docs/SECURITY-AUDIT-2026-10-09.md)

## Solution Design

### Functional Requirements

| ID | ข้อกำหนด | สถานะ | วิธีตรวจ / ผู้ตรวจ |
|---|---|---|---|
| FR-1 | เลือก PK ก่อน Login; เปลี่ยนแผนกล้างรหัสที่ค้าง และไม่ยอมรับผล Login ที่มาช้า | มีแล้ว | `tests/auth-flow-browser.cjs` / ผู้พัฒนา |
| FR-2 | เมนูตามสิทธิ์; API ต้องปฏิเสธบัญชีไม่ active/ไม่มีสิทธิ์ | มี guard; ตรวจเพิ่มต่อ endpoint | credential/SQL fixtures และ server policy review / ผู้พัฒนา |
| FR-3 | ทุกช่องค้นหาที่รองรับค้นคำบางส่วน ใช้ข้อมูลฟิลด์ของหน้านั้น ไม่จับข้อความ HTML ที่ไม่ได้ตั้งใจ | มีแล้ว | `tests/all-keyword-search-browser.cjs`, `tests/operations-keyword-browser.cjs` / ผู้พัฒนา |
| FR-4 | Sidebar เริ่มย่อ เก็บโลโก้; hover/focus เปิดเฉพาะชื่อเมนูนั้น; กด toggle เปิดทั้งแถบอย่างสมูท | มีแล้ว | `tests/sidebar-hover-browser.cjs`, `tests/sidebar-browser.cjs` / ผู้พัฒนา |
| FR-5 | มือถือมี drawer และแผนผังที่ controls ไม่บดบัง; ซูม/หมุน/fullscreen ใช้งานได้ | มีแล้วใน browser fixtures | `tests/map-controls-browser.cjs`, ตรวจเครื่องจริงเพิ่มเติม / ผู้พัฒนาและผู้ใช้ |
| FR-6 | คัดลอกพาเลทไปโซนเดิมได้เมื่อเงื่อนไขถูกต้อง; ไม่ลบข้อมูลต้นทาง; ปฏิเสธ source เวอร์ชันเก่า | มีแล้ว | `tests/slot-self-copy-browser.cjs` / ผู้พัฒนา |
| FR-7 | Settings จัดการชื่อ บัญชี Admin สิทธิ์ PIN/รหัส และ avatar; Header แสดงรูป แต่แก้รูปเฉพาะ Settings | มีแล้ว | `tests/settings-browser.cjs`, backend credential/avatar fixtures / ผู้พัฒนา |
| FR-8 | Dashboard แสดงค่าจริง Trend/donut และ gauge ทั้งรวม/แยกอาคาร; สี gauge เขียว→เหลือง→แดง | มีแล้ว | chart/layout browser checks และคำนวณกับ fixtures / ผู้พัฒนา |
| FR-9 | Animation มีจุดจบตรงค่าจริงและเคารพ reduced motion | มีแล้ว | `tests/trend-motion-browser.cjs`, `tests/building-gauge-browser.cjs` / ผู้พัฒนา |
| FR-10 | สต็อก/BOM ของเว็บไซต์ปัจจุบันโหลดผ่าน API หลัง Login และไม่มี fallback ใน static assets | ทำแล้วสำหรับ stock/BOM; สำเนาเก่าและ catalog ภายนอกยังต้องตัดสินใจ | ตรวจ coverage สูตร, anonymous static fetch, API allow/deny และ invariant สต็อก / ผู้พัฒนา; เจ้าของคลังอนุมัติเทียบข้อมูล |

### User Experience

ใช้ไทยเป็นหลัก Noto Sans Thai และ tokens ใน [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) ลำดับ Dashboard คือภาพรวม → แนวโน้ม → ความจุตามอาคาร/สัดส่วนกิจกรรม → รายละเอียด stock value ปุ่มอัปเดตสต็อกเป็น icon ใน header ข้างปฏิทิน บอกชื่อปุ่มผ่าน accessible label

### Edge Cases

| เหตุการณ์ | พฤติกรรมที่ต้องรักษา |
|---|---|
| Login ล้มเหลว/ผลตอบกลับช้า | ไม่เข้าระบบด้วย state เก่า และไม่เก็บรหัสที่ผู้ใช้ยกเลิกแล้ว |
| Supabase/network ล้มเหลว | แสดงสถานะที่ถูกต้อง ไม่อ้างว่าเขียนข้อมูลสำเร็จ; ล้างข้อมูลจาก API ที่ผิดพลาด ไม่กลับไปใช้ fallback สาธารณะ |
| หน่วยสินค้าต่างกัน | ไม่รวมจำนวนคนละหน่วยหรือเดาอัตราแปลง |
| source/destination ถูกแก้พร้อมกัน | ตรวจ expected version และให้ผู้ใช้โหลดข้อมูลใหม่ |
| Browser storage ใช้ไม่ได้ | UI ไม่ crash และไม่ล้าง business data |
| ไม่มีกิจกรรมในช่วงวันที่ | แสดง empty state/ศูนย์ตามข้อมูล ไม่แต่งเส้นแนวโน้ม |

## Technical Considerations

ดู [ARCHITECTURE.md](ARCHITECTURE.md): สต็อกใช้ `get_latest_stock_inventory`, BOM ต้นฉบับใช้ `get_pk_bom_baseline`, สูตรบันทึกใช้ `get_pk_recipes`, ประวัติสูตรใช้ `get_pk_recipe_versions` ผ่าน Supabase RPC หลัง Login เว็บไซต์ปัจจุบันไม่ฝัง stock/BOM สำรองแล้ว

## Agent Execution Contract

แหล่งอ้างอิง: คำขอปัจจุบันของผู้ใช้กำหนด scope; production schema/code/tests ยืนยันสิ่งที่มี; PRD ระบุสิ่งที่ต้องการ; DESIGN_SYSTEM ระบุภาพลักษณ์ เมื่อเอกสารขัดโค้ด ให้ตรวจต้นทางและบันทึกความต่างก่อนตัดสินใจ ไม่สร้างเงื่อนไขขออนุมัติใหม่จากเอกสารนี้

ทุก FR มีวิธีตรวจและผู้ตรวจในตารางข้างต้น หยุดเฉพาะเมื่อจำเป็นต้องใช้ข้อมูลธุรกิจที่ขาดหรือทำการเปลี่ยนแปลงแบบย้อนกลับไม่ได้: เจ้าของคลังต้องยืนยันหน่วย/ยอด/สูตรที่ขัดกัน; ผู้ดูแลระบบต้องให้สิทธิ์บัญชี hosting/backup ที่ยังไม่มี; ผู้ใช้เป็นผู้ตัดสิน scope ใหม่ ไม่ทดสอบด้วยการแก้สต็อกจริงโดยพลการ

## Dependencies & Risks

| เรื่อง | เจ้าของการตัดสินใจ | แนวทาง |
|---|---|---|
| Supabase availability/Auth/RPC | ผู้ดูแลระบบ | แยก error/loading/success และตรวจ guard ด้วย fixtures |
| สูตร legacy เทียบกับสูตร DB | เจ้าของคลัง + ผู้พัฒนา | ตรวจครบ 757 สูตร / 3,476 lines แล้ว; หน่วยที่ขาดยังต้องให้เจ้าของคลังยืนยันก่อนแก้สูตร |
| Google Sheets receipt plan | เจ้าของไฟล์ต้นทาง | รักษาวันที่/สถานะโหลด ไม่ถือว่าข้อมูลเก่าคือข้อมูลล่าสุด |
| ข้อมูล fallback สาธารณะ | ผู้ดูแลระบบ + เจ้าของคลัง | ถอดจากเว็บปัจจุบันแล้ว; ตรวจประวัติ Git/hosting เก่าและ integrations แยกต่างหาก |
| CSS cascade หลายรุ่น | ผู้พัฒนา | ใช้ computed style และ DESIGN_SYSTEM ปัจจุบัน |

## Timeline & Milestones

1. งานนี้: ติดตั้งสกิลและจัดทำเอกสาร baseline ตรวจลิงก์/คำสั่ง/ความสอดคล้อง
2. งานย้าย API: ตรวจสูตร legacy และ mapping ข้อมูล ทำแผน rollback ก่อนเปลี่ยนหน้าโหลดข้อมูล
3. หลังย้าย: ทดสอบ anonymous denial, authorized load และ mobile/network failure ก่อนส่ง release

ทั้งสาม milestone ดำเนินการในวันที่ 9 ตุลาคม 2026; รายละเอียดการนำเข้าและการทดสอบอยู่ในรายงานการย้าย ไม่มีการแก้ยอดสต็อกจริงเพื่อทดสอบ

## Release acceptance

ผลผ่านในรายงานก่อนหน้าเป็นหลักฐานของ release นั้น งานถัดไปต้องเลือกตรวจตามส่วนที่เปลี่ยนและผ่านเกณฑ์ต่อไปนี้ก่อนส่ง:

| ส่วนที่เปลี่ยน | เกณฑ์ผ่าน | หลักฐาน / ผู้ตรวจ |
|---|---|---|
| Stock/BOM loader (FR-10) | โหลดเมื่อมีสิทธิ์; ผู้ไม่มีสิทธิ์ถูกปฏิเสธ; logout และผลตอบกลับเก่าไม่คืนข้อมูล; static assets ไม่มี payload สำรอง | tests/private-data-browser.cjs, grant review และ anonymous HTTP checks / ผู้พัฒนา |
| สูตรและการคำนวณ | สูตรบันทึกใช้แทนต้นฉบับตาม FG; ไม่เดาหน่วย; version conflict ไม่ทับสูตรใหม่ | tests/pk-recipes-browser.cjs และ calculation fixtures / ผู้พัฒนา |
| UI | ขนาดมือถือไม่ overflow; keyboard/focus ใช้งานได้; light/dark และ reduced motion ตาม component | browser checks ตาม DESIGN_SYSTEM / ผู้พัฒนา |
| เอกสาร | ลิงก์ local มีจริง; API/สิทธิ์ตรง schema; proposed/unknown ไม่ถูกอ้างว่าเสร็จ | ตรวจไฟล์และหลักฐาน / ผู้พัฒนา |

## Open Questions

เจ้าของคลังต้องยืนยันว่า catalog รหัส/ชื่อ/หน่วยสำหรับแอปเบิกสินค้าควรเปิดสาธารณะหรือไม่; ต้องการเก็บข้อมูล offline ระดับใด; provider backup/rate limits ปัจจุบันเป็นอย่างไร รายละเอียดอยู่ใน Audit

## Appendix

[AGENTS.md](AGENTS.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) · [Skill provenance](docs/SKILLS.md)
