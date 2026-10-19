(() => {
'use strict';
const bank=window.QUESTION_BANK, info=window.MODULE_INFO, byId=new Map(bank.map(q=>[q.id,q]));
const key='cpp-interview-session-v1', $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dates=[...new Set(bank.map(q=>q.sourceDate).filter(Boolean))].sort().reverse();
$('source-filter').innerHTML+='<option value="每日">全部每日练习</option>'+dates.map(date=>`<option value="${date}">${date} 每日练习</option>`).join('');
const projectOf=q=>q.project||(/\bIM\b|即时通[讯信]|聊天|client_msg|outbox/i.test([q.title,q.prompt,q.sourceRoundTitle||''].join(' '))?'IM':'通用');
const searchText=new Map(bank.map(q=>[q.id,[q.title,q.module,q.prompt,q.sourceRoundTitle||'',projectOf(q)].join(' ').normalize('NFKC').toLowerCase()]));
let visibleCount=60;
const fresh=()=>({version:1,query:'',status:'all',source:'全部',project:'全部',module:'全部',type:'全部',mode:'practice',current:bank[0].id,entries:{},outcomes:{},exam:null,lastTest:null});
let state=fresh(),storageOK=true,toastTimer,confirmAction;
try {
  const saved=JSON.parse(sessionStorage.getItem(key));
  if(saved?.version===1){
    if(typeof saved.query==='string'&&saved.query.length<=120)state.query=saved.query;
    if(['all','pending','answered','review'].includes(saved.status))state.status=saved.status;
    if(['全部','基础','每日',...dates].includes(saved.source))state.source=saved.source;
    if(['全部','IM','云盘','通用'].includes(saved.project))state.project=saved.project;
    if(saved.module==='全部'||info[saved.module]) state.module=saved.module;
    if(['全部','概念题','场景题','代码题'].includes(saved.type)) state.type=saved.type;
    if(byId.has(saved.current)) state.current=saved.current;
    if(['practice','exam'].includes(saved.mode)) state.mode=saved.mode;
    for(const [id,e] of Object.entries(saved.entries||{})) if(byId.has(id)&&e&&typeof e.draft==='string') state.entries[id]={draft:e.draft.slice(0,10000),submitted:typeof e.submitted==='string'?e.submitted.slice(0,10000):'',rating:['review','basic','fluent'].includes(e.rating)?e.rating:null};
    for(const [id,pass] of Object.entries(saved.outcomes||{})) if(byId.has(id)&&typeof pass==='boolean') state.outcomes[id]=pass;
    if(saved.lastTest&&Number.isInteger(saved.lastTest.correct)&&Number.isInteger(saved.lastTest.total)&&saved.lastTest.total>=0&&saved.lastTest.total<=10&&(saved.lastTest.total>0||saved.lastTest.manual>0)&&saved.lastTest.correct>=0&&saved.lastTest.correct<=saved.lastTest.total)state.lastTest=saved.lastTest;
    const ex=saved.exam;
    if(ex&&Array.isArray(ex.ids)&&ex.ids.length>0&&ex.ids.length<=10&&new Set(ex.ids).size===ex.ids.length&&ex.ids.every(id=>byId.has(id))){
      const answers={};for(const [id,n] of Object.entries(ex.answers||{})) if(ex.ids.includes(id)&&((byId.get(id).manual&&typeof n==='string'&&n.trim()&&n.length<=10000)||(!byId.get(id).manual&&Number.isInteger(n)&&n>=0&&n<4))) answers[id]=n;
      state.exam={ids:ex.ids,answers,index:Number.isInteger(ex.index)&&ex.index>=0&&ex.index<ex.ids.length?ex.index:0,submitted:ex.submitted===true&&ex.ids.every(id=>answers[id]!==undefined)};
    }
  }
}catch{storageOK=false;}
let listExpanded=false,filtersExpanded=state.project!=='全部'||state.module!=='全部'||state.type!=='全部'||state.source!=='全部'||Boolean(state.query)||state.status!=='all';
function setListExpanded(on){listExpanded=on;document.documentElement?.classList.toggle('questions-open',on);$('mobile-list-toggle').setAttribute('aria-expanded',on);$('mobile-list-toggle').textContent=`${on?'收起':'展开'}列表 · ${listQuestions().length}`;}
function setFiltersExpanded(on){filtersExpanded=on;document.documentElement?.classList.toggle('filters-open',on);$('mobile-filter-toggle').setAttribute('aria-expanded',on);}
setListExpanded(false);setFiltersExpanded(filtersExpanded);
function notify(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200);}
function persist(){try{sessionStorage.setItem(key,JSON.stringify(state));}catch{if(storageOK)notify('当前浏览器无法保存进度，刷新后可能丢失。');storageOK=false;}}
function isCompleted(id){return Boolean(state.entries[id]?.submitted?.trim())||Object.hasOwn(state.outcomes,id);}
function filtered(){
 const words=state.query.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
 return bank.filter(q=>(state.project==='全部'||projectOf(q)===state.project)&&(state.module==='全部'||q.module===state.module)&&(state.type==='全部'||q.type===state.type)&&(state.source==='全部'||state.source==='基础'&&!q.sourceDate||state.source==='每日'&&q.sourceDate||q.sourceDate===state.source)&&words.every(word=>searchText.get(q.id).includes(word))&&(state.status==='all'||state.status==='pending'&&!isCompleted(q.id)||state.status==='answered'&&isCompleted(q.id)||state.status==='review'&&needsReview(q.id)));
}
function clearFilters(){return configure('全部','全部','全部','','all','全部');}
function revealActive(){if(window.matchMedia?.('(max-width: 700px)').matches){setListExpanded(false);$('question').scrollIntoView?.({block:'start',behavior:'auto'});$('question').focus({preventScroll:true});}else $('question-items').querySelector('[aria-current="true"]')?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});}
function completedIds(){return bank.filter(q=>Boolean(state.entries[q.id]?.submitted?.trim())||Object.hasOwn(state.outcomes,q.id)).map(q=>q.id);}
function needsReview(id){const rating=state.entries[id]?.rating;return rating?rating==='review':state.outcomes[id]===false;}
function getScore(ex=state.exam){return ex?.submitted?ex.ids.reduce((n,id)=>n+(!byId.get(id).manual&&ex.answers[id]===byId.get(id).correct?1:0),0):null;}
function activeExam(){return state.mode==='exam'&&state.exam&&!state.exam.submitted;}
function entry(id){return state.entries[id]||(state.entries[id]={draft:'',submitted:'',rating:null});}
function syncStats(){
  const done=completedIds().length;$('completed').textContent=done;$('total').textContent=`/ ${bank.length}`;$('review-count').textContent=bank.filter(q=>needsReview(q.id)).length;
  $('progress').max=bank.length;$('progress').value=done;$('percentage').textContent=`${Math.round(done/bank.length*100)}%`;
  const last=state.lastTest;$('score').textContent=last?(last.total?`${last.correct}/${last.total}`:`已答 ${last.manual} 题`):'—';$('score-label').textContent=last?(last.total?(last.manual?'单选得分 · 另有文字题自评':'答对题数'):'文字题 · 对照答案自评'):'尚未交卷';
}
function renderModules(){
  $('modules').innerHTML=['全部',...Object.keys(info)].map(m=>`<button class="module ${state.module===m?'active':''}" data-module="${esc(m)}" aria-pressed="${state.module===m}" ${activeExam()?'disabled':''}><span class="module-symbol">${m==='全部'?'ALL':info[m].short}</span><span>${m==='全部'?'全部题目':esc(m)}</span><span class="module-count">${m==='全部'?bank.length:bank.filter(q=>q.module===m).length}</span></button>`).join('');
}
function listQuestions(){return state.mode==='exam'&&state.exam?state.exam.ids.map(id=>byId.get(id)):filtered();}
function renderList(){
  const scroll=$('question-items').scrollTop, list=listQuestions();
  const activeIndex=state.mode==='exam'&&state.exam?state.exam.index:list.findIndex(q=>q.id===state.current);
  visibleCount=Math.max(visibleCount,activeIndex+1);const shown=list.slice(0,visibleCount),remaining=list.length-shown.length;
  $('list-title').textContent=state.mode==='exam'&&state.exam?(state.exam.submitted?'自测回顾':'本轮自测'):(state.module==='全部'?'全部题目':state.module);
  $('list-subtitle').textContent=state.mode==='exam'&&state.exam?(state.exam.submitted?'查看得分与错题解析':'可跳题，交卷后统一看答案'):`${list.length} 道题 · ${state.type==='全部'?'全部题型':state.type}`;
  $('mobile-list-toggle').textContent=`${listExpanded?'收起':'展开'}列表 · ${list.length}`;
  $('question-items').innerHTML=list.length?shown.map((q,i)=>{
    const ex=state.mode==='exam'&&state.exam,selected=ex?state.exam.index===i:state.current===q.id;
    let status='';
    if(ex){if(state.exam.submitted)status=q.manual?(needsReview(q.id)?'待复习':'已作答'):state.exam.answers[q.id]===q.correct?'答对':'答错';else if(state.exam.answers[q.id]!==undefined)status=q.manual?'有作答':'已选择';}
    else if(needsReview(q.id))status='待复习';else if(state.entries[q.id]?.rating)status=state.entries[q.id].rating==='fluent'?'熟练':'基本掌握';else if(state.entries[q.id]?.submitted)status='已作答';else if(Object.hasOwn(state.outcomes,q.id))status='已自测';else if(state.entries[q.id]?.draft)status='有草稿';
    return `<button class="question-item ${selected?'active':''}" data-q="${q.id}" ${selected?'aria-current="true"':''}><span class="item-number">${String(i+1).padStart(2,'0')}</span><span class="item-body"><strong title="${esc(q.title)}">${esc(q.title)}</strong><span class="item-meta"><span>${esc(q.module)}</span><span>${esc(q.type)}</span>${projectOf(q)!=='通用'?`<span>${esc(projectOf(q))}</span>`:''}${q.sourceDate?`<span>${q.sourceDate}</span>`:''}${status?`<span class="item-status ${status==='待复习'||status==='答错'?'warn':''}">${status}</span>`:''}</span></span></button>`;
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
function questionHeader(q,i,n){return `<div class="q-top"><div class="badges"><span class="badge">${esc(q.module)}</span><span class="badge">${esc(q.type)}</span>${projectOf(q)!=='通用'?`<span class="badge">${esc(projectOf(q))} 项目</span>`:''}${q.priority?'<span class="badge focus">近期重点</span>':''}${q.sourceDate?`<span class="badge">${q.sourceDate} · 第 ${q.sourceRound} 轮</span>`:''}</div><span class="position">${String(i+1).padStart(2,'0')} / ${String(n).padStart(2,'0')}</span></div><h2>${esc(q.title)}</h2>${q.sourceDate?`<p class="daily-origin">${esc(q.sourceRoundTitle)}</p>`:''}${q.promptMarkdown?`<div class="prompt markdown">${markdown(q.promptMarkdown)}</div>`:`<p class="prompt">${esc(q.prompt)}</p>`}${q.code?codeMarkup(q.code,'cpp'):''}`;}
function answerMarkup(q,open=false,practice=true){
  const e=state.entries[q.id];return `<details class="answer-details" ${open?'open':''}><summary>参考答案与易错点<span class="expand" aria-hidden="true">+</span></summary><div class="answer-content">${q.answerMarkdown?`<div class="markdown">${markdown(q.answerMarkdown)}</div>`:`<ol class="answer-points">${q.answer.map(a=>`<li>${esc(a)}</li>`).join('')}</ol><div class="pitfalls"><h3>易错点</h3><ul>${q.pitfalls.map(a=>`<li>${esc(a)}</li>`).join('')}</ul></div><div class="follow"><h3>面试追问</h3><p>${esc(q.follow)}</p></div>`}${q.project==='云盘'?`<a class="source" href="https://github.com/qzshen219-pixel/distributed-cloud-disk/blob/main/${esc(q.sourceFile)}" target="_blank" rel="noopener noreferrer">核对云盘源码 · ${esc(q.sourceFile.split('/').pop())}</a>`:''}${info[q.module].source?`<a class="source" href="${info[q.module].source}" target="_blank" rel="noopener noreferrer">延伸阅读 · ${esc(info[q.module].label)}</a>`:''}${practice?`<div class="self-eval"><span>对照答案后，标记本题掌握程度</span><div class="rating-buttons">${[['review','需要复习'],['basic','基本掌握'],['fluent','熟练表达']].map(([v,t])=>`<button data-rating="${v}" data-rating-id="${q.id}" aria-pressed="${e?.rating===v}" class="${e?.rating===v?'active':''}" ${e?.submitted?.trim()?'':'disabled'}>${t}</button>`).join('')}</div>${e?.submitted?.trim()?'':'<span class="muted">先保存你的作答，再进行自评。</span>'}</div>`:''}</div></details>`;
}
function renderPractice(){
  const list=filtered();if(!list.some(q=>q.id===state.current))state.current=list[0]?.id||null;
  const q=byId.get(state.current);if(!q){$('question').innerHTML='<div class="exam-setup"><h2>没有匹配的题目</h2><p>试试更短的关键词，或调整来源、题型和练习状态。</p><button class="secondary" id="clear-filter">恢复全部题目</button></div>';return;}
  const i=list.indexOf(q),e=state.entries[q.id]||{draft:'',submitted:''};
  $('question').innerHTML=questionHeader(q,i,list.length)+`<div class="answer-label"><label for="draft">你的回答</label><span id="char-count">${e.draft.length} / 10000 字符</span></div><textarea id="draft" maxlength="10000" placeholder="先说结论，再解释原理，最后举一个项目例子。">${esc(e.draft)}</textarea><div class="write-actions"><span class="save-status" id="save-status">${e.submitted&&e.submitted===e.draft?'已保存作答':e.draft?'草稿已暂存，尚未保存作答':'草稿自动暂存到本次练习'}</span><button class="primary" id="save-answer">保存作答</button></div>${answerMarkup(q)}<div class="question-nav"><button class="secondary" data-nav="-1" ${i===0?'disabled':''}>上一题</button><span>按你的节奏，一题一题来</span><button class="secondary" data-nav="1" ${i===list.length-1?'disabled':''}>下一题</button></div>`;
}
function renderExamSetup(){
  const list=filtered(),n=Math.min(10,list.length);
  $('question').innerHTML=`<div class="exam-setup"><div class="exam-kicker">SELF CHECK / 01</div><h2>用 ${n} 道题，检查理解。</h2><p>从当前模块和题型中随机抽题。基础题选择最准确的判断；开放题写下回答。交卷后，单选题显示得分，文字题对照参考答案自评。</p><div class="exam-info"><div><strong>${n}</strong><span>本轮题数</span></div><div><strong>${list.length}</strong><span>可选题目</span></div><div><strong>不限时</strong><span>先理解，再判断</span></div></div><button class="primary" id="start-exam" ${n?'':'disabled'}>开始本轮自测</button><div class="exam-intro-note">当前范围：${esc(state.project==='全部'?'全部项目':state.project)} / ${esc(state.module)} / ${state.type==='全部'?'全部题型':esc(state.type)} / ${esc(state.source==='全部'?'全部来源':state.source==='基础'?'基础题库':state.source==='每日'?'全部每日练习':state.source)}。少于十题时使用全部匹配题目。</div></div>`;
}
function renderExam(){
  const ex=state.exam;if(!ex){renderExamSetup();return;}
  const q=byId.get(ex.ids[ex.index]),chosen=ex.answers[q.id],pass=chosen===q.correct,n=Object.keys(ex.answers).length;
  const objective=ex.ids.filter(id=>!byId.get(id).manual).length,manual=ex.ids.length-objective;
  let body;
  if(q.manual){
    body=ex.submitted?`<div class="written-answer"><h3>你的作答</h3><pre>${esc(chosen)}</pre></div><div class="feedback">文字题不自动判分。对照完整答案与易错点，标记掌握程度。</div>${answerMarkup(q,true,true)}`:`<label class="answer-label" for="exam-draft">你的回答</label><textarea id="exam-draft" maxlength="10000" placeholder="独立作答，交卷后再对照答案。">${esc(chosen||'')}</textarea><div class="exam-intro-note">文字作答自动保留，交卷后采用自评。</div>`;
  }else{
    body=`<fieldset class="choice-list" style="border:0;padding:0;margin-left:0;margin-right:0"><legend class="muted">请选择最准确的判断（单选）</legend>${q.choices.map((c,i)=>`<label class="choice ${chosen===i?'selected':''} ${ex.submitted?(i===q.correct?'correct':chosen===i?'wrong':''):''}"><input type="radio" name="exam-choice" value="${i}" ${chosen===i?'checked':''} ${ex.submitted?'disabled':''}><span class="choice-letter">${'ABCD'[i]}</span><span class="choice-text">${esc(c)}</span>${ex.submitted&&i===q.correct?'<span class="item-status">正确</span>':''}</label>`).join('')}</fieldset>${ex.submitted?`<div class="feedback ${pass?'':'wrong'}">${pass?'本题答对。继续检查你能否完整解释原理。':`本题答错。正确选项：${'ABCD'[q.correct]}。`}</div>${answerMarkup(q,true,false)}`:'<div class="exam-intro-note">答案在交卷后显示，选项会自动保留。</div>'}`;
  }
  $('question').innerHTML=(ex.submitted?`<div class="score-banner"><strong>${objective?`${getScore(ex)} / ${objective}`:`已答 ${manual} 题`}</strong><span>本轮自测已完成<br>${objective?`单选题答对 ${getScore(ex)} 题`:'文字题不自动判分'}${manual?` · ${ex.ids.filter(id=>byId.get(id).manual&&!state.entries[id]?.rating).length} 道文字题待自评`:''}</span></div>`:'')+questionHeader(q,ex.index,ex.ids.length)+body+`<div class="question-nav"><button class="secondary" data-nav="-1" ${ex.index===0?'disabled':''}>上一题</button><span>${ex.submitted?'逐题回顾':'已作答'} ${ex.submitted?ex.index+1:n} / ${ex.ids.length}</span><button class="secondary" data-nav="1" ${ex.index===ex.ids.length-1?'disabled':''}>下一题</button></div><div class="exam-controls"><button class="text-button" id="return-practice">${ex.submitted?'返回逐题练习':'退出本轮自测'}</button>${ex.submitted?'<button class="primary" id="retry-exam">重新抽题自测</button>':`<span>交卷前可修改作答</span><button class="primary" id="submit-exam">交卷并查看解析</button>`}</div>`;
}
function renderDetail(){state.mode==='practice'?renderPractice():renderExam();}
function render(){renderModules();if($('question-search').value!==state.query)$('question-search').value=state.query;$('status-filter').value=state.status;$('question-search').disabled=Boolean(activeExam());$('status-filter').disabled=Boolean(activeExam());$('clear-all-filter').disabled=Boolean(activeExam())||(state.project==='全部'&&state.module==='全部'&&state.type==='全部'&&state.source==='全部'&&!state.query&&state.status==='all');$('project-filter').value=state.project;$('project-filter').disabled=Boolean(activeExam());$('source-filter').value=state.source;$('source-filter').disabled=Boolean(activeExam());$('type-filter').value=state.type;$('type-filter').disabled=Boolean(activeExam());$('filter-count').textContent=`${filtered().length} 题`;$('mobile-filter-toggle').textContent=`筛选 · ${filtered().length} 题`;$('mobile-filter-toggle').disabled=Boolean(activeExam());$('practice-tab').setAttribute('aria-selected',state.mode==='practice');$('exam-tab').setAttribute('aria-selected',state.mode==='exam');$('practice-tab').tabIndex=state.mode==='practice'?0:-1;$('exam-tab').tabIndex=state.mode==='exam'?0:-1;$('workspace').setAttribute('aria-labelledby',state.mode==='practice'?'practice-tab':'exam-tab');renderDetail();renderList();syncStats();persist();}
function configure(module,type,source=state.source,query=state.query,status=state.status,project=state.project){
  if(activeExam())throw new Error('请先完成或退出本轮自测。');
  if(module!=='全部'&&!info[module])throw new Error('无效模块。');
  if(!['全部','概念题','场景题','代码题'].includes(type))throw new Error('无效题型。');
  if(!['全部','基础','每日',...dates].includes(source))throw new Error('无效来源。');
  if(!['全部','IM','云盘','通用'].includes(project))throw new Error('无效项目。');
  if(typeof query!=='string'||query.length>120||!['all','pending','answered','review'].includes(status))throw new Error('无效的搜索或状态。');
  visibleCount=60;state.module=module;state.type=type;state.source=source;state.query=query;state.status=status;state.project=project;if(state.mode==='exam')state.exam=null;render();return {count:filtered().length,module,type,source,query,status,project};
}
function saveAnswer(id,text){
  if(!byId.has(id)||typeof text!=='string'||!text.trim()||text.length>10000)throw new Error('请填写有效回答，最多 10000 字符。');
  if(activeExam())throw new Error('请先完成或退出自测。');
  const expanded=$('question').querySelector('details')?.open;
  const e=entry(id);e.draft=text;e.submitted=text;e.rating=null;render();
  if(expanded&&state.current===id&&state.mode==='practice'){const details=$('question').querySelector('details');if(details)details.open=true;}
  return {questionId:id,saved:true,completed:completedIds().length};
}
function startExam(){
  const ids=filtered().map(q=>q.id);if(!ids.length){notify('当前筛选没有可自测题目。');return;}
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  state.mode='exam';state.exam={ids:ids.slice(0,10),answers:{},index:0,submitted:false};setFiltersExpanded(false);render();notify('自测已开始，交卷后统一查看答案。');
}
function submitExam(){
  const ex=state.exam;if(!ex||ex.submitted)return;
  const unanswered=id=>byId.get(id).manual?!ex.answers[id]?.trim():ex.answers[id]===undefined;
  const missing=ex.ids.findIndex(unanswered);
  if(missing>=0){ex.index=missing;render();notify(`还有 ${ex.ids.filter(unanswered).length} 道未作答，请先完成作答。`);return;}
  ex.submitted=true;ex.index=0;const total=ex.ids.filter(id=>!byId.get(id).manual).length,manual=ex.ids.length-total;state.lastTest={correct:getScore(ex),total,manual};for(const id of ex.ids){if(byId.get(id).manual){const e=entry(id);e.draft=ex.answers[id];e.submitted=ex.answers[id];e.rating=null;}else{state.outcomes[id]=ex.answers[id]===byId.get(id).correct;if(!state.outcomes[id]&&state.entries[id]?.rating)state.entries[id].rating='review';}}render();notify(total?`自测完成：单选题答对 ${getScore(ex)} / ${total}，文字题 ${manual} 道采用自评。`:`已完成 ${manual} 道文字题，请对照答案自评。`);
}
function confirm(title,message,action){confirmAction=action;$('dialog-title').textContent=title;$('dialog-text').textContent=message;$('confirm-dialog').showModal();}
function setMode(mode){
  if(mode===state.mode)return;
  if(activeExam()&&mode==='practice'){confirm('退出本轮自测？','本轮尚未交卷，退出会清除本轮选择。已经保存的逐题作答会保留。',()=>{state.exam=null;state.mode='practice';render();});return;}
  state.mode=mode;render();
}
$('modules').addEventListener('click',event=>{const button=event.target.closest('[data-module]');if(button&&!button.disabled)configure(button.dataset.module,state.type);});
$('project-filter').addEventListener('change',()=>configure('全部','全部','全部','','all',$('project-filter').value));
$('type-filter').addEventListener('change',()=>configure(state.module,$('type-filter').value));
$('source-filter').addEventListener('change',()=>configure(state.module,state.type,$('source-filter').value));
$('question-search').addEventListener('input',()=>configure(state.module,state.type,state.source,$('question-search').value));
$('status-filter').addEventListener('change',()=>configure(state.module,state.type,state.source,state.query,$('status-filter').value));
$('clear-all-filter').addEventListener('click',clearFilters);
$('mobile-filter-toggle').addEventListener('click',()=>setFiltersExpanded(!filtersExpanded));
$('mobile-list-toggle').addEventListener('click',()=>{setListExpanded(!listExpanded);renderList();});
$('practice-tab').addEventListener('click',()=>setMode('practice'));$('exam-tab').addEventListener('click',()=>setMode('exam'));
document.querySelector('.mode-tabs').addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const mode=state.mode==='practice'?'exam':'practice';setMode(mode);$(mode+'-tab').focus();}});
$('question-items').addEventListener('click',event=>{const more=event.target.closest('#load-more');if(more?.id==='load-more'){visibleCount+=60;renderList();return;}const button=event.target.closest('[data-q]');if(!button)return;if(state.mode==='exam'&&state.exam)state.exam.index=state.exam.ids.indexOf(button.dataset.q);else state.current=button.dataset.q;renderDetail();renderList();revealActive();persist();});
$('question').addEventListener('input',event=>{if(event.target.id==='exam-draft'&&activeExam()){const id=state.exam.ids[state.exam.index];if(event.target.value.trim())state.exam.answers[id]=event.target.value;else delete state.exam.answers[id];persist();renderList();return;}if(event.target.id!=='draft')return;entry(state.current).draft=event.target.value;persist();$('char-count').textContent=`${event.target.value.length} / 10000 字符`;$('save-status').textContent=entry(state.current).submitted===event.target.value&&event.target.value?'已保存作答':'草稿已暂存，尚未保存作答';});
$('question').addEventListener('change',event=>{if(event.target.name!=='exam-choice'||!activeExam())return;const chosen=Number(event.target.value);state.exam.answers[state.exam.ids[state.exam.index]]=chosen;persist();renderExam();renderList();$('question').querySelector(`input[name="exam-choice"][value="${chosen}"]`)?.focus({preventScroll:true});});
$('question').addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.copyCode!==undefined){copyCode(button);return;}
  if(button.dataset.nav){const delta=Number(button.dataset.nav);if(state.mode==='exam'&&state.exam)state.exam.index=Math.max(0,Math.min(state.exam.ids.length-1,state.exam.index+delta));else {const list=filtered(),i=list.findIndex(q=>q.id===state.current);state.current=list[Math.max(0,Math.min(list.length-1,i+delta))].id;}renderDetail();renderList();revealActive();persist();}
  if(button.id==='save-answer'){try{saveAnswer(state.current,$('draft').value);notify(state.status==='pending'?'作答已保存，并移出未作答列表。可在已作答中查看解析和自评。':'作答已保存，可以展开解析并标记掌握程度。');}catch(error){notify(error.message);$('draft')?.focus();}}
  if(button.dataset.rating){const id=button.dataset.ratingId||state.current,e=entry(id);if(!e.submitted?.trim())return;const expanded=$('question').querySelector('details')?.open;e.rating=button.dataset.rating;render();if(expanded&&state.current===id&&state.mode==='practice'){const details=$('question').querySelector('details');if(details)details.open=true;}$('question').querySelector(`[data-rating-id="${id}"][data-rating="${e.rating}"]`)?.focus({preventScroll:true});notify('本题自评已记录。');}
  if(button.id==='start-exam'||button.id==='retry-exam')startExam();
  if(button.id==='submit-exam')submitExam();
  if(button.id==='return-practice')setMode('practice');
  if(button.id==='clear-filter')clearFilters();
});
$('reset').addEventListener('click',()=>confirm('重新开始本次练习？','这会清除当前标签页的作答、草稿、自评和自测结果。',()=>{state=fresh();visibleCount=60;setFiltersExpanded(false);setListExpanded(false);render();notify('本次练习已重置。');}));
$('cancel-dialog').addEventListener('click',()=>{$('confirm-dialog').close();confirmAction=null;});$('confirm-dialog-action').addEventListener('click',()=>{const action=confirmAction;confirmAction=null;$('confirm-dialog').close();action?.();});$('confirm-dialog').addEventListener('cancel',()=>{confirmAction=null;});
const motionPreferenceKey='cpp-interview-motion-v1',reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');let motionEnabled=true;
try{motionEnabled=localStorage.getItem(motionPreferenceKey)!=='off';}catch{}
function applyMotion(){const on=motionEnabled&&!reducedMotion?.matches;document.documentElement?.classList.toggle('motion-paused',!on);$('motion-toggle').setAttribute('aria-pressed',on);$('motion-toggle').disabled=Boolean(reducedMotion?.matches);$('motion-label').textContent=reducedMotion?.matches?'静态背景 · 系统设置':on?'动态背景已开启':'动态背景已暂停';}
$('motion-toggle').addEventListener('click',()=>{motionEnabled=!motionEnabled;try{localStorage.setItem(motionPreferenceKey,motionEnabled?'on':'off');}catch{}applyMotion();});reducedMotion?.addEventListener?.('change',applyMotion);document.addEventListener?.('visibilitychange',()=>document.documentElement?.classList.toggle('page-idle',document.hidden));applyMotion();
render();if(!storageOK)notify('当前浏览器无法读取已存进度，将从新练习开始。');
// These tools share the same actions and state as the visible practice controls.
const context=document.modelContext;
if(context?.registerTool){
  const lifecycle=new AbortController();const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'read_practice_progress',description:'读取当前标签页的练习完成情况和最近自测结果。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({total:bank.length,completed:completedIds().length,needsReview:bank.filter(q=>needsReview(q.id)).map(q=>q.id),module:state.module,type:state.type,source:state.source,project:state.project,query:state.query,status:state.status,lastTest:state.lastTest})});
  register({name:'filter_practice_questions',description:'按项目、模块、来源、关键词和练习状态筛选题目；自测进行中不能改变范围。',inputSchema:{type:'object',properties:{module:{type:'string',enum:['全部',...Object.keys(info)]},type:{type:'string',enum:['全部','概念题','场景题','代码题']},source:{type:'string',enum:['全部','基础','每日',...dates]},project:{type:'string',enum:['全部','IM','云盘','通用']},query:{type:'string',maxLength:120},status:{type:'string',enum:['all','pending','answered','review']}},required:['module','type'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||typeof input.module!=='string'||typeof input.type!=='string')throw new Error('模块和题型为必填项。');return configure(input.module,input.type,input.source||state.source,input.query??state.query,input.status||state.status,input.project||state.project);}});
  register({name:'save_practice_answer',description:'保存指定题目的文字作答到本次练习，并更新进度；不会自动判分。',inputSchema:{type:'object',properties:{questionId:{type:'string'},answer:{type:'string',minLength:1,maxLength:10000}},required:['questionId','answer'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:input=>{if(!input)throw new Error('缺少作答。');return saveAnswer(input.questionId,input.answer);}});
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
})();
