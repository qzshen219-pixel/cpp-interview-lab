const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../learning-core.js');
const now=Date.parse('2026-10-19T12:00:00+08:00');
const bank=Array.from({length:36},(_,i)=>({id:'q'+i,title:'题目'+i,prompt:'项目问题',module:['C++','Linux','MySQL'][i%3],type:['概念题','场景题','代码题'][i%3],project:i<18?'IM':'云盘',manual:i%2===0,choices:['A','B','C','D'],correct:0,follow:'异常退出时如何验证？'}));
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('daily date uses Beijing time, including midnight and invalid dates',()=>{
 assert.equal(C.dayKey(Date.parse('2026-10-19T16:00:00Z')),'2026-10-20');
 assert.equal(C.addDays('2026-10-31',1),'2026-11-01');
 for(const v of ['bad','2026-13-01','2026-02-31',null,4])assert.equal(C.validDay(v),false);
});
test('legacy drafts, submitted answers, project and quiz migrate without losing content',()=>{
 const local=memory(),session=memory();session.setItem(C.LEGACY_KEY,JSON.stringify({version:1,project:'IM',current:'q1',entries:{q1:{draft:'原始草稿',submitted:'原始答案',rating:'review'}},outcomes:{q3:false},exam:{ids:['q1'],answers:{q1:2},index:0,submitted:false},mode:'exam'}));
 const loaded=C.load(bank,local,session,now);assert.equal(loaded.migrated,true);assert.equal(loaded.state.version,2);assert.equal(loaded.state.entries.q1.submitted,'原始答案');assert.equal(loaded.state.exam.answers.q1,2);assert.equal(loaded.state.project,'IM');assert.ok(C.isDue(loaded.state,'q1',now));
});
test('corrupt persistent storage recovers legacy records and blocked storage does not crash',()=>{
 const local=memory(),session=memory();local.setItem(C.KEY,'broken');session.setItem(C.LEGACY_KEY,JSON.stringify({version:1,entries:{q0:{draft:'保留草稿'}}}));
 const loaded=C.load(bank,local,session,now);assert.equal(loaded.invalid,true);assert.equal(loaded.state.entries.q0.draft,'保留草稿');
 const blocked={getItem(){throw Error('blocked');}};assert.equal(C.load(bank,blocked,blocked,now).state.version,2);
});
test('normalization only accepts existing question IDs and safe limits',()=>{
 const raw=JSON.parse('{"version":2,"entries":{"q0":{"draft":"abc","submitted":"answer","rating":"wrong"},"__proto__":{"draft":"unsafe"}},"cards":{"q0":{"note":"<img src=x>","favorite":true}},"settings":{"dailyTarget":999},"activity":{"2026-13-01":{"ids":["q0"]}}}');
 const s=C.normalize(raw,bank,now);assert.equal(s.entries.q0.rating,null);assert.equal(s.cards.q0.note,'<img src=x>');assert.equal(s.settings.dailyTarget,10);assert.equal(Object.keys(s.entries).length,1);assert.equal(Object.keys(s.activity).length,0);assert.equal({}.draft,undefined);
});
test('review schedule is idempotent within a rating attempt and advances on a later day',()=>{
 const s=C.fresh(bank);C.submitAnswer(s,'q0','我的答案',now);C.rate(s,'q0','basic',now);
 const first=structuredClone(s.cards.q0.review);assert.equal(first.intervalDays,1);
 C.rate(s,'q0','basic',now+1000);assert.deepEqual(s.cards.q0.review,first);
 C.rate(s,'q0','fluent',now+2000);assert.equal(s.cards.q0.review.intervalDays,3);assert.equal(s.cards.q0.review.repetitions,1);
 C.rate(s,'q0','basic',now+C.DAY);assert.equal(s.cards.q0.review.intervalDays,6);assert.equal(s.cards.q0.review.repetitions,2);
 assert.equal(s.activity['2026-10-19'].ids.length,1);assert.equal(s.activity['2026-10-20'].ids.length,1);
});
test('needs-review waits ten minutes and a new answer resets self assessment',()=>{
 const s=C.fresh(bank);assert.throws(()=>C.submitAnswer(s,'q0','  ',now));assert.throws(()=>C.rate(s,'q0','basic',now));
 C.submitAnswer(s,'q0','第一次回答',now);C.rate(s,'q0','review',now);assert.equal(C.isDue(s,'q0',now),false);assert.equal(C.isDue(s,'q0',now+600000),true);
 C.submitAnswer(s,'q0','第一次回答',now+1000);assert.equal(s.entries.q0.rating,'review');
 C.submitAnswer(s,'q0','补充后的回答',now+2000);assert.equal(s.entries.q0.rating,null);assert.equal(s.cards.q0.pendingReview,true);
});
test('daily plan mixes due reviews with new material, is stable, and preserves completed items',()=>{
 const s=C.fresh(bank);for(let i=0;i<16;i++){C.submitAnswer(s,'q'+i,'已完成',now-C.DAY*5);C.rate(s,'q'+i,'review',now-C.DAY*5);}
 C.ensurePlan(bank,s,now);assert.equal(s.dailyPlan.ids.length,10);assert.equal(new Set(s.dailyPlan.ids).size,10);assert.ok(s.dailyPlan.ids.some(id=>!C.isCompleted(s,id)));assert.ok(s.dailyPlan.ids.some(id=>C.isDue(s,id,now)));
 const first=s.dailyPlan.ids[0],copy=structuredClone(s.dailyPlan);assert.equal(C.ensurePlan(bank,s,now+1000),false);assert.deepEqual(s.dailyPlan,copy);
 C.recordActivity(s,first,now);s.settings.dailyTarget=5;C.ensurePlan(bank,s,now);assert.equal(s.dailyPlan.ids.length,5);assert.ok(s.dailyPlan.ids.includes(first));
 s.settings.dailyProject='云盘';C.ensurePlan(bank,s,now);assert.ok(s.dailyPlan.ids.every(id=>C.projectOf(bank.find(q=>q.id===id))==='云盘'));
 C.ensurePlan(bank,s,now+C.DAY);assert.equal(s.dailyPlan.day,'2026-10-20');
});
test('review calendar separates overdue work and future planned days',()=>{
 const s=C.fresh(bank);C.card(s,'q0').review=C.schedule(null,'basic',now);C.card(s,'q1').review=C.schedule(null,'review',now-C.DAY);
 assert.equal(C.inReviewDay(s,'q1','2026-10-19',now),true);assert.equal(C.inReviewDay(s,'q0','2026-10-20',now),true);assert.equal(C.inReviewDay(s,'q0','2026-10-19',now),false);
});
test('custom tests honor ratios, wrong-first, unique IDs and limited pools',()=>{
 const s=C.fresh(bank),opts={count:20,minutes:10,reviewFirst:true,ratios:[40,40,20]};C.card(s,'q0').review=C.schedule(null,'review',now-1000000);
 const ids=C.sample(bank,s,opts,()=>.31,now);assert.equal(ids.length,20);assert.equal(new Set(ids).size,20);assert.equal(ids[0],'q0');
 const types=ids.map(id=>bank.find(q=>q.id===id).type);assert.equal(types.filter(t=>t==='概念题').length,8);assert.equal(types.filter(t=>t==='场景题').length,8);assert.equal(types.filter(t=>t==='代码题').length,4);
 assert.equal(C.sample(bank.slice(0,2),s,opts).length,2);assert.equal(C.sample(bank.filter(q=>q.type==='代码题'),s,opts).length,12);
 assert.throws(()=>C.validateExamOptions({...opts,ratios:[50,50,50]}));assert.throws(()=>C.validateExamOptions({...opts,count:999}));
});
test('project interview alternates original questions and follow-ups and preserves transcript',()=>{
 const s=C.fresh(bank);s.interview=C.buildInterview(bank,'云盘',10,20,now,()=>.25);const iv=s.interview;
 assert.equal(iv.rounds.length,10);assert.ok(iv.rounds.every(r=>bank.find(q=>q.id===r.id).project==='云盘'));assert.equal(iv.rounds[0].stage,'main');assert.equal(iv.rounds[1].stage,'follow');assert.equal(iv.rounds[1].prompt,'异常退出时如何验证？');
 iv.answers[0]='项目主问题的回答';iv.answers[1]='追问回答';C.finishInterview(s,now+10000);
 assert.equal(s.interviewHistory.length,1);assert.equal(s.interviewHistory[0].answers[1],'追问回答');assert.equal(C.isCompleted(s,iv.rounds[0].id),true);assert.equal(s.activity['2026-10-19'].ids.length,1);
 C.finishInterview(s,now+20000);assert.equal(s.interviewHistory.length,1);
 const restored=C.normalize(s,bank,now);assert.equal(restored.interview.answers[1],'追问回答');
});
test('backup round-trip restores notes, settings, unfinished test and current position on a fresh device',()=>{
 const s=C.fresh(bank);C.submitAnswer(s,'q2','<完整答案>',now);const c=C.card(s,'q2');c.favorite=true;c.note='自己的口述例子';c.updatedAt=now;s.settings.dailyTarget=20;s.current='q2';s.mode='exam';s.exam={ids:['q1'],answers:{q1:2},index:0,submitted:false,startedAt:now,deadlineAt:now+60000};
 const parsed=C.parseBackup(C.backup(s,now),bank,now),merged=C.merge(C.fresh(bank),parsed.state,bank,now);
 assert.equal(parsed.answers,1);assert.equal(parsed.notes,1);assert.equal(parsed.favorites,1);assert.equal(merged.cards.q2.note,'自己的口述例子');assert.equal(merged.settings.dailyTarget,20);assert.equal(merged.current,'q2');assert.equal(merged.exam.answers.q1,2);
});
test('backup merging keeps newer local edits, unions daily progress, and rejects unrelated files',()=>{
 const local=C.fresh(bank),incoming=C.fresh(bank);C.submitAnswer(local,'q0','较新的本机答案',now+2000);C.submitAnswer(incoming,'q0','旧备份答案',now);C.submitAnswer(incoming,'q1','备份中独有的答案',now);C.recordActivity(local,'q2',now);
 const a=C.card(local,'q0');a.note='新笔记';a.favorite=false;a.updatedAt=now+2000;const b=C.card(incoming,'q0');b.note='旧笔记';b.favorite=true;b.updatedAt=now;
 const merged=C.merge(local,incoming,bank,now);assert.equal(merged.entries.q0.submitted,'较新的本机答案');assert.equal(merged.entries.q1.submitted,'备份中独有的答案');assert.equal(merged.cards.q0.note,'新笔记');assert.equal(merged.cards.q0.favorite,false);assert.equal(merged.activity['2026-10-19'].ids.length,3);
 assert.throws(()=>C.parseBackup('not json',bank));assert.throws(()=>C.parseBackup('{}',bank));assert.throws(()=>C.parseBackup(JSON.stringify({format:'cpp-interview-lab-backup',schemaVersion:99,state:incoming}),bank));
});
test('mastery excludes ungraded written answers and includes interview self-evaluation',()=>{
 const s=C.fresh(bank);C.submitAnswer(s,'q0','未自评答案',now);assert.equal(C.mastery(bank,s).find(m=>m.module==='C++').score,null);
 C.rate(s,'q0','basic',now);C.card(s,'q3').interviewAnswered=true;C.rate(s,'q3','review',now,true);const m=C.mastery(bank,s).find(m=>m.module==='C++');assert.equal(m.rated,2);assert.equal(m.score,30);
});
test('malformed backup dates and fractional interview indexes cannot break the learning screen',()=>{
 const s=C.fresh(bank);s.interview=C.buildInterview(bank,'IM',5,20,now);s.interview.index=1.5;s.interview.deadlineAt=1e100;
 C.card(s,'q0').review={dueAt:1e100,lastReviewedAt:1e100,intervalDays:1,grade:'basic'};
 const fixed=C.normalize(s,bank,now);assert.equal(fixed.interview.index,0);assert.equal(fixed.interview.deadlineAt,0);assert.equal(fixed.cards.q0.review,null);
 assert.doesNotThrow(()=>C.parseBackup(C.backup(s,now),bank,now));
});
test('a later interview self-evaluation wins when merging histories with the same finish time',()=>{
 const a=C.fresh(bank);a.interview=C.buildInterview(bank,'IM',5,0,now,()=>.5);a.interview.answers[0]='主问题回答';C.finishInterview(a,now+1000);
 const b=structuredClone(a);b.interviewHistory[0].ratings[0]='fluent';b.interviewHistory[0].updatedAt=now+2000;
 const merged=C.merge(a,b,bank,now);assert.equal(merged.interviewHistory.length,1);assert.equal(merged.interviewHistory[0].ratings[0],'fluent');
});

test('legacy favorite-only backup never replaces an existing note with its default empty note',()=>{
 const a=C.fresh(bank),b=C.fresh(bank);
 Object.assign(C.card(a,'q0'),{note:'设备 A 的重要笔记',updatedAt:now});
 Object.assign(C.card(b,'q0'),{favorite:true,updatedAt:now+1000});
 const merged=C.merge(a,b,bank,now);assert.equal(merged.cards.q0.note,'设备 A 的重要笔记');assert.equal(merged.cards.q0.favorite,true);
});
test('independent note, favorite and review changes merge in either direction',()=>{
 const start=C.fresh(bank);C.submitAnswer(start,'q0','答案',now);C.rate(start,'q0','basic',now);
 const a=structuredClone(start),b=structuredClone(start);
 C.editCard(a,'q0',{note:'补充项目例子'},now+1000);
 C.editCard(b,'q0',{favorite:true},now+2000);C.rate(b,'q0','fluent',now+3000);
 for(const merged of [C.merge(a,b,bank,now),C.merge(b,a,bank,now)]){
  assert.equal(merged.cards.q0.note,'补充项目例子');assert.equal(merged.cards.q0.favorite,true);assert.equal(merged.cards.q0.review.grade,'fluent');
 }
});
test('explicit note deletion and unfavorite survive import without deleting a newer review',()=>{
 const original=C.fresh(bank);C.editCard(original,'q0',{note:'旧笔记',favorite:true},now);
 const cleared=structuredClone(original);C.editCard(cleared,'q0',{note:'',favorite:false},now+1000);
 C.submitAnswer(original,'q0','新的回答',now+2000);C.rate(original,'q0','basic',now+2000);
 const restored=C.parseBackup(C.backup(cleared,now),bank,now).state,merged=C.merge(original,restored,bank,now);
 assert.equal(merged.cards.q0.note,'');assert.equal(merged.cards.q0.favorite,false);assert.equal(merged.cards.q0.review.grade,'basic');
});
test('reset wins over stale tabs while explicit old-backup restoration preserves this device reset epoch',()=>{
 const old=C.fresh(bank);C.submitAnswer(old,'q0','重置前的回答',now);
 const cleared=C.reset(bank,old,now+1000);C.submitAnswer(old,'q1','迟到的旧页面写入',now+2000);
 for(const merged of [C.sync(old,cleared,bank,now),C.sync(cleared,old,bank,now)]){
  assert.equal(Object.keys(merged.entries).length,0);assert.equal(merged.resetAt,now+1000);
 }
 const restored=C.merge(cleared,old,bank,now);assert.equal(restored.entries.q0.submitted,'重置前的回答');assert.equal(restored.resetAt,cleared.resetAt);
});
test('storage fallback restores the current session when persistent storage is unavailable',()=>{
 const s=C.fresh(bank),session=memory();C.submitAnswer(s,'q0','临时保留的回答',now);session.setItem(C.KEY,JSON.stringify(s));
 const restored=C.load(bank,{getItem(){throw Error('blocked');}},session,now);
 assert.equal(restored.state.entries.q0.submitted,'临时保留的回答');assert.equal(restored.migrated,false);
});
