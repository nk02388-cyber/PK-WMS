import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderWithdrawalReport} from '../operations/print-report.mjs';
const context={formatDate:v=>v||'—',quantity:String,nameFor:()=> 'Worker',jobFor:()=> 'Packaging',statusFor:t=>t.status,documentCount:()=>1,totalDocuments:t=>t.length,counts:{done:1},statusLabels:{done:'Complete'},filtersText:'All',durationFor:()=> '10 min',completenessFor:()=> 'Complete',documentsFor:()=> '<p>Document</p>',varianceFor:()=> 'Exact',printedAt:'2026-10-02'};
test('report preserves long materials and escapes supplied content',()=>{
 const html=renderWithdrawalReport([{ticket_no:'<script>x</script>',fg_code:'FG',fg_name:'A&B',requested_qty:10,status:'done',materials:Array.from({length:70},(_,i)=>({pk_code:`PK-${i}`,pk_name:'<img>',unit:'piece',required_qty:2,actual_qty:0,confirmed_at:'2026-10-02'}))}],context);
 assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt;'));assert.ok(html.includes('A&amp;B'));assert.ok(html.includes('PK-69'));assert.ok(!html.includes('<img>'));
 assert.ok(html.includes('class="report-num">0</td>'));assert.ok(!html.includes('class="report-ticket"'));
});
test('empty reports retain heading and explicit empty state',()=>{
 const html=renderWithdrawalReport([],context);assert.ok(html.includes('ไม่พบใบเบิกตามตัวกรอง'));assert.ok(!html.includes('class="report-detail"'));
});
