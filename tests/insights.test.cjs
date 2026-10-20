const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../learning-core.js'),S=require('../learning-search.js');
const now=Date.parse('2026-10-20T10:00:00+08:00');
const bank=[{id:'one',module:'C++',title:'智能指针',prompt:'共享对象的生命周期',code:'auto p = std::make_shared<int>(1);',answer:['控制块的引用计数是原子的'],pitfalls:['引用计数不能保护对象并发写'],follow:'旧回调怎样处理？'},{id:'two',module:'MySQL',title:'索引',promptMarkdown:'如何检查执行计划？',answerMarkdown:'使用 EXPLAIN 分析覆盖索引。',manual:true},{id:'three',module:'C++',title:'并发',prompt:'写出锁的边界',answer:[],manual:true}];
test('full text search covers reference, code, markdown, submitted answers and live personal notes',()=>{
 const s=C.fresh(bank),index=S.createIndex(bank);C.submitAnswer(s,'two','连接池由我负责',now);C.editCard(s,'one',{note:'排查旧 session_id 路由'},now);
 assert.equal(S.match(index.get('one'),s,'one',S.terms('引用计数 原子'),'reference'),true);assert.equal(S.match(index.get('one'),s,'one',S.terms('引用计数'),'question'),false);
 assert.equal(S.match(index.get('two'),s,'two',S.terms('EXPLAIN'),'reference'),true);assert.equal(S.match(index.get('two'),s,'two',S.terms('执行计划'),'question'),true);
 assert.equal(S.match(index.get('one'),s,'one',S.terms('session_id'),'personal'),true);assert.equal(S.match(index.get('two'),s,'two',S.terms('连接池'),'personal'),true);
 assert.equal(S.match(index.get('one'),s,'one',S.terms('make_shared'),'question'),true);C.editCard(s,'one',{note:''},now+1);assert.equal(S.match(index.get('one'),s,'one',S.terms('session_id'),'personal'),false);
});
test('search highlights Unicode equivalents and literal punctuation without interpreting user HTML',()=>{
 assert.equal(S.highlight('ＳＱＬ 与 e\u0301，.*','sql é .*'),'<mark>ＳＱＬ</mark> 与 <mark>e\u0301</mark>，<mark>.*</mark>');
 assert.equal(S.highlight('<img src=x onerror=alert(1)>','img'),'&lt;<mark>img</mark> src=x onerror=alert(1)&gt;');
 const index=S.createIndex(bank),s=C.fresh(bank);C.editCard(s,'one',{note:'x'.repeat(200)+'定位关键词'+'y'.repeat(200)},now);
 const hit=S.snippet(index.get('one'),s,'one','定位关键词','personal');assert.equal(hit.label,'我的作答与笔记');assert.match(hit.html,/<mark>定位关键词<\/mark>/);assert.ok(hit.html.length<200);
});
test('answer versions retain original legacy content and unsaved drafts before restoring',()=>{
 const s=C.fresh(bank);s.entries.one={draft:'升级前草稿',submitted:'升级前已保存',submittedAt:0,rating:'basic',updatedAt:0};
 C.submitAnswer(s,'one','第二个答案',now);C.submitAnswer(s,'one','第三个答案',now+1000);s.entries.one.draft='尚未保存的重要补充';
 const old=C.answerVersions(s,'one').find(v=>v.answer==='升级前已保存');C.restoreAnswer(s,'one',old.id,now+2000);
 assert.equal(s.entries.one.submitted,'升级前已保存');assert.equal(s.entries.one.rating,null);
 const answers=C.answerVersions(s,'one').map(v=>v.answer);for(const value of ['升级前已保存','第二个答案','第三个答案','尚未保存的重要补充'])assert.ok(answers.includes(value));
 C.submitAnswer(s,'one','升级前已保存',now+3000);assert.equal(C.answerVersions(s,'one').length,answers.length);
});
test('answer histories merge without duplication and obey per-question and global limits',()=>{
 const a=C.fresh(bank);for(let i=0;i<15;i++)C.submitAnswer(a,'one','版本 '+i,now+i);assert.equal(a.answerHistory.one.length,10);
 const b=C.clone(a);C.submitAnswer(a,'one','来自设备 A',now+20);C.submitAnswer(b,'one','来自设备 B',now+21);
 const merged=C.merge(a,b,bank,now+100),again=C.merge(merged,b,bank,now+100);assert.equal(again.answerHistory.one.length,10);
 assert.ok(again.answerHistory.one.some(v=>v.answer==='来自设备 A'));assert.ok(again.answerHistory.one.some(v=>v.answer==='来自设备 B'));
 const many=C.fresh(bank);for(let q=0;q<20;q++)for(let v=0;v<12;v++)C.rememberAnswer(many,'fake'+q,'内容'+v,now+q*100+v);
 assert.equal(Object.values(many.answerHistory).flat().length,100);assert.ok(Object.values(many.answerHistory).every(v=>v.length<=10));
});
test('answer comparisons preserve both texts and identify inserted and removed lines',()=>{
 const diff=C.diffAnswers('共同\n旧行\n结尾','共同\n新行\n补充\n结尾');assert.equal(diff.before.map(v=>v.text).join(''),'共同\n旧行\n结尾');assert.equal(diff.after.map(v=>v.text).join(''),'共同\n新行\n补充\n结尾');
 assert.ok(diff.before.some(v=>v.changed&&v.text.includes('旧行')));assert.ok(diff.after.some(v=>v.changed&&v.text.includes('补充')));assert.ok(diff.before.some(v=>!v.changed&&v.text==='共同\n'));
 assert.equal(C.diffAnswers('a\n'.repeat(300),'b\n'.repeat(300)).before.length,1);
});
test('weekly report uses Beijing Monday boundaries and separates correct, missed and self ratings',()=>{
 const s=C.fresh(bank),sunday=Date.parse('2026-10-18T23:59:59+08:00'),monday=sunday+1000;
 C.recordActivity(s,'one',sunday);C.recordActivity(s,'one',monday);C.recordActivity(s,'one',monday+1000);C.recordActivity(s,'one',now);C.recordActivity(s,'two',now);
 C.recordStudy(s,'one',{kind:'objective',result:'correct'},now,'attempt1');C.recordStudy(s,'one',{kind:'objective',result:'wrong'},now+1,'attempt2');C.recordStudy(s,'two',{kind:'objective',result:'missed'},now+2,'attempt3');
 C.submitAnswer(s,'three','我的表达',now);C.rate(s,'three','review',now);C.rate(s,'three','fluent',now+1000);C.rate(s,'three','fluent',now+2000);
 const r=C.weekReport(bank,s,0,now+3000);assert.equal(r.start,'2026-10-19');assert.equal(r.end,'2026-10-25');assert.equal(r.practiceCount,4);assert.equal(r.activeDays,2);assert.equal(r.unique,3);
 assert.deepEqual(r.objective,{correct:1,answered:2,missed:1,accuracy:50});assert.deepEqual(r.self,{review:0,basic:0,fluent:1});assert.equal(r.selfTotal,1);assert.equal(C.weekReport(bank,s,1,now).practiceCount,1);
 assert.match(C.reportMarkdown(r),/未答单列|未答单/);assert.match(C.reportMarkdown(r),/50%/);
});
test('due review completion is counted once and same-day re-review advances an overdue task',()=>{
 const s=C.fresh(bank);C.submitAnswer(s,'one','回答',now);C.rate(s,'one','review',now);const due=s.cards.one.review.dueAt;
 assert.equal(C.weekReport(bank,s,0,due).reviews.rate,0);C.rate(s,'one','review',due+1);const report=C.weekReport(bank,s,0,due+2);
 assert.deepEqual(report.reviews,{done:1,total:1,pending:0,rate:100});assert.equal(s.cards.one.review.dueAt,due+1+600000);
 C.rate(s,'one','review',due+2);assert.equal(C.weekReport(bank,s,0,due+3).reviews.done,1);
});
test('blank timed work keeps its due task incomplete and past-week reports use the historical cutoff',()=>{
 const s=C.fresh(bank),sunday=Date.parse('2026-10-18T23:40:00+08:00');C.submitAnswer(s,'one','回答',sunday);C.rate(s,'one','review',sunday);
 const due=s.cards.one.review.dueAt;C.editCard(s,'one',{review:C.trackReview(s,'one',C.schedule(s.cards.one.review,'review',due+1),due+1,false)},due+1);
 assert.equal(C.weekReport(bank,s,0,due+2).reviews.done,0);C.rate(s,'one','basic',now);
 const past=C.weekReport(bank,s,1,now+1000);assert.deepEqual(past.reviews,{done:0,total:1,pending:1,rate:0});assert.equal(C.weekReport(bank,s,0,now+1000).reviews.done,1);
});
test('upgrading old records retains practice counts without inventing dated results',()=>{
 const old={version:2,activity:{'2026-10-19':{ids:['one'],updatedAt:now}},entries:{one:{submitted:'旧答案',draft:'旧答案',rating:'fluent'}},outcomes:{two:true},cards:{one:{review:C.schedule(null,'basic',now-2*C.DAY)}}};
 const s=C.normalize(old,bank,now),r=C.weekReport(bank,s,0,now);assert.equal(r.practiceCount,1);assert.equal(r.objective.accuracy,null);assert.equal(r.selfTotal,0);assert.equal(r.reviews.pending,1);assert.equal(r.trackedSince,now);assert.equal(C.answerVersions(s,'one')[0].answer,'旧答案');
});
test('backup round trip and reset include history and report evidence',()=>{
 const s=C.fresh(bank);C.submitAnswer(s,'one','答案 A',now);C.submitAnswer(s,'one','答案 B',now+1);C.rate(s,'one','basic',now+2);C.recordStudy(s,'two',{kind:'objective',result:'correct'},now+3,'a');
 const restored=C.parseBackup(C.backup(s,now+4),bank,now+4).state;assert.equal(restored.answerHistory.one.length,2);assert.equal(C.weekReport(bank,restored,0,now+5).objective.correct,1);
 const merged=C.merge(s,restored,bank,now+5);assert.equal(Object.keys(merged.studyLog).length,Object.keys(s.studyLog).length);
 const cleared=C.reset(bank,s,now+6),synced=C.sync(s,cleared,bank,now+6);assert.equal(Object.keys(synced.answerHistory).length,0);assert.equal(Object.keys(synced.studyLog).length,0);assert.equal(Object.keys(synced.reviewTasks).length,0);
});

test('a stale legacy version identifier can never restore a different answer',()=>{
 const s=C.fresh(bank);s.entries.one={draft:'旧内容',submitted:'旧内容',submittedAt:0};const version=C.answerVersions(s,'one')[0];
 s.entries.one={draft:'另一页面的新内容',submitted:'另一页面的新内容',submittedAt:0};assert.throws(()=>C.restoreAnswer(s,'one',version.id,now),/历史版本已不存在/);assert.equal(s.entries.one.submitted,'另一页面的新内容');
});
