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
  user:'postgres',password:'local-test-only',port:55446,persistent:true,
  authMethod:'scram-sha-256',initdbFlags:['--encoding=UTF8','--locale=C'],
  postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{},onError:()=>{}});

try {
 await server.initialise();await server.start();
 const client=new Client({host:'127.0.0.1',port:55446,user:'postgres',password:'local-test-only',database:'postgres'});await client.connect();
 try {
 await client.query(`create schema extensions;create extension pgcrypto with schema extensions;
 create table public.stock_inventory_settings(singleton boolean,pin_hash text);insert into public.stock_inventory_settings values(true,extensions.crypt('fixture-pin',extensions.gen_salt('bf')));
 create function public.has_menu_access(text) returns boolean language sql as $$select coalesce(current_setting('qa.allowed',true),'no')='yes'$$;
 create function public.save_pallet_changes(jsonb,jsonb) returns jsonb language sql as $$select jsonb_build_object('slots',$1,'dates',$2)$$;`);
 const sql=await fs.readFile(path.join(root,'supabase-pallet-transfer-pin.sql'),'utf8');await client.query('create role anon;create role authenticated;');await client.query(sql);
 await assert.rejects(()=>client.query("select verify_pallet_transfer_pin('fixture-pin')"),/ไม่มีสิทธิ์/);
 await client.query("set qa.allowed='yes'");
 await assert.rejects(()=>client.query("select verify_pallet_transfer_pin('wrong')"),/ไม่ถูกต้อง/);
 await assert.rejects(()=>client.query("select import_pallet_changes('wrong','[]','[]')"),/ไม่ถูกต้อง/);
 assert.equal((await client.query("select verify_pallet_transfer_pin('fixture-pin') ok")).rows[0].ok,true);
 const result=(await client.query("select import_pallet_changes('fixture-pin','[{\"zone\":\"QA\",\"expected_version\":3}]','[]') value")).rows[0].value;
 assert.equal(result.slots[0].expected_version,3);
 assert.equal((await client.query("select has_function_privilege('anon','public.verify_pallet_transfer_pin(text)','execute') ok")).rows[0].ok,false);
 console.log('PASS shared stock PIN validation, bad PIN denial, permission denial, import delegation and anonymous denial');
 }finally{await client.end();}
}finally{await server.stop();}
