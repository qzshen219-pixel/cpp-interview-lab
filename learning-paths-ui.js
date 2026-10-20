(() => {
'use strict';
const app=window.PracticeApp,C=app.C,P=window.LearningPaths,$=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let routeChoice='backend';
function progress(key){
 const s=app.state.routeSessions[key],ids=s?.ids||[];return {ids,done:ids.filter(id=>C.isCompleted(app.state,id)).length,review:ids.filter(id=>C.needsReview(app.state,id)).length};
}
function renderPaths(){
 const route=P.ROUTES.find(r=>r.id===routeChoice),busy=app.activeAssessment();
 document.querySelectorAll('[data-path-choice]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.pathChoice===routeChoice));
 $('path-intro').textContent=route.intro;
 $('path-stages').innerHTML=route.stages.map((stage,i)=>{
  const key=route.id+':'+stage.id,p=progress(key),available=P.routePools(app.bank).get(key).length;
  return `<section class="path-stage"><div class="path-stage-number">${String(i+1).padStart(2,'0')}</div><div class="path-stage-body"><h3>${esc(stage.label)}</h3><p>${esc(stage.goal)}</p><span class="path-stage-status">${p.ids.length?'已作答 '+p.done+' / '+p.ids.length+' · 需强化 '+p.review:'尚未开始 · 可选 '+available+' 题'}</span>${p.ids.length?`<progress max="${p.ids.length}" value="${p.done}" aria-label="${esc(stage.label)}已作答进度"></progress>`:''}<div class="path-stage-actions"><button class="primary" data-start-stage="${key}" ${busy||!available?'disabled':''}>${p.ids.length?(p.done===p.ids.length?'回顾本阶段':'继续练习'):'开始 '+Math.min(10,available)+' 题'}</button>${p.ids.length?`<button class="text-button" data-repick-stage="${key}" ${busy?'disabled':''}>重新选题</button>`:''}</div></div></section>`;
 }).join('');
}
function renderContext(){
 const state=app.state,active=P.stage(state.routeActive),p=active?progress(active.key):null;
 $('route-session-banner').hidden=!active;$('route-leave').disabled=Boolean(app.activeAssessment());
 if(active){$('route-session-title').textContent=active.route.label+' · '+active.label;$('route-session-progress').textContent='已作答 '+p.done+' / '+p.ids.length+' · 需强化 '+p.review;}
 document.documentElement.classList.toggle('focus-mode',state.focusMode);$('focus-bar').hidden=!state.focusMode;$('focus-toggle').setAttribute('aria-pressed',state.focusMode);
 const topic=P.TOPICS.find(t=>t.id===state.topic);let title=active?active.route.label+' · '+active.label:topic?topic.label:'逐题练习',position='';
 if(state.mode==='exam'&&state.exam){title=state.exam.submitted?'自测回顾':'自定义自测';position=(state.exam.index+1)+' / '+state.exam.ids.length;}
 else if(state.mode==='interview'&&state.interview){title=state.interview.project+' 项目面试';position=(state.interview.index+1)+' / '+state.interview.rounds.length;}
 else if(state.mode==='practice'){const list=app.filtered(),i=list.findIndex(q=>q.id===state.current);position=list.length?(i+1)+' / '+list.length:'暂无匹配题目';}
 else title=state.mode==='exam'?'自测设置':'项目面试设置';
 $('focus-position').textContent=title+' · '+position;
}
function focus(on){
 app.flush();app.state.focusMode=on;app.persist();renderContext();$('question').scrollIntoView?.({block:'start',behavior:'auto'});$('question').focus({preventScroll:true});
}
$('focus-toggle').addEventListener('click',()=>focus(!app.state.focusMode));$('focus-exit').addEventListener('click',()=>focus(false));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&app.state.focusMode&&!document.querySelector('dialog[open]')){event.preventDefault();focus(false);}});
$('paths-open').addEventListener('click',()=>{app.flush();const active=P.stage(app.state.routeActive);if(active)routeChoice=active.route.id;renderPaths();$('paths-dialog').showModal();});
$('paths-close').addEventListener('click',()=>$('paths-dialog').close());
$('paths-dialog').addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button||button.disabled)return;
 if(button.dataset.pathChoice){routeChoice=button.dataset.pathChoice;renderPaths();return;}
 if(button.dataset.startStage){$('paths-dialog').close();try{app.openRoute(button.dataset.startStage);}catch(error){app.notify(error.message);}return;}
 if(button.dataset.repickStage){const key=button.dataset.repickStage;$('paths-dialog').close();app.confirm('重新选择本阶段题目？','会优先选择现有到期、需强化与未作答题。原有作答、笔记和答案历史会保留。',()=>{try{app.openRoute(key,true);}catch(error){app.notify(error.message);}});}
});
$('route-leave').addEventListener('click',()=>{try{app.leaveRoute();}catch(error){app.notify(error.message);}});
$('question').addEventListener('click',event=>{
 const topic=event.target.closest('[data-topic]');if(topic&&!topic.disabled){app.openTopic(topic.dataset.topic);return;}
 const related=event.target.closest('[data-related-question]');if(related)app.openQuestion(related.dataset.relatedQuestion);
});
document.addEventListener('study:change',event=>{if(event.detail?.refreshHub===false)return;renderContext();if($('paths-dialog').open)renderPaths();});
renderContext();
})();
