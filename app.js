(() => {
'use strict';
const bank=window.QUESTION_BANK, info=window.MODULE_INFO, byId=new Map(bank.map(q=>[q.id,q]));
const C=window.LearningCore, key=C.KEY, $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dates=[...new Set(bank.map(q=>q.sourceDate).filter(Boolean))].sort().reverse();
$('source-filter').innerHTML+='<option value="每日">全部每日练习</option>'+dates.map(date=>`<option value="${date}">${date} 每日练习</option>`).join('');
const P=window.LearningPaths,topicIndex=P.index(bank);
const projectOf=C.projectOf;
const S=window.LearningSearch,searchIndex=S.createIndex(bank);let searchTimer=null,searchPending=false;
$('topic-filter').innerHTML='<option value="all">全部知识点</option>'+Object.keys(info).map(module=>`<optgroup label="${esc(module)}">${P.TOPICS.filter(t=>t.module===module).map(t=>`<option value="${t.id}">${esc(t.label)} · ${bank.filter(q=>topicIndex.get(q.id).includes(t.id)).length} 题</option>`).join('')}</optgroup>`).join('');
let visibleCount=60,localStore,sessionStore;
try{localStore=window.localStorage;}catch{}try{sessionStore=window.sessionStorage;}catch{}
const fresh=()=>C.fresh(bank),restored=C.load(bank,localStore,sessionStore);
let state=restored.state,storageOK=true,toastTimer,confirmAction,receivingStorage=false;
let saveTimer=null,pendingSave=false,pendingHub=false,lastStoredRaw=null;
let listExpanded=false,filtersExpanded=state.project!=='全部'||state.module!=='全部'||state.type!=='全部'||state.source!=='全部'||Boolean(state.query)||state.status!=='all'||state.searchScope!=='all'||state.topic!=='all'||Boolean(state.routeActive);
function setListExpanded(on){listExpanded=on;document.documentElement?.classList.toggle('questions-open',on);$('mobile-list-toggle').setAttribute('aria-expanded',on);$('mobile-list-toggle').textContent=`${on?'收起':'展开'}列表 · ${listQuestions().length}`;}
function setFiltersExpanded(on){filtersExpanded=on;document.documentElement?.classList.toggle('filters-open',on);$('mobile-filter-toggle').setAttribute('aria-expanded',on);}
setListExpanded(false);setFiltersExpanded(filtersExpanded);
function notify(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200);}
function saveLabels(){
 const status=$('storage-status');if(status){status.textContent=pendingSave?'正在保存最新输入…':storageOK?'学习记录已自动保存在此设备':'自动保存未成功，请先导出备份';status.classList.toggle('storage-warning',!storageOK);}
 if($('focus-save'))$('focus-save').textContent=pendingSave?'正在保存…':storageOK?'已自动保存到本机':'保存未成功，请退出专注导出备份';
 if($('note-save-status'))$('note-save-status').textContent=pendingSave?'笔记正在保存…':storageOK?'笔记已自动保存到本机':'尚未保存成功，请导出备份';
 if($('draft')&&$('save-status'))$('save-status').textContent=pendingSave?'草稿正在保存…':!storageOK?'草稿尚未保存成功，请导出备份':state.entries[state.current]?.submitted===$('draft').value&&$('draft').value?'已保存作答':'草稿已自动保存，点击保存作答后计入进度';
}
function queuePersist(refreshHub=false){
 pendingSave=true;pendingHub=pendingHub||refreshHub;clearTimeout(saveTimer);saveLabels();
 saveTimer=setTimeout(()=>persist({refreshHub:pendingHub}),300);
}
function flush(){if(pendingSave)persist({refreshHub:pendingHub});}
function persist({refreshHub=true}={}){
 if(receivingStorage)return;
 clearTimeout(saveTimer);saveTimer=null;refreshHub=refreshHub||pendingHub;pendingSave=false;pendingHub=false;
 let resetReceived=false;
 try{
  const sharedRaw=localStore.getItem(key);
  if(sharedRaw&&sharedRaw!==lastStoredRaw){
   try{const incoming=JSON.parse(sharedRaw);if(incoming?.version===2){resetReceived=(incoming.resetAt||0)>(state.resetAt||0);state=C.sync(state,incoming,bank);}}catch{}
  }
  const raw=JSON.stringify(state);localStore.setItem(key,raw);lastStoredRaw=raw;storageOK=true;
  try{sessionStore?.removeItem(key);sessionStore?.removeItem(C.LEGACY_KEY);}catch{}
 }
 catch{storageOK=false;try{sessionStore?.setItem(key,JSON.stringify(state));}catch{}}
 if(resetReceived){receivingStorage=true;try{render();}finally{receivingStorage=false;}notify('另一页面已重置学习记录，当前页面已同步。');refreshHub=true;}
 saveLabels();document.dispatchEvent(new CustomEvent('study:change',{detail:{storageOK,refreshHub}}));
}

function isCompleted(id){return C.isCompleted(state,id);}

function filtered(){
 const words=S.terms(state.query),now=Date.now();
 const route=state.routeActive?state.routeSessions[state.routeActive]:null;
 const list=bank.filter(q=>(!route||route.ids.includes(q.id))&&(state.topic==='all'||topicIndex.get(q.id).includes(state.topic))&&(state.project==='全部'||projectOf(q)===state.project)&&(state.module==='全部'||q.module===state.module)&&(state.type==='全部'||q.type===state.type)&&(state.source==='全部'||state.source==='基础'&&!q.sourceDate||state.source==='每日'&&q.sourceDate||q.sourceDate===state.source)&&S.match(searchIndex.get(q.id),state,q.id,words,state.searchScope)&&(
 state.status==='all'||state.status==='pending'&&!isCompleted(q.id)||state.status==='answered'&&isCompleted(q.id)||state.status==='review'&&needsReview(q.id)||state.status==='due'&&C.isDue(state,q.id,now)||state.status==='favorite'&&state.cards[q.id]?.favorite||state.status==='notes'&&state.cards[q.id]?.note?.trim()||state.status==='plan'&&state.dailyPlan?.ids.includes(q.id)||state.status==='calendar'&&C.inReviewDay(state,q.id,state.reviewDate||C.dayKey(now),now)));
 if(route){const order=new Map(route.ids.map((id,i)=>[id,i]));list.sort((a,b)=>order.get(a.id)-order.get(b.id));}
 else if(state.status==='plan'){const order=new Map(state.dailyPlan.ids.map((id,i)=>[id,i]));list.sort((a,b)=>order.get(a.id)-order.get(b.id));}return list;
}

function clearFilters(){searchPending=false;return configure('全部','全部','全部','','all','全部','all','all','');}
function revealActive(){if(window.matchMedia?.('(max-width: 700px)').matches){setListExpanded(false);$('question').scrollIntoView?.({block:'start',behavior:'auto'});$('question').focus({preventScroll:true});}else $('question-items').querySelector('[aria-current="true"]')?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});}
function completedIds(){return bank.filter(q=>isCompleted(q.id)).map(q=>q.id);}

function needsReview(id){return C.needsReview(state,id);}

function getScore(ex=state.exam){return ex?.submitted?ex.ids.reduce((n,id)=>n+(!byId.get(id).manual&&ex.answers[id]===byId.get(id).correct?1:0),0):null;}
function activeExam(){return state.mode==='exam'&&state.exam&&!state.exam.submitted;}
function activeInterview(){return state.mode==='interview'&&state.interview&&!state.interview.submitted;}
function activeAssessment(){return activeExam()||activeInterview();}
function noteMarkup(q){const c=state.cards[q.id];return `<details class="personal-notes" ${c?.note?'open':''}><summary>个人笔记与口述答案${c?.note?' · 已记录':''}</summary><div class="note-body"><label for="personal-note">只属于你的补充、例子和面试表达</label><textarea id="personal-note" data-note-id="${esc(q.id)}" maxlength="5000" placeholder="例如：用 IM 项目里的旧连接回调竞态，解释为什么需要比较 session_id。">${esc(c?.note||'')}</textarea><span class="muted" id="note-save-status">笔记自动保存到本机，可随学习备份导出。</span></div></details>`;}
function timerMarkup(session){return session&&!session.submitted&&session.deadlineAt?`<div class="assessment-timer"><span>本轮剩余时间</span><strong data-countdown="${session.deadlineAt}" aria-label="本轮剩余时间">--:--</strong><span>到时自动结束，关闭页面不暂停计时</span></div>`:'';}
function getExamOptions(){return C.validateExamOptions({count:Number($('exam-count')?.value||state.examOptions.count),minutes:Number($('exam-minutes')?.value??state.examOptions.minutes),reviewFirst:$('exam-review-first')?$('exam-review-first').checked:state.examOptions.reviewFirst,ratios:['concept','scenario','code'].map((k,i)=>Number($('ratio-'+k)?.value??state.examOptions.ratios[i]))});}
function finishProjectInterview(auto=false){
 const iv=state.interview;if(!iv||iv.submitted)return;
 C.finishInterview(state,Date.now(),auto);render();notify(auto?'面试时间已到，已保存作答并生成复盘。':'模拟面试已结束，作答已保存，可逐轮自评。');
}
function renderInterview(){
 const iv=state.interview;
 if(!iv){
  const history=[...state.interviewHistory].reverse();
  $('question').innerHTML=`<div class="exam-setup"><div class="exam-kicker">PROJECT INTERVIEW</div><h2>把项目经历，讲成经得起追问的答案。</h2><p>从 IM 或云盘题库选择项目题，连续进行主问题与追问。作答时隐藏参考答案，结束后对照题库要点自评。</p><div class="session-options"><label>面试项目<select id="interview-project"><option value="IM">分布式 IM</option><option value="云盘">分布式云盘</option></select></label><label>面试轮数<select id="interview-count"><option value="5">5 轮</option><option value="10">10 轮</option></select></label><label>面试时限<select id="interview-minutes"><option value="20">20 分钟</option><option value="10">10 分钟</option><option value="30">30 分钟</option><option value="0">不限时</option></select></label></div><button class="primary" id="start-interview">开始项目面试</button><p class="exam-intro-note">同一道题可能包含一轮主问题和一轮追问。此模式采用参考要点与自评，不进行 AI 自动评分。</p>${history.length?`<div class="interview-history"><h3>最近的面试复盘</h3>${history.map(h=>`<button class="history-row secondary" data-history="${esc(h.id)}"><span>${esc(h.project)} · ${h.rounds.length} 轮</span><span>${C.dayKey(h.finishedAt)} · 已答 ${Object.values(h.answers).filter(a=>a.trim()).length} 轮</span></button>`).join('')}</div>`:''}</div>`;
  return;
 }
 const r=iv.rounds[iv.index],q=byId.get(r.id),answer=iv.answers[iv.index]||'',answered=Object.values(iv.answers).filter(a=>a.trim()).length;
 const prompt=r.stage==='follow'?`<div class="follow-context"><span class="badge">追问</span><p>围绕「${esc(q.title)}」继续回答：</p><h2>${esc(r.prompt)}</h2></div>`:questionHeader(q,iv.index,iv.rounds.length);
 const body=iv.submitted?`<div class="written-answer"><h3>你的回答</h3><pre>${esc(answer||'本轮未作答')}</pre></div>${answerMarkup(q,true,false)}<div class="interview-rating"><span>本轮表达自评</span><div class="rating-buttons">${[['review','需要复习'],['basic','基本掌握'],['fluent','熟练表达']].map(([v,t])=>`<button data-interview-rating="${v}" aria-pressed="${iv.ratings[iv.index]===v}" class="${iv.ratings[iv.index]===v?'active':''}" ${answer.trim()?'':'disabled'}>${t}</button>`).join('')}</div><p class="muted">同一题的主问题与追问按已自评轮次中的最低掌握度安排复习。</p></div>`:`<label class="answer-label" for="interview-draft">你的口述要点或完整回答</label><textarea id="interview-draft" maxlength="10000" placeholder="先给结论，再说明你实际实现的链路、故障边界和验证方式。">${esc(answer)}</textarea><p class="muted">自动保存作答。可以先口述，再记录关键点；结束后查看参考要点。</p>`;
 $('question').innerHTML=(iv.submitted?`<div class="score-banner"><strong>${answered} / ${iv.rounds.length}</strong><span>${iv.autoSubmitted?'到时自动结束':'本轮面试已完成'}<br>已自评 ${Object.keys(iv.ratings).length} 轮 · 可切换轮次复盘</span></div>`:timerMarkup(iv))+`<div class="interview-round-label">${esc(iv.project)} 项目 · 第 ${iv.index+1} / ${iv.rounds.length} 轮 · ${r.stage==='follow'?'项目追问':'主问题'}</div>`+prompt+body+`<div class="question-nav"><button class="secondary" data-interview-nav="-1" ${iv.index===0?'disabled':''}>上一轮</button><span>已作答 ${answered} / ${iv.rounds.length} 轮</span><button class="secondary" data-interview-nav="1" ${iv.index===iv.rounds.length-1?'disabled':''}>下一轮</button></div><div class="exam-controls"><button class="text-button" id="return-from-interview">保存并返回题库</button>${iv.submitted?'<button class="primary" id="new-interview">新的模拟面试</button>':'<button class="primary" id="finish-interview">结束并生成复盘</button>'}</div>`;
}

function entry(id){return state.entries[id]||(state.entries[id]={draft:'',submitted:'',rating:null});}
function syncStats(){
  const done=completedIds().length;$('completed').textContent=done;$('total').textContent=`/ ${bank.length}`;$('review-count').textContent=bank.filter(q=>needsReview(q.id)).length;
  $('progress').max=bank.length;$('progress').value=done;$('percentage').textContent=`${Math.round(done/bank.length*100)}%`;
  const last=state.lastTest;$('score').textContent=last?(last.total?`${last.correct}/${last.total}`:`已答 ${last.manual} 题`):'—';$('score-label').textContent=last?(last.total?(last.manual?'单选得分 · 另有文字题自评':'答对题数'):'文字题 · 对照答案自评'):'尚未交卷';
}
function renderModules(){
  $('modules').innerHTML=['全部',...Object.keys(info)].map(m=>`<button class="module ${state.module===m?'active':''}" data-module="${esc(m)}" aria-pressed="${state.module===m}" ${activeAssessment()?'disabled':''}><span class="module-symbol">${m==='全部'?'ALL':info[m].short}</span><span>${m==='全部'?'全部题目':esc(m)}</span><span class="module-count">${m==='全部'?bank.length:bank.filter(q=>q.module===m).length}</span></button>`).join('');
}
function listQuestions(){return state.mode==='interview'&&state.interview?state.interview.rounds.map(r=>byId.get(r.id)):state.mode==='exam'&&state.exam?state.exam.ids.map(id=>byId.get(id)):filtered();}

function renderList(){
 if(state.mode==='interview'){
  const iv=state.interview;$('list-title').textContent=iv?iv.project+' 项目面试':'项目模拟面试';$('list-subtitle').textContent=iv?'主问题与追问，逐轮作答':'选择项目，开始一轮模拟面试';
  $('question-items').innerHTML=iv?iv.rounds.map((r,i)=>`<button class="question-item ${i===iv.index?'active':''}" data-round="${i}" ${i===iv.index?'aria-current="true"':''}><span class="item-number">${String(i+1).padStart(2,'0')}</span><span class="item-body"><strong>${r.stage==='follow'?'追问 · ':''}${esc(byId.get(r.id).title)}</strong><span class="item-meta">${iv.answers[i]?.trim()?'已作答':'待作答'}${iv.ratings[i]?' · 已自评':''}</span></span></button>`).join(''):'<div class="empty">从主问题到故障边界，练习完整的项目表达。</div>';
  $('mobile-list-toggle').textContent=`${listExpanded?'收起':'展开'}轮次 · ${iv?.rounds.length||0}`;return;
 }
  const scroll=$('question-items').scrollTop, list=listQuestions();
  const activeIndex=state.mode==='exam'&&state.exam?state.exam.index:list.findIndex(q=>q.id===state.current);
  visibleCount=Math.max(visibleCount,activeIndex+1);const shown=list.slice(0,visibleCount),remaining=list.length-shown.length;
  $('list-title').textContent=state.mode==='exam'&&state.exam?(state.exam.submitted?'自测回顾':'本轮自测'):(state.status==='calendar'?(state.reviewDate||C.dayKey())+' 复习':({plan:'今日计划',due:'到期复习',review:'需要强化',favorite:'我的收藏',notes:'个人笔记',pending:'未作答',answered:'已作答'}[state.status]||(state.module==='全部'?'全部题目':state.module)));
  if(state.mode==='practice'){const part=P.stage(state.routeActive),topic=P.TOPICS.find(t=>t.id===state.topic);if(part)$('list-title').textContent=part.label+' · 阶段练习';else if(topic)$('list-title').textContent=state.status==='all'?topic.label:$('list-title').textContent+' · '+topic.label;}
  $('list-subtitle').textContent=state.mode==='exam'&&state.exam?(state.exam.submitted?'查看得分与错题解析':'可跳题，交卷后统一看答案'):`${list.length} 道题 · ${state.type==='全部'?'全部题型':state.type}`;
  $('mobile-list-toggle').textContent=`${listExpanded?'收起':'展开'}列表 · ${list.length}`;
  $('question-items').innerHTML=list.length?shown.map((q,i)=>{
    const ex=state.mode==='exam'&&state.exam,selected=ex?state.exam.index===i:state.current===q.id;
    let status='';
    if(ex){if(state.exam.submitted)status=q.manual?(needsReview(q.id)?'待复习':'已作答'):state.exam.answers[q.id]===q.correct?'答对':'答错';else if(state.exam.answers[q.id]!==undefined)status=q.manual?'有作答':'已选择';}
    else if(needsReview(q.id))status='待复习';else if(state.entries[q.id]?.rating)status=state.entries[q.id].rating==='fluent'?'熟练':'基本掌握';else if(state.entries[q.id]?.submitted)status='已作答';else if(Object.hasOwn(state.outcomes,q.id))status='已自测';else if(state.entries[q.id]?.draft)status='有草稿';
    const hit=!ex&&state.query?S.snippet(searchIndex.get(q.id),state,q.id,state.query,state.searchScope):null;
    return `<button class="question-item ${selected?'active':''}" data-q="${q.id}" ${selected?'aria-current="true"':''}><span class="item-number">${String(i+1).padStart(2,'0')}</span><span class="item-body"><strong title="${esc(q.title)}">${!ex?S.highlight(q.title,state.query):esc(q.title)}</strong>${hit?`<span class="search-hit"><span>${hit.label}</span> · ${hit.html}</span>`:''}<span class="item-meta"><span>${esc(q.module)}</span><span>${esc(q.type)}</span>${projectOf(q)!=='通用'?`<span>${esc(projectOf(q))}</span>`:''}${q.sourceDate?`<span>${q.sourceDate}</span>`:''}${status?`<span class="item-status ${status==='待复习'||status==='答错'?'warn':''}">${status}</span>`:''}</span></span></button>`;
  }).join('')+(remaining?`<button class="list-more" id="load-more">再显示 ${Math.min(60,remaining)} 题 · 还有 ${remaining} 题</button>`:''):'<div class="empty">没有匹配的题目<br>试试更短的关键词或其他筛选。</div>';
  $('question-items').scrollTop=scroll;
}
function codeMarkup(text,language=''){
 const label=String(language).replace(/[^a-z0-9+#.-]/gi,'').slice(0,20).toUpperCase()||'CODE';
 return `<div class="code-block"><div class="code-toolbar"><span>${esc(label==='CPP'?'C++':label)}</span><button class="code-copy" data-copy-code aria-label="复制代码">复制代码</button></div><pre class="code"><code>${esc(text)}</code></pre></div>`;
}
async function copyCode(button){
 const text=button.closest('.code-block')?.querySelector('code')?.textContent;
 if(typeof text!=='string')return;
 try{if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');await navigator.clipboard.writeText(text);button.textContent='已复制';notify('代码已复制。');setTimeout(()=>{if(button.isConnected)button.textContent='复制代码';},1800);}
 catch{notify('暂时无法复制，请选中代码手动复制。');}
}
function markdown(text){
  const inline=value=>esc(value).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  const lines=String(text).split('\n'),output=[];let i=0;
  while(i<lines.length){
    const line=lines[i];
    if(/^\s*```/.test(line)){
      const lang=line.trim().slice(3);const code=[];i++;
      while(i<lines.length&&!/^\s*```/.test(lines[i]))code.push(lines[i++]);
      i++;output.push(codeMarkup(code.join('\n'),lang));continue;
    }
    if(!line.trim()){i++;continue;}
    if(/^\s*---+\s*$/.test(line)){output.push('<hr>');i++;continue;}
    if(/^#{1,6}\s/.test(line)){output.push(`<h3>${inline(line.replace(/^#{1,6}\s+/,''))}</h3>`);i++;continue;}
    if(/^\s*\|/.test(line)){
      const rows=[];
      while(i<lines.length&&/^\s*\|/.test(lines[i])){
        const row=lines[i++].trim().replace(/^\||\|$/g,'').split('|');
        if(row.every(cell=>/^\s*:?-+:?\s*$/.test(cell)))continue;
        rows.push(row);
      }
      output.push(`<div class="table-scroll"><table>${rows.map((row,n)=>`<tr>${row.map(cell=>`<${n?'td':'th'}>${inline(cell.trim())}</${n?'td':'th'}>`).join('')}</tr>`).join('')}</table></div>`);continue;
    }
    if(/^\s*(?:[-*]\s|\d+[.)]\s)/.test(line)){
      const ordered=/^\s*\d/.test(line),tag=ordered?'ol':'ul',items=[];
      const pattern=ordered?/^\s*\d+[.)]\s/:/^\s*[-*]\s/;
      while(i<lines.length&&pattern.test(lines[i]))items.push(`<li>${inline(lines[i++].replace(pattern,''))}</li>`);
      output.push(`<${tag}>${items.join('')}</${tag}>`);continue;
    }
    const paragraph=[];
    while(i<lines.length&&lines[i].trim()&&!/^\s*(?:```|#{1,6}\s|\||[-*]\s|\d+[.)]\s|---+$)/.test(lines[i]))paragraph.push(lines[i++]);
    if(paragraph.length)output.push(`<p>${inline(paragraph.join('\n')).replace(/\n/g,'<br>')}</p>`);else i++;
  }
  return output.join('');
}
function questionHeader(q,i,n){return `<div class="question-tools"><span class="muted">${state.cards[q.id]?.review?'下次复习 '+new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(state.cards[q.id].review.dueAt):'先独立表达，再对照要点'}</span><button class="favorite-button" data-favorite="${esc(q.id)}" aria-pressed="${Boolean(state.cards[q.id]?.favorite)}">${state.cards[q.id]?.favorite?'★ 已收藏':'☆ 收藏'}</button></div><div class="question-topic-tags" aria-label="本题知识点">${topicIndex.get(q.id).map(id=>{const t=P.TOPICS.find(t=>t.id===id);return `<button class="topic-chip" data-topic="${id}" ${activeAssessment()?'disabled':''}>${esc(t.label)}</button>`;}).join('')}</div><div class="q-top"><div class="badges"><span class="badge">${esc(q.module)}</span><span class="badge">${esc(q.type)}</span>${projectOf(q)!=='通用'?`<span class="badge">${esc(projectOf(q))} 项目</span>`:''}${q.priority?'<span class="badge focus">近期重点</span>':''}${q.sourceDate?`<span class="badge">${q.sourceDate} · 第 ${q.sourceRound} 轮</span>`:''}</div><span class="position">${String(i+1).padStart(2,'0')} / ${String(n).padStart(2,'0')}</span></div><h2>${esc(q.title)}</h2>${q.sourceDate?`<p class="daily-origin">${esc(q.sourceRoundTitle)}</p>`:''}${q.promptMarkdown?`<div class="prompt markdown">${markdown(q.promptMarkdown)}</div>`:`<p class="prompt">${esc(q.prompt)}</p>`}${q.code?codeMarkup(q.code,'cpp'):''}`;}
function answerMarkup(q,open=false,practice=true){
  const e=state.entries[q.id];return `<details class="answer-details" ${open?'open':''}><summary>参考答案与易错点<span class="expand" aria-hidden="true">+</span></summary><div class="answer-content">${q.answerMarkdown?`<div class="markdown">${markdown(q.answerMarkdown)}</div>`:`<ol class="answer-points">${q.answer.map(a=>`<li>${esc(a)}</li>`).join('')}</ol><div class="pitfalls"><h3>易错点</h3><ul>${q.pitfalls.map(a=>`<li>${esc(a)}</li>`).join('')}</ul></div><div class="follow"><h3>面试追问</h3><p>${esc(q.follow)}</p></div>`}${q.project==='云盘'?`<a class="source" href="https://github.com/qzshen219-pixel/distributed-cloud-disk/blob/main/${esc(q.sourceFile)}" target="_blank" rel="noopener noreferrer">核对云盘源码 · ${esc(q.sourceFile.split('/').pop())}</a>`:''}${info[q.module].source?`<a class="source" href="${info[q.module].source}" target="_blank" rel="noopener noreferrer">延伸阅读 · ${esc(info[q.module].label)}</a>`:''}${practice?`<div class="self-eval"><span>对照答案后，标记本题掌握程度</span><div class="rating-buttons">${[['review','需要复习'],['basic','基本掌握'],['fluent','熟练表达']].map(([v,t])=>`<button data-rating="${v}" data-rating-id="${q.id}" aria-pressed="${e?.rating===v}" class="${e?.rating===v?'active':''}" ${e?.submitted?.trim()?'':'disabled'}>${t}</button>`).join('')}</div>${e?.submitted?.trim()?'':'<span class="muted">先保存你的作答，再进行自评。</span>'}</div>`:''}</div></details>`;
}
function renderPractice(){
  const list=filtered();if(!list.some(q=>q.id===state.current))state.current=list[0]?.id||null;
  const q=byId.get(state.current);if(!q){$('question').innerHTML='<div class="exam-setup"><h2>没有匹配的题目</h2><p>试试更短的关键词，或调整来源、题型和练习状态。</p><button class="secondary" id="clear-filter">恢复全部题目</button></div>';return;}
  const i=list.indexOf(q),e=state.entries[q.id]||{draft:'',submitted:''};
  $('question').innerHTML=questionHeader(q,i,list.length)+`<div class="answer-label"><label for="draft">你的回答</label><span id="char-count">${e.draft.length} / 10000 字符</span></div><textarea id="draft" maxlength="10000" placeholder="先说结论，再解释原理，最后举一个项目例子。">${esc(e.draft)}</textarea><div class="write-actions"><span class="save-status" id="save-status">${e.submitted&&e.submitted===e.draft?'已保存作答':e.draft?'草稿已自动保存，点击保存作答后计入进度':'草稿自动保存到此设备'}</span><button class="primary" id="save-answer">保存作答</button></div>${answerMarkup(q)}${noteMarkup(q)}<details class="related-questions"><summary>同知识点，再练几题</summary><div>${P.related(bank,q.id).map(other=>`<button class="related-question" data-related-question="${esc(other.id)}">${esc(other.title)}</button>`).join('')||'<span class="muted">暂无同知识点题目</span>'}</div></details><div class="answer-history-entry"><button class="secondary" data-answer-history="${esc(q.id)}">答案历史与恢复 <span>${C.answerVersions(state,q.id).length} 版</span></button><span class="muted">保存作答时保留版本，可比较和恢复。</span></div><div class="question-nav"><button class="secondary" data-nav="-1" ${i===0?'disabled':''}>上一题</button><span>按你的节奏，一题一题来</span><button class="secondary" data-nav="1" ${i===list.length-1?'disabled':''}>下一题</button></div>`;
}
function renderExamSetup(){
 const list=filtered(),o=state.examOptions,n=Math.min(o.count,list.length);
 $('question').innerHTML=`<div class="exam-setup"><div class="exam-kicker">CUSTOM SELF CHECK</div><h2>按你的节奏，检查理解。</h2><p>从当前筛选范围抽题。选择题自动判分，文字题交卷后对照参考答案自评。</p><div class="session-options"><label>本轮题数<select id="exam-count" class="exam-option">${[5,10,20].map(v=>`<option value="${v}" ${v===o.count?'selected':''}>${v} 题</option>`).join('')}</select></label><label>自测时限<select id="exam-minutes" class="exam-option">${[0,5,10,20,30,60].map(v=>`<option value="${v}" ${v===o.minutes?'selected':''}>${v?v+' 分钟':'不限时'}</option>`).join('')}</select></label></div><fieldset class="ratio-settings"><legend>题型比例 · 合计 100%</legend>${[['concept','概念题'],['scenario','场景题'],['code','代码题']].map(([id,label],i)=>`<label>${label}<span><input id="ratio-${id}" class="exam-option" type="number" min="0" max="100" step="5" value="${o.ratios[i]}" inputmode="numeric" aria-label="${label}比例">%</span></label>`).join('')}</fieldset><label class="check-setting"><input id="exam-review-first" class="exam-option" type="checkbox" ${o.reviewFirst?'checked':''}>同题型优先抽取错题和到期复习题</label><p class="muted">当前有 ${list.length} 道可选题。题数不足时使用全部匹配题目；某题型不足时，从其他题型补足。单一题型筛选优先于配比。</p><button class="primary" id="start-exam" ${n?'':'disabled'}>开始自测</button><div class="exam-intro-note">范围：${esc(state.project==='全部'?'全部项目':state.project)} / ${esc(state.module)} / ${esc(state.type)} / ${esc(state.source)}。限时自测到时自动交卷，未答题仍标记为未作答。</div></div>`;
}

function renderExam(){
  const ex=state.exam;if(!ex){renderExamSetup();return;}
  const q=byId.get(ex.ids[ex.index]),chosen=ex.answers[q.id],pass=chosen===q.correct,n=Object.keys(ex.answers).length;
  const objective=ex.ids.filter(id=>!byId.get(id).manual).length,manual=ex.ids.length-objective;
  let body;
  if(q.manual){
    body=ex.submitted?`<div class="written-answer"><h3>你的作答</h3><pre>${esc(chosen||'未作答')}</pre></div><div class="feedback">文字题不自动判分。对照完整答案与易错点，标记掌握程度。</div>${answerMarkup(q,true,true)}`:`<label class="answer-label" for="exam-draft">你的回答</label><textarea id="exam-draft" maxlength="10000" placeholder="独立作答，交卷后再对照答案。">${esc(chosen||'')}</textarea><div class="exam-intro-note">文字作答自动保留，交卷后采用自评。</div>`;
  }else{
    body=`<fieldset class="choice-list" style="border:0;padding:0;margin-left:0;margin-right:0"><legend class="muted">请选择最准确的判断（单选）</legend>${q.choices.map((c,i)=>`<label class="choice ${chosen===i?'selected':''} ${ex.submitted?(i===q.correct?'correct':chosen===i?'wrong':''):''}"><input type="radio" name="exam-choice" value="${i}" ${chosen===i?'checked':''} ${ex.submitted?'disabled':''}><span class="choice-letter">${'ABCD'[i]}</span><span class="choice-text">${esc(c)}</span>${ex.submitted&&i===q.correct?'<span class="item-status">正确</span>':''}</label>`).join('')}</fieldset>${ex.submitted?`<div class="feedback ${pass?'':'wrong'}">${pass?'本题答对。继续检查你能否完整解释原理。':`本题答错。正确选项：${'ABCD'[q.correct]}。`}</div>${answerMarkup(q,true,false)}`:'<div class="exam-intro-note">答案在交卷后显示，选项会自动保留。</div>'}`;
  }
  $('question').innerHTML=timerMarkup(ex)+(ex.submitted?`<div class="score-banner"><strong>${objective?`${getScore(ex)} / ${objective}`:`已答 ${Object.values(ex.answers).filter(a=>typeof a==='string'&&a.trim()).length} 题`}</strong><span>本轮自测已完成<br>${objective?`单选题答对 ${getScore(ex)} 题`:'文字题不自动判分'}${manual?` · ${ex.ids.filter(id=>byId.get(id).manual&&ex.answers[id]?.trim()&&!state.entries[id]?.rating).length} 道文字题待自评`:''}</span></div>`:'')+questionHeader(q,ex.index,ex.ids.length)+body+`<div class="question-nav"><button class="secondary" data-nav="-1" ${ex.index===0?'disabled':''}>上一题</button><span>${ex.submitted?'逐题回顾':'已作答'} ${ex.submitted?ex.index+1:n} / ${ex.ids.length}</span><button class="secondary" data-nav="1" ${ex.index===ex.ids.length-1?'disabled':''}>下一题</button></div><div class="exam-controls"><button class="text-button" id="return-practice">${ex.submitted?'返回逐题练习':'退出本轮自测'}</button>${ex.submitted?'<button class="primary" id="retry-exam">调整设置重新自测</button>':`<span>交卷前可修改作答</span><button class="primary" id="submit-exam">交卷并查看解析</button>`}</div>`;
}
function renderDetail(){state.mode==='practice'?renderPractice():state.mode==='interview'?renderInterview():renderExam();if(state.mode==='practice'){S.highlightElement($('question'),state.query);if(state.query&&state.searchScope==='reference'){const details=$('question').querySelector('.answer-details');if(details)details.open=true;}}}

function render(){
 C.ensurePlan(bank,state);renderModules();
 if($('question-search').value!==state.query)$('question-search').value=state.query;
 const busy=Boolean(activeAssessment());
 for(const id of ['question-search','search-scope','topic-filter','status-filter','project-filter','source-filter','type-filter','mobile-filter-toggle'])$(id).disabled=busy;
 $('topic-filter').value=state.topic;$('search-scope').value=state.searchScope;$('status-filter').value=state.status;$('project-filter').value=state.project;$('source-filter').value=state.source;$('type-filter').value=state.type;
 $('clear-all-filter').disabled=busy||(state.project==='全部'&&state.module==='全部'&&state.type==='全部'&&state.source==='全部'&&!state.query&&state.status==='all'&&state.searchScope==='all'&&state.topic==='all'&&!state.routeActive);
 const count=filtered().length;$('filter-count').textContent=`${count} 题`;$('mobile-filter-toggle').textContent=`筛选 · ${count} 题`;
 for(const mode of ['practice','exam','interview']){const tab=$(mode+'-tab');tab.setAttribute('aria-selected',state.mode===mode);tab.tabIndex=state.mode===mode?0:-1;}
 $('workspace').setAttribute('aria-labelledby',state.mode+'-tab');document.querySelector('.eyebrow').textContent=`C++ / 后端 · ${bank.length} 道题`;
 renderDetail();renderList();syncStats();persist();
}

function configure(module,type,source=state.source,query=state.query,status=state.status,project=state.project,searchScope=state.searchScope,topic=state.topic,routeActive=state.routeActive){
  if(searchPending&&query===state.query){query=$('question-search').value;searchScope=$('search-scope').value;}
  clearTimeout(searchTimer);searchTimer=null;searchPending=false;
  if(activeAssessment())throw new Error('请先完成或退出当前自测或项目面试。');
  if(module!=='全部'&&!info[module])throw new Error('无效模块。');
  if(!['全部','概念题','场景题','代码题'].includes(type))throw new Error('无效题型。');
  if(!['全部','基础','每日',...dates].includes(source))throw new Error('无效来源。');
  if(!['全部','IM','云盘','通用'].includes(project))throw new Error('无效项目。');
  if(topic!=='all'&&!P.TOPICS.some(t=>t.id===topic))throw new Error('无效的知识点。');
  if(routeActive&&(!P.stage(routeActive)||!Object.hasOwn(state.routeSessions,routeActive)))throw new Error('这个训练阶段尚未开始。');
  if(module!=='全部'&&topic!=='all'&&P.TOPICS.find(t=>t.id===topic).module!==module)topic='all';
  if(!['all','question','reference','personal'].includes(searchScope))throw new Error('无效的搜索范围。');
  if(typeof query!=='string'||query.length>120||!['all','pending','answered','review','due','favorite','notes','plan','calendar'].includes(status))throw new Error('无效的搜索或状态。');
  visibleCount=60;state.module=module;state.type=type;state.source=source;state.query=query;state.searchScope=searchScope;state.topic=topic;state.routeActive=routeActive;state.status=status;state.project=project;if(state.mode==='exam')state.exam=null;render();return {count:filtered().length,module,type,source,query,status,project,searchScope,topic,routeActive};
}
function saveAnswer(id,text){
 if(!byId.has(id))throw new Error('无效题目。');if(activeAssessment())throw new Error('请先完成或退出当前自测或项目面试。');
 const expanded=$('question').querySelector('.answer-details')?.open;
 C.submitAnswer(state,id,text);render();
 if(expanded&&state.current===id&&state.mode==='practice'){const details=$('question').querySelector('.answer-details');if(details)details.open=true;}
 return {questionId:id,saved:true,completed:completedIds().length};
}

function startExam(){
 try{
  runSearch();
  const options=getExamOptions(),ids=C.sample(filtered(),state,options);if(!ids.length){notify('当前筛选没有可自测题目。');return;}
  const now=Date.now();state.examOptions=options;state.mode='exam';state.exam={id:'exam-'+now+'-'+Math.random().toString(36).slice(2),ids,answers:{},index:0,submitted:false,autoSubmitted:false,startedAt:now,deadlineAt:options.minutes?now+options.minutes*60000:0,finishedAt:0};
  setFiltersExpanded(false);render();tick();notify(`已开始 ${ids.length} 题自测，作答自动保存。`);
 }catch(error){notify(error.message);}
}

function submitExam(auto=false){
 const ex=state.exam;if(!ex||ex.submitted)return;
 const unanswered=id=>byId.get(id).manual?!ex.answers[id]?.trim():ex.answers[id]===undefined;
 const missing=ex.ids.findIndex(unanswered);
 if(!auto&&missing>=0){ex.index=missing;render();notify(`还有 ${ex.ids.filter(unanswered).length} 道未作答，请先完成作答。`);return;}
 const now=Date.now();ex.submitted=true;ex.autoSubmitted=auto;ex.finishedAt=now;ex.index=0;
 const total=ex.ids.filter(id=>!byId.get(id).manual).length,manual=ex.ids.filter(id=>byId.get(id).manual&&ex.answers[id]?.trim()).length;
 state.lastTest={correct:getScore(ex),total,manual,answered:Object.keys(ex.answers).length,at:now};
 for(const id of ex.ids){
  const q=byId.get(id),answered=!unanswered(id);
  if(q.manual){if(answered)C.submitAnswer(state,id,ex.answers[id],now,'exam');else C.editCard(state,id,{lastResult:'missed',review:C.trackReview(state,id,C.schedule(C.card(state,id).review,'review',now),now,false)},now);}
  else{
   const pass=ex.answers[id]===q.correct,c=C.editCard(state,id,{lastResult:answered?(pass?'correct':'wrong'):'missed'},now);
   if(answered){state.outcomes[id]=pass;C.rate(state,id,pass?'basic':'review',now,true,'objective');}else C.editCard(state,id,{review:C.trackReview(state,id,C.schedule(c.review,'review',now),now,false)},now);
   C.recordStudy(state,id,{kind:'objective',result:answered?(pass?'correct':'wrong'):'missed'},now,(ex.id||'exam:'+ex.startedAt)+':'+id);
  }
 }
 render();notify(auto?'时间已到，已自动交卷；未答题保留为未作答。':total?`自测完成：单选题答对 ${getScore(ex)} / ${total}，文字题 ${manual} 道采用自评。`:`已完成 ${manual} 道文字题，请对照答案自评。`);
}

function confirm(title,message,action){confirmAction=action;$('dialog-title').textContent=title;$('dialog-text').textContent=message;$('confirm-dialog').showModal();}
function setMode(mode){
 if(!['practice','exam','interview'].includes(mode)||mode===state.mode)return;
 if(!activeAssessment())runSearch();
 if(activeExam()&&mode!=='exam'){confirm('退出本轮自测？','本轮尚未交卷，退出会清除本轮选择。已经保存的逐题作答会保留。',()=>{state.exam=null;state.mode=mode;render();});return;}
 state.mode=mode;render();tick();
}

$('modules').addEventListener('click',event=>{const button=event.target.closest('[data-module]');if(button&&!button.disabled)configure(button.dataset.module,state.type);});
$('project-filter').addEventListener('change',()=>configure('全部','全部','全部','','all',$('project-filter').value));
$('topic-filter').addEventListener('change',()=>configure(state.module,state.type,state.source,state.query,state.status,state.project,state.searchScope,$('topic-filter').value));
$('type-filter').addEventListener('change',()=>configure(state.module,$('type-filter').value));
$('source-filter').addEventListener('change',()=>configure(state.module,state.type,$('source-filter').value));
const runSearch=()=>{const pending=searchPending;clearTimeout(searchTimer);searchTimer=null;searchPending=false;if(!pending&&$('question-search').value===state.query&&$('search-scope').value===state.searchScope)return;configure(state.module,state.type,state.source,$('question-search').value,state.status,state.project,$('search-scope').value);};
$('question-search').addEventListener('input',()=>{searchPending=true;clearTimeout(searchTimer);searchTimer=setTimeout(runSearch,160);});
$('question-search').addEventListener('change',runSearch);
$('question-search').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();runSearch();}});
$('search-scope').addEventListener('change',runSearch);
$('status-filter').addEventListener('change',()=>configure(state.module,state.type,state.source,state.query,$('status-filter').value));
$('clear-all-filter').addEventListener('click',clearFilters);
$('mobile-filter-toggle').addEventListener('click',()=>setFiltersExpanded(!filtersExpanded));
$('mobile-list-toggle').addEventListener('click',()=>{setListExpanded(!listExpanded);renderList();});
for(const mode of ['practice','exam','interview'])$(mode+'-tab').addEventListener('click',()=>setMode(mode));
document.querySelector('.mode-tabs').addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const modes=['practice','exam','interview'],mode=modes[(modes.indexOf(state.mode)+(event.key==='ArrowRight'?1:2))%3];setMode(mode);if(state.mode===mode)$(mode+'-tab').focus();}});
$('question-items').addEventListener('click',event=>{const round=event.target.closest('[data-round]');if(round&&state.mode==='interview'&&state.interview){state.interview.index=Number(round.dataset.round);renderDetail();renderList();revealActive();persist();return;}const more=event.target.closest('#load-more');if(more?.id==='load-more'){visibleCount+=60;renderList();return;}const button=event.target.closest('[data-q]');if(!button)return;if(state.mode==='exam'&&state.exam)state.exam.index=state.exam.ids.indexOf(button.dataset.q);else state.current=button.dataset.q;renderDetail();renderList();revealActive();persist();});
$('question').addEventListener('input',event=>{
 if(event.target.dataset.noteId){const id=event.target.dataset.noteId,hadNote=Boolean(C.card(state,id).note.trim()),note=event.target.value.slice(0,5000);C.editCard(state,id,{note});queuePersist(hadNote!==Boolean(note.trim()));return;}
 if(event.target.id==='interview-draft'&&activeInterview()){const iv=state.interview,wasAnswered=Boolean(iv.answers[iv.index]?.trim());iv.answers[iv.index]=event.target.value.slice(0,10000);iv.updatedAt=Date.now();state.updatedAt=Date.now();queuePersist();if(wasAnswered!==Boolean(iv.answers[iv.index].trim()))renderList();return;}
 if(event.target.id==='exam-draft'&&activeExam()){const id=state.exam.ids[state.exam.index],wasAnswered=Boolean(state.exam.answers[id]?.trim());if(event.target.value.trim())state.exam.answers[id]=event.target.value;else delete state.exam.answers[id];queuePersist();if(wasAnswered!==Boolean(state.exam.answers[id]?.trim()))renderList();return;}
 if(event.target.id!=='draft')return;entry(state.current).draft=event.target.value;entry(state.current).updatedAt=Date.now();queuePersist();$('char-count').textContent=`${event.target.value.length} / 10000 字符`;
});
$('question').addEventListener('change',event=>{if(event.target.classList.contains('exam-option')){try{state.examOptions=getExamOptions();persist();}catch{}return;}if(event.target.name!=='exam-choice'||!activeExam())return;const chosen=Number(event.target.value);state.exam.answers[state.exam.ids[state.exam.index]]=chosen;persist();renderExam();renderList();$('question').querySelector(`input[name="exam-choice"][value="${chosen}"]`)?.focus({preventScroll:true});});
$('question').addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.copyCode!==undefined){copyCode(button);return;}
  if(button.dataset.nav){const delta=Number(button.dataset.nav);if(state.mode==='exam'&&state.exam)state.exam.index=Math.max(0,Math.min(state.exam.ids.length-1,state.exam.index+delta));else {const list=filtered(),i=list.findIndex(q=>q.id===state.current);state.current=list[Math.max(0,Math.min(list.length-1,i+delta))].id;}renderDetail();renderList();revealActive();persist();}
  if(button.id==='save-answer'){try{saveAnswer(state.current,$('draft').value);notify(state.status==='pending'?'作答已保存，并移出未作答列表。可在已作答中查看解析和自评。':'作答已保存，可以展开解析并标记掌握程度。');}catch(error){notify(error.message);$('draft')?.focus();}}
  if(button.dataset.favorite){const id=button.dataset.favorite,c=C.editCard(state,id,{favorite:!C.card(state,id).favorite});button.setAttribute('aria-pressed',c.favorite);button.textContent=c.favorite?'★ 已收藏':'☆ 收藏';persist();notify(c.favorite?'已加入收藏夹。':'已取消收藏。');if(state.status==='favorite'&&!c.favorite)render();return;}
  if(button.dataset.rating){
   const id=button.dataset.ratingId||state.current,e=state.entries[id];if(!e?.submitted?.trim())return;
   const expanded=$('question').querySelector('.answer-details')?.open;
   try{const review=C.rate(state,id,button.dataset.rating);render();if(expanded&&state.current===id&&state.mode==='practice'){const details=$('question').querySelector('.answer-details');if(details)details.open=true;}notify(`已记录掌握程度，下次复习：${new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(review.dueAt)}。`);}catch(error){notify(error.message);}
  }
  if(button.id==='start-interview'){try{state.interview=C.buildInterview(bank,$('interview-project').value,Number($('interview-count').value),Number($('interview-minutes').value));render();tick();revealActive();}catch(error){notify(error.message);}return;}
  if(button.dataset.interviewNav){const iv=state.interview;iv.index=Math.max(0,Math.min(iv.rounds.length-1,iv.index+Number(button.dataset.interviewNav)));renderDetail();renderList();revealActive();persist();return;}
  if(button.id==='finish-interview'){const missing=state.interview.rounds.length-Object.values(state.interview.answers).filter(a=>a.trim()).length;if(missing)confirm('结束并生成复盘？',`仍有 ${missing} 轮未作答。已写下的回答会保存，未答轮次标记为未作答。`,()=>finishProjectInterview());else finishProjectInterview();return;}
  if(button.id==='return-from-interview'){setMode('practice');return;}
  if(button.id==='new-interview'){state.interview=null;render();return;}
  if(button.dataset.history){const h=state.interviewHistory.find(h=>h.id===button.dataset.history);if(h){state.interview=C.clone(h);state.interview.index=0;render();}return;}
  if(button.dataset.interviewRating){
   const iv=state.interview,index=iv.index;if(!iv.submitted||!iv.answers[index]?.trim())return;
   iv.ratings[index]=button.dataset.interviewRating;iv.updatedAt=Date.now();const id=iv.rounds[index].id,order=['review','basic','fluent'];
   const grades=iv.rounds.map((r,i)=>r.id===id?iv.ratings[i]:null).filter(Boolean);const grade=grades.sort((a,b)=>order.indexOf(a)-order.indexOf(b))[0];
   C.rate(state,id,grade,Date.now(),true);state.interviewHistory=state.interviewHistory.map(h=>h.id===iv.id?C.clone(iv):h);render();notify('本轮自评已保存，并更新该题的复习安排。');return;
  }

  if(button.id==='start-exam')startExam();
  if(button.id==='retry-exam'){state.exam=null;render();}
  if(button.id==='submit-exam')submitExam();
  if(button.id==='return-practice')setMode('practice');
  if(button.id==='clear-filter')clearFilters();
});
$('reset').addEventListener('click',()=>confirm('重置本机学习记录？','这会清除本机的作答、收藏、笔记、复习安排和面试记录，并同步到此浏览器的其他页面。建议先导出备份。',()=>{state=C.reset(bank,state);visibleCount=60;setFiltersExpanded(false);setListExpanded(false);render();notify('本机学习记录已重置。');}));
$('cancel-dialog').addEventListener('click',()=>{$('confirm-dialog').close();confirmAction=null;});$('confirm-dialog-action').addEventListener('click',()=>{const action=confirmAction;confirmAction=null;$('confirm-dialog').close();action?.();});$('confirm-dialog').addEventListener('cancel',()=>{confirmAction=null;});
const motionPreferenceKey='cpp-interview-motion-v1',reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');let motionEnabled=true;
try{motionEnabled=localStorage.getItem(motionPreferenceKey)!=='off';}catch{}
function applyMotion(){const on=motionEnabled&&!reducedMotion?.matches;document.documentElement?.classList.toggle('motion-paused',!on);$('motion-toggle').setAttribute('aria-pressed',on);$('motion-toggle').disabled=Boolean(reducedMotion?.matches);$('motion-label').textContent=reducedMotion?.matches?'静态背景 · 系统设置':on?'动态背景已开启':'动态背景已暂停';}
$('motion-toggle').addEventListener('click',()=>{motionEnabled=!motionEnabled;try{localStorage.setItem(motionPreferenceKey,motionEnabled?'on':'off');}catch{}applyMotion();});reducedMotion?.addEventListener?.('change',applyMotion);document.addEventListener?.('visibilitychange',()=>document.documentElement?.classList.toggle('page-idle',document.hidden));applyMotion();
window.PracticeApp={bank,info,C,get state(){return state;},get storageOK(){return storageOK;},persist,flush,render,notify,confirm,setMode,activeAssessment,filtered,
 openScope(status,date){if(activeAssessment()){notify('请先完成或退出当前自测或项目面试。');return;}state.mode='practice';searchPending=false;if(date)state.reviewDate=date;configure('全部','全部','全部','',status,'全部','all','all','');setListExpanded(false);revealActive();},
 openQuestion(id){if(!byId.has(id)||activeAssessment())return;state.mode='practice';searchPending=false;configure('全部','全部','全部','','all','全部','all','all','');state.current=id;render();revealActive();},
 openTopic(topic){if(activeAssessment()){notify('请先结束当前自测或项目面试。');return;}state.mode='practice';searchPending=false;configure('全部','全部','全部','','all','全部','all',topic,'');setFiltersExpanded(true);revealActive();},
 openRoute(key,replace=false){if(activeAssessment())throw Error('请先结束当前自测或项目面试。');const part=P.stage(key);if(!part)throw Error('无效的训练阶段。');flush();if(replace||!state.routeSessions[key]){const ids=P.pick(bank,key,state,C);if(!ids.length)throw Error('这个阶段暂时没有可用题目。');const now=Date.now(),old=state.routeSessions[key];state.routeSessions[key]={ids,startedAt:now,updatedAt:Math.max(now,(old?.updatedAt||0)+1)};}const session=state.routeSessions[key];state.mode='practice';state.current=session.ids.find(id=>C.isDue(state,id))||session.ids.find(id=>!C.isCompleted(state,id))||session.ids.find(id=>C.needsReview(state,id))||session.ids[0];searchPending=false;configure('全部','全部','全部','','all','全部','all','all',key);setListExpanded(false);revealActive();},
 leaveRoute(){if(activeAssessment())throw Error('请先结束当前自测或项目面试。');configure(state.module,state.type,state.source,state.query,state.status,state.project,state.searchScope,state.topic,'');},
 mergeImport(incoming){if(activeAssessment())throw Error('请先结束当前自测或项目面试，再导入学习记录。');state=C.merge(state,incoming,bank);render();},
 updatePlan(target,project){if(![5,10,15,20].includes(target)||!['全部','IM','云盘','通用'].includes(project))throw Error('无效的每日计划设置。');if(activeAssessment())throw Error('请先结束当前自测或项目面试，再调整计划。');state.settings={dailyTarget:target,dailyProject:project};state.dailyPlan=C.makePlan(bank,state);persist();}
};
function tick(){
 const now=Date.now();
 if(state.exam&&!state.exam.submitted&&state.exam.deadlineAt&&now>=state.exam.deadlineAt)submitExam(true);
 if(state.interview&&!state.interview.submitted&&state.interview.deadlineAt&&now>=state.interview.deadlineAt)finishProjectInterview(true);
 for(const node of document.querySelectorAll('[data-countdown]')){const seconds=Math.max(0,Math.ceil((Number(node.dataset.countdown)-now)/1000));node.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;node.classList.toggle('timer-urgent',seconds<60);}
 if(C.ensurePlan(bank,state,now)){persist();if(state.status==='plan')render();}
}
window.addEventListener('storage',event=>{
 if(event.key!==key||!event.newValue)return;
 try{
  const incoming=JSON.parse(event.newValue);if(incoming?.version!==2)return;
  const resetReceived=(incoming.resetAt||0)>(state.resetAt||0),staleReset=(incoming.resetAt||0)<(state.resetAt||0);
  state=C.sync(state,incoming,bank);lastStoredRaw=event.newValue;
  if(resetReceived){clearTimeout(saveTimer);pendingSave=false;pendingHub=false;}
  receivingStorage=true;try{if(resetReceived||!['TEXTAREA','INPUT'].includes(document.activeElement?.tagName))render();else syncStats();}finally{receivingStorage=false;}
  saveLabels();document.dispatchEvent(new CustomEvent('study:change',{detail:{storageOK}}));
  if(resetReceived)notify('另一页面已重置学习记录，当前页面已同步。');
  if(staleReset)persist();
 }catch{receivingStorage=false;}
});
window.addEventListener('pagehide',flush);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();else tick();});
render();tick();setInterval(tick,1000);
if(restored.migrated)notify('已将当前标签页的旧学习记录迁移到长期保存。');else if(restored.invalid)notify('部分旧记录无法读取。当前仍可练习，也可导入学习备份恢复。');
if(!storageOK)notify('自动保存未成功，请使用“学习备份”导出当前记录。');
// These tools share the same actions and state as the visible practice controls.
const context=document.modelContext;
if(context?.registerTool){
  const lifecycle=new AbortController();const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'read_practice_progress',description:'读取当前标签页的练习完成情况和最近自测结果。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({total:bank.length,completed:completedIds().length,needsReview:bank.filter(q=>needsReview(q.id)).map(q=>q.id),module:state.module,type:state.type,source:state.source,project:state.project,searchScope:state.searchScope,topic:state.topic,routeActive:state.routeActive,query:state.query,status:state.status,lastTest:state.lastTest,due:bank.filter(q=>C.isDue(state,q.id)).length,favorites:Object.values(state.cards).filter(c=>c.favorite).length,dailyPlan:state.dailyPlan})});
  register({name:'filter_practice_questions',description:'按项目、模块、来源、关键词和练习状态筛选题目；自测进行中不能改变范围。',inputSchema:{type:'object',properties:{module:{type:'string',enum:['全部',...Object.keys(info)]},type:{type:'string',enum:['全部','概念题','场景题','代码题']},source:{type:'string',enum:['全部','基础','每日',...dates]},project:{type:'string',enum:['全部','IM','云盘','通用']},query:{type:'string',maxLength:120},topic:{type:'string',enum:['all',...P.TOPICS.map(t=>t.id)]},searchScope:{type:'string',enum:['all','question','reference','personal']},status:{type:'string',enum:['all','pending','answered','review','due','favorite','notes','plan','calendar']}},required:['module','type'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||typeof input.module!=='string'||typeof input.type!=='string')throw new Error('模块和题型为必填项。');return configure(input.module,input.type,input.source||state.source,input.query??state.query,input.status||state.status,input.project||state.project,input.searchScope||state.searchScope,input.topic||state.topic);}});
  register({name:'save_practice_answer',description:'保存指定题目的文字作答到本次练习，并更新进度；不会自动判分。',inputSchema:{type:'object',properties:{questionId:{type:'string'},answer:{type:'string',minLength:1,maxLength:10000}},required:['questionId','answer'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:input=>{if(!input)throw new Error('缺少作答。');return saveAnswer(input.questionId,input.answer);}});
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
})();
