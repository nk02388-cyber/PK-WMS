const assert = require('node:assert/strict');
const test = require('node:test');
const handler = require('../api/pk-bom-baseline.js');

function responseRecorder() {
  return { headers:{}, setHeader(key,value){this.headers[key]=value;}, status(code){this.code=code;return this;}, json(value){this.body=value;return this;} };
}

test('requires a PK WMS session but not a GitHub token for the public baseline', async () => {
  const previous=process.env.PK_BOM_GITHUB_TOKEN;
  delete process.env.PK_BOM_GITHUB_TOKEN;
  try {
    const res=responseRecorder();
    await handler({method:'GET',headers:{}},res);
    assert.equal(res.code,401);
  } finally { if(previous===undefined)delete process.env.PK_BOM_GITHUB_TOKEN;else process.env.PK_BOM_GITHUB_TOKEN=previous; }
});

test('enforces the current BOM menu permission before reading the public file', async () => {
  delete process.env.PK_BOM_GITHUB_TOKEN;
  const originalFetch=global.fetch;let calls=0;
  global.fetch=async()=>{calls++;return Response.json([{active:true,role:'user',menu_access:['stock']}]);};
  try {
    const res=responseRecorder();
    await handler({method:'GET',headers:{authorization:'Bearer valid-user-token'}},res);
    assert.equal(res.code,403);
    assert.equal(calls,1,'must not request GitHub after access is denied');
  } finally { global.fetch=originalFetch;delete process.env.PK_BOM_GITHUB_TOKEN; }
});

test('reads the public GitHub baseline only for an authorized BOM user', async () => {
  delete process.env.PK_BOM_GITHUB_TOKEN;
  const originalFetch=global.fetch;
  const baseline={bom_detail:{FG1:{lines:[]}},fg_catalog:{FG1:{fg:'FG1'}},source_sha256:'a'.repeat(64)};
  const calls=[];
  global.fetch=async(url,options)=>{
    calls.push({url:String(url),headers:options?.headers});
    if(String(url).includes('/rest/v1/app_users'))return Response.json([{active:true,role:'user',menu_access:['bompk']}]);
    return Response.json(baseline);
  };
  try {
    const res=responseRecorder();
    await handler({method:'GET',headers:{authorization:'Bearer valid-user-token'}},res);
    assert.equal(res.code,200);
    assert.deepEqual(res.body,baseline);
    assert.equal(res.headers['Cache-Control'],'no-store');
    assert.equal(calls.length,2);
    assert.equal(calls[1].headers,undefined,'the public GitHub baseline must not require a PAT');
  } finally { global.fetch=originalFetch;delete process.env.PK_BOM_GITHUB_TOKEN; }
});
