'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'artifacts', 'geeky-agent', 'ui-' + Date.now());
const mime = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.glb':'model/gltf-binary'};
const mockClient = `
export function createRealtimeClient({onEvent}) {
  window.agentTest = {connects: 0, disconnects: 0, texts: [], voice: false};
  let next = 0;
  return {
    async connect() { window.agentTest.connects++; onEvent({type:'status',status:'connected'}); },
    async sendText(text) {
      window.agentTest.texts.push(text);
      onEvent({type:'message',id:'u'+(++next),role:'user',text,final:true});
      onEvent({type:'message',id:'a'+next,role:'assistant',text:'<img src=x onerror=alert(1)> Listo, revisemos tu colegio.',final:true});
    },
    async setVoice(enabled) {
      if (enabled) throw new Error('No se pudo acceder al micrófono. Puedes seguir por texto.');
      window.agentTest.voice = false; onEvent({type:'voice',enabled:false});
    },
    disconnect() { window.agentTest.disconnects++; onEvent({type:'status',status:'disconnected'}); }
  };
}`;
(async () => {
  await fs.mkdir(output, {recursive:true});
  const server = http.createServer(async(req,res)=>{
    try {
      const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
      if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');
      res.end(await fs.readFile(file));
    } catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
      const page = await browser.newPage({viewport,reducedMotion:'reduce'});
      await page.route('**/vendor/geeky-agent/**/client.mjs*', route=>route.fulfill({contentType:'text/javascript',body:mockClient}));
      await page.goto('http://127.0.0.1:'+server.address().port+'/asesor/index.html');
      await page.locator('#geeky-launcher').waitFor({timeout:5000});
      assert.equal(await page.evaluate(()=>window.agentTest),undefined,'no automatic remote connection');
      const quote = await page.evaluate(()=>{
        const a=window.GGCotizadorAgent;
        const change=(action,args)=>{const r=a.executeTool('update_cotizador',{action,args,expectedRevision:a.getContext().revision});if(!r.ok)throw new Error(action+': '+r.error);return r.context;};
        change('set_levels',{levelIds:['prim']});
        change('set_students',{gradeId:'p1',sectionId:'p1-1',students:24});
        let c=change('add_program',{programId:'master',groupIds:['p1-1']});
        c=change('set_modality',{entryId:c.selection[0].id,plan:'INTEGRA'});
        const before=c.summary.net, expected=GGMotor.quoteFor('INTEGRA',1,8,GG_CONFIG.TARIFFS.master,GG_CONFIG.FISCAL).net;
        change('set_tax',{enabled:true});
        const undo=a.executeTool('undo_cotizador',{expectedRevision:a.getContext().revision});
        const stale=a.getContext().revision;
        setIva(true);
        const conflict=a.executeTool('update_cotizador',{action:'set_tax',args:{enabled:false},expectedRevision:stale});
        change('navigate',{step:5});
        // A pending manual quote must not be silently repriced by summary rendering.
        state.selected[0].calc='manual-stale-signature'; store();
        const staleEntry=JSON.stringify(state.selected[0]);
        const added=change('add_program',{programId:'electronics',groupIds:['p1-1']});
        const pendingPreserved=JSON.stringify(state.selected.find(e=>e.programId==='master'))===staleEntry && added.selection.find(e=>e.programId==='master').status==='stale';

        return {before,expected,undo:undo.ok,conflict:conflict.error,units:a.getContext().selection[0].effectiveUnits,pendingPreserved};
      });
      assert.equal(quote.before,quote.expected,'same authoritative quote engine');
      assert.equal(quote.units,8);
      assert.equal(quote.pendingPreserved,true,'summary render preserves unrelated pending quote');
      assert.equal(quote.undo,true);
      assert.equal(quote.conflict,'revision_conflict','manual changes invalidate stale commands');
      await page.waitForFunction(()=>window.GGCotizadorHost?.sceneCapabilities().available);
      const scene = await page.evaluate(()=>{
        const a=window.GGCotizadorAgent, before=JSON.stringify(GGCotizadorHost.getState());
        const commands=[
          a.executeTool('control_campus',{action:'focus',args:{kind:'program',id:'master'}}),
          a.executeTool('control_campus',{action:'view',args:{name:'front'}}),
          a.executeTool('control_campus',{action:'rotate',args:{direction:'left'}}),
          a.executeTool('control_campus',{action:'zoom',args:{direction:'in'}}),
          a.executeTool('control_campus',{action:'pause',args:{paused:true}})
        ];
        return {ok:commands.every(x=>x.ok),unchanged:before===JSON.stringify(GGCotizadorHost.getState()),view:mascot.getDiagnostics().view,paused:mascot.getDiagnostics().paused};
      });
      assert.equal(scene.ok,true,'scene tools execute');
      assert.equal(scene.unchanged,true,'scene controls preserve commercial state');
      assert.equal(scene.view,'front');
      assert.equal(scene.paused,true);


      await page.locator('#geeky-launcher').click();
      await page.screenshot({path:path.join(output,viewport.width+'-welcome.png')});
      await page.locator('#geeky-input').fill('Quiero robótica para primaria');
      await page.locator('#geeky-send').click();
      await page.waitForFunction(()=>window.agentTest?.texts.length === 1);
      assert.equal(await page.locator('.geeky-message[data-role="assistant"] img').count(),0,'assistant HTML rendered as text');
      await page.locator('#geeky-voice').click();
      await page.getByText('No se pudo acceder al micrófono. Puedes seguir por texto.',{exact:true}).waitFor();
      assert.equal(await page.locator('#geeky-voice').getAttribute('aria-pressed'),'false');
      await page.locator('#geeky-input').fill('Continuar por texto');
      await page.locator('#geeky-send').click();
      await page.waitForFunction(()=>window.agentTest?.texts.length === 2);
      await page.evaluate(()=>start());
      assert.equal(await page.locator('#geeky-panel').isVisible(),true,'survives quote render');
      const bounds=await page.locator('#geeky-panel').boundingBox();
      assert.ok(bounds.x>=0 && bounds.x+bounds.width<=viewport.width+1 && bounds.y>=0,'panel within viewport');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),'no horizontal overflow');
      await page.screenshot({path:path.join(output,viewport.width+'-panel.png'),fullPage:false});
      await page.locator('#geeky-close').click();
      assert.equal(await page.locator('#geeky-panel').isVisible(),false);
      assert.equal(await page.evaluate(()=>window.agentTest.disconnects),1,'close releases connection');
      await page.locator('#geeky-launcher').click();
      assert.equal(await page.locator('.geeky-message[data-role="user"]').count(),2,'transcript retained on reopen');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#geeky-panel').isVisible(),false);
      await page.close();
    }
    const fallback = await browser.newPage({viewport:{width:390,height:844}});
    await fallback.addInitScript(()=>{
      const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};
    });
    await fallback.route('**/vendor/geeky-agent/**/client.mjs*',route=>route.fulfill({contentType:'text/javascript',body:mockClient}));
    await fallback.goto('http://127.0.0.1:'+server.address().port+'/asesor/index.html');
    await fallback.locator('#geeky-launcher').click();
    await fallback.locator('#geeky-input').fill('Ayúdame sin el campus');
    await fallback.locator('#geeky-send').click();
    await fallback.waitForFunction(()=>window.agentTest?.texts.length===1);
    assert.equal(await fallback.evaluate(()=>GGCotizadorAgent.executeTool('control_campus',{action:'rotate',args:{direction:'left'}}).error),'scene_unavailable');
    await fallback.screenshot({path:path.join(output,'no-webgl.png')});
    await fallback.close();

    console.log('PASS desktop/mobile: lazy text connection, escaped messages, microphone denial, text fallback, redraw, bounds, close, reopen, Escape');
    console.log('Screenshots: '+output);
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
