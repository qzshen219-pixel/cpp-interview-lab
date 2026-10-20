/* Learning records stay on this device. This module has no network access. */
(function(root){
'use strict';
const Paths=typeof module==='object'&&module.exports?require('./learning-paths.js'):root.LearningPaths;
const KEY='cpp-interview-learning-v2',LEGACY_KEY='cpp-interview-session-v1',DAY=86400000;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const obj=v=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const text=(v,n=10000)=>typeof v==='string'?v.slice(0,n):'';
const time=v=>Number.isFinite(v)&&v>=0&&v<=8640000000000000?v:0;
const ratings=['review','basic','fluent'];
const statuses=['all','pending','answered','review','due','favorite','notes','plan','calendar'];
const projects=['全部','IM','云盘','通用'];
const dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'});
const cardGroups={note:['note'],favorite:['favorite'],review:['review','ratingBase','ratingDay','ratedSubmissionAt','pendingReview'],interview:['interviewAnswered'],result:['lastResult']};
function dayKey(now=Date.now()){
 const parts=dayFormatter.formatToParts(new Date(now));
 return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');
}
function validDay(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const n=Date.parse(v+'T12:00:00+08:00');return Number.isFinite(n)&&dayKey(n)===v;}
function addDays(day,n){return dayKey(Date.parse(day+'T12:00:00+08:00')+n*DAY);}
function projectOf(q){return q.project||(/\bIM\b|即时通[讯信]|聊天|client_msg|outbox/i.test([q.title,q.prompt,q.sourceRoundTitle||''].join(' '))?'IM':'通用');}
function fresh(bank){return {version:2,resetAt:0,topic:'all',routeActive:'',routeSessions:{},focusMode:false,query:'',searchScope:'all',answerHistory:{},studyLog:{},reviewTasks:{},reportStartedAt:0,status:'all',source:'全部',project:'全部',module:'全部',type:'全部',mode:'practice',current:bank[0]?.id||null,entries:{},outcomes:{},cards:{},activity:{},settings:{dailyTarget:10,dailyProject:'全部'},examOptions:{count:10,minutes:0,reviewFirst:true,ratios:[40,40,20]},dailyPlan:null,exam:null,lastTest:null,interview:null,interviewHistory:[],updatedAt:0,lastBackupAt:0};}
function fieldTimes(c){
 const old=time(c.updatedAt),known=obj(c.fieldUpdatedAt)?c.fieldUpdatedAt:{};
 // Old backups do not identify which field changed. An absent note or schedule
 // must not erase useful data merely because a favorite was edited later.
 const fallback={note:c.note?old:0,favorite:old,review:c.review||c.pendingReview?old:0,interview:c.interviewAnswered?old:0,result:c.lastResult?old:0};
 return Object.fromEntries(Object.keys(cardGroups).map(k=>[k,own(known,k)?time(known[k]):fallback[k]]));
}
function reset(bank,state,now=Date.now()){
 const out=fresh(bank);out.resetAt=Math.max(time(now),time(state?.resetAt)+1);out.updatedAt=out.resetAt;return out;
}
function reviewRecord(r){
 if(!obj(r)||!time(r.dueAt))return null;
 return {taskId:text(r.taskId,200),dueAt:time(r.dueAt),lastReviewedAt:time(r.lastReviewedAt),intervalDays:Math.min(180,Math.max(0,Number(r.intervalDays)||0)),repetitions:Math.min(100000,Math.max(0,Number(r.repetitions)||0)),lapses:Math.min(100000,Math.max(0,Number(r.lapses)||0)),grade:ratings.includes(r.grade)?r.grade:'review'};
}
function normalize(raw,bank,now=Date.now()){
 const state=fresh(bank),ids=new Set(bank.map(q=>q.id)),byId=new Map(bank.map(q=>[q.id,q]));
 if(!obj(raw)||![1,2].includes(raw.version))return state;
 state.topic=Paths.TOPICS.some(t=>t.id===raw.topic)?raw.topic:'all';state.focusMode=raw.focusMode===true;state.routeSessions=Paths.cleanSessions(raw.routeSessions,bank);if(typeof raw.routeActive==='string'&&own(state.routeSessions,raw.routeActive))state.routeActive=raw.routeActive;
 const dates=new Set(['全部','基础','每日',...bank.map(q=>q.sourceDate).filter(Boolean)]);
 state.query=text(raw.query,120);if(['all','question','reference','personal'].includes(raw.searchScope))state.searchScope=raw.searchScope;if(statuses.includes(raw.status))state.status=raw.status;
 if(dates.has(raw.source))state.source=raw.source;
 if(projects.includes(raw.project))state.project=raw.project;
 if(raw.module==='全部'||bank.some(q=>q.module===raw.module))state.module=raw.module;
 if(['全部','概念题','场景题','代码题'].includes(raw.type))state.type=raw.type;
 if(['practice','exam','interview'].includes(raw.mode))state.mode=raw.mode;
 if(ids.has(raw.current))state.current=raw.current;
 if(validDay(raw.reviewDate))state.reviewDate=raw.reviewDate;
 for(const [id,e] of Object.entries(obj(raw.entries)?raw.entries:{}))if(ids.has(id)&&obj(e)){
  state.entries[id]={draft:text(e.draft),submitted:text(e.submitted),rating:ratings.includes(e.rating)?e.rating:null,updatedAt:time(e.updatedAt),submittedAt:time(e.submittedAt)};
 }
 for(const [id,pass] of Object.entries(obj(raw.outcomes)?raw.outcomes:{}))if(ids.has(id)&&typeof pass==='boolean')state.outcomes[id]=pass;
 for(const [id,c] of Object.entries(obj(raw.cards)?raw.cards:{}))if(ids.has(id)&&obj(c)){
  state.cards[id]={favorite:c.favorite===true,note:text(c.note,5000),interviewAnswered:c.interviewAnswered===true,updatedAt:time(c.updatedAt),review:reviewRecord(c.review),ratingBase:reviewRecord(c.ratingBase),ratingDay:validDay(c.ratingDay)?c.ratingDay:'',ratedSubmissionAt:time(c.ratedSubmissionAt),pendingReview:c.pendingReview===true,lastResult:['correct','wrong','missed'].includes(c.lastResult)?c.lastResult:null};
 }
 if(raw.version===1){
  for(const id of new Set([...Object.keys(state.entries),...Object.keys(state.outcomes)])){
   const grade=state.entries[id]?.rating||(own(state.outcomes,id)?state.outcomes[id]?'basic':'review':null);
   if(grade){const c=card(state,id);c.review=schedule(null,grade,now);if(grade==='review')c.review.dueAt=now;c.updatedAt=now;}
  }
 }
 for(const [day,a] of Object.entries(obj(raw.activity)?raw.activity:{}))if(validDay(day)&&obj(a)&&Array.isArray(a.ids))state.activity[day]={ids:[...new Set(a.ids.filter(id=>ids.has(id)))],updatedAt:time(a.updatedAt)};
 if(obj(raw.settings)){
  if([5,10,15,20].includes(raw.settings.dailyTarget))state.settings.dailyTarget=raw.settings.dailyTarget;
  if(projects.includes(raw.settings.dailyProject))state.settings.dailyProject=raw.settings.dailyProject;
 }
 try{state.examOptions=validateExamOptions(raw.examOptions||state.examOptions);}catch{}
 if(obj(raw.dailyPlan)&&validDay(raw.dailyPlan.day)&&Array.isArray(raw.dailyPlan.ids))state.dailyPlan={day:raw.dailyPlan.day,ids:[...new Set(raw.dailyPlan.ids.filter(id=>ids.has(id)))].slice(0,20),target:[5,10,15,20].includes(raw.dailyPlan.target)?raw.dailyPlan.target:10,project:projects.includes(raw.dailyPlan.project)?raw.dailyPlan.project:'全部',updatedAt:time(raw.dailyPlan.updatedAt)};
 const ex=raw.exam;
 if(obj(ex)&&Array.isArray(ex.ids)&&ex.ids.length>0&&ex.ids.length<=20&&new Set(ex.ids).size===ex.ids.length&&ex.ids.every(id=>ids.has(id))){
  const answers={};for(const [id,a] of Object.entries(obj(ex.answers)?ex.answers:{}))if(ex.ids.includes(id)){
   if(byId.get(id).manual){if(typeof a==='string'&&a.trim())answers[id]=text(a);}
   else if(Number.isInteger(a)&&a>=0&&a<(byId.get(id).choices?.length||4))answers[id]=a;
  }
  state.exam={id:text(ex.id,150)||'exam-'+time(ex.startedAt)+'-'+fingerprint(ex.ids.join(',')),ids:[...ex.ids],answers,index:Number.isInteger(ex.index)?Math.max(0,Math.min(ex.ids.length-1,ex.index)):0,submitted:ex.submitted===true&&(ex.autoSubmitted===true||ex.ids.every(id=>own(answers,id))),autoSubmitted:ex.autoSubmitted===true,startedAt:time(ex.startedAt),deadlineAt:time(ex.deadlineAt),finishedAt:time(ex.finishedAt)};
 }
 if(obj(raw.lastTest)&&Number.isInteger(raw.lastTest.total)&&raw.lastTest.total>=0&&raw.lastTest.total<=20&&Number.isInteger(raw.lastTest.correct)&&raw.lastTest.correct>=0&&raw.lastTest.correct<=raw.lastTest.total)state.lastTest={correct:raw.lastTest.correct,total:raw.lastTest.total,manual:Math.min(20,Math.max(0,Number(raw.lastTest.manual)||0)),answered:Math.min(20,Math.max(0,Number(raw.lastTest.answered)||0)),at:time(raw.lastTest.at)};
 const cleanInterview=v=>{
  if(!obj(v)||!['IM','云盘'].includes(v.project)||!Array.isArray(v.rounds))return null;
  const rounds=v.rounds.filter(r=>obj(r)&&ids.has(r.id)&&['main','follow'].includes(r.stage)).slice(0,10).map(r=>({id:r.id,stage:r.stage,prompt:text(r.prompt,2000)}));
  if(!rounds.length||rounds.length!==v.rounds.length)return null;
  const answers={},grades={};for(let i=0;i<rounds.length;i++){if(typeof v.answers?.[i]==='string')answers[i]=text(v.answers[i]);if(ratings.includes(v.ratings?.[i]))grades[i]=v.ratings[i];}
  return {id:typeof v.id==='string'?v.id.slice(0,100):'interview-'+time(v.startedAt),project:v.project,rounds,answers,ratings:grades,index:Number.isInteger(v.index)?Math.max(0,Math.min(rounds.length-1,v.index)):0,startedAt:time(v.startedAt),deadlineAt:time(v.deadlineAt),finishedAt:time(v.finishedAt),updatedAt:time(v.updatedAt||v.finishedAt||v.startedAt),submitted:v.submitted===true,autoSubmitted:v.autoSubmitted===true};
 };
 state.interview=cleanInterview(raw.interview);
 state.interviewHistory=(Array.isArray(raw.interviewHistory)?raw.interviewHistory:[]).map(cleanInterview).filter(v=>v?.submitted).slice(-10);
 if(state.mode==='interview'&&!state.interview)state.mode='interview';
 for(const [id,c] of Object.entries(state.cards))c.fieldUpdatedAt=fieldTimes({...c,fieldUpdatedAt:raw.cards?.[id]?.fieldUpdatedAt});
 normalizeInsights(state,raw,ids,now);
 state.resetAt=time(raw.resetAt);state.updatedAt=time(raw.updatedAt);state.lastBackupAt=time(raw.lastBackupAt);
 return state;
}
function load(bank,local,session,now=Date.now()){
 let invalid=false,legacy=false,raw=null;
 try{const v=local.getItem(KEY);if(v){raw=JSON.parse(v);if(!obj(raw)||raw.version!==2){invalid=true;raw=null;}}}catch{invalid=true;}
 if(!raw)try{const v=session?.getItem(KEY);if(v){const p=JSON.parse(v);if(obj(p)&&p.version===2)raw=p;}}catch{invalid=true;}
 if(!raw)try{const v=session?.getItem(LEGACY_KEY);if(v){const p=JSON.parse(v);if(obj(p)&&p.version===1){raw=p;legacy=true;}}}catch{invalid=true;}
 return {state:normalize(raw,bank,now),invalid,migrated:legacy};
}
function card(state,id){return state.cards[id]||(state.cards[id]={favorite:false,note:'',interviewAnswered:false,updatedAt:0,review:null,ratingBase:null,ratingDay:'',ratedSubmissionAt:0,pendingReview:false,lastResult:null});}
function editCard(state,id,fields,now=Date.now()){
 const c=card(state,id),clocks=fieldTimes(c);let stamp=time(now);
 for(const [group,keys] of Object.entries(cardGroups))if(keys.some(k=>own(fields,k))){
  const at=Math.max(stamp,clocks[group]+1);clocks[group]=at;stamp=Math.max(stamp,at);
  for(const k of keys)if(own(fields,k))c[k]=clone(fields[k]);
 }
 c.fieldUpdatedAt=clocks;c.updatedAt=Math.max(c.updatedAt,stamp);state.updatedAt=Math.max(state.updatedAt,stamp);return c;
}
function recordActivity(state,id,now=Date.now()){
 const day=dayKey(now),a=state.activity[day]||(state.activity[day]={ids:[],updatedAt:0});
 if(!a.ids.includes(id))a.ids.push(id);a.updatedAt=now;state.updatedAt=now;
}
function submitAnswer(state,id,answer,now=Date.now(),source='practice'){
 if(typeof answer!=='string'||!answer.trim()||answer.length>10000)throw Error('请填写有效回答，最多 10000 字符。');
 const e=state.entries[id]||(state.entries[id]={draft:'',submitted:'',rating:null,updatedAt:0,submittedAt:0});
 e.draft=answer;e.updatedAt=now;
 if(e.submitted!==answer){if(e.submitted.trim())rememberAnswer(state,id,e.submitted,e.submittedAt||0,'saved');rememberAnswer(state,id,answer,now,source);e.submitted=answer;e.submittedAt=now;e.rating=null;editCard(state,id,{pendingReview:true},now);}
 recordActivity(state,id,now);return e;
}
function schedule(previous,grade,now=Date.now()){
 if(!ratings.includes(grade))throw Error('无效的掌握程度。');
 const prev=previous||{},interval=grade==='review'?0:grade==='basic'?Math.min(90,Math.max(1,Math.round((prev.intervalDays||0)*2))):Math.min(180,Math.max(3,Math.round((prev.intervalDays||0)*2.5)));
 return {dueAt:now+(grade==='review'?10*60000:interval*DAY),lastReviewedAt:now,intervalDays:interval,repetitions:(prev.repetitions||0)+1,lapses:(prev.lapses||0)+(grade==='review'?1:0),grade};
}
function rate(state,id,grade,now=Date.now(),objective=false,origin='self'){
 if(!ratings.includes(grade))throw Error('无效的掌握程度。');
 const e=state.entries[id],c=card(state,id),day=dayKey(now);
 if(!objective&&!e?.submitted?.trim())throw Error('先保存你的作答，再进行自评。');
 const attempt=e?.submittedAt||0,same=c.ratingDay===day&&c.ratedSubmissionAt===attempt&&!c.pendingReview&&!isDue(state,id,now);
 if(same&&c.review?.grade===grade){recordActivity(state,id,now);return c.review;}
 const base=same?c.ratingBase:c.review;
 const review=trackReview(state,id,schedule(base,grade,now),now,true);
 editCard(state,id,{ratingBase:clone(base),review,ratingDay:day,ratedSubmissionAt:attempt,pendingReview:false},now);
 if(e){e.rating=grade;e.updatedAt=now;}
 if(origin!=='objective')recordStudy(state,id,{kind:'self',grade},now,'self:'+id+':'+day+':'+attempt);
 recordActivity(state,id,now);return c.review;
}
function isCompleted(state,id){return Boolean(state.entries[id]?.submitted?.trim())||own(state.outcomes,id)||state.cards[id]?.interviewAnswered===true;}
function needsReview(state,id){const e=state.entries[id],c=state.cards[id];return e?.rating?e.rating==='review':c?.review?c.review.grade==='review':state.outcomes[id]===false||c?.lastResult==='missed';}
function isDue(state,id,now=Date.now()){return Boolean(state.cards[id]?.review&&state.cards[id].review.dueAt<=now);}
function inReviewDay(state,id,day,now=Date.now()){const r=state.cards[id]?.review;return Boolean(r&&(day===dayKey(now)?r.dueAt<=now:dayKey(r.dueAt)===day));}
function mastery(bank,state){
 return [...new Set(bank.map(q=>q.module))].map(module=>{
  const pool=bank.filter(q=>q.module===module);let sum=0,rated=0;
  for(const q of pool){const r=state.entries[q.id]?.rating||(state.cards[q.id]?.interviewAnswered&&!state.cards[q.id]?.pendingReview?state.cards[q.id]?.review?.grade:null);if(r){sum+=r==='fluent'?1:r==='basic'?.6:0;rated++;}else if(own(state.outcomes,q.id)){sum+=state.outcomes[q.id]?1:0;rated++;}}
  return {module,total:pool.length,completed:pool.filter(q=>isCompleted(state,q.id)).length,rated,score:rated?Math.round(sum/rated*100):null};
 });
}
function makePlan(bank,state,now=Date.now()){
 const day=dayKey(now),target=state.settings.dailyTarget,project=state.settings.dailyProject;
 const pool=bank.filter(q=>project==='全部'||projectOf(q)===project),today=new Set(state.activity[day]?.ids||[]);
 const previous=state.dailyPlan?.day===day?state.dailyPlan.ids:[];
 const ids=previous.filter(id=>today.has(id)&&pool.some(q=>q.id===id)).slice(0,target);
 const used=new Set(ids),stats=mastery(bank,state),score=new Map(stats.map(m=>[m.module,m.score==null?65:m.score]));
 const due=pool.filter(q=>!used.has(q.id)&&!today.has(q.id)&&isDue(state,q.id,now)).sort((a,b)=>state.cards[a.id].review.dueAt-state.cards[b.id].review.dueAt);
 const dueQuota=Math.min(target-ids.length,Math.max(Math.ceil(target*.5),Math.min(due.length,3)));
 for(const q of due.slice(0,dueQuota)){ids.push(q.id);used.add(q.id);}
 const candidates=pool.filter(q=>!used.has(q.id)&&!today.has(q.id)).sort((a,b)=>{
  const priority=q=>(isDue(state,q.id,now)?-300:needsReview(state,q.id)?-150:0)+(isCompleted(state,q.id)?100:0)+score.get(q.module);
  return priority(a)-priority(b);
 });
 const moduleCount={};for(const id of ids){const q=pool.find(q=>q.id===id);moduleCount[q.module]=(moduleCount[q.module]||0)+1;}
 while(ids.length<target&&candidates.length){
  let best=0;for(let i=1;i<candidates.length;i++){
   const q=candidates[i],b=candidates[best];
   const value=x=>(isDue(state,x.id,now)?250:needsReview(state,x.id)?-50:0)+(isCompleted(state,x.id)?100:0)+(score.get(x.module)||0)+(moduleCount[x.module]||0)*35;
   if(value(q)<value(b))best=i;
  }
  const q=candidates.splice(best,1)[0];ids.push(q.id);moduleCount[q.module]=(moduleCount[q.module]||0)+1;
 }
 return {day,ids,target,project,updatedAt:now};
}
function ensurePlan(bank,state,now=Date.now()){
 if(!state.dailyPlan||state.dailyPlan.day!==dayKey(now)||state.dailyPlan.target!==state.settings.dailyTarget||state.dailyPlan.project!==state.settings.dailyProject){state.dailyPlan=makePlan(bank,state,now);return true;}return false;
}
function validateExamOptions(v){
 if(!obj(v)||![5,10,20].includes(Number(v.count))||![0,5,10,20,30,60].includes(Number(v.minutes)))throw Error('请选择有效的自测题数与时限。');
 const ratios=Array.isArray(v.ratios)?v.ratios.map(Number):[];
 if(ratios.length!==3||ratios.some(n=>!Number.isFinite(n)||n<0||n>100)||Math.abs(ratios.reduce((n,v)=>n+v,0)-100)>.001)throw Error('概念题、场景题和代码题的比例合计应为 100%。');
 return {count:Number(v.count),minutes:Number(v.minutes),reviewFirst:v.reviewFirst===true,ratios};
}
function shuffled(items,rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function sample(pool,state,options,rng=Math.random,now=Date.now()){
 const opts=validateExamOptions(options),n=Math.min(opts.count,pool.length),types=['概念题','场景题','代码题'];
 const priority=q=>opts.reviewFirst?(needsReview(state,q.id)?0:isDue(state,q.id,now)?1:2):0;
 const ordered=items=>shuffled(items,rng).sort((a,b)=>priority(a)-priority(b));
 const buckets=types.map(t=>ordered(pool.filter(q=>q.type===t))),exact=opts.ratios.map(p=>n*p/100),quota=exact.map(Math.floor);
 for(let left=n-quota.reduce((n,v)=>n+v,0);left>0;left--){const i=exact.map((v,i)=>({i,rest:v-quota[i]})).sort((a,b)=>b.rest-a.rest)[0].i;quota[i]++;}
 const selected=[];for(let i=0;i<types.length;i++)selected.push(...buckets[i].slice(0,quota[i]));
 const used=new Set(selected.map(q=>q.id));for(const q of ordered(pool.filter(q=>!used.has(q.id)))){if(selected.length>=n)break;selected.push(q);}
 return ordered(selected).map(q=>q.id);
}
function buildInterview(bank,project,count=5,minutes=20,now=Date.now(),rng=Math.random){
 if(!['IM','云盘'].includes(project)||![5,10].includes(Number(count))||![0,10,20,30].includes(Number(minutes)))throw Error('请选择有效的项目面试设置。');
 const pool=bank.filter(q=>projectOf(q)===project);
 if(!pool.length)throw Error('当前项目还没有可用题目。');
 const preferred=shuffled(pool,rng).sort((a,b)=>(Boolean(b.follow)-Boolean(a.follow))||(Number(b.type==='场景题')-Number(a.type==='场景题')));
 const base=preferred.slice(0,Math.ceil(count/2)),rounds=[];
 for(const q of base){
  rounds.push({id:q.id,stage:'main',prompt:''});
  if(rounds.length<count)rounds.push({id:q.id,stage:'follow',prompt:q.follow||`结合${project}项目，说明这个方案在并发、异常恢复和排障验证方面的边界，并给出一个具体例子。`});
 }
 return {id:'interview-'+now+'-'+Math.floor(rng()*1000000),project,rounds,answers:{},ratings:{},index:0,startedAt:now,deadlineAt:minutes?now+minutes*60000:0,finishedAt:0,updatedAt:now,submitted:false,autoSubmitted:false};
}
function finishInterview(state,now=Date.now(),auto=false){
 const ex=state.interview;if(!ex||ex.submitted)return ex;
 ex.submitted=true;ex.finishedAt=now;ex.updatedAt=now;ex.autoSubmitted=auto;
 for(let i=0;i<ex.rounds.length;i++)if(ex.answers[i]?.trim()){editCard(state,ex.rounds[i].id,{interviewAnswered:true},now);recordActivity(state,ex.rounds[i].id,now);}
 state.interviewHistory=[...state.interviewHistory.filter(h=>h.id!==ex.id),clone(ex)].slice(-10);return ex;
}
function parseBackup(raw,bank,now=Date.now()){
 if(typeof raw!=='string'||raw.length>12*1024*1024)throw Error('备份文件过大，请选择 12 MB 以内的 JSON 文件。');
 let data;try{data=JSON.parse(raw);}catch{throw Error('文件不是有效的 JSON 备份。');}
 if(!obj(data)||data.format!=='cpp-interview-lab-backup'||data.schemaVersion!==2||!obj(data.state)||data.state.version!==2||!obj(data.state.entries)||!obj(data.state.cards))throw Error('这不是受支持的面试练习台备份文件。');
 const state=normalize(data.state,bank,now),ids=new Set(bank.map(q=>q.id));
 const unknown=new Set([...Object.keys(data.state.entries),...Object.keys(data.state.cards)].filter(id=>!ids.has(id)));
 return {state,unknown:unknown.size,answers:Object.values(state.entries).filter(e=>e.submitted.trim()).length,notes:Object.values(state.cards).filter(c=>c.note.trim()).length,favorites:Object.values(state.cards).filter(c=>c.favorite).length};
}
function merge(local,incoming,bank,now=Date.now()){
 const a=normalize(local,bank,now),b=normalize(incoming,bank,now);
 const empty=!Object.keys(a.entries).length&&!Object.keys(a.cards).length&&!Object.keys(a.outcomes).length&&!Object.keys(a.activity).length&&!a.exam&&!a.interview&&!a.interviewHistory.length&&!Object.keys(a.routeSessions).length;
 const out=clone(empty?b:a);
 for(const [id,e] of Object.entries(b.entries))if(!out.entries[id]||e.updatedAt>out.entries[id].updatedAt||(e.updatedAt===out.entries[id].updatedAt&&!out.entries[id].submitted&&e.submitted))out.entries[id]=clone(e);
 for(const [id,c] of Object.entries(b.cards)){
  if(!out.cards[id]){out.cards[id]=clone(c);continue;}
  const target=out.cards[id],clocks=fieldTimes(target),incomingClocks=fieldTimes(c);
  for(const [group,keys] of Object.entries(cardGroups))if(incomingClocks[group]>clocks[group]){
   for(const k of keys)target[k]=clone(c[k]);clocks[group]=incomingClocks[group];
  }
  target.fieldUpdatedAt=clocks;target.updatedAt=Math.max(target.updatedAt,c.updatedAt);
 }
 for(const [id,v] of Object.entries(b.outcomes))if(!own(out.outcomes,id)||(b.cards[id]?.fieldUpdatedAt?.result||0)>(a.cards[id]?.fieldUpdatedAt?.result||0))out.outcomes[id]=v;
 for(const [day,v] of Object.entries(b.activity)){const old=out.activity[day]||{ids:[],updatedAt:0};out.activity[day]={ids:[...new Set([...old.ids,...v.ids])],updatedAt:Math.max(old.updatedAt,v.updatedAt)};}
 const histories=new Map(out.interviewHistory.map(h=>[h.id,h]));for(const h of b.interviewHistory)if(!histories.has(h.id)||h.updatedAt>histories.get(h.id).updatedAt)histories.set(h.id,h);
 out.interviewHistory=[...histories.values()].sort((a,b)=>a.finishedAt-b.finishedAt).slice(-10);
 if(!a.interview&&!a.interviewHistory.length&&b.interview)out.interview=clone(b.interview);
 // Reset epochs belong to this browser. An explicit backup import can restore
 // old records without importing another device's reset history.
 for(const [key,session] of Object.entries(b.routeSessions))if(!out.routeSessions[key]||session.updatedAt>out.routeSessions[key].updatedAt)out.routeSessions[key]=clone(session);
 mergeInsights(out,a,b,now);
 out.resetAt=a.resetAt;out.updatedAt=Math.max(a.updatedAt,b.updatedAt);out.lastBackupAt=Math.max(a.lastBackupAt,b.lastBackupAt);
 return out;
}
function sync(local,incoming,bank,now=Date.now()){
 const a=normalize(local,bank,now),b=normalize(incoming,bank,now);
 if(a.resetAt!==b.resetAt)return clone(a.resetAt>b.resetAt?a:b);
 const out=merge(a,b,bank,now);
 // Learning evidence is shared; the current page keeps its view and session.
 for(const key of ['query','searchScope','topic','routeActive','focusMode','source','project','module','type','status','reviewDate','mode','current','exam','interview','examOptions','settings','dailyPlan'])out[key]=clone(a[key]);
 return out;
}
// Historical answers and report evidence are bounded, local-only records.
function fingerprint(value){let h=2166136261;for(const ch of value){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function trimAnswerHistory(history){
 const all=[];for(const [questionId,versions] of Object.entries(history))for(const v of versions)all.push({questionId,...v});
 all.sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id));const out={},counts={};
 for(const {questionId,...v} of all){if((counts[questionId]||0)>=10)continue;if(Object.values(counts).reduce((n,v)=>n+v,0)>=100)break;(out[questionId]||(out[questionId]=[])).push(v);counts[questionId]=(counts[questionId]||0)+1;}return out;
}
function rememberAnswer(state,id,answer,at,source='saved'){
 if(!answer?.trim())return;
 const history=state.answerHistory||(state.answerHistory={}),versions=history[id]||(history[id]=[]);
 if(!versions.some(v=>v.at===at&&v.answer===answer))versions.push({id:'answer:'+id+':'+at+':'+fingerprint(answer),answer,at,source});
 state.answerHistory=trimAnswerHistory(history);
}
function answerVersions(state,id){
 const history=clone(state.answerHistory?.[id]||[]),e=state.entries[id];
 if(e?.submitted?.trim()&&!history.some(v=>v.answer===e.submitted&&v.at===(e.submittedAt||0)))history.push({id:'answer:'+id+':'+(e.submittedAt||0)+':'+fingerprint(e.submitted),answer:e.submitted,at:e.submittedAt||0,source:'saved'});
 return history.sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id));
}
function restoreAnswer(state,id,versionId,now=Date.now()){
 const version=answerVersions(state,id).find(v=>v.id===versionId);if(!version)throw Error('这个历史版本已不存在，请重新打开历史记录。');
 const e=state.entries[id];if(e?.draft?.trim()&&e.draft!==e.submitted)rememberAnswer(state,id,e.draft,now,'draft');
 return submitAnswer(state,id,version.answer,now,'restore');
}
function recordStudy(state,questionId,fields,now=Date.now(),eventId=''){
 const key='event:'+(eventId||questionId+':'+now+':'+Math.random().toString(36).slice(2)),old=state.studyLog?.[key];
 (state.studyLog||(state.studyLog={}))[key]={questionId,kind:fields.kind,result:fields.result||null,grade:fields.grade||null,at:old?.at||now,updatedAt:Math.max(now,(old?.updatedAt||0)+1)};
 state.reportStartedAt=state.reportStartedAt?Math.min(state.reportStartedAt,now):now;
 trimEvidence(state,now);
}
function taskKey(id,dueAt){return 'review:'+id+':'+dueAt;}
function trackReview(state,id,review,now=Date.now(),answered=false){
 const tasks=state.reviewTasks||(state.reviewTasks={}),oldReview=state.cards[id]?.review;
 let previous=oldReview?.taskId?tasks[oldReview.taskId]:null;
 if(!previous&&oldReview){const key=taskKey(id,oldReview.dueAt);previous=tasks[key]||(tasks[key]={id:key,questionId:id,dueAt:oldReview.dueAt,createdAt:now,status:'pending',closedAt:0,updatedAt:now});}
 if(previous?.status==='pending'){
  if(!answered&&previous.dueAt<=now)return {...review,taskId:previous.id};
  previous.status=answered&&previous.dueAt<=now?'done':'canceled';previous.closedAt=now;previous.updatedAt=Math.max(now,previous.updatedAt+1);
 }
 const key=taskKey(id,review.dueAt);tasks[key]={id:key,questionId:id,dueAt:review.dueAt,createdAt:now,status:'pending',closedAt:0,updatedAt:now};
 state.reportStartedAt=state.reportStartedAt?Math.min(state.reportStartedAt,now):now;trimEvidence(state,now);return {...review,taskId:key};
}
function trimEvidence(state,now){
 const cutoff=now-90*DAY;
 state.studyLog=Object.fromEntries(Object.entries(state.studyLog||{}).filter(([,v])=>v.at>=cutoff).sort((a,b)=>b[1].at-a[1].at||a[0].localeCompare(b[0])).slice(0,2000));
 const tasks=Object.entries(state.reviewTasks||{}),pending=tasks.filter(([,v])=>v.status==='pending'),closed=tasks.filter(([,v])=>v.status!=='pending'&&v.closedAt>=cutoff).sort((a,b)=>b[1].closedAt-a[1].closedAt).slice(0,1000);
 state.reviewTasks=Object.fromEntries([...pending,...closed]);
}
function normalizeInsights(state,raw,ids,now){
 state.answerHistory={};
 for(const [id,versions] of Object.entries(obj(raw.answerHistory)?raw.answerHistory:{}))if(ids.has(id)&&Array.isArray(versions))for(const v of versions.slice(-100))if(obj(v)&&typeof v.answer==='string'&&v.answer.trim())rememberAnswer(state,id,text(v.answer),time(v.at),['practice','exam','restore','saved','draft'].includes(v.source)?v.source:'saved');
 state.studyLog={};
 for(const [key,v] of Object.entries(obj(raw.studyLog)?raw.studyLog:{}))if(key.startsWith('event:')&&key.length<=400&&obj(v)&&ids.has(v.questionId)&&time(v.at)&&(['objective','self'].includes(v.kind))){
  if(v.kind==='objective'&&!['correct','wrong','missed'].includes(v.result)||v.kind==='self'&&!ratings.includes(v.grade))continue;
  state.studyLog[key]={questionId:v.questionId,kind:v.kind,result:v.kind==='objective'?v.result:null,grade:v.kind==='self'?v.grade:null,at:time(v.at),updatedAt:time(v.updatedAt)||time(v.at)};
 }
 state.reviewTasks={};
 for(const v of Object.values(obj(raw.reviewTasks)?raw.reviewTasks:{}))if(obj(v)&&ids.has(v.questionId)&&time(v.dueAt)&&['pending','done','canceled'].includes(v.status)){
  const id=taskKey(v.questionId,v.dueAt);state.reviewTasks[id]={id,questionId:v.questionId,dueAt:time(v.dueAt),createdAt:time(v.createdAt)||now,status:v.status,closedAt:time(v.closedAt),updatedAt:time(v.updatedAt)||now};
 }
 for(const [id,c] of Object.entries(state.cards))if(c.review){
  const key=state.reviewTasks[c.review.taskId]?.questionId===id?c.review.taskId:taskKey(id,c.review.dueAt);
  if(!state.reviewTasks[key])state.reviewTasks[key]={id:key,questionId:id,dueAt:c.review.dueAt,createdAt:now,status:'pending',closedAt:0,updatedAt:now};c.review.taskId=key;
 }
 state.reportStartedAt=time(raw.reportStartedAt)||now;trimEvidence(state,now);
}
function mergeInsights(out,a,b,now){
 out.answerHistory={};for(const source of [a,b])for(const [id,versions] of Object.entries(source.answerHistory))for(const v of versions)rememberAnswer(out,id,v.answer,v.at,v.source);
 out.studyLog=clone(a.studyLog);for(const [id,v] of Object.entries(b.studyLog))if(!out.studyLog[id]||v.updatedAt>out.studyLog[id].updatedAt)out.studyLog[id]=clone(v);
 out.reviewTasks=clone(a.reviewTasks);for(const [id,v] of Object.entries(b.reviewTasks))if(!out.reviewTasks[id]||v.updatedAt>out.reviewTasks[id].updatedAt||v.updatedAt===out.reviewTasks[id].updatedAt&&v.status==='done')out.reviewTasks[id]=clone(v);
 for(const task of Object.values(out.reviewTasks))if(task.status==='pending'){
  const c=out.cards[task.questionId];if(c?.review?.taskId&&c.review.taskId!==task.id){task.status='canceled';task.closedAt=c.review.lastReviewedAt||now;task.updatedAt=Math.max(task.updatedAt,c.fieldUpdatedAt.review);}
 }
 out.reportStartedAt=Math.min(a.reportStartedAt||now,b.reportStartedAt||now);trimEvidence(out,now);
}
function weekReport(bank,state,offset=0,now=Date.now()){
 offset=Number.isInteger(offset)?Math.max(0,Math.min(8,offset)):0;
 const today=dayKey(now),weekday=new Date(today+'T12:00:00+08:00').getUTCDay(),start=addDays(today,-((weekday+6)%7)-offset*7),end=addDays(start,6),from=Date.parse(start+'T00:00:00+08:00'),until=Math.min(now,from+7*DAY-1);
 const days=Array.from({length:7},(_,i)=>{const day=addDays(start,i);return {day,ids:day<=today?[...new Set(state.activity[day]?.ids||[])]:[]};}),unique=new Set(days.flatMap(d=>d.ids));
 const events=Object.values(state.studyLog||{}).filter(v=>v.at>=from&&v.at<=until),objective=events.filter(v=>v.kind==='objective'),answered=objective.filter(v=>v.result!=='missed'),correct=answered.filter(v=>v.result==='correct').length;
 const latestSelf=new Map();for(const e of events.filter(v=>v.kind==='self'))if(!latestSelf.has(e.questionId)||e.updatedAt>latestSelf.get(e.questionId).updatedAt)latestSelf.set(e.questionId,e);
 const self={review:0,basic:0,fluent:0};for(const v of latestSelf.values())self[v.grade]++;
 const eligible=Object.values(state.reviewTasks||{}).filter(t=>t.createdAt<=until&&t.dueAt<=until&&(!(t.status==='canceled'&&t.closedAt<=until))&&(!(t.status==='done'&&t.closedAt<from)));
 const reviewDone=eligible.filter(t=>t.status==='done'&&t.closedAt<=until).length;
 const modules=[...new Set(bank.map(q=>q.module))].map(module=>{
  const ids=new Set(bank.filter(q=>q.module===module).map(q=>q.id)),attempts=answered.filter(e=>ids.has(e.questionId)),graded=[...latestSelf.values()].filter(e=>ids.has(e.questionId));
  return {module,practiced:[...unique].filter(id=>ids.has(id)).length,objective:attempts.length,correct:attempts.filter(e=>e.result==='correct').length,self:graded.length,needsReview:graded.filter(e=>e.grade==='review').length};
 });
 return {start,end,days,unique:unique.size,practiceCount:days.reduce((n,d)=>n+d.ids.length,0),activeDays:days.filter(d=>d.ids.length).length,objective:{correct,answered:answered.length,missed:objective.length-answered.length,accuracy:answered.length?Math.round(correct/answered.length*100):null},self,selfTotal:latestSelf.size,reviews:{done:reviewDone,total:eligible.length,pending:eligible.length-reviewDone,rate:eligible.length?Math.round(reviewDone/eligible.length*100):null},modules,trackedSince:state.reportStartedAt||now};
}
function diffAnswers(before,after){
 const a=String(before).match(/[^\n]*\n|[^\n]+$/g)||[],b=String(after).match(/[^\n]*\n|[^\n]+$/g)||[],left=[],right=[];
 if(before===after)return {before:[{text:before,changed:false}],after:[{text:after,changed:false}]};
 if(a.length*b.length>62500)return {before:[{text:before,changed:true}],after:[{text:after,changed:true}]};
 const matrix=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)matrix[i][j]=a[i]===b[j]?matrix[i+1][j+1]+1:Math.max(matrix[i+1][j],matrix[i][j+1]);
 let i=0,j=0;while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){left.push({text:a[i++],changed:false});right.push({text:b[j++],changed:false});}else if(i<a.length&&(j===b.length||matrix[i+1][j]>=matrix[i][j+1]))left.push({text:a[i++],changed:true});else right.push({text:b[j++],changed:true});}
 return {before:left,after:right};
}

function reportMarkdown(report){
 const o=report.objective,r=report.reviews;
 return '# 面试练习周报\n\n'+report.start+' 至 '+report.end+'（北京时间）\n\n'+
  '- 练习量：'+report.practiceCount+' 题次，覆盖 '+report.unique+' 道题，练习 '+report.activeDays+' 天\n'+
  '- 客观题：'+o.correct+'/'+o.answered+' 答对，正确率 '+(o.accuracy==null?'暂无数据':o.accuracy+'%')+'，另有 '+o.missed+' 题未答\n'+
  '- 表达自评：需要复习 '+report.self.review+'，基本掌握 '+report.self.basic+'，熟练表达 '+report.self.fluent+'\n'+
  '- 到期复习任务：完成 '+r.done+'/'+r.total+'，完成率 '+(r.rate==null?'暂无到期任务':r.rate+'%')+'\n\n'+
  '| 日期 | 练习题数 |\n| --- | --- |\n'+report.days.map(d=>'| '+d.day+' | '+d.ids.length+' |').join('\n')+'\n\n'+
  '| 模块 | 练习题数 | 客观题答对/已答 | 文字表达自评题数 |\n| --- | --- | --- | --- |\n'+report.modules.map(m=>'| '+m.module+' | '+m.practiced+' | '+m.correct+'/'+m.objective+' | '+m.self+' |').join('\n')+'\n\n'+
  '同一天同题只计一次练习量；跨天重复练习计为多次。客观题正确率仅统计已答题，未答单列；表达自评取每题本周最后一次评价，不能当作正确率。到期任务包括本周到期及此前未完成任务，提前调整的任务不计入。旧练习量保留；详细成绩与复习任务从 '+dayKey(report.trackedSince)+' 起记录。明细保留最近 90 天，最多 2000 条成绩记录。\n';
}

function backup(state,now=Date.now()){return JSON.stringify({format:'cpp-interview-lab-backup',schemaVersion:2,exportedAt:new Date(now).toISOString(),state},null,2);}
const api={diffAnswers,rememberAnswer,answerVersions,restoreAnswer,recordStudy,trackReview,weekReport,reportMarkdown,KEY,LEGACY_KEY,DAY,dayKey,addDays,validDay,fresh,reset,normalize,load,clone,card,editCard,submitAnswer,recordActivity,schedule,rate,isCompleted,needsReview,isDue,inReviewDay,mastery,makePlan,ensurePlan,validateExamOptions,sample,buildInterview,finishInterview,parseBackup,merge,sync,backup,projectOf};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LearningCore=api;
})(typeof window==='object'?window:globalThis);
