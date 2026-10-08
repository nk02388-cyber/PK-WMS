// Opt-in integration test. Called by a local PostgreSQL runner; never accepts a remote target.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=async function runDatabaseIntegration({Client,connection}) {
  assert.ok(['127.0.0.1','localhost','::1'].includes(connection.host),'Local database required');
  assert.match(connection.database,/^codex_test_/);
  const admin=new Client(connection);await admin.connect();const clients=[];
  const report={checks:[],findings:[]};
  const pass=(s)=>report.checks.push(s);
  try {
    await admin.query(`create role anon; create role authenticated; create schema extensions;
      create extension pgcrypto with schema extensions; create publication supabase_realtime;`);
    await admin.query(fs.readFileSync(path.join(__dirname,'..','supabase-pallet.sql'),'utf8'));
    await admin.query(fs.readFileSync(path.join(__dirname,'..','supabase-stock.sql'),'utf8'));
    // Schema/policies are loaded from the repository and were compared with the live catalog.
    for(const [user,role] of [['qa_user_a','authenticated'],['qa_user_b','authenticated'],['qa_guest','anon']]) {
      await admin.query(`create role ${user} login password 'local-test-only'; grant ${role} to ${user};`);
      const client=new Client({...connection,user,password:'local-test-only'});await client.connect();clients.push(client);
    }
    const [a,b,guest]=clients;
    const original={code:'QA-STOCK',name:'Synthetic integration item',unit:'ใบ',qty:20,remainingQty:15,
      receiveDate:'2026-09-01',withdrawals:[{qty:5,date:'2026-09-02',unit:'ใบ',by:'QA'}]};
    await a.query(`insert into public.pallet_slots(zone,slot_code,occupied,items,updated_at)
      values('QA','QA-01',true,$1,'2000-01-01T00:00:00Z')`,[JSON.stringify([original])]);
    assert.equal((await b.query("select items from public.pallet_slots where zone='QA'")).rows.length,1);
    pass('Two separate authenticated database accounts can read the shared synthetic slot');
    for(const client of [a,b,guest]) {
      await assert.rejects(client.query('select * from public.stock_inventory_settings'),e=>e.code==='42501');
      await assert.rejects(client.query('select * from public.stock_inventory_snapshots'),e=>e.code==='42501');
      await assert.rejects(client.query("delete from public.pallet_slots where zone='QA'"),e=>e.code==='42501');
    }
    pass('anon/authenticated direct PIN-table, snapshot-table and DELETE access denied');
    await guest.query(`insert into public.receive_dates(item_code,receive_date) values('QA-GUEST','2026-09-01')`);
    await guest.query(`update public.receive_dates set receive_date='2026-09-02' where item_code='QA-GUEST'`);
    await guest.query(`insert into public.pallet_slots(zone,slot_code,items) values('QA','QA-GUEST','[]')`);
    await guest.query(`update public.pallet_slots set occupied=true where zone='QA' and slot_code='QA-GUEST'`);
    report.findings.push('Current production-equivalent policies allow unauthenticated pallet and receive-date inserts/updates. Authentication/role separation is not enforced.');
    const pin='test-pin-only';
    await admin.query("update public.stock_inventory_settings set pin_hash=extensions.crypt($1,extensions.gen_salt('bf'))",[pin]);
    const args=['Test date','Synthetic test',JSON.stringify([{code:'QA',name:'Synthetic',unit:'ใบ',qty:20,value:20,wh:'200',cat:'Test'}])];
    await assert.rejects(guest.query('select public.replace_stock_inventory($1,$2,$3,$4)',[...args,'wrong-test-pin']),/Invalid Update PIN/);
    assert.equal((await admin.query('select count(*)::int n from public.stock_inventory_snapshots')).rows[0].n,0);
    await guest.query('select public.replace_stock_inventory($1,$2,$3,$4)',[...args,pin]);
    assert.equal((await admin.query('select count(*)::int n from public.stock_inventory_snapshots')).rows[0].n,1);
    pass('Wrong PIN rejects a write without adding a snapshot; synthetic correct PIN creates one snapshot');
    const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
    const extract=n=>html.match(new RegExp(`(?:async )?function ${n}\\([^]*?\\n\\}`))[0];
    const source=['movementMatchesSnapshot','formatMovementDate','getRemainingQty','movementNumber','movementDateKey',
      'getStockMovement','prepareMovementEdit','persistMovementEdit'].map(extract).join('\n');
    // Apply current versioned write and audit migrations to the isolated schema.
    await admin.query(`create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.app_users(id uuid primary key,username text,role text,active boolean default true);
      insert into auth.users values ('11111111-1111-4111-8111-111111111111','a@test.local',now(),false),('22222222-2222-4222-8222-222222222222','b@test.local',now(),false);
      insert into public.app_users values ('11111111-1111-4111-8111-111111111111','User A','user',true),('22222222-2222-4222-8222-222222222222','User B','user',true);`);
    for(const migration of ['supabase-pallet-security.sql','supabase-pallet-public-edit.sql','supabase-pallet-audit.sql','supabase-pallet-audit-login-actor.sql'])
      await admin.query(fs.readFileSync(path.join(__dirname,'..',migration),'utf8'));
    await a.query("select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false)");
    await b.query("select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false)");
    for(const client of [a,b,guest]){
      await assert.rejects(client.query("update public.pallet_slots set occupied=false where zone='QA'"),e=>e.code==='42501');
      await assert.rejects(client.query("insert into public.receive_dates values('QA-DIRECT','2026-09-03',now(),1)"),e=>e.code==='42501');
    }
    pass('Current migrations deny direct inventory writes for every browser role');
    await assert.rejects(guest.query("select public.save_pallet_changes($1::jsonb,'[]')",[JSON.stringify([{zone:'QA',slot_code:'QA-01',occupied:true,items:[{...original,qty:999}],expected_version:1,_audit:{actor:'Forged',action:'adjust',document_no:'QA-1'}}])]),e=>e.code==='42501');
    pass('Anonymous write through the RPC is rejected by the authenticated audit actor check');
    report.findings=[]; // Earlier legacy policy probes were setup checks before current migrations.
    let waiting=0,release;const barrier=new Promise(r=>release=r);
    function userContext(client,actor){
      const local=[JSON.parse(JSON.stringify(original))];
      const ctx=vm.createContext({palletDataReady:true,palletWriteBusy:false,editingSlot:null,palletVersions:new Map(),
        window:{getWmsUsername:()=>actor},slotItemsFor:()=>local,
        buildSlotRow:(zone,slot_code)=>({zone,slot_code,occupied:true,items:local}),
        applyRemoteSlotRow(row){local.splice(0,local.length,...row.items)},applyRemoteReceiveDateRow(){},
        supabaseClient:{async rpc(name,args){
          assert.equal(name,'save_pallet_changes');if(++waiting===2)release();await barrier;
          try{const r=await client.query('select public.save_pallet_changes($1::jsonb,$2::jsonb) data',[JSON.stringify(args.p_slots),JSON.stringify(args.p_dates)]);return {data:r.rows[0].data};}
          catch(error){return {error};}
        }}});
      vm.runInContext(source+'\n'+extract('palletAuditMetadata')+'\n'+extract('savePalletBatch'),ctx);return ctx;
    }
    const ca=userContext(a,'User A'),cb=userContext(b,'User B');
    const edit={zone:'QA',slot:'QA-01',itemIndex:0,version:1,snapshot:JSON.stringify(original)};
    const nextA=ca.prepareMovementEdit(original,'receive',0,{qty:21,date:'2026-09-01',lotNo:'QA',by:'User A'});
    const nextB=cb.prepareMovementEdit(original,'receive',0,{qty:22,date:'2026-09-01',lotNo:'QA',by:'User B'});
    const outcomes=await Promise.allSettled([ca.persistMovementEdit(edit,nextA),cb.persistMovementEdit(edit,nextB)]);
    assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);
    assert.equal(outcomes.filter(o=>o.status==='rejected').length,1);
    assert.match(String(outcomes.find(o=>o.status==='rejected').reason),/คนแก้/);
    const saved=(await admin.query("select items from public.pallet_slots where zone='QA' and slot_code='QA-01'")).rows[0].items[0];
    assert.ok([21,22].includes(saved.qty));assert.equal(saved.remainingQty,saved.qty-5);
    assert.equal(saved.movementEdits.length,1);assert.equal(saved.withdrawals.length,1);
    pass('Actual application movement persistence with two concurrent PostgreSQL sessions: exactly one writer succeeds, the stale writer is rejected, balance/history/audit remain consistent');
    const audit=(await admin.query("select * from public.pallet_audit_log where zone='QA' and slot_code='QA-01'")).rows;
    assert.equal(audit.length,1);assert.ok(['User A','User B'].includes(audit[0].actor_name));assert.equal(Number(audit[0].after_version),2);
    pass('One committed write creates exactly one log with the server-authenticated username');
    return report;
  } finally {await Promise.allSettled(clients.map(c=>c.end()));await admin.end();}
};
