/* Geeky semantic boundary. No model-supplied JavaScript or raw state patches. */
(function (root) {
  'use strict';
  const H = root.GGCotizadorHost, C = root.GG_CONFIG, M = root.GGMotor;
  const copy = x => JSON.parse(JSON.stringify(x));
  const fail = (error, message) => { throw Object.assign(new Error(message || error), { code: error }); };
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
  const bool = { type: 'boolean' }, str = { type: 'string' };
  const en = values => ({ type: 'string', enum: values });
  const num = (minimum, maximum) => ({ type: 'integer', minimum, maximum });
  const ids = { type: 'array', items: str, uniqueItems: true, minItems: 1 };
  const nullable = schema => ({ anyOf: [schema, { type: 'null' }] });
  const shape = (properties, optional = []) => ({ type: 'object', properties, required: Object.keys(properties).filter(k => !optional.includes(k)), additionalProperties: false });
  const entry = { entryId: str };
  const actions = {
    set_levels: shape({ levelIds: { ...ids, minItems: 0 } }),
    set_students: shape({ gradeId: str, sectionId: str, students: nullable(num(0, 1000)) }),
    add_section: shape({ gradeId: str, students: nullable(num(0, 1000)) }, ['students']),
    remove_section: shape({ gradeId: str, sectionId: str }),
    add_program: shape({ programId: str, groupIds: ids }),
    remove_program: shape(entry),
    set_program_groups: shape({ ...entry, groupIds: ids }),
    set_schedule: shape({ ...entry, sharing: en(['separate', 'simultaneous', 'unknown']), simIds: { ...ids, minItems: 0 } }),
    set_equipment: shape({ ...entry, units: nullable(num(1, 1000)), stations: bool }, ['stations']),
    set_modality: shape({ ...entry, plan: en(['UNDECIDED', 'INTEGRA', 'FLEX', 'EV8', 'EV16']), flexBimestres: num(1, 4) }, ['flexBimestres']),
    set_tax: shape({ enabled: bool }),
    set_projection: shape({ useSuggested: bool, fee: nullable(num(0, 10000)) }),
    navigate: shape({ step: num(0, 5), entryId: str }, ['entryId']),
    calculate: shape({})
  };
  const sceneActions = {
    focus: shape({ kind: en(['program', 'level', 'overview']), id: str }, ['id']),
    view: shape({ name: en(['overview', 'front', 'patio', 'people', 'program']) }),
    rotate: shape({ direction: en(['left', 'right']) }),
    zoom: shape({ direction: en(['in', 'out']) }),
    reset: shape({}), pause: shape({ paused: bool }), show: shape({ visible: bool }),
    gesture: shape({ name: en(['greet', 'nod', 'point', 'celebrate']) })
  };
  function validate(value, schema) {
    if (schema.anyOf) { if (schema.anyOf.some(s => { try { validate(value, s); return true; } catch (_) { return false; } })) return; fail('invalid_arguments'); }
    if (schema.type === 'null') { if (value !== null) fail('invalid_arguments'); return; }
    if (schema.type === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) fail('invalid_arguments');
      if (Object.keys(value).some(k => !has(schema.properties, k)) || schema.required.some(k => !has(value, k))) fail('invalid_arguments');
      for (const k of Object.keys(value)) validate(value[k], schema.properties[k]);
    } else if (schema.type === 'array') {
      if (!Array.isArray(value) || value.length < schema.minItems || value.length > 200 || new Set(value).size !== value.length) fail('invalid_arguments');
      value.forEach(v => validate(v, schema.items));
    } else if (schema.type === 'integer') {
      if (!integer(value, schema.minimum, schema.maximum)) fail('invalid_arguments');
    } else if (typeof value !== schema.type || schema.type === 'string' && (!value.length || value.length > 150)) fail('invalid_arguments');
    if (schema.enum && !schema.enum.includes(value)) fail('invalid_arguments');
  }
  const groups = s => M.groupsOf(s.enroll, C.LEVELS, s.levels);
  const program = id => C.PROGRAMS.find(p => p.id === id);
  const grade = id => C.LEVELS.find(l => l.grades.some(g => g[0] === id));
  const findEntry = (s, id) => s.selected.find(e => e.id === id) || fail('unknown_entry');
  function validState(s) {
    if (!s || s.v !== 1 || !Array.isArray(s.levels) || !s.enroll || typeof s.enroll !== 'object' || !Array.isArray(s.selected)) fail('invalid_state');
    if (s.levels.some(id => !C.LEVELS.some(l => l.id === id)) || new Set(s.levels).size !== s.levels.length) fail('invalid_state');
    const allIds = new Set();
    for (const [gid, g] of Object.entries(s.enroll)) {
      if (!grade(gid) || !g || !Array.isArray(g.sections) || !integer(g.sections.length, 1, 12)) fail('invalid_state');
      for (const sec of g.sections) {
        if (!sec || typeof sec.id !== 'string' || !sec.id || allIds.has(sec.id) || !(sec.students === null || integer(sec.students, 0, 1000))) fail('invalid_state');
        allIds.add(sec.id);
      }
    }
    const gs = groups(s), seen = new Set(), used = new Set();
    for (const e of s.selected) {
      if (!e || !program(e.programId) || typeof e.id !== 'string' || seen.has(e.id) || !Array.isArray(e.groupIds) || !e.groupIds.length || new Set(e.groupIds).size !== e.groupIds.length || !Array.isArray(e.simIds)) fail('invalid_state');
      seen.add(e.id);
      if (![null,'separate','simultaneous','unknown'].includes(e.sharing) || !(e.units === null || integer(e.units,1,1000)) || !['UNDECIDED','INTEGRA','FLEX','EV8','EV16'].includes(e.plan) || !integer(e.flexBimestres,1,4)) fail('invalid_state');
      for (const id of e.groupIds) {
        const g=gs.find(g=>g.id===id), key=e.programId+'|'+id;
        if (!g || !program(e.programId).grades.includes(g.gradeId) || used.has(key)) fail('invalid_state');
        used.add(key);
      }
      if (e.simIds.some(id=>!e.groupIds.includes(id)) || new Set(e.simIds).size!==e.simIds.length) fail('invalid_state');
    }
  }
  let revision = 0, observed = null, observedCommercial = null, undo = null, sequence = 0;
  const commercialSignature = () => {
    const { step, selectedIndex, levelIndex, ...commercial } = H.getState();
    return JSON.stringify([H.getVersion?.() ?? 0, commercial]);
  };
  const signature = () => JSON.stringify([H.getVersion?.() ?? 0, H.getState()]);
  function observe() {
    const sig = signature(), commercial = commercialSignature();
    if (observed === null) { observed = sig; observedCommercial = commercial; }
    else if (sig !== observed) {
      revision++;
      if (commercial !== observedCommercial) undo = null;
      observed = sig; observedCommercial = commercial;
    }
    return H.getState();
  }
  function getContext() {
    const s = observe();
    try {
      validState(s);
      const gs = groups(s), totals = M.proposalTotals(s.selected,C.PROGRAMS,gs,C.TARIFFS,C.FISCAL);
      const covered = new Set(s.selected.flatMap(e=>e.groupIds));
      const selection = s.selected.map(e => {
        const p=program(e.programId), mine=gs.filter(g=>e.groupIds.includes(g.id)), effectiveUnits=M.effectiveUnits(e,p,gs);
        return { ...copy(e), effectiveUnits, status:M.entryStatus(e,p,gs,C.TARIFFS), analysis:M.analyze({groups:mine,ratio:p.ratio,units:effectiveUnits,sharing:e.sharing,simIds:e.simIds}) };
      });
      const projectionRows=totals.rows.filter(r=>r.quote&&r.entry.plan!=='INTEGRA');
      const projectionStudents=M.uniqueStudents(gs,[...new Set(projectionRows.flatMap(r=>r.entry.groupIds))]);
      const projection=projectionRows.length&&projectionStudents?M.simulateAll(projectionRows.map(r=>r.quote),projectionStudents,s.useSuggested!==false?null:s.fee,C.FISCAL,!!s.iva):null;
      const modalities=['INTEGRA','FLEX','EV8','EV16'].map(plan=>{const rows=totals.rows.filter(r=>r.quote&&r.entry.plan===plan);return {plan,count:rows.length,net:rows.reduce((n,r)=>n+r.quote.net,0),tax:rows.reduce((n,r)=>n+r.quote.tax,0),total:rows.reduce((n,r)=>n+r.quote.total,0)};}).filter(m=>m.count);
      return copy({revision,canUndo:!!undo,step:s.step,catalog:{levels:C.LEVELS,programs:C.PROGRAMS,plans:C.PLANS},enrollment:s.enroll,groups:gs,selection,
        settings:{iva:s.iva,useSuggested:s.useSuggested,fee:s.fee},
        summary:{projection,modalities,net:totals.net,tax:totals.tax,total:totals.total,complete:totals.complete,pricedCount:totals.pricedCount,unpricedCount:totals.unpricedCount,
          registered:gs.reduce((n,g)=>n+(g.students||0),0),participants:M.uniqueStudents(gs,[...covered]),
          pending:selection.filter(e=>e.status!=='priced').map(e=>({entryId:e.id,status:e.status})),
          uncovered:gs.filter(g=>g.students>0&&!covered.has(g.id)).map(g=>g.id),
          warnings:selection.filter(e=>['limited','unconfirmed'].includes(e.analysis.state)).map(e=>({entryId:e.id,coverage:e.analysis.state}))},
        actions,scene:{...(H.sceneCapabilities?.()||{available:false}),actions:sceneActions}});
    } catch (_) { return {revision,canUndo:false,error:'invalid_state',message:'El borrador requiere revisión manual antes de usar Geeky.'}; }
  }
  function ensureGrade(s,gid) {
    const level=grade(gid);
    if (!level || !s.levels.includes(level.id)) fail('unknown_grade');
    if (!s.enroll[gid]) s.enroll[gid]=copy(M.gradeData(s.enroll,gid));
    return s.enroll[gid];
  }
  function participating(s,e,ids_) {
    const gs=groups(s), p=program(e.programId);
    for (const id of ids_) {
      const g=gs.find(g=>g.id===id);
      if (!g || !(g.students>0) || !p.grades.includes(g.gradeId) || s.selected.some(other=>other!==e&&other.programId===e.programId&&other.groupIds.includes(id))) fail('incompatible_group');
    }
  }
  function normalize(s, signatures, calculate, removedIds, touchedIds) {
    const gs=groups(s), active=new Set(gs.filter(g=>g.students>0).map(g=>g.id));
    s.selected.forEach(e=>{
      if (!calculate && !touchedIds.has(e.id) && !e.groupIds.some(id=>removedIds.has(id))) return;
      e.groupIds=e.groupIds.filter(id=>!removedIds.has(id));
      e.simIds=e.simIds.filter(id=>e.groupIds.includes(id));
      if(e.groupIds.length===1){e.sharing='separate';e.simIds=[];}
      if(e.sharing!=='simultaneous') e.simIds=[];
      const ready=e.groupIds.length && e.groupIds.every(id=>active.has(id)) && e.sharing && (e.sharing!=='simultaneous'||e.simIds.length>=2) && (!program(e.programId).ratio||M.effectiveUnits(e,program(e.programId),gs)!==null);
      const signature=M.entrySignature(e,gs);
      if(calculate || signatures.get(e.id)!==signature){ e.confirmed=!!ready; e.calc=ready?signature:null; }
    });
    s.selected=s.selected.filter(e=>e.groupIds.length);
    s.selectedIndex=Math.max(0,Math.min(s.selectedIndex||0,s.selected.length-1));
    s.levelIndex=Math.max(0,Math.min(s.levelIndex||0,s.levels.length-1));
    s.skipped=(s.skipped||[]).filter(id=>active.has(id));
    for(const g of Object.values(s.enroll)) g.sections.forEach((sec,i)=>sec.name=String.fromCharCode(65+i));
    if(s.step===4&&!s.selected.length)s.step=groups(s).some(g=>g.students>0)?3:s.levels.length?2:1;
    else if(s.step>1&&s.step!==5&&!s.levels.length)s.step=1;
  }
  function mutate(s,action,a) {
    const original = JSON.stringify(s), previousGroups = groups(s);
    const signatures = new Map(s.selected.map(e => [e.id, M.entrySignature(e,previousGroups)]));
    let e;
    if(has(a,'entryId'))e=findEntry(s,a.entryId);
    switch(action) {
      case 'set_levels': if(a.levelIds.some(id=>!C.LEVELS.some(l=>l.id===id)))fail('unknown_level'); s.levels=C.LEVELS.filter(l=>a.levelIds.includes(l.id)).map(l=>l.id);break;
      case 'set_students': {const g=ensureGrade(s,a.gradeId),sec=g.sections.find(x=>x.id===a.sectionId);if(!sec)fail('unknown_section');sec.students=a.students;break;}
      case 'add_section': {const g=ensureGrade(s,a.gradeId);if(g.sections.length>=12)fail('section_limit');let id;do{id=a.gradeId+'-agent-'+(++sequence);}while(groups(s).some(g=>g.id===id));g.sections.push({id,name:'',students:a.students??null});break;}
      case 'remove_section': {const g=ensureGrade(s,a.gradeId);if(!g.sections.some(sec=>sec.id===a.sectionId))fail('unknown_section');g.sections=g.sections.filter(sec=>sec.id!==a.sectionId);if(!g.sections.length)g.sections=[{id:a.gradeId+'-agent-'+(++sequence),name:'A',students:null}];break;}
      case 'add_program': {
        if(!program(a.programId))fail('unknown_program');
        let id; do { id=a.programId+'@agent-'+(++sequence); } while(s.selected.some(e=>e.id===id));
        e={id,programId:a.programId,groupIds:[],sharing:null,simIds:[],units:null,stations:false,plan:'UNDECIDED',flexBimestres:1,confirmed:false,calc:null};
        participating(s,e,a.groupIds);e.groupIds=a.groupIds.slice();s.selected.push(e);break;
      }
      case 'remove_program':s.selected=s.selected.filter(x=>x!==e);break;
      case 'set_program_groups':participating(s,e,a.groupIds);e.groupIds=a.groupIds.slice();e.units=null;e.stations=false;e.simIds=[];e.sharing=e.groupIds.length===1?'separate':null;break;
      case 'set_schedule':
        if(a.simIds.some(id=>!e.groupIds.includes(id)) || a.sharing==='simultaneous'&&a.simIds.length<2 || a.sharing!=='simultaneous'&&a.simIds.length)fail('invalid_schedule');
        e.sharing=a.sharing;e.simIds=a.simIds.slice();e.units=null;e.stations=false;break;
      case 'set_equipment':if(!program(e.programId).ratio)fail('custom_equipment');e.units=a.units;e.stations=a.stations??false;break;
      case 'set_modality':e.plan=a.plan;if(has(a,'flexBimestres'))e.flexBimestres=a.flexBimestres;break;
      case 'set_tax':s.iva=a.enabled;break;
      case 'set_projection':s.useSuggested=a.useSuggested;s.fee=a.fee;break;
      case 'navigate':
        if(a.step===2&&!s.levels.length||a.step===3&&!groups(s).some(g=>g.students>0)||a.step===4&&!s.selected.length)fail('step_unavailable');
        s.step=a.step;if(e)s.selectedIndex=s.selected.indexOf(e);break;
      case 'calculate':break;
      default:fail('unknown_action');
    }
    // Unrelated settings must preserve manual pending scope, including empty enrollment.
    if (JSON.stringify(s) === original && action !== 'calculate') return;
    if (!['set_tax','set_projection','navigate'].includes(action)) {
      const removedIds = new Set();
      if (action === 'set_levels') { const currentIds=new Set(groups(s).map(g=>g.id)); previousGroups.filter(g=>!currentIds.has(g.id)).forEach(g=>removedIds.add(g.id)); }
      if (action === 'remove_section' || action === 'set_students' && !(a.students > 0)) removedIds.add(a.sectionId);
      const touchedIds = new Set();
      if (e && s.selected.includes(e)) touchedIds.add(e.id);
      if (action === 'set_students') s.selected.filter(e=>e.groupIds.includes(a.sectionId)).forEach(e=>touchedIds.add(e.id));
      normalize(s,signatures,action==='calculate',removedIds,touchedIds);
    }
    validState(s);
  }
  function executeTool(name, args) {
    try {
      observe();
      if(name==='get_cotizador_context'){validate(args,shape({}));return {ok:true,revision,context:getContext()};}
      if(name==='undo_cotizador'){
        validate(args,shape({expectedRevision:num(0,Number.MAX_SAFE_INTEGER)}));
        if(args.expectedRevision!==revision)fail('revision_conflict');
        if(!undo)fail('undo_unavailable');
        const current=H.getState(), previous=copy(undo);
        const unavailable=current.step===2&&!previous.levels.length || current.step===3&&!groups(previous).some(g=>g.students>0) || current.step===4&&!previous.selected.length;
        previous.step=unavailable?5:current.step;
        previous.selectedIndex=Math.max(0,Math.min(current.selectedIndex||0,previous.selected.length-1));
        previous.levelIndex=Math.max(0,Math.min(current.levelIndex||0,previous.levels.length-1));
        undo=null;H.replaceState(previous);revision++;observed=signature();observedCommercial=commercialSignature();
        return {ok:true,revision,message:'Se deshizo el último cambio de Geeky.',context:getContext()};
      }
      if(name!=='update_cotizador')fail('unknown_tool');
      if(!args||!has(actions,args.action))fail('unknown_action');
      validate(args,shape({action:str,args:actions[args.action],expectedRevision:num(0,Number.MAX_SAFE_INTEGER)}));
      if(args.expectedRevision!==revision)fail('revision_conflict');
      const before=H.getState();validState(before);const draft=copy(before);
      mutate(draft,args.action,args.args);
      if(JSON.stringify(before)!==JSON.stringify(draft)){
        if(args.action==='navigate')H.navigate(draft.step,draft.selectedIndex);
        else { H.replaceState(draft);undo=before; }
        revision++;observed=signature();observedCommercial=commercialSignature();
      }
      return {ok:true,revision,message:'Cotización actualizada.',context:getContext()};
    } catch(e) { return {ok:false,error:e.code||'action_failed',message:e.code?'Revisa los argumentos y el contexto antes de volver a intentar.':'No se pudo completar la acción.',revision,context:getContext()}; }
  }
  // Scene controls have an independent allowlist and never write quotation state.
  const executeQuoteTool=executeTool;
  root.GGCotizadorAgent=Object.freeze({getContext,openProposal(){
    return executeQuoteTool('update_cotizador',{action:'navigate',args:{step:5},expectedRevision:getContext().revision});
  },executeTool(name,args){
    if(name!=='control_campus')return executeQuoteTool(name,args);
    try{
      if(!args||Object.keys(args).some(k=>!['action','args'].includes(k))||!has(sceneActions,args.action))fail('unknown_scene_action');
      validate(args.args,sceneActions[args.action]);
      if(args.action==='focus'){
        if(args.args.kind!=='overview'&&!args.args.id)fail('invalid_arguments');
        if(args.args.kind==='program'&&!program(args.args.id)||args.args.kind==='level'&&!C.LEVELS.some(l=>l.id===args.args.id))fail('unknown_focus');
      }
      return H.scene(args.action,copy(args.args));
    }catch(e){return {ok:false,error:e.code||'scene_failed',message:'No se pudo ajustar el campus.'};}
  }});
})(window);

