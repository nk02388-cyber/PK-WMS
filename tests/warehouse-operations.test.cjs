const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync(new URL('../warehouse-operations.js',`file://${__filename.replaceAll('\\','/')}`),'utf8');
function setup(search=''){
 let admin=false,writes=0,observed;const listeners={};const frame={attrs:{},hasAttribute(k){return k in this.attrs},removeAttribute(k){delete this.attrs[k]},set src(v){this.attrs.src=v}};
 const pane={_hidden:true,get hidden(){return this._hidden},set hidden(v){writes++;this._hidden=v}};
 const button={hidden:true,addEventListener(k,fn){listeners[k]=fn},click(){pane.hidden=false;listeners.click()}};
 const window={getWmsIsAdmin:()=>admin,addEventListener(k,fn){listeners[k]=fn}};
 vm.runInNewContext(source,{window,location:{search},URLSearchParams,document:{getElementById:id=>id.startsWith('tab-')?button:id.startsWith('pane-')?pane:frame},MutationObserver:class{constructor(fn){observed=fn}observe(){}}});
 return {button,pane,frame,refresh(){listeners['wms:account-changed']()},setAdmin(v){admin=v},observer(){observed()},get writes(){return writes}};
}
test('keeps unauthenticated pane hidden without a mutation loop',()=>{const s=setup();s.observer();assert.equal(s.writes,0);assert.equal(s.button.hidden,true);assert.deepEqual(s.frame.attrs,{})});
test('loads migrated app only for Admin, and unloads it on logout',()=>{const s=setup();s.setAdmin(true);s.refresh();assert.equal(s.button.hidden,false);assert.deepEqual(s.frame.attrs,{});s.button.click();assert.equal(s.frame.attrs.src,'/operations/');s.setAdmin(false);s.refresh();assert.equal(s.pane.hidden,true);assert.deepEqual(s.frame.attrs,{});const n=s.writes;s.observer();assert.equal(s.writes,n)});
test('old app deep link opens the new Admin menu once',()=>{const s=setup('?module=warehouse-operations');s.setAdmin(true);s.refresh();assert.equal(s.frame.attrs.src,'/operations/');const n=s.writes;s.refresh();assert.equal(s.writes,n)});
