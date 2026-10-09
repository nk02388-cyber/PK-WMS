const {test}=require('node:test');
const assert=require('node:assert/strict');
const {cleanup}=require('../cache-maintenance.js');
const storage=entries=>{const map=new Map(Object.entries(entries));return {getItem:k=>map.has(k)?map.get(k):null,removeItem:k=>map.delete(k),map};};
test('removes only obsolete UI caches and preserves operational data and current preferences',()=>{
 const local=storage({'pk-sidebar-collapsed':'true','pk-sidebar-collapsed-v2':'false','pk-notifications-dismissed-v1':'{"day":"2026-10-08","signatures":[]}','bcl-cycle-counts-v1':'counts','pk-dashboard-bom-plan-v1':'draft','pk-event-calendar-v1':'events','sb-project-auth-token':'session'});
 const session=storage({'pk-notifications-toast-seen-v1':'broken','workActorId':'actor'});
 assert.deepEqual(cleanup(local,session,new Date(2026,9,9)).sort(),['pk-notifications-dismissed-v1','pk-notifications-toast-seen-v1','pk-sidebar-collapsed']);
 assert.equal(local.getItem('sb-project-auth-token'),'session');assert.equal(local.getItem('bcl-cycle-counts-v1'),'counts');assert.equal(local.getItem('pk-dashboard-bom-plan-v1'),'draft');assert.equal(local.getItem('pk-event-calendar-v1'),'events');assert.equal(local.getItem('pk-sidebar-collapsed-v2'),'false');assert.equal(session.getItem('workActorId'),'actor');
 assert.deepEqual(cleanup(local,session,new Date(2026,9,9)),[]);
});
test('keeps current-day notification choices and tolerates unavailable browser storage',()=>{
 const raw=JSON.stringify({day:'2026-10-09',signatures:['dismissed']});const local=storage({'pk-notifications-dismissed-v1':raw});const session=storage({'pk-notifications-toast-seen-v1':raw});
 assert.deepEqual(cleanup(local,session,new Date(2026,9,9)),[]);assert.equal(local.getItem('pk-notifications-dismissed-v1'),raw);
 assert.doesNotThrow(()=>cleanup(undefined,undefined));assert.doesNotThrow(()=>cleanup({getItem(){throw Error('blocked');}},undefined));
});
