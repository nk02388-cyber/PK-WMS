const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {chromium} = require('C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try {
    for (const mobile of [false, true]) {
      const page = await browser.newPage({viewport:mobile ? {width:390,height:844} : {width:1440,height:1000}, hasTouch:mobile, isMobile:mobile});
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.route('**/*', route => {
        const u = new URL(route.request().url()); if (u.hostname !== 'localhost') return route.abort();
        const file = path.join(root,u.pathname === '/' ? 'index.html' : u.pathname);
        if (!fs.existsSync(file)) return route.abort(); let body = fs.readFileSync(file);
        if (file.endsWith('index.html')) body = body.toString().replace(/const (SUPABASE_URL|STOCK_SUPABASE_URL) = '[^']*';/g,"const $1 = '';").replace(/<script src="account-status.js[^>]*><\/script>/,`<script>document.body.classList.remove('auth-pending','department-choosing');document.body.classList.add('auth-ready');window.getWmsIsAdmin=()=>true;window.getWmsCanAccess=()=>true;window.getWmsActorName=()=> 'QA';supabaseClient={rpc:async()=>({data:[]})};</script>`);
        route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/png'});
      });
      await page.addInitScript(() => {
        window.tones = []; window.contexts = 0;
        window.AudioContext = class {
          constructor() { window.contexts++; this.state='running'; this.currentTime=1; this.destination={}; }
          createOscillator() { const tone={frequency:{setValueAtTime(v){tone.frequencyValue=v;},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){window.tones.push(tone.frequencyValue);},stop(){this.onended?.();}}; return tone; }
          createGain() { return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}; }
        };
      });
      await page.goto('http://localhost/'); await page.waitForTimeout(800);
      await page.evaluate(() => {
        const fixture=document.createElement('div');fixture.style='position:fixed;bottom:0;left:100px;z-index:999999;background:white;padding:8px';
        fixture.innerHTML='<button id="soundQA"><span>Sound QA</span></button><button id="soundDisabled" disabled>Disabled</button>';document.body.append(fixture);
      });
      const button = page.locator('#soundQA');
      if (!mobile) await button.hover();
      assert.equal(await page.evaluate(()=>window.contexts),0,'no startup/initial-hover AudioContext');
      if (mobile) await button.tap(); else await button.click();
      assert.deepEqual(await page.evaluate(()=>window.tones),[660]);
      if (!mobile) {
        await page.mouse.move(900,700);await page.waitForTimeout(90);await button.hover();
        assert.deepEqual(await page.evaluate(()=>window.tones),[660,880]);
        await button.locator('span').hover();
        assert.equal(await page.evaluate(()=>window.tones.length),2,'child hover does not repeat');
        await page.locator('#soundDisabled').hover();
        assert.equal(await page.evaluate(()=>window.tones.length),2,'disabled silent');
      }
      const before = await page.evaluate(()=>window.tones.length);
      await button.evaluate(el=>el.click());
      assert.equal(await page.evaluate(()=>window.tones.length),before,'synthetic clicks silent');
      await button.focus();await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(()=>window.tones.at(-1)),660,'keyboard activation sounds');
      // Reveal preference controls without invoking real account actions.
      await page.evaluate(()=>{document.getElementById('accountPanel').hidden=false;});
      await page.locator('#uiSoundToggle').click();
      assert.equal(await page.locator('#uiSoundToggle').getAttribute('aria-pressed'),'false');
      assert.equal(await page.locator('#uiSoundEnabled').isChecked(),false);
      const mutedCount=await page.evaluate(()=>window.tones.length);await button.click();
      assert.equal(await page.evaluate(()=>window.tones.length),mutedCount,'muted controls silent');
      await page.reload();
      assert.equal(await page.locator('#uiSoundEnabled').isChecked(),false,'mute persists');
      assert.equal(await page.evaluate(()=>window.contexts),0,'muted reload no audio allocation');
      await page.evaluate(()=>{document.getElementById('accountPanel').hidden=false;});
      await page.locator('#uiSoundToggle').click();
      assert.equal(await page.locator('#uiSoundEnabled').isChecked(),true);
      assert.deepEqual(await page.evaluate(()=>window.tones),[660],'unmute confirms once');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no page overflow');
      assert.deepEqual(errors.filter(e=>!e.includes('supabase')),[]);
      console.log(`PASS UI sound ${mobile?'touch':'desktop'}: hover/click/keyboard/mute/persistence/no overflow`);
      await page.close();
    }
    const audioPage = await browser.newPage();
    await audioPage.setContent('<button id="realAudio">Real audio context</button>');
    await audioPage.evaluate(() => {
      const Context = window.AudioContext;
      window.AudioContext = class extends Context {
        constructor() { super(); window.qaAudio = this; }
        createOscillator() { window.qaTones = (window.qaTones || 0) + 1; return super.createOscillator(); }
      };
    });
    await audioPage.addScriptTag({content:fs.readFileSync(path.join(root,'ui-sound.js'),'utf8')});
    await audioPage.locator('#realAudio').click();
    await audioPage.waitForFunction(()=>window.qaAudio?.state==='running');
    await audioPage.locator('#realAudio').click();
    assert.ok(await audioPage.evaluate(()=>window.qaTones>=1),'real Web Audio context creates a tone after gesture');
    await audioPage.evaluate(()=>window.qaAudio.close());await audioPage.close();
    console.log('PASS real Web Audio unlock and oscillator creation (hardware listening not measured)');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
