const assert=require('node:assert/strict');
const dates=require('../date-display.js');
for(const [input,expected] of [
 ['2026-07-30','30/07/2026'],['2025-05-05','05/05/2025'],['5/5/2025','05/05/2025'],
 ['30/7/2569','30/07/2026'],['ณ วันที่: 21 ต.ค. 69','21/10/2026'],['15 ธันวาคม 2569','15/12/2026'],
 ['ข้อมูล ณ วันที่ 21 ต.ค. 69','21/10/2026'],['อัปเดต 21/10/2026','21/10/2026'],
 ['2024-02-29','29/02/2024'],['2026-02-29','—'],['2026-04-31','—'],['1900-02-29','—'],
 ['2026-10-20T18:30:00Z','21/10/2026'],['2026-10-20T23:30:00-05:00','21/10/2026'],
 ['2026-02-30T00:00:00Z','—'],['','—'],[null,'—'],['0000-01-01','—'],['invalid','—'],['<img>','—']
])assert.equal(dates.date(input),expected,JSON.stringify(input));
assert.equal(dates.dateTime('2026-10-20T18:30:59Z'),'21/10/2026 01:30:59');
assert.equal(dates.dateTime('2026-07-30'),'30/07/2026','date-only values must not invent a time');
assert.equal(dates.dateTime('2026-02-30T00:00:00Z'),'—');
assert.equal(dates.date(new Date('2026-10-20T18:30:00Z')),'21/10/2026');
assert.equal(dates.dateTime(new Date('2026-10-20T18:30:00Z')),'21/10/2026 01:30:00');
assert.equal(dates.dateTime(new Date('invalid')),'—');
console.log('PASS shared date display: DD/MM/YYYY Gregorian, legacy Thai/BE metadata, leap validation, Bangkok timestamps and no invented date/time');
