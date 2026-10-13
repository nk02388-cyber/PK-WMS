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
  user:'postgres',password:'local-test-only',port:55443,persistent:true,
  authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8','--locale=C'],
  postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{},onError:()=>{}});

try {
 await server.initialise();await server.start();
 const client=new Client({host:'127.0.0.1',port:55443,user:'postgres',password:'local-test-only',database:'postgres'});await client.connect();
 try {
 await client.query(`create schema wms_legacy_archive;create table wms_legacy_archive.snapshots(source_project text,captured_at timestamptz default now(),snapshot jsonb,checksum text);
 create table public.pallet_slots(zone text,slot_code text,items jsonb,occupied boolean,version bigint,updated_at timestamptz,primary key(zone,slot_code));
 create table public.pallet_audit_log(id bigint primary key,zone text,slot_code text,before_items jsonb,after_items jsonb);
 create table public.incoming_pallets(id bigint primary key,zone text,slot_code text);
 create table public.incoming_locations(zone text,slot_code text,primary key(zone,slot_code));
 insert into pallet_slots select 'T-1','T1-'||lpad(n::text,2,'0'),jsonb_build_array(jsonb_build_object('code','QA-'||n,'qty',n*10,'unit','ชิ้น')),true,3,now() from generate_series(1,18)n where n<>14;
 insert into pallet_slots values('A','A-01','[]',false,1,now());
 insert into pallet_audit_log select n,'T-1','T1-'||lpad((n%18+1)::text,2,'0'),'[]','[]' from generate_series(1,27)n;`);
 const sql=await fs.readFile(path.join(root,'supabase-t1-renumber-20261013.sql'),'utf8');await client.query(sql);
 const {rows}=await client.query('select * from pallet_slots order by zone,slot_code');assert.equal(rows.length,18);assert.equal(rows.find(r=>r.slot_code==='T1-03').items[0].code,'QA-1');assert.equal(rows.find(r=>r.slot_code==='T1-20').items[0].code,'QA-18');assert.ok(rows.filter(r=>r.zone==='T-1').every(r=>Number(r.version)===4));assert.equal(rows.find(r=>r.zone==='A').version,'1');
 assert.equal((await client.query('select count(*) from incoming_locations')).rows[0].count,'20');assert.equal((await client.query('select count(*) from pallet_audit_log')).rows[0].count,'27');assert.equal((await client.query(`select jsonb_array_length(snapshot->'slots') as n from wms_legacy_archive.snapshots`)).rows[0].n,17);
 await assert.rejects(()=>client.query(sql),/already applied/);await client.query('rollback');console.log('PASS T1 migration fixture: contents, versions, backup, history, other zones, incoming locations and rerun guard');
 }finally{await client.end();}
}finally{await server.stop();}
