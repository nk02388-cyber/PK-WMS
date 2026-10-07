const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../account-status.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(loggedIn=false){
 const nodes=new Map(),storage=new Map(),classes=new Set(['department-choosing']);let reloads=0,interval,events=0;
 function node(id){if(nodes.has(id))return nodes.get(id);const handlers={};const el={id,hidden:false,value:'',dataset:{department:'pk'},parentElement:{replaceWith(){}},classList:{add(){},remove(){},contains(){return false}},append(){},replaceChildren(){},setAttribute(){},removeAttribute(){},focus(){el.focused=true},reset(){},addEventListener(k,fn){handlers[k]=fn},querySelector(){return node(id+'-submit')},querySelectorAll(){return []},async fire(k){await handlers[k]?.({preventDefault(){}})}};nodes.set(id,el);return el}
 const pk=node('pk-option'),client={auth:{getUser:async()=>({data:{user:loggedIn?{id:'admin'}:null}}),onAuthStateChange(){},setSession:async()=>({}),signOut:async()=>{}},from(){return {select(){return this},eq(){return this},single:async()=>({data:{username:'Admin',role:'admin',active:true}})}}};
 const document={body:{classList:{remove(...args){args.forEach(v=>classes.delete(v))},add(v){classes.add(v)},contains(v){return classes.has(v)}}},getElementById:node,createElement:()=>node('created-'+nodes.size),querySelector:()=>pk,querySelectorAll:s=>s==='button.department-option'?[pk]:[],addEventListener(){},hidden:false};
 const window={addEventListener(){},dispatchEvent(){events++}};
 vm.runInNewContext(source,{document,window,supabaseClient:client,SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'test',sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},location:{reload(){reloads++}},setInterval(fn){interval=fn},setTimeout,clearTimeout,AbortController,Event,fetch:async()=>({ok:true,json:async()=>({access_token:'test',refresh_token:'test'})})});
 return {node,pk,classes,storage,fail(){client.auth.getUser=async()=>{throw new Error('offline')}},expire(){loggedIn=false},async refresh(){interval();await tick()},get events(){return events},get reloads(){return reloads}};
}
test('signed-out visitor chooses department before login and can go back',async()=>{
 const s=setup();await tick();assert.ok(s.classes.has('department-choosing'));assert.equal(s.node('departmentSignout').hidden,true);
 await s.pk.fire('click');assert.ok(s.classes.has('auth-pending'));assert.ok(s.node('authUsername').focused);
 s.node('authPassword').value='draft';await s.node('authChangeDepartment').fire('click');assert.ok(s.classes.has('department-choosing'));assert.equal(s.node('authPassword').value,'');
});
test('login retains chosen PK department to enter dashboard after reload',async()=>{
 const s=setup();await tick();await s.pk.fire('click');s.node('authUsername').value='Admin';await s.node('authLoginForm').fire('submit');assert.equal(s.storage.get('bcl-wms-selected-department'),'pk');assert.equal(s.reloads,1);
});
test('existing authenticated session still chooses department and opens PK',async()=>{
 const s=setup(true);await tick();assert.ok(s.classes.has('department-choosing'));await s.pk.fire('click');assert.ok(s.classes.has('auth-ready'));
 await s.node('accountChangeDepartment').fire('click');assert.ok(s.classes.has('department-choosing'));
});
test('password visibility toggles and is reset when returning to departments',async()=>{
 const s=setup();await tick();s.node('authPassword').type='password';
 await s.node('authTogglePassword').fire('click');assert.equal(s.node('authPassword').type,'text');
 await s.node('authTogglePassword').fire('click');assert.equal(s.node('authPassword').type,'password');
 await s.node('authTogglePassword').fire('click');await s.node('authChangeDepartment').fire('click');assert.equal(s.node('authPassword').type,'password');
});

test('unchanged account refresh does not redispatch account events; expired session hides settings',async()=>{
 const s=setup(true);await tick();await s.pk.fire('click');const events=s.events;
 await s.refresh();assert.equal(s.events,events);assert.ok(s.classes.has('auth-ready'));
 s.expire();await s.refresh();assert.equal(s.node('accountAdmin').hidden,true);assert.ok(s.classes.has('auth-pending'));assert.equal(s.events,events+1);
});

test('failed account refresh clears privileged controls and reports a retry message',async()=>{
 const s=setup(true);await tick();await s.pk.fire('click');s.fail();await s.refresh();
 assert.equal(s.node('accountAdmin').hidden,true);assert.ok(s.classes.has('auth-pending'));assert.equal(s.node('authError').hidden,false);
});
