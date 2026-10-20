// Local PostgreSQL smoke test for the production access migration.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const runtime = path.resolve(root, '..', 'pg-testing');
const require = createRequire(path.join(runtime, 'package.json'));
const {default: EmbeddedPostgres} = await import(pathToFileURL(require.resolve('embedded-postgres')));
const {Client} = require('pg');
const server = new EmbeddedPostgres({databaseDir:path.join(root,'work','auth-test-'+Date.now()),
  user:'postgres',password:'local-test-only',port:55451,persistent:true,
  authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8','--locale=C'],
  postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{},onError:()=>{}});

try {
 await server.initialise();await server.start();
 const client=new Client({host:'127.0.0.1',port:55451,user:'postgres',password:'local-test-only',database:'postgres'});await client.connect();
 try {
 await client.query(`create schema wms_legacy_archive;create table wms_legacy_archive.snapshots(source_project text,captured_at timestamptz default now(),snapshot jsonb,checksum text);
 create table public.pallet_slots(zone text,slot_code text,items jsonb,occupied boolean,version bigint,updated_at timestamptz,primary key(zone,slot_code));
 create table public.pallet_audit_log(id bigint primary key,zone text,slot_code text,before_items jsonb,after_items jsonb);
 create table public.incoming_pallets(id uuid primary key,zone text,slot_code text);
 create table public.incoming_locations(zone text,slot_code text,primary key(zone,slot_code));
 insert into pallet_slots select 'O-1','O1-'||lpad(n::text,2,'0'),jsonb_build_array(jsonb_build_object('code','QA-'||n,'qty',n*10,'unit','ชิ้น')),true,n,now() from generate_series(1,24)n;
 insert into pallet_slots values('A','A-01','[]',false,1,now());
 insert into pallet_audit_log select n,'O-1','O1-'||lpad(n::text,2,'0'),'[]','[]' from generate_series(1,24)n;
 insert into incoming_pallets values('00000000-0000-0000-0000-000000000001','O-1','O1-15');`);
 const sql=await fs.readFile(path.join(root,'supabase-o1-renumber-20261020.sql'),'utf8');await client.query(sql);
 const {rows}=await client.query('select * from pallet_slots order by zone,slot_code');assert.equal(rows.length,25);
 const order=[1,2,3,4,25,5,6,7,8,26,9,10,11,12,27,13,14,15,16,28,17,18,19,20,29,21,22,23,24,30];
 order.forEach((old,i)=>{const r=rows.find(r=>r.zone==='O-1'&&r.slot_code===`O1-${String(i+1).padStart(2,'0')}`);if(old>24){assert.equal(r,undefined);return;}assert.equal(r.items[0].code,'QA-'+old);assert.equal(Number(r.version),25);});
 assert.equal(rows.find(r=>r.zone==='A').version,'1');
 assert.equal((await client.query('select count(*) from incoming_locations')).rows[0].count,'30');
 assert.equal((await client.query('select count(*) from pallet_audit_log')).rows[0].count,'24');
 assert.equal((await client.query('select slot_code from incoming_pallets')).rows[0].slot_code,'O1-18');
 const backup=(await client.query("select snapshot,checksum=encode(sha256(convert_to(snapshot::text,'UTF8')),'hex') as valid from wms_legacy_archive.snapshots")).rows[0];assert.equal(backup.snapshot.slots.length,24);assert.equal(backup.valid,true);
 const audit=(await client.query('select * from pallet_audit_log order by id')).rows;
 order.forEach((old,i)=>old<=24&&assert.equal(audit.find(r=>Number(r.id)===old).slot_code,`O1-${String(i+1).padStart(2,'0')}`));
 const html=await fs.readFile(path.join(root,'index.html'),'utf8');assert.deepEqual(JSON.parse(html.match(/const O1_FINAL_ORDER = (.*);/)[1]),order);
 await assert.rejects(()=>client.query(sql),/already applied/);await client.query('rollback');console.log('PASS O1 migration: all stock and history identities, versions, backup checksum, incoming refs, other zones, geometry mapping and rerun guard');
 }finally{await client.end();}
}finally{await server.stop();}
