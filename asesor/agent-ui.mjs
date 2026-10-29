const AGENT_MODULE = './vendor/geeky-agent/6194d34c7fa3911adaea800cd95b095afb1c8b4b/client.mjs';
// Presentation only; transport is versioned in GuateGeeks/geeky-agent.
const icons = {
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
  send:'<path d="m21 3-7 18-4-7-7-4 18-7ZM10 14 21 3"/>',
  undo:'<path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  proposal:'<path d="M14 3H5v18h14V8l-5-5ZM14 3v5h5M8 12h8M8 16h5"/>',
  pause:'<path d="M9 5v14M15 5v14"/>',
  play:'<path d="m8 5 11 7-11 7V5Z"/>'
};
const svg = name => '<svg class="geeky-symbol" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+icons[name]+'</svg>';
const activityCopy={idle:'Listo para tus ideas',listening:'Te escucho',thinking:'Estoy pensando…',speaking:'Te cuento…',acting:'Estoy ajustando tu propuesta…',connecting:'Conectando contigo…',error:'Vamos a intentarlo de nuevo'};
const actionCopy={set_levels:'Niveles actualizados.',set_students:'Matrícula actualizada.',add_section:'Sección agregada.',remove_section:'Sección retirada.',add_program:'Programa agregado a tu propuesta.',remove_program:'Programa retirado.',set_program_groups:'Grupos actualizados.',set_schedule:'Horarios actualizados.',set_equipment:'Equipos actualizados.',set_modality:'Modalidad actualizada.',set_tax:'Vista de impuestos actualizada.',set_projection:'Proyección actualizada.',calculate:'Propuesta revisada.'};

export function mountGeeky({config=window.GG_AGENT_CONFIG || {},adapter=()=>window.GGCotizadorAgent,createClient}={}) {
  if(config.enabled===false || document.getElementById('geeky-companion'))return;
  const host=document.createElement('aside');host.id='geeky-companion';host.setAttribute('aria-label','Asistente Geeky');
  host.innerHTML=[
    '<button type="button" id="geeky-launcher" class="geeky-launcher" aria-expanded="false" aria-controls="geeky-panel"><span id="geeky-launcher-portrait" class="geeky-launcher-portrait"><span id="geeky-character" class="geeky-character" aria-hidden="true"></span></span><span class="geeky-launcher-copy"><strong>Tu idea empieza conmigo.</strong><small>Conversa con Geeky</small></span>'+svg('arrow')+'</button>',
    '<section id="geeky-panel" class="geeky-panel" aria-labelledby="geeky-title" hidden>',
    '<header class="geeky-header"><div id="geeky-portrait" class="geeky-portrait"></div><div class="geeky-intro"><h2 id="geeky-title">Geeky</h2><p>De idea a propuesta, contigo.</p><span id="geeky-status" role="status">Listo para tus ideas</span></div><button type="button" id="geeky-close" class="geeky-icon geeky-close" aria-label="Cerrar chat y desconectar">'+svg('close')+'</button><button type="button" id="geeky-motion" class="geeky-icon geeky-motion" aria-label="Pausar animación de Geeky" aria-pressed="false">'+svg('pause')+'</button></header>',
    '<div class="geeky-proposal-bar"><span><strong>Tu propuesta</strong><small id="geeky-proposal-detail">Un borrador por construir</small></span><button type="button" id="geeky-proposal">Ver propuesta '+svg('arrow')+'</button></div>',
    '<div id="geeky-messages" class="geeky-messages" role="log" aria-label="Conversación con Geeky" aria-live="polite" aria-relevant="additions text"></div>',
    '<div id="geeky-suggestions" class="geeky-suggestions"><button type="button" id="geeky-start">Empezar mi cotización '+svg('arrow')+'</button><button type="button" data-prompt="Muéstrame el campus y explícame cómo explorarlo sin modificar mi propuesta.">Explorar el campus</button></div>',
    '<p id="geeky-error" class="geeky-error" role="alert" hidden></p>',
    '<div class="geeky-actionbar"><span id="geeky-action" role="status">Tú decides. Yo te ayudo a darle forma.</span><button type="button" id="geeky-undo" hidden>'+svg('undo')+'Deshacer</button></div>',
    '<form id="geeky-form" class="geeky-compose"><label for="geeky-input" class="geeky-sr-only">Tu mensaje para Geeky</label><textarea id="geeky-input" rows="2" maxlength="4000" placeholder="Cuéntame cómo imaginas tu colegio…" enterkeyhint="send"></textarea><div class="geeky-compose-tools"><button type="button" id="geeky-voice" aria-pressed="false">'+svg('mic')+'<span>Activar voz</span></button><button type="submit" id="geeky-send" aria-label="Enviar mensaje">'+svg('send')+'</button></div></form>',
    '<p class="geeky-privacy" id="geeky-privacy">Asistente de IA · micrófono apagado</p>',
    '<details class="geeky-disclosure"><summary>Sobre tu conversación</summary><p>Geeky es un asistente de IA. Al conversar, OpenAI procesa tus mensajes y el contexto de la cotización. El micrófono solo se usa al activar la voz.</p></details></section>'
  ].join('');
  document.body.append(host);
  const el=id=>host.querySelector('#geeky-'+id);
  const face=el('character');
  const favicon=document.querySelector('link[rel="icon"]');
  if(favicon){const fallback=new Image();fallback.src=new URL('guategeeks-ojos.png',favicon.href).href;fallback.alt='';fallback.className='geeky-character-fallback';face.append(fallback);}
  let client=null,connecting=null,connected=false,voice=false,busy=false,voiceBusy=false,generation=0,messageCount=0,opened=false;
  let activity='idle',hasError=false,character=null,characterPaused=false,campusPaused=false,lastAction='';
  const messages=new Map();
  const displayState=()=>hasError?'error':busy?'connecting':activity;
  function updateCharacter(){
    const state=displayState();host.dataset.state=state;character?.setState(state);character?.setPaused(characterPaused||campusPaused);character?.setVisible(opened);
    el('status').textContent=state==='idle'&&connected?'Conectado · solo texto':activityCopy[state]||activityCopy.idle;
  }
  function refresh(){
    const context=adapter()?.getContext?.();
    campusPaused=!!context?.scene?.paused;
    el('undo').hidden=!context?.canUndo;
    el('send').disabled=busy||!el('input').value.trim();el('voice').disabled=busy||voiceBusy;
    el('start').disabled=busy;
    el('voice').setAttribute('aria-pressed',String(voice));el('voice').querySelector('span').textContent=voice?'Desactivar voz':'Activar voz';
    el('privacy').textContent=voice?'Micrófono activo · desactívalo cuando quieras':'Asistente de IA · micrófono apagado';
    const count=context?.selection?.length||0;
    el('start').firstChild.textContent=count?'Continuar mi cotización ':'Empezar mi cotización ';
    el('proposal-detail').textContent=count?count+' '+(count===1?'programa seleccionado':'programas seleccionados'):'Un borrador por construir';
    el('proposal').setAttribute('aria-current',context?.step===5?'page':'false');
    el('motion').disabled=campusPaused;el('motion').setAttribute('aria-pressed',String(characterPaused||campusPaused));
    el('motion').setAttribute('aria-label',characterPaused?'Reanudar animación de Geeky':campusPaused?'Animación pausada con el campus':'Pausar animación de Geeky');
    el('motion').innerHTML=svg(characterPaused||campusPaused?'play':'pause');
    updateCharacter();
  }
  function error(message){hasError=!!message;el('error').textContent=message;el('error').hidden=!message;updateCharacter();}
  function gesture(name){try{adapter()?.executeTool?.('control_campus',{action:'gesture',args:{name}});}catch{/* optional scene never blocks chat */}}
  function showMessage({id,role,text,final}){
    let item=messages.get(id);
    if(!item){
      item=document.createElement('div');item.className='geeky-message';item.dataset.role=role;
      const label=document.createElement('strong');label.textContent=role==='user'?'Tú':'Geeky';
      const content=document.createElement('p');item.append(label,content);el('messages').append(item);messages.set(id,item);
      if(++messageCount>150){const first=messages.keys().next().value;messages.get(first).remove();messages.delete(first);}
    }
    const log=el('messages'),follow=log.scrollHeight-log.scrollTop-log.clientHeight<80||role==='user';
    item.querySelector('p').textContent=text;item.setAttribute('aria-busy',String(!final));
    if(follow)log.scrollTop=log.scrollHeight;
  }
  function onEvent(event){
    if(event.type==='status'){
      connected=event.status==='connected';
      if(event.status==='disconnected'){voice=false;busy=false;activity='idle';}
    }else if(event.type==='activity')activity=event.state;
    else if(event.type==='voice'){voice=event.enabled;if(!voice&&['listening','speaking'].includes(activity))activity='idle';}
    else if(event.type==='message')showMessage(event);
    else if(event.type==='error')error(event.message);
    else if(event.type==='action'){
      if(event.result?.ok===false)error(event.result.message||'No pude aplicar ese cambio. Revisemos los datos.');
      else if(event.name!=='get_cotizador_context'){
        el('action').textContent=lastAction||event.result?.message||'Listo. Tu propuesta está actualizada.';
        character?.react('success');gesture('nod');lastAction='';
      }
    }
    refresh();
  }
  async function ensureConnected(){
    if(connected&&client)return client;if(connecting)return connecting;
    const current=generation;busy=true;error('');refresh();
    connecting=(async()=>{
      const factory=createClient||(await import(AGENT_MODULE)).createRealtimeClient;
      if(current!==generation)throw new Error('Conversación cerrada.');
      const next=factory({endpoint:config.endpoint||'/session',executeTool:async(name,args)=>{
        const bridge=adapter();if(!bridge)return {ok:false,error:'El cotizador todavía se está preparando. Intenta de nuevo.'};
        const result=await bridge.executeTool(name,args);
        if(result?.ok!==false){lastAction=name==='update_cotizador'?actionCopy[args.action]||'Vista de la propuesta actualizada.':name==='undo_cotizador'?'Deshice el último cambio de Geeky.':name==='control_campus'?'Campus actualizado.':lastAction;}
        return result;
      },onEvent:event=>{if(current===generation)onEvent(event);}});
      client=next;await next.connect({voice:false});
      if(current!==generation){next.disconnect();throw new Error('Conversación cerrada.');}
      connected=true;return next;
    })();
    try{return await connecting;}
    catch(err){if(current===generation){client?.disconnect();client=null;connected=false;}throw err;}
    finally{if(current===generation){connecting=null;busy=false;refresh();}}
  }
  function safeMessage(err){return typeof err?.message==='string'&&!/https?:|Bearer|sk-|stack/i.test(err.message)?err.message.slice(0,240):'Revisa la conexión y vuelve a intentarlo. Puedes continuar con el formulario.';}
  async function send(text){
    if(!text.trim()||busy)return;const current=generation;
    try{
      error('');const active=await ensureConnected();if(current!==generation)return;
      await active.sendText(text.trim());if(current!==generation)return;
      el('input').value='';el('suggestions').hidden=true;refresh();
      // Keep the mobile keyboard closed when a suggestion starts the conversation.
      if(document.activeElement===el('input'))el('input').focus({preventScroll:true});
    }catch(err){if(current===generation){busy=false;error('No pude enviar tu mensaje. '+safeMessage(err));refresh();}}
  }
  function openProposal(){
    const result=adapter()?.openProposal?.();
    if(!result?.ok){error('Todavía no pude abrir la propuesta. Intenta de nuevo en un momento.');return false;}
    error('');el('action').textContent='Tu propuesta está abierta. La construiremos paso a paso.';character?.react('success');gesture('point');refresh();return true;
  }
  function close(){
    generation++;connecting=null;connected=false;voice=false;busy=false;voiceBusy=false;activity='idle';opened=false;
    client?.disconnect();client=null;character?.setVisible(false);
    el('launcher-portrait').append(face);el('panel').hidden=true;el('launcher').hidden=false;el('launcher').setAttribute('aria-expanded','false');
    refresh();el('launcher').focus({preventScroll:true});
  }
  el('launcher').onclick=()=>{
    opened=true;el('portrait').append(face);el('panel').hidden=false;el('launcher').hidden=true;el('launcher').setAttribute('aria-expanded','true');
    refresh();character?.react('greet');gesture('greet');el('close').focus({preventScroll:true});
  };
  el('close').onclick=close;
  el('proposal').onclick=()=>{if(openProposal())close();};
  el('start').onclick=()=>{if(openProposal())void send('Armemos mi propuesta. Guíame con una pregunta a la vez y mantén la vista de Propuesta mientras la completamos.');};
  el('form').onsubmit=event=>{event.preventDefault();void send(el('input').value);};
  el('input').oninput=refresh;
  el('input').onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();void send(el('input').value);}};
  host.addEventListener('keydown',event=>{if(event.key==='Escape'&&!el('panel').hidden){event.preventDefault();close();}});
  host.querySelectorAll('[data-prompt]').forEach(button=>button.onclick=()=>void send(button.dataset.prompt));
  el('motion').onclick=()=>{characterPaused=!characterPaused;refresh();};
  el('voice').onclick=async()=>{
    if(voiceBusy)return;const current=generation,enabled=!voice;voiceBusy=true;error('');refresh();
    try{const active=await ensureConnected();if(current!==generation)return;await active.setVoice(enabled);if(current!==generation)return;voice=enabled;}
    catch(err){if(current===generation){voice=false;error(safeMessage(err));}}
    finally{if(current===generation){voiceBusy=false;refresh();}}
  };
  el('undo').onclick=async()=>{
    try{
      const bridge=adapter(),context=bridge?.getContext();if(!context?.canUndo)return refresh();
      const result=await bridge.executeTool('undo_cotizador',{expectedRevision:context.revision});
      if(result.ok===false)error(result.message||'No pude deshacer el cambio. Revisa tu propuesta.');
      else{el('action').textContent='Deshice el último cambio de Geeky.';error('');character?.react('success');gesture('nod');}
    }catch{error('No pude deshacer el cambio. Revisa tu propuesta.');}refresh();
  };
  const pauseChanged=event=>{campusPaused=!!event.detail?.paused;refresh();};
  window.addEventListener('gg:quote-changed',refresh);window.addEventListener('gg:animations-changed',pauseChanged);
  window.addEventListener('pagehide',()=>{generation++;client?.disconnect();client=null;connecting=null;connected=false;voice=false;busy=false;voiceBusy=false;activity='idle';refresh();character?.setVisible(false);});
  window.addEventListener('pageshow',refresh);
  import('./vendor/agent-character.mjs?v=164').then(({mountGeekyCharacter})=>{
    const fallback=face.querySelector('img');character=mountGeekyCharacter(face);fallback?.remove();refresh();if(opened)character.react('greet');
  }).catch(()=>{/* Original brand image remains if the optional character module fails. */});
  showMessage({id:'welcome',role:'assistant',text:'¡Hola! Soy Geeky. Tú conoces tu colegio; yo te ayudo a darle forma. Abramos tu propuesta y construyámosla juntos.',final:true});refresh();
  return Object.freeze({close,getDiagnostics:()=>({state:displayState(),open:opened,character:character?.getDiagnostics()||null})});
}
if(typeof window!=='undefined')window.GGGeekyCompanion=mountGeeky();