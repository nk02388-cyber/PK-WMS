const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../account-status.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(loggedIn=false){
 const nodes=new Map(),storage=new Map(),classes=new Set(['department-choosing']);let reloads=0,interval,events=0,resolveLogin,delayLogin=false,sessionSets=0,signoutError=false;
 function node(id){if(nodes.has(id))return nodes.get(id);const handlers={};const el={id,hidden:false,value:'',dataset:{department:'pk'},parentElement:{replaceWith(){}},classList:{add(){},remove(){},toggle(){},contains(){return false}},append(){},prepend(){},insertBefore(){},remove(){},replaceChildren(){},setAttribute(){},removeAttribute(){},focus(){el.focused=true},reset(){},addEventListener(k,fn){handlers[k]=fn},querySelector(){return node(id+'-submit')},querySelectorAll(){return []},async fire(k){await handlers[k]?.({preventDefault(){}})}};nodes.set(id,el);return el}
 const pk=node('pk-option'),client={auth:{getUser:async()=>({data:{user:loggedIn?{id:'admin'}:null}}),onAuthStateChange(){},setSession:async()=>{sessionSets++;return {}},signOut:async()=>signoutError?{error:new Error('offline')}:{}},from(){return {select(){return this},eq(){return this},single:async()=>({data:{username:'Admin',role:'admin',active:true}})}}};
 const document={body:{classList:{remove(...args){args.forEach(v=>classes.delete(v))},add(v){classes.add(v)},contains(v){return classes.has(v)}}},getElementById:node,createElement:()=>node('created-'+nodes.size),querySelector:()=>pk,querySelectorAll:s=>s==='button.department-option'?[pk]:[],addEventListener(){},hidden:false};
 const window={addEventListener(){},dispatchEvent(){events++}};
 vm.runInNewContext(source,{document,window,supabaseClient:client,SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'test',sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},location:{reload(){reloads++}},setInterval(fn){interval=fn},setTimeout,clearTimeout,AbortController,Event,fetch:async()=>{if(delayLogin)await new Promise(resolve=>resolveLogin=resolve);return {ok:true,json:async()=>({access_token:'test',refresh_token:'test'})}} });
 return {node,pk,classes,storage,delay(){delayLogin=true},release(){resolveLogin()},failSignout(){signoutError=true},get sessionSets(){return sessionSets},fail(){client.auth.getUser=async()=>{throw new Error('offline')}},expire(){loggedIn=false},async refresh(){interval();await tick()},get events(){return events},get reloads(){return reloads}};
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

test('Back during delayed login discards the reply and prevents duplicate submissions',async()=>{const s=setup();await tick();await s.pk.fire('click');s.delay();const pending=s.node('authLoginForm').fire('submit');await tick();await s.node('authLoginForm').fire('submit');await s.node('authChangeDepartment').fire('click');s.release();await pending;assert.equal(s.sessionSets,0);assert.equal(s.reloads,0);assert.ok(s.classes.has('department-choosing'));assert.equal(s.node('authSubmit').disabled,false);});
test('sign-out failure keeps the session and reports retry',async()=>{const s=setup(true);await tick();await s.pk.fire('click');s.failSignout();await s.node('accountLogout').fire('click');assert.equal(s.reloads,0);assert.equal(s.storage.get('bcl-wms-selected-department'),'pk');assert.equal(s.node('accountPanel').hidden,false);assert.match(s.node('accountStatus').textContent,/ไม่สำเร็จ/);assert.equal(s.node('accountLogout').disabled,false);});

test('successful sign-out clears department selection and privileged UI',async()=>{const s=setup(true);await tick();await s.pk.fire('click');await s.node('accountLogout').fire('click');assert.equal(s.reloads,1);assert.equal(s.storage.has('bcl-wms-selected-department'),false);assert.equal(s.node('accountAdmin').hidden,true);});
