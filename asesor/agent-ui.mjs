const AGENT_MODULE = './vendor/geeky-agent/0222867adcb94ab3225fb2b61ebff68c3a8cdce1/client.mjs';
// Presentation only; transport is versioned in GuateGeeks/geeky-agent.
const icons = {
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z"/><path d="M7 10h8M7 14h5"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
  send:'<path d="m21 3-7 18-4-7-7-4 18-7ZM10 14 21 3"/>',
  undo:'<path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12"/>'
};
const svg = name => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+icons[name]+'</svg>';
export function mountGeeky({config=window.GG_AGENT_CONFIG || {}, adapter=()=>window.GGCotizadorAgent, createClient}={}) {
  if (config.enabled === false || document.getElementById('geeky-companion')) return;
  const host = document.createElement('aside');
  host.id='geeky-companion';
  host.setAttribute('aria-label','Asistente Geeky');
  host.innerHTML=[
    '<button type="button" id="geeky-launcher" class="geeky-launcher" aria-expanded="false" aria-controls="geeky-panel">'+svg('chat')+'<span><strong>Hola, soy Geeky</strong><small>¿Armamos tu colegio?</small></span></button>',
    '<section id="geeky-panel" class="geeky-panel" aria-labelledby="geeky-title" hidden>',
    '<header class="geeky-header"><div><h2 id="geeky-title">Geeky</h2><p>Tu copiloto de GuateGeeks</p></div><button type="button" id="geeky-close" class="geeky-icon" aria-label="Cerrar chat y desconectar">'+svg('close')+'</button></header>',
    '<div class="geeky-toolbar"><span id="geeky-status" role="status">Listo para ayudarte</span><button type="button" id="geeky-voice" aria-pressed="false">'+svg('mic')+'<span>Activar voz</span></button></div>',
    '<div id="geeky-messages" class="geeky-messages" role="log" aria-label="Conversación con Geeky" aria-live="polite" aria-relevant="additions text"></div>',
    '<div id="geeky-suggestions" class="geeky-suggestions"><button type="button" data-prompt="Ayúdame a empezar mi cotización.">Empezar mi cotización</button><button type="button" data-prompt="Muéstrame el campus y explícame cómo explorarlo.">Explorar el campus</button></div>',
    '<p id="geeky-error" class="geeky-error" role="alert" hidden></p>',
    '<div class="geeky-actionbar"><span id="geeky-action" role="status">Los cambios se ven en tu cotización.</span><button type="button" id="geeky-undo" hidden>'+svg('undo')+'Deshacer</button></div>',
    '<form id="geeky-form" class="geeky-compose"><label for="geeky-input" class="geeky-sr-only">Tu mensaje para Geeky</label><textarea id="geeky-input" rows="2" maxlength="4000" placeholder="Por ejemplo: 24 estudiantes en primero…" enterkeyhint="send"></textarea><button type="submit" id="geeky-send" aria-label="Enviar mensaje">'+svg('send')+'</button></form>',
    '<p class="geeky-disclosure">Asistente de IA. Al conversar, tus mensajes y el contexto de la cotización se procesan con OpenAI. El micrófono solo se usa al activar la voz.</p></section>'
  ].join('');
  document.body.append(host);
  const el = id => host.querySelector('#geeky-'+id);
  let client=null, connecting=null, connected=false, voice=false, busy=false, generation=0, messageCount=0;
  const messages=new Map();
  function refresh() {
    const context = adapter()?.getContext?.();
    el('undo').hidden=!context?.canUndo;
    el('send').disabled=busy || !el('input').value.trim();
    el('voice').disabled=busy;
    el('voice').setAttribute('aria-pressed',String(voice));
    el('voice').querySelector('span').textContent=voice ? 'Desactivar voz' : 'Activar voz';
    el('status').textContent=busy ? 'Conectando…' : connected ? (voice ? 'Voz activa · te escucho' : 'Conectado · solo texto') : 'Listo para ayudarte';
  }
  function error(message) { el('error').textContent=message; el('error').hidden=!message; }
  function showMessage({id,role,text,final}) {
    let item=messages.get(id);
    if (!item) {
      item=document.createElement('div'); item.className='geeky-message'; item.dataset.role=role;
      const label=document.createElement('strong'); label.textContent=role==='user' ? 'Tú' : 'Geeky';
      const content=document.createElement('p'); item.append(label,content); el('messages').append(item); messages.set(id,item);
      if (++messageCount > 150) { const first=messages.keys().next().value; messages.get(first).remove(); messages.delete(first); }
    }
    item.querySelector('p').textContent=text;
    item.setAttribute('aria-busy',String(!final));
    el('messages').scrollTop=el('messages').scrollHeight;
  }
  function onEvent(event) {
    if (event.type==='status') {
      connected=event.status==='connected';
      if (event.status==='disconnected') { voice=false; busy=false; }
    } else if (event.type==='voice') voice=event.enabled;
    else if (event.type==='message') showMessage(event);
    else if (event.type==='error') error(event.message);
    else if (event.type==='action') {
      const result=event.result;
      if (result?.ok === false) error(result.error?.message || result.error || 'No se pudo aplicar ese cambio.');
      else if (event.name!=='get_cotizador_context') el('action').textContent=result?.message || 'Listo. Tu cotización está actualizada.';
    }
    refresh();
  }
  async function ensureConnected() {
    if (connected && client) return client;
    if (connecting) return connecting;
    const current=generation;
    busy=true; error(''); refresh();
    connecting=(async()=>{
      const factory=createClient || (await import(AGENT_MODULE)).createRealtimeClient;
      if (current!==generation) throw new Error('Conversación cerrada.');
      const next=factory({
        endpoint:config.endpoint || '/session',
        executeTool:async(name,args)=>{
          const bridge=adapter();
          if (!bridge) return {ok:false,error:'El cotizador todavía se está preparando. Intenta de nuevo.'};
          return bridge.executeTool(name,args);
        },
        onEvent:event=>{if(current===generation) onEvent(event);}
      });
      client=next;
      await next.connect({voice:false});
      if (current!==generation) { next.disconnect(); throw new Error('Conversación cerrada.'); }
      connected=true;
      return next;
    })();
    try { return await connecting; }
    catch(err) { if (current===generation) { client?.disconnect(); client=null; connected=false; } throw err; }
    finally { if (current===generation) { connecting=null; busy=false; refresh(); } }
  }
  function safeMessage(err) {
    return typeof err?.message==='string' && !/https?:|Bearer|sk-|stack/i.test(err.message)
      ? err.message.slice(0,240) : 'Revisa la conexión y vuelve a intentarlo. Puedes continuar con el formulario.';
  }
  async function send(text) {
    if (!text.trim() || busy) return;
    const current=generation;
    try {
      const active=await ensureConnected();
      if (current!==generation) return;
      await active.sendText(text.trim());
      if (current!==generation) return;
      el('input').value=''; el('suggestions').hidden=true; error(''); refresh(); el('input').focus();
    } catch(err) { if (current===generation) error('No pude enviar tu mensaje. '+safeMessage(err)); }
  }
  function close() {
    generation++; connecting=null; connected=false; voice=false; busy=false;
    client?.disconnect(); client=null;
    el('panel').hidden=true; el('launcher').hidden=false; el('launcher').setAttribute('aria-expanded','false');
    refresh(); el('launcher').focus();
  }
  el('launcher').onclick=()=>{
    el('panel').hidden=false; el('launcher').hidden=true; el('launcher').setAttribute('aria-expanded','true');
    refresh(); el('input').focus();
  };
  el('close').onclick=close;
  el('form').onsubmit=event=>{event.preventDefault(); void send(el('input').value);};
  el('input').oninput=refresh;
  el('input').onkeydown=event=>{
    if (event.key==='Enter' && !event.shiftKey && !event.isComposing) {event.preventDefault(); void send(el('input').value);}
  };
  host.addEventListener('keydown',event=>{if(event.key==='Escape' && !el('panel').hidden) {event.preventDefault(); close();}});
  host.querySelectorAll('[data-prompt]').forEach(button=>button.onclick=()=>{
    el('input').value=button.dataset.prompt; void send(button.dataset.prompt);
  });
  el('voice').onclick=async()=>{
    const current=generation, enabled=!voice;
    error('');
    try {
      const active=await ensureConnected();
      if (current!==generation) return;
      await active.setVoice(enabled);
      if (current!==generation) return;
      voice=enabled;
    } catch(err) {if(current===generation) {voice=false; error(safeMessage(err));}}
    refresh();
  };
  el('undo').onclick=async()=>{
    try {
      const bridge=adapter(), context=bridge?.getContext();
      if(!context?.canUndo) return refresh();
      const result=await bridge.executeTool('undo_cotizador',{expectedRevision:context.revision});
      if(result.ok===false) error(result.error?.message || result.error || 'No se pudo deshacer el cambio.');
      else {el('action').textContent=result.message || 'Deshice el último cambio de Geeky.'; error('');}
    } catch {error('No se pudo deshacer el cambio. Revisa tu cotización.');}
    refresh();
  };
  window.addEventListener('gg:quote-changed',refresh);
  window.addEventListener('pagehide',()=>{generation++; client?.disconnect(); client=null;});
  showMessage({id:'welcome',role:'assistant',text:'¡Hola! Soy Geeky. Transformemos tus ideas en un colegio lleno de posibilidades. Puedo ajustar tu cotización y recorrer el campus contigo. ¿Qué te gustaría crear?',final:true});
  refresh();
  return {close};
}
if (typeof window!=='undefined') mountGeeky();
