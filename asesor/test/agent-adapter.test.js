'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const M = require('../motor.js'), C = require('../config.js');
function setup() {
  let state = {v:1,step:1,levels:['prim'],enroll:{p1:{confirmed:true,sections:[{id:'p1-1',name:'A',students:24},{id:'p1-2',name:'B',students:24}]}},selected:[],selectedIndex:0,levelIndex:0,skipped:[],fee:null,useSuggested:true,iva:false};
  let version=0, renders=0;
  const host = {getState:()=>structuredClone(state),getVersion:()=>version,replaceState:s=>{state=structuredClone(s);version++;renders++;},navigate:(step,selectedIndex)=>{state.step=step;if(selectedIndex!==undefined)state.selectedIndex=selectedIndex;version++;renders++;},scene:()=>({ok:false,error:'scene_unavailable'}),sceneCapabilities:()=>({available:false})};
  const window={GG_CONFIG:C,GGMotor:M,GGCotizadorHost:host};
  const path=require('node:path').join(__dirname,'../agent-adapter.js');
  if(fs.existsSync(path)) vm.runInNewContext(fs.readFileSync(path,'utf8'),{window,structuredClone});
  const api=window.GGCotizadorAgent;
  return {api,host,get state(){return state},get renders(){return renders},manual(fn){fn(state);version++;}};
}
function update(x,action,args,revision=x.api.getContext().revision){return x.api.executeTool('update_cotizador',{action,args,expectedRevision:revision});}
test('exposes semantic adapter context and rejects unknown mutation atomically',()=>{
  const x=setup(); assert.ok(x.api,'semantic adapter must exist');
  const before=JSON.stringify(x.state), revision=x.api.getContext().revision;
  assert.equal(update(x,'set_students',{gradeId:'p1',sectionId:'p1-1',students:-1}).ok,false);
  assert.equal(update(x,'set_students',{gradeId:'p1',sectionId:'p1-1',students:25,raw:'bad'}).ok,false);
  assert.equal(update(x,'__proto__',{}).ok,false);
  assert.equal(JSON.stringify(x.state),before);assert.equal(x.api.getContext().revision,revision);assert.equal(x.renders,0);
});
test('quotes use motor rounding per simultaneous section and exact catalogs',()=>{
  const x=setup();assert.ok(x.api,'semantic adapter must exist');
  assert.equal(update(x,'add_program',{programId:'master',groupIds:['p1-1','p1-2']}).ok,true);
  const id=x.state.selected[0].id;
  assert.equal(update(x,'set_schedule',{entryId:id,sharing:'simultaneous',simIds:['p1-1','p1-2']}).ok,true);
  assert.equal(update(x,'set_modality',{entryId:id,plan:'FLEX',flexBimestres:1}).ok,true);
  const c=x.api.getContext();assert.equal(c.selection[0].effectiveUnits,16);assert.equal(c.summary.complete,true);
  assert.equal(c.summary.total,M.proposalTotals(x.state.selected,C.PROGRAMS,M.groupsOf(x.state.enroll,C.LEVELS,x.state.levels),C.TARIFFS,C.FISCAL).total);
  assert.ok(c.actions.set_equipment);assert.ok(c.catalog.programs.length);
});
test('revision guards manual edits and undo never clobbers them',()=>{
  const x=setup();assert.ok(x.api,'semantic adapter must exist');
  const old=x.api.getContext().revision;
  assert.equal(update(x,'set_tax',{enabled:true}).ok,true);
  assert.equal(update(x,'set_tax',{enabled:false},old).error,'revision_conflict');
  assert.equal(x.api.executeTool('undo_cotizador',{expectedRevision:x.api.getContext().revision}).ok,true);assert.equal(x.state.iva,false);
  update(x,'set_tax',{enabled:true});const r=x.api.getContext().revision;
  x.manual(s=>s.enroll.p1.sections[0].students=30);
  assert.equal(x.api.executeTool('undo_cotizador',{expectedRevision:r}).ok,false);
  assert.equal(x.state.enroll.p1.sections[0].students,30);
  assert.equal(x.api.getContext().canUndo,false);
});
test('incompatible groups, invalid terms and invalid scene commands never mutate',()=>{
  const x=setup();assert.ok(x.api,'semantic adapter must exist');
  assert.equal(update(x,'add_program',{programId:'tale',groupIds:['p1-1']}).ok,false);
  update(x,'add_program',{programId:'master',groupIds:['p1-1']});const id=x.state.selected[0].id;
  const before=JSON.stringify(x.state);
  for(const [action,args] of [['set_schedule',{entryId:id,sharing:'simultaneous',simIds:['p1-1']}],['set_equipment',{entryId:id,units:0}],['set_modality',{entryId:id,plan:'FLEX',flexBimestres:5}],['set_program_groups',{entryId:id,groupIds:[]}]]) assert.equal(update(x,action,args).ok,false);
  assert.equal(JSON.stringify(x.state),before);
  assert.equal(x.api.executeTool('control_campus',{action:'zoom',args:{direction:'fly'}}).ok,false);
  assert.equal(x.api.executeTool('control_campus',{action:'gesture',args:{name:'nod'}}).error,'scene_unavailable');
});
test('enrollment clears empty groups and invalid restored state fails safely',()=>{
  const x=setup();assert.ok(x.api,'semantic adapter must exist');
  update(x,'add_program',{programId:'master',groupIds:['p1-1']});
  assert.equal(update(x,'set_students',{gradeId:'p1',sectionId:'p1-1',students:0}).ok,true);
  assert.equal(x.state.selected.length,0);
  x.manual(s=>s.selected.push({programId:'fictional'}));
  assert.equal(update(x,'set_tax',{enabled:true}).ok,false);
  assert.equal(x.state.iva,false);
});


test('host records manual store changes and scene bridge respects pause and reduced motion',()=>{
  const source=fs.readFileSync(require('node:path').join(__dirname,'../asesor.js'),'utf8');
  assert.ok(source.includes('// Geeky host boundary'),'host boundary must exist');
  const code=source.slice(source.indexOf('// Geeky host boundary'));
  let state={v:1,step:1}, version=0, hidden=false, paused=false, reduced=false, calls=[];
  const sandbox={window:{},get state(){return state},set state(s){state=s},ui:{},JSON,
    get agentHostVersion(){return version},render(){version++},store(){},
    document:{getElementById:()=>null},get mascot(){return {rotate:n=>calls.push(n),zoom:n=>calls.push(n),setView:n=>calls.push(n),resetView(){},agentGesture:n=>calls.push(n)}},
    mascotHost:{classList:{contains:()=>true}},get campusHidden(){return hidden},toggleCampus(){hidden=!hidden},
    get animPaused(){return paused},setAnimPaused(v){paused=v},matchMedia:()=>({matches:reduced}),
    inspectCampus(){},campusFeedback:{focus:{programId:'master'}},PROGRAMS:C.PROGRAMS,LEVELS:C.LEVELS};
  vm.runInNewContext(code,sandbox);const h=sandbox.window.GGCotizadorHost;
  assert.equal(h.scene('rotate',{direction:'left'}).ok,true);assert.equal(calls[0],-.25);
  assert.equal(h.scene('gesture',{name:'inject'}).ok,false);
  paused=true;assert.equal(h.scene('gesture',{name:'nod'}).error,'animation_paused');
  paused=false;reduced=true;assert.equal(h.scene('gesture',{name:'nod'}).error,'reduced_motion');
  hidden=true;assert.equal(h.scene('zoom',{direction:'in'}).error,'scene_unavailable');
  assert.equal(h.scene('show',{visible:true}).ok,true);assert.equal(hidden,false);
});
test('scene provides bounded cue method without changing Geeky geometry',()=>{
  const src=fs.readFileSync(require('node:path').join(__dirname,'../lab/campus-scene.js'),'utf8');
  assert.match(src,/function agentGesture\(/);
  const start=src.indexOf('function agentGesture('), end=src.indexOf('\n  }',start)+4;
  let cues=[],scheduled=0;
  const sandbox={disposed:false,reduced:false,paused:false,visible:true,geekyHidden:()=>false,geeky:{cue:n=>{cues.push(n);return true}},schedule:()=>scheduled++};
  vm.runInNewContext(src.slice(start,end)+'\nthis.gesture=agentGesture;',sandbox);
  assert.equal(sandbox.gesture('arbitrary'),false);assert.equal(cues.length,0);
  assert.equal(sandbox.gesture('nod'),true);assert.equal(cues[0],'nod');assert.equal(scheduled,1);
  sandbox.paused=true;assert.equal(sandbox.gesture('greet'),false);
});


test('tax and navigation preserve incomplete manual draft decisions',()=>{
  const x=setup();assert.ok(x.api);
  x.manual(s=>s.selected.push({id:'manual',programId:'master',groupIds:['p1-1'],sharing:'separate',simIds:[],units:null,stations:false,plan:'FLEX',flexBimestres:1,confirmed:false,calc:null}));
  update(x,'set_tax',{enabled:true});
  assert.equal(x.state.selected[0].confirmed,false);
  assert.equal(x.api.getContext().summary.unpricedCount,1);
});
test('atomic setters cover section lifecycle, scoped programs and projection',()=>{
  const x=setup();assert.ok(x.api);
  assert.equal(update(x,'set_levels',{levelIds:['prim','bas']}).ok,true);
  assert.equal(update(x,'set_students',{gradeId:'b1',sectionId:'b1-1',students:25}).ok,true);
  assert.equal(update(x,'add_section',{gradeId:'b1',students:2}).ok,true);
  const section=x.state.enroll.b1.sections[1].id;
  update(x,'add_program',{programId:'master',groupIds:['b1-1',section]});
  const id=x.state.selected[0].id;
  update(x,'set_schedule',{entryId:id,sharing:'simultaneous',simIds:['b1-1',section]});
  update(x,'set_modality',{entryId:id,plan:'EV16'});
  assert.equal(x.api.getContext().selection[0].effectiveUnits,10);
  update(x,'set_equipment',{entryId:id,units:1,stations:true});
  assert.equal(x.api.getContext().summary.warnings[0].coverage,'limited');
  update(x,'set_projection',{useSuggested:false,fee:25});
  assert.equal(x.api.getContext().summary.projection.fee,25);
  update(x,'set_equipment',{entryId:id,units:null});
  update(x,'set_program_groups',{entryId:id,groupIds:['b1-1']});
  assert.equal(x.state.selected[0].sharing,'separate');
  assert.equal(update(x,'navigate',{step:5}).ok,true);
  assert.equal(update(x,'remove_section',{gradeId:'b1',sectionId:section}).ok,true);
  assert.equal(update(x,'remove_program',{entryId:id}).ok,true);
  assert.equal(x.state.selected.length,0);
});
test('manual edit and revert still invalidates revision and undo',()=>{
  const x=setup();assert.ok(x.api);
  update(x,'set_tax',{enabled:true});const r=x.api.getContext().revision;
  x.manual(s=>s.fee=100);x.manual(s=>s.fee=null);
  assert.equal(update(x,'set_tax',{enabled:false},r).error,'revision_conflict');
  assert.equal(x.api.getContext().canUndo,false);
});


for (const students of [null,0]) test('unrelated agent actions preserve manual enrollment '+students+' and pending program scope',()=>{
  const x=setup();
  update(x,'add_program',{programId:'master',groupIds:['p1-1']});
  const id=x.state.selected[0].id;
  update(x,'set_modality',{entryId:id,plan:'FLEX'});
  x.manual(s=>{s.enroll.p1.sections[0].students=students;s.step=5;});
  const entry=JSON.stringify(x.state.selected);
  assert.equal(x.api.getContext().error,undefined);
  for (const [action,args] of [['set_tax',{enabled:true}],['navigate',{step:5}],['set_projection',{useSuggested:false,fee:25}],['set_levels',{levelIds:['prim']}]]) {
    assert.equal(update(x,action,args).ok,true,action);
    assert.equal(JSON.stringify(x.state.selected),entry,action+' must preserve pending manual scope');
    assert.equal(x.state.step,5,action+' must preserve proposal step');
  }
});
test('new entry ids do not collide with persisted agent ids after adapter reload',()=>{
  const x=setup();
  x.manual(s=>s.selected.push({id:'master@agent-1',programId:'master',groupIds:['p1-1'],sharing:'separate',simIds:[],units:null,stations:false,plan:'UNDECIDED',flexBimestres:1,confirmed:false,calc:null}));
  assert.equal(update(x,'add_program',{programId:'master',groupIds:['p1-2']}).ok,true);
  assert.equal(x.state.selected.length,2);
  assert.equal(new Set(x.state.selected.map(e=>e.id)).size,2);
});


test('adding unrelated program preserves stale manual schedule after section removal',()=>{
  const x=setup();
  update(x,'add_program',{programId:'master',groupIds:['p1-1','p1-2']});
  const id=x.state.selected[0].id;
  update(x,'set_schedule',{entryId:id,sharing:'simultaneous',simIds:['p1-1','p1-2']});
  update(x,'set_modality',{entryId:id,plan:'FLEX'});
  x.manual(s=>{
    s.enroll.p1.sections=s.enroll.p1.sections.filter(sec=>sec.id!=='p1-2');
    const e=s.selected[0];e.groupIds=['p1-1'];e.simIds=['p1-1'];
  });
  const before=JSON.stringify(x.state.selected[0]);
  assert.equal(x.api.getContext().selection[0].status,'stale');
  assert.equal(x.api.getContext().summary.net,0);
  assert.equal(update(x,'add_program',{programId:'electronics',groupIds:['p1-1']}).ok,true);
  assert.equal(JSON.stringify(x.state.selected.find(e=>e.id===id)),before);
  assert.equal(x.api.getContext().selection.find(e=>e.id===id).status,'stale');
  assert.equal(x.api.getContext().summary.net,0);
});


test('real host summary render does not reprice untouched stale entries during agent updates',()=>{
  const source=fs.readFileSync(require('node:path').join(__dirname,'../asesor.js'),'utf8');
  const hostCode=source.slice(source.indexOf('// Geeky host boundary'));
  const syncCode=source.match(/function syncCalc\(\) \{[^\n]+/)[0];
  let state=structuredClone(setup().state);
  state.step=5;
  state.selected=[{id:'manual',programId:'master',groupIds:['p1-1'],sharing:'simultaneous',simIds:['p1-1'],units:null,stations:false,plan:'FLEX',flexBimestres:1,confirmed:true,calc:'previous-two-section-signature'}];
  const sandbox={window:{GG_CONFIG:C,GGMotor:M},M,PROGRAMS:C.PROGRAMS,LEVELS:C.LEVELS,JSON,agentHostVersion:0,agentHostRendering:false,
    get state(){return state},set state(next){state=next},groups:()=>M.groupsOf(state.enroll,C.LEVELS,state.levels),
    ui:{},document:{getElementById:()=>null},mascot:null,mascotHost:null,campusHidden:true,animPaused:false,
    matchMedia:()=>({matches:false}),store(){},render(){vm.runInContext('syncCalc()',context)}};
  const context=vm.createContext(sandbox);
  vm.runInContext(syncCode+'\n'+hostCode,context);
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../agent-adapter.js'),'utf8'),context);
  const api=sandbox.window.GGCotizadorAgent, before=JSON.stringify(state.selected[0]);
  const result=api.executeTool('update_cotizador',{action:'add_program',args:{programId:'electronics',groupIds:['p1-1']},expectedRevision:api.getContext().revision});
  assert.equal(result.ok,true);
  assert.equal(JSON.stringify(state.selected[0]),before);
  assert.equal(api.getContext().selection[0].status,'stale');
  assert.equal(api.getContext().summary.net,0);
  assert.equal(sandbox.agentHostRendering,false);
  // An ordinary manual summary still keeps its established recalculation behavior.
  vm.runInContext('syncCalc()',context);
  assert.notEqual(state.selected[0].calc,'previous-two-section-signature');
  sandbox.render=()=>{throw new Error('render failed')};
  assert.throws(()=>sandbox.window.GGCotizadorHost.replaceState(state),/render failed/);
  assert.equal(sandbox.agentHostRendering,false);
});


test('opening an empty proposal is local navigation without inventing quote data',()=>{
  const x=setup();x.manual(s=>{s.levels=[];s.enroll={};s.step=0;});
  const before=structuredClone(x.state);
  const result=x.api.openProposal();
  assert.equal(result.ok,true);assert.equal(result.context.step,5);
  assert.deepEqual(x.state,{...before,step:5});
  assert.equal(result.context.canUndo,false);
  assert.equal(update(x,'navigate',{step:1}).ok,true);
  assert.equal(update(x,'navigate',{step:4}).error,'step_unavailable');
  assert.equal(update(x,'navigate',{step:5}).ok,true);
});
test('proposal navigation preserves commercial undo and undo keeps the current view',()=>{
  const x=setup();update(x,'set_tax',{enabled:true});
  const revision=x.api.getContext().revision;
  assert.equal(x.api.openProposal().context.canUndo,true);
  assert.equal(x.api.getContext().revision,revision+1);
  assert.equal(update(x,'navigate',{step:2}).context.canUndo,true);
  assert.equal(x.api.executeTool('undo_cotizador',{expectedRevision:x.api.getContext().revision}).ok,true);
  assert.equal(x.state.iva,false);assert.equal(x.state.step,2);
});
test('opening a proposal preserves stored stale and pending selections exactly',()=>{
  const x=setup();
  update(x,'add_program',{programId:'master',groupIds:['p1-1']});
  update(x,'set_modality',{entryId:x.state.selected[0].id,plan:'FLEX'});
  x.manual(s=>{s.selected[0].calc='previous-signature';s.enroll.p1.sections[0].students=null;});
  update(x,'set_tax',{enabled:true});
  const before=structuredClone(x.state), status=x.api.getContext().selection[0].status;
  assert.equal(x.api.openProposal().ok,true);
  assert.deepEqual(x.state,{...before,step:5});
  assert.equal(x.api.getContext().selection[0].status,status);
  assert.equal(x.api.getContext().canUndo,true);
});
test('empty proposal gives manual next steps without a fake price or download',()=>{
  const source=fs.readFileSync(require('node:path').join(__dirname,'../asesor.js'),'utf8');
  const code=source.slice(source.indexOf('function renderSummary()'),source.indexOf('function render()'));
  for(const [levels,students,next] of [[[],false,1],[['prim'],false,2],[['prim'],true,3]]) {
    let output='';const state={selected:[],levels};
    vm.runInNewContext(code+';renderSummary();',{state,hasStudents:()=>students,registered:()=>students?24:0,icon:()=>'',frame:(title,description,content)=>{output=title+description+content;}});
    assert.match(output,/Borrador/);assert.ok(output.includes('step('+next+')'));
    assert.match(output,/precios/);assert.doesNotMatch(output,/Q\s*0|downloadPdf/);
  }
});

test('pause control publishes its actual state for the independent portrait',()=>{
  const source=fs.readFileSync(require('node:path').join(__dirname,'../asesor.js'),'utf8');
  const code=source.slice(source.indexOf('function setAnimPaused(v)'),source.indexOf('function syncPauseBtn()'));
  const events=[],sandbox={animPaused:false,mascot:null,duck3:null,localStorage:{setItem(){}},syncPauseBtn(){},window:{dispatchEvent:e=>events.push(e)},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail}}};
  vm.runInNewContext(code+';setAnimPaused(true);setAnimPaused(false);',sandbox);
  assert.deepEqual(events.map(e=>[e.type,e.detail.paused]),[['gg:animations-changed',true],['gg:animations-changed',false]]);
});
test('real host proposal navigation retains stale prices and rolls back on render failure',()=>{
  const source=fs.readFileSync(require('node:path').join(__dirname,'../asesor.js'),'utf8');
  let state=structuredClone(setup().state);
  state.selected=[{id:'manual',programId:'master',groupIds:['p1-1'],sharing:'separate',simIds:[],units:null,stations:false,plan:'FLEX',flexBimestres:1,confirmed:true,calc:'stale-signature'}];
  const sandbox={window:{GG_CONFIG:C,GGMotor:M},M,PROGRAMS:C.PROGRAMS,LEVELS:C.LEVELS,JSON,agentHostVersion:0,agentHostRendering:false,
    get state(){return state},set state(next){state=next},groups:()=>M.groupsOf(state.enroll,C.LEVELS,state.levels),hasStudents:()=>true,
    ui:{},store(){},render(){vm.runInContext('syncCalc()',context)}};
  const context=vm.createContext(sandbox);
  vm.runInContext(source.match(/function canStep\(n\) \{[^\n]+/)[0]+';'+source.match(/function syncCalc\(\) \{[^\n]+/)[0]+';'+source.slice(source.indexOf('// Geeky host boundary')),context);
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../agent-adapter.js'),'utf8'),context);
  const before=JSON.stringify(state.selected);
  assert.equal(sandbox.window.GGCotizadorAgent.openProposal().ok,true);
  assert.equal(state.step,5);assert.equal(JSON.stringify(state.selected),before);assert.equal(sandbox.agentHostRendering,false);
  sandbox.render=()=>{throw new Error('render failed')};
  assert.throws(()=>sandbox.window.GGCotizadorHost.navigate(1),/render failed/);
  assert.equal(state.step,5);assert.equal(JSON.stringify(state.selected),before);assert.equal(sandbox.agentHostRendering,false);
});

test('undo returns to a draft if its restored state cannot support the current editor',()=>{
  const x=setup();x.manual(s=>{s.levels=[];s.enroll={};});
  update(x,'set_levels',{levelIds:['prim']});
  update(x,'navigate',{step:2});
  assert.equal(x.api.executeTool('undo_cotizador',{expectedRevision:x.api.getContext().revision}).ok,true);
  assert.equal(x.state.levels.length,0);assert.equal(x.state.step,5);
});

test('commercial edits keep the proposal draft open through empty levels and selection',()=>{
  const x=setup();x.manual(s=>{s.levels=[];s.enroll={};});
  x.api.openProposal();
  assert.equal(update(x,'set_levels',{levelIds:['prim']}).ok,true);assert.equal(x.state.step,5);
  assert.equal(x.api.executeTool('undo_cotizador',{expectedRevision:x.api.getContext().revision}).ok,true);
  assert.equal(x.state.step,5);assert.deepEqual(x.state.levels,[]);
  update(x,'set_levels',{levelIds:['prim']});update(x,'set_students',{gradeId:'p1',sectionId:'p1-1',students:24});
  assert.equal(x.state.step,5);
  update(x,'add_program',{programId:'master',groupIds:['p1-1']});
  update(x,'remove_program',{entryId:x.state.selected[0].id});assert.equal(x.state.step,5);
  update(x,'set_levels',{levelIds:[]});assert.equal(x.state.step,5);
});
test('reload retains an empty saved proposal while guarding incomplete editors',()=>{
  const source=fs.readFileSync(require('node:path').join(__dirname,'../asesor.js'),'utf8');
  const start=source.indexOf("if (location.hash === '#ejemplo')");
  const code=source.slice(start,source.indexOf('render();',start));
  for(const [initial,expected] of [[5,5],[2,1],[4,1],[0,0]]) {
    const state={step:initial,levels:[]};vm.runInNewContext(code,{state,location:{hash:''}});assert.equal(state.step,expected);
  }
});

test('real manual navigation retains undo while commercial edit and revert invalidates it',()=>{
  const source=fs.readFileSync(require('node:path').join(__dirname,'../asesor.js'),'utf8');
  let state=structuredClone(setup().state),events=[];state.levels.push('bas');
  const sandbox={window:{GG_CONFIG:C,GGMotor:M,dispatchEvent:e=>events.push(e)},CustomEvent:class{constructor(type){this.type=type}},localStorage:{setItem(){}},KEY:'test',JSON,M,PROGRAMS:C.PROGRAMS,LEVELS:C.LEVELS,
    get state(){return state},set state(next){state=next},groups:()=>M.groupsOf(state.enroll,C.LEVELS,state.levels),hasStudents:()=>true,
    ui:{},mascot:null,mascotHost:null,campusHidden:true,animPaused:false,matchMedia:()=>({matches:false}),document:{getElementById:()=>null},assignPending:()=>[],pickConfigTarget(){},render(){vm.runInContext('syncCalc();store();',context)}};
  const context=vm.createContext(sandbox);
  const stateTracking=source.slice(source.indexOf('let agentHostVersion ='),source.indexOf('// ---------- Utilidades'));
  vm.runInContext(stateTracking+source.match(/function canStep\(n\) \{[^\n]+/)[0]+source.slice(source.indexOf('function step(n)'),source.indexOf('function start()'))+source.match(/function syncCalc\(\) \{[^\n]+/)[0]+source.slice(source.indexOf('// Geeky host boundary')),context);
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../agent-adapter.js'),'utf8'),context);
  const api=sandbox.window.GGCotizadorAgent,update=(action,args,revision=api.getContext().revision)=>api.executeTool('update_cotizador',{action,args,expectedRevision:revision});
  assert.equal(update('set_tax',{enabled:true}).ok,true);assert.equal(api.openProposal().ok,true);const beforeNavigation=api.getContext().revision;
  vm.runInContext('step(1);state.levelIndex=1;store();',context);
  assert.equal(api.getContext().canUndo,true);
  assert.ok(api.getContext().revision>beforeNavigation);
  assert.equal(update('set_tax',{enabled:false},beforeNavigation).error,'revision_conflict');
  assert.equal(api.executeTool('undo_cotizador',{expectedRevision:api.getContext().revision}).ok,true);
  assert.equal(state.step,1);assert.equal(state.levelIndex,1);assert.equal(state.iva,false);
  state.selected=[{id:'manual',programId:'master',groupIds:['p1-1'],sharing:'separate',simIds:[],units:null,stations:false,plan:'FLEX',flexBimestres:1,confirmed:true,calc:'stale-signature'}];
  vm.runInContext('store();',context);
  update('set_tax',{enabled:true});const selectionBefore=JSON.stringify(state.selected);
  vm.runInContext('step(5);',context);
  assert.equal(JSON.stringify(state.selected),selectionBefore);
  assert.equal(api.getContext().canUndo,true);
  const beforeManual=api.getContext().revision;
  vm.runInContext('state.fee=100;store();state.fee=null;store();',context);
  assert.equal(update('set_tax',{enabled:false},beforeManual).error,'revision_conflict');
  assert.equal(api.getContext().canUndo,false);
});
