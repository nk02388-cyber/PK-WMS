import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../supabase/functions/pk-user-access/index.ts', import.meta.url), 'utf8');
const calls = [];
let duplicate = false;let callerRole='admin';let targetProfile={username:'worker.01',email:'worker.01@pin.bcl-wms.local',role:'user',active:true};
let handler;
let createdPassword;
let loginProfile = { email: 'worker.01@pin.bcl-wms.local', active: true };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status });

vm.runInNewContext(source, {
  Deno: { env: { get: name => ({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' })[name] }, serve: fn => { handler = fn; } },
  Response,
  crypto: globalThis.crypto,
  TextEncoder,
  Uint8Array,
  fetch: async (url, init) => {
    const path = new URL(url).pathname;
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ path, url, method: init.method || 'GET', body });
    if (path === '/auth/v1/user') return json({ id: '11111111-1111-4111-8111-111111111111' });
    if (path === '/rest/v1/app_users' && url.includes('select=role,active') && url.includes('id=eq.22222222')) return json([{ role: 'user', active: true }]);
    if (path === '/rest/v1/app_users' && url.includes('select=role,active')) return json([{ role: callerRole, active: true }]);
    if (path === '/rest/v1/app_users' && url.includes('select=email,active')) return json([loginProfile]);
    if (path === '/rest/v1/app_users' && url.includes('select=id')) return json(duplicate ? [{ id: 'already-exists' }] : []);
    if (path.startsWith('/auth/v1/admin/users/') && init.method==='PUT') {createdPassword=body.password;return json({});}
    if (path === '/rest/v1/app_users' && url.includes('select=username,email,role,active'))return json([targetProfile]);
    if (path === '/auth/v1/admin/users') { createdPassword = body.password; return json({ id: '22222222-2222-4222-8222-222222222222' }); }
    if (path === '/auth/v1/token') return body.password === createdPassword
      ? json({ access_token: 'access', refresh_token: 'refresh' }) : json({}, 401);
    if (path === '/rest/v1/app_users' && init.method === 'POST') return json({}, 201);
    if (path === '/rest/v1/app_users' && init.method === 'PATCH') {if(body.username)targetProfile.username=body.username;return json(body.username?[{id,...targetProfile}]:{});}
    throw new Error(`Unexpected request: ${init.method || 'GET'} ${url}`);
  },
});

const request = (action, input) => new Request('https://zgsxbuckjrplkpvtlbmn.supabase.co/functions/v1/pk-user-access', {
  method: 'POST',
  headers: { origin: 'https://nk02388-cyber.github.io', authorization: 'Bearer signed-in-admin', 'content-type': 'application/json' },
  body: JSON.stringify({ action, ...input }),
});

const created = await handler(request('create', { username: 'Worker.01', pin: '000123' }));
assert.equal(created.status, 201);
assert.deepEqual(JSON.parse(await created.text()), { id: '22222222-2222-4222-8222-222222222222', username: 'worker.01', role: 'user' });
assert.equal(calls.find(call => call.path === '/auth/v1/admin/users')?.body.email, 'worker.01@pin.bcl-wms.local');
assert.equal(calls.find(call => call.path === '/rest/v1/app_users' && call.method === 'POST')?.body.email, 'worker.01@pin.bcl-wms.local');
assert.deepEqual(calls.find(call => call.path === '/rest/v1/app_users' && call.method === 'POST')?.body.menu_access, ['stock']);
assert.match(createdPassword, /^Bcl![0-9a-f]{64}9$/);
assert.ok(!createdPassword.includes('000123'));

const id = '22222222-2222-4222-8222-222222222222';
const permissions = await handler(request('set_menu_access', { id, menu_access: ['incoming','floorplan'] }));
assert.equal(permissions.status, 200);
assert.deepEqual(calls.filter(call => call.path === '/rest/v1/app_users' && call.method === 'PATCH').at(-1)?.body.menu_access, ['incoming','floorplan']);
assert.equal((await handler(request('set_menu_access', { id, menu_access: ['unknown'] }))).status, 400);
assert.equal((await handler(request('set_menu_access', { id, menu_access: ['stock','stock'] }))).status, 400);
assert.equal((await handler(request('set_menu_access', { id, menu_access: [] }))).status, 400);

const login = await handler(request('login', { username: 'Worker.01', password: '000123' }));
assert.equal(login.status, 200);
assert.deepEqual(JSON.parse(await login.text()), { access_token: 'access', refresh_token: 'refresh' });
assert.equal(calls.find(call => call.path === '/auth/v1/token')?.body.password, createdPassword);
assert.equal((await handler(request('login', { username: 'Worker.01', password: '12345' }))).status, 401);

loginProfile = { email: 'admin@bcl-wms.local', active: true };
createdPassword = 'existing-admin-passphrase';
const adminLogin = await handler(request('login', { username: 'Admin', password: createdPassword }));
assert.equal(adminLogin.status, 200);
assert.equal(calls.filter(call => call.path === '/auth/v1/token').at(-1)?.body.password, createdPassword);

for (const pin of ['12345', '1234567', '12a456']) {
  assert.equal((await handler(request('create', { username: 'other', pin }))).status, 400);
}

duplicate = true;
const before = calls.filter(call => call.path === '/auth/v1/admin/users').length;
const rejected = await handler(request('create', { username: 'Worker.01', pin: '000123' }));
assert.equal(rejected.status, 409);
assert.equal(calls.filter(call => call.path === '/auth/v1/admin/users').length, before);
console.log('PASS: six-digit PIN creation, login, validation, and duplicate protection');

// Additional Admin and credential regression cases use mocked Auth only.
duplicate=false;callerRole='admin';
assert.equal((await handler(request('create',{username:'lead',role:'owner',pin:'123456'}))).status,400);
assert.equal((await handler(request('create',{username:'lead',role:'admin',login_kind:'password',password:'short'}))).status,400);
let result=await handler(request('create',{username:'lead',role:'admin',login_kind:'password',password:'QA-password-123'}));assert.equal(result.status,201);
assert.equal(JSON.parse(await result.text()).role,'admin');
assert.equal(calls.filter(c=>c.path==='/rest/v1/app_users'&&c.method==='POST').at(-1).body.role,'admin');
assert.equal(createdPassword,'QA-password-123');
loginProfile={email:'lead@bcl-wms.local',active:true};assert.equal((await handler(request('login',{username:'lead',password:'QA-password-123'}))).status,200);
result=await handler(request('create',{username:'leadpin',role:'admin',pin:'001234'}));assert.equal(result.status,201);
assert.equal(JSON.parse(await result.text()).role,'admin');
targetProfile={username:'worker.01',email:'worker.01@pin.bcl-wms.local',role:'user',active:true};
assert.equal((await handler(request('set_credential',{id,credential:'12345'}))).status,400);
assert.equal((await handler(request('set_credential',{id,credential:'000456'}))).status,200);
loginProfile={email:targetProfile.email,active:true};assert.equal((await handler(request('login',{username:'worker.01',password:'000456'}))).status,200);assert.equal((await handler(request('login',{username:'worker.01',password:'000123'}))).status,401);
targetProfile={username:'Admin',email:'admin@bcl-wms.local',role:'admin',active:true};
assert.equal((await handler(request('set_credential',{id,credential:'QA-new-password'}))).status,200);assert.equal(createdPassword,'QA-new-password');
loginProfile={email:targetProfile.email,active:true};assert.equal((await handler(request('login',{username:'Admin',password:'QA-new-password'}))).status,200);
const writes=calls.filter(c=>c.method==='PUT'||c.method==='POST').length;callerRole='user';
assert.equal((await handler(request('set_credential',{id,credential:'QA-password-123'}))).status,403);
assert.equal((await handler(request('create',{username:'lead2',role:'admin',pin:'001234'}))).status,403);
assert.equal(calls.filter(c=>c.method==='PUT'||c.method==='POST').length,writes);
console.log('PASS: Admin password/PIN creation, reset and new-login validation, old PIN rejected, non-admin denied');

for(const value of [null,[], 'invalid']) {
 const invalid=new Request('https://example.test/',{method:'POST',headers:{origin:'https://bcl-wms.vercel.app'},body:JSON.stringify(value)});
 assert.equal((await handler(invalid)).status,400);
}
const oversized=new Request('https://example.test/',{method:'POST',headers:{origin:'https://bcl-wms.vercel.app'},body:JSON.stringify({action:'login',password:'x'.repeat(9000)})});
assert.equal((await handler(oversized)).status,400);
console.log('PASS: invalid and oversized request bodies are rejected');

callerRole='admin';duplicate=false;targetProfile={username:'worker.01',email:'worker.01@pin.bcl-wms.local',role:'user',active:true};
await handler(request('set_credential',{id,credential:'000789'}));const passwordBeforeRename=createdPassword;
assert.equal((await handler(request('set_username',{id,username:'Worker.New'}))).status,200);
assert.equal(targetProfile.username,'worker.new');assert.equal(createdPassword,passwordBeforeRename);
const patch=calls.filter(c=>c.method==='PATCH'&&c.body.username).at(-1);assert.deepEqual(patch.body,{username:'worker.new'});
loginProfile={email:targetProfile.email,active:true};assert.equal((await handler(request('login',{username:'worker.new',password:'000789'}))).status,200);
await handler(request('set_credential',{id,credential:'000790'}));assert.equal((await handler(request('login',{username:'worker.new',password:'000790'}))).status,200);
duplicate=true;assert.equal((await handler(request('set_username',{id,username:'existing'}))).status,409);duplicate=false;
assert.equal((await handler(request('set_username',{id,username:'bad name'}))).status,400);
assert.equal((await handler(request('set_username',{id:'bad',username:'valid'}))).status,400);
callerRole='user';assert.equal((await handler(request('set_username',{id,username:'valid'}))).status,403);
console.log('PASS rename: unchanged PIN, reset after rename, duplicates, invalid name/id and non-admin denied');
