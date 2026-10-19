const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>({name:m[1].split('?')[0],code:fs.readFileSync(path.join(root,m[1].split('?')[0]),'utf8')}));
const NOW=Date.parse('2026-10-19T12:00:00+08:00');
function boot(options={}){
 let now=options.now||NOW;const errors=[],intervals=[],downloads=[],blobs=[];
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://qzshen219-pixel.github.io/cpp-interview-lab/'}),w=dom.window;
 w.Date.now=()=>now;w.matchMedia=()=>({matches:options.mobile===true,addEventListener(){}});w.HTMLElement.prototype.scrollIntoView=function(){};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.setInterval=(fn,ms)=>{intervals.push({fn,ms});return intervals.length;};
 w.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);};w.URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:https://example.test/'+blobs.length;};w.URL.revokeObjectURL=()=>{};
 const tools=[];w.document.modelContext={registerTool:tool=>tools.push(tool)};
 w.addEventListener('error',event=>{errors.push(event.error||event.message);event.preventDefault();});
 if(options.local)w.localStorage.setItem('cpp-interview-learning-v2',options.local);
 if(options.legacy)w.sessionStorage.setItem('cpp-interview-session-v1',options.legacy);
 if(options.blocked)w.Storage.prototype.setItem=function(){throw Error('blocked');};
 scripts.forEach(s=>w.eval(s.code));
 const $=s=>w.document.querySelector(s),click=s=>{const node=$(s);assert.ok(node,'Missing '+s);node.click();assert.deepEqual(errors,[]);};
 const value=(s,v,event='change')=>{const node=$(s);assert.ok(node,'Missing '+s);if(node.type==='checkbox')node.checked=v;else node.value=v;node.dispatchEvent(new w.Event(event,{bubbles:true}));assert.deepEqual(errors,[]);};
 return {dom,w,app:w.PracticeApp,$,click,value,tools,errors,downloads,blobs,state:()=>w.PracticeApp.state,stored:()=>w.localStorage.getItem('cpp-interview-learning-v2'),advance:ms=>{now+=ms;intervals.filter(i=>i.ms===1000).forEach(i=>i.fn());assert.deepEqual(errors,[]);},close:()=>w.close()};
}
test('full current bank boots with all seven modules, projects and learning tools',t=>{
 const b=boot();t.after(b.close);assert.equal(b.app.bank.length,1279);assert.equal(new Set(b.app.bank.map(q=>q.id)).size,1279);assert.equal(new Set(b.app.bank.map(q=>q.module)).size,7);assert.ok(b.app.bank.filter(q=>q.project==='云盘').length>=24);
 assert.equal(b.state().dailyPlan.ids.length,10);assert.equal(b.$('#today-total').textContent,'10');assert.ok(b.stored());assert.match(b.$('#storage-status').textContent,/已自动保存/);assert.equal(b.tools.length,3);
});
test('answer, self-evaluation, favorite, note and current position survive a new tab without session data',t=>{
 const b=boot();t.after(b.close);b.value('#draft','对象本身的并发访问仍需同步。','input');b.click('#save-answer');b.click('[data-rating="basic"]');b.click('[data-favorite]');b.value('#personal-note','</textarea><img src=x onerror=alert(1)>','input');
 b.app.flush();const id=b.state().current,stored=b.stored(),c=boot({local:stored});t.after(c.close);
 assert.equal(c.state().current,id);assert.equal(c.state().entries[id].submitted,'对象本身的并发访问仍需同步。');assert.equal(c.state().cards[id].favorite,true);assert.equal(c.state().cards[id].note,'</textarea><img src=x onerror=alert(1)>');assert.equal(c.$('#personal-note').value,'</textarea><img src=x onerror=alert(1)>');assert.equal(c.$('#question img'),null);assert.equal(c.$('#completed').textContent,'1');assert.equal(c.$('#favorite-total').textContent,'1');
});
test('legacy session migration immediately persists a durable copy',t=>{
 const legacy=JSON.stringify({version:1,entries:{q01:{draft:'旧草稿',submitted:'旧答案',rating:'review'}},current:'q01'}),b=boot({legacy});t.after(b.close);
 assert.equal(b.state().entries.q01.submitted,'旧答案');assert.ok(JSON.parse(b.stored()).entries.q01);assert.match(b.$('#toast').textContent,/迁移/);assert.ok(Number(b.$('#due-total').textContent)>=1);
});
test('storage failures keep practice working and surface an explicit backup message',t=>{
 const b=boot({blocked:true});t.after(b.close);b.value('#draft','不能丢失的回答','input');b.click('#save-answer');assert.equal(b.$('#completed').textContent,'1');assert.equal(b.app.storageOK,false);assert.match(b.$('#storage-status').textContent,/未成功/);b.click('#backup-open');assert.match(b.$('#backup-status').textContent,/未成功/);b.click('#export-learning');assert.equal(b.downloads.length,1);
});
test('daily scope, progress, changed target and next day work on mobile layout controls',t=>{
 const b=boot({mobile:true});t.after(b.close);b.click('#daily-start');assert.equal(b.state().status,'plan');const id=b.state().current;b.value('#draft','今日完成的一题','input');b.click('#save-answer');assert.equal(b.$('#today-completed').textContent,'1');b.value('#daily-target','5');b.click('#apply-daily-plan');assert.equal(b.state().dailyPlan.ids.length,5);assert.ok(b.state().dailyPlan.ids.includes(id));
 b.value('#daily-project','云盘');b.click('#apply-daily-plan');assert.ok(b.state().dailyPlan.ids.every(id=>b.app.C.projectOf(b.app.bank.find(q=>q.id===id))==='云盘'));b.advance(b.app.C.DAY);assert.equal(b.state().dailyPlan.day,'2026-10-20');assert.equal(b.$('#today-completed').textContent,'0');
});
test('favorite, note and calendar filters use the same visible state as WebMCP',t=>{
 const b=boot();t.after(b.close);const id=b.state().current;b.click('[data-favorite]');b.value('#personal-note','用自己的 IM 项目例子回答。','input');
 b.click('[data-scope="favorite"]');assert.equal(b.app.filtered().length,1);assert.equal(b.state().current,id);b.click('[data-favorite]');assert.equal(b.app.filtered().length,0);assert.ok(b.$('#clear-filter'));
 b.click('[data-scope="notes"]');assert.equal(b.app.filtered().length,1);assert.equal(b.$('#personal-note').value,'用自己的 IM 项目例子回答。');
 const c=b.app.C.card(b.state(),id);c.review=b.app.C.schedule(null,'review',NOW-1000000);b.app.persist();b.click('[data-calendar="2026-10-19"]');assert.equal(b.state().status,'calendar');assert.equal(b.app.filtered().length,1);
 const tool=b.tools.find(t=>t.name==='filter_practice_questions');const result=tool.execute({module:'全部',type:'全部',status:'notes',source:'全部',query:'',project:'全部'});assert.equal(result.count,1);assert.equal(b.state().status,'notes');
});
test('twenty-question objective test supports ratios and grades without duplicate completion',t=>{
 const b=boot();t.after(b.close);b.value('#project-filter','通用');b.value('#source-filter','基础');b.click('#exam-tab');b.value('#exam-count','20');b.value('#ratio-concept','40');b.value('#ratio-scenario','40');b.value('#ratio-code','20');b.click('#start-exam');
 const ex=b.state().exam;assert.equal(ex.ids.length,20);assert.equal(new Set(ex.ids).size,20);assert.equal(b.$('.answer-details'),null);
 const types=ex.ids.map(id=>b.app.bank.find(q=>q.id===id).type);assert.deepEqual([types.filter(t=>t==='概念题').length,types.filter(t=>t==='场景题').length,types.filter(t=>t==='代码题').length],[8,8,4]);
 ex.ids.forEach((id,i)=>{b.click(`[data-q="${id}"]`);const q=b.app.bank.find(q=>q.id===id),choice=i===0?(q.correct+1)%4:q.correct;b.value(`input[name="exam-choice"][value="${choice}"]`,String(choice));});
 b.click('#submit-exam');assert.equal(b.state().exam.submitted,true);assert.equal(b.state().lastTest.correct,19);assert.equal(b.state().lastTest.total,20);assert.equal(b.$('#completed').textContent,'20');const done=b.$('#completed').textContent;b.click('[data-nav="1"]');b.click('[data-nav="-1"]');assert.equal(b.$('#completed').textContent,done);
});
test('invalid proportions do not start a test, and explicit submission blocks blank answers',t=>{
 const b=boot();t.after(b.close);b.click('#exam-tab');b.value('#ratio-concept','95');b.click('#start-exam');assert.equal(b.state().exam,null);assert.match(b.$('#toast').textContent,/100%/);b.value('#ratio-concept','40');b.value('#exam-count','5');b.click('#start-exam');b.click('#submit-exam');assert.equal(b.state().exam.submitted,false);assert.match(b.$('#toast').textContent,/未作答/);
});
test('deadline survives reopening and auto-submits incomplete work without marking blanks completed',t=>{
 const b=boot();t.after(b.close);b.value('#project-filter','通用');b.value('#source-filter','基础');b.click('#exam-tab');b.value('#exam-count','5');b.value('#exam-minutes','5');b.click('#start-exam');const id=b.state().exam.ids[0],q=b.app.bank.find(q=>q.id===id);b.value(`input[name="exam-choice"][value="${q.correct}"]`,String(q.correct));
 const c=boot({local:b.stored(),now:NOW+6*60000});t.after(c.close);assert.equal(c.state().exam.submitted,true);assert.equal(c.state().exam.autoSubmitted,true);assert.equal(c.state().lastTest.correct,1);assert.equal(c.state().lastTest.total,5);assert.equal(c.$('#completed').textContent,'1');assert.ok(c.$('.answer-details').open);
 const d=boot({local:c.stored(),now:NOW+7*60000});t.after(d.close);assert.equal(d.state().exam.submitted,true);assert.equal(d.state().exam.ids.length,5);assert.equal(d.$('#completed').textContent,'1');
});
test('written tests keep partial drafts and expire without fabricating answers or ratings',t=>{
 const b=boot();t.after(b.close);b.value('#source-filter','每日');b.click('#exam-tab');b.value('#exam-count','5');b.value('#exam-minutes','5');b.click('#start-exam');assert.ok(b.$('#exam-draft'));b.value('#exam-draft','文字题答案','input');const id=b.state().exam.ids[0];b.advance(300001);
 assert.equal(b.state().entries[id].submitted,'文字题答案');assert.equal(b.state().lastTest.manual,1);assert.equal(b.state().lastTest.total,0);assert.equal(b.$('#completed').textContent,'1');assert.equal(Object.keys(b.state().exam.answers).length,1);assert.ok(b.$('.answer-details').open);b.click('[data-nav="1"]');assert.match(b.$('.written-answer').textContent,/未作答/);assert.ok([...b.w.document.querySelectorAll('[data-rating]')].every(n=>n.disabled));
});
test('project interview resumes across a new tab, keeps follow-ups and produces a reusable review',t=>{
 const b=boot();t.after(b.close);b.click('#interview-tab');b.value('#interview-project','云盘');b.value('#interview-count','5');b.value('#interview-minutes','0');b.click('#start-interview');assert.equal(b.state().interview.rounds.length,5);assert.equal(b.$('.answer-details'),null);
 b.value('#interview-draft','云盘主问题回答','input');b.click('[data-interview-nav="1"]');assert.equal(b.state().interview.rounds[1].stage,'follow');b.value('#interview-draft','进一步说明并发和异常边界','input');
 b.app.flush();const c=boot({local:b.stored()});t.after(c.close);assert.equal(c.state().mode,'interview');assert.equal(c.$('#interview-draft').value,'进一步说明并发和异常边界');c.click('#finish-interview');assert.equal(c.$('#confirm-dialog').open,true);c.click('#confirm-dialog-action');assert.equal(c.state().interview.submitted,true);assert.equal(c.state().interviewHistory.length,1);assert.ok(c.$('.answer-details').open);c.click('[data-interview-rating="basic"]');const id=c.state().interview.rounds[1].id;assert.ok(c.state().cards[id].review);assert.equal(c.state().interviewHistory[0].ratings[1],'basic');assert.equal(c.$('#completed').textContent,'1');
 c.click('#new-interview');assert.ok(c.$('[data-history]'));c.click('[data-history]');assert.equal(c.state().interview.answers[1],'进一步说明并发和异常边界');
});
test('timed project interviews save partial transcripts when time expires',t=>{
 const b=boot();t.after(b.close);b.click('#interview-tab');b.value('#interview-minutes','10');b.click('#start-interview');b.value('#interview-draft','只完成一轮','input');b.advance(600001);assert.equal(b.state().interview.submitted,true);assert.equal(b.state().interview.autoSubmitted,true);assert.equal(b.state().interviewHistory.length,1);assert.equal(b.state().interviewHistory[0].answers[0],'只完成一轮');
});
test('backup download includes notes and import preview merges only after confirmation',async t=>{
 const b=boot();t.after(b.close);const id=b.state().current;b.value('#draft','较新的本机回答','input');b.click('#save-answer');b.value('#personal-note','本机笔记','input');b.click('#backup-open');b.click('#export-learning');assert.match(b.downloads[0],/学习备份/);assert.equal(b.blobs.length,1);
 const incoming=b.app.C.fresh(b.app.bank),other=b.app.bank[1].id;b.app.C.submitAnswer(incoming,other,'从其他设备带来的答案',NOW-1000);const card=b.app.C.card(incoming,other);card.note='导入的笔记';card.favorite=true;card.updatedAt=NOW;
 const content=b.app.C.backup(incoming,NOW),file={size:content.length,text:async()=>content},input=b.$('#import-learning');Object.defineProperty(input,'files',{configurable:true,value:[file]});input.dispatchEvent(new b.w.Event('change',{bubbles:true}));await new Promise(setImmediate);
 assert.equal(b.state().entries[other],undefined);assert.equal(b.$('#confirm-import').disabled,false);assert.match(b.$('#import-preview').textContent,/1 条作答/);b.click('#confirm-import');assert.equal(b.state().entries[id].submitted,'较新的本机回答');assert.equal(b.state().entries[other].submitted,'从其他设备带来的答案');assert.equal(b.state().cards[other].note,'导入的笔记');assert.equal(b.state().cards[other].favorite,true);
});
test('reset requires confirmation and cancellation preserves learning data',t=>{
 const b=boot();t.after(b.close);b.value('#draft','保留我的回答','input');b.click('#save-answer');b.click('[data-favorite]');b.click('#reset');b.click('#cancel-dialog');assert.equal(b.$('#completed').textContent,'1');b.click('#reset');b.click('#confirm-dialog-action');assert.equal(b.$('#completed').textContent,'0');assert.equal(Object.keys(b.state().entries).length,0);assert.equal(Object.keys(b.state().cards).length,0);assert.equal(b.$('#today-total').textContent,'10');
});
test('installation guidance is available without a browser install prompt',t=>{
 const b=boot();t.after(b.close);b.click('#install-app');assert.equal(b.$('#install-dialog').open,true);assert.match(b.$('#install-dialog').textContent,/Safari/);b.click('#install-close');assert.equal(b.$('#install-dialog').open,false);
});
test('rating a due question never reveals the next question answer automatically',t=>{
 const b=boot();t.after(b.close);const ids=b.app.bank.slice(0,2).map(q=>q.id);
 for(const id of ids){b.app.C.submitAnswer(b.state(),id,'之前的作答',NOW-1000000);b.app.C.rate(b.state(),id,'review',NOW-1000000);}
 b.app.persist();b.click('[data-scope="due"]');assert.equal(b.$('#list-title').textContent,'到期复习');const previous=b.state().current;b.click('.answer-details summary');assert.equal(b.$('.answer-details').open,true);b.click('[data-rating="basic"]');assert.notEqual(b.state().current,previous);assert.equal(b.$('.answer-details').open,false);
});

test('reset propagates across open pages and cancels pending stale drafts',async t=>{
 const a=boot();t.after(a.close);a.value('#draft','重置前的回答','input');a.click('#save-answer');
 const b=boot({local:a.stored()});t.after(b.close);b.value('#draft','另一个页面的待保存内容','input');
 a.click('#reset');a.click('#confirm-dialog-action');const resetRaw=a.stored();
 b.w.localStorage.setItem(b.app.C.KEY,resetRaw);b.w.dispatchEvent(new b.w.StorageEvent('storage',{key:b.app.C.KEY,newValue:resetRaw}));
 assert.equal(Object.values(b.state().entries).filter(e=>e.submitted||e.draft).length,0);assert.match(b.$('#toast').textContent,/另一页面已重置/);
 await new Promise(resolve=>setTimeout(resolve,350));
 assert.equal(Object.values(JSON.parse(b.stored()).entries).filter(e=>e.submitted||e.draft).length,0);
 b.click('[data-favorite]');assert.equal(Object.values(JSON.parse(b.stored()).entries).filter(e=>e.submitted||e.draft).length,0);
});
test('a suspended page checks the durable reset before its next write even without a storage event',t=>{
 const a=boot();t.after(a.close);a.value('#draft','旧答案','input');a.click('#save-answer');const b=boot({local:a.stored()});t.after(b.close);
 a.click('#reset');a.click('#confirm-dialog-action');b.w.localStorage.setItem(b.app.C.KEY,a.stored());
 b.value('#draft','暂停后继续输入的旧草稿','input');b.app.flush();
 assert.equal(Object.values(b.state().entries).filter(e=>e.submitted||e.draft).length,0);assert.equal(b.$('#draft').value,'');
});
test('independent edits from another page preserve the note currently being typed',t=>{
 const b=boot();t.after(b.close);const id=b.state().current,incoming=b.app.C.clone(b.state());
 b.$('#personal-note').focus();b.value('#personal-note','本页正在输入的笔记','input');
 b.app.C.editCard(incoming,id,{favorite:true},NOW+1000);const raw=JSON.stringify(incoming);b.w.localStorage.setItem(b.app.C.KEY,raw);
 b.w.dispatchEvent(new b.w.StorageEvent('storage',{key:b.app.C.KEY,newValue:raw}));b.app.flush();
 assert.equal(b.state().cards[id].favorite,true);assert.equal(b.state().cards[id].note,'本页正在输入的笔记');assert.equal(b.$('#personal-note').value,'本页正在输入的笔记');
});
test('rapid typing batches writes and preserves the calendar DOM and keyboard focus',async t=>{
 const b=boot();t.after(b.close);let writes=0;const original=b.w.Storage.prototype.setItem;
 b.w.Storage.prototype.setItem=function(k,v){if(k===b.app.C.KEY)writes++;return original.call(this,k,v);};
 const calendar=b.$('#review-calendar').firstElementChild,mastery=b.$('#mastery-list').firstElementChild;
 b.$('#draft').focus();for(let i=1;i<=20;i++)b.value('#draft','连续输入'.repeat(i),'input');
 assert.equal(writes,0);assert.match(b.$('#save-status').textContent,/正在保存/);
 await new Promise(resolve=>setTimeout(resolve,350));
 assert.equal(writes,1);assert.equal(JSON.parse(b.stored()).entries[b.state().current].draft,'连续输入'.repeat(20));
 assert.equal(b.$('#review-calendar').firstElementChild,calendar);assert.equal(b.$('#mastery-list').firstElementChild,mastery);assert.equal(b.w.document.activeElement,b.$('#draft'));assert.match(b.$('#save-status').textContent,/已自动保存/);
});
test('page hide immediately flushes the latest note and draft before leaving',t=>{
 const b=boot();t.after(b.close);b.value('#draft','切后台前的最后一句','input');b.value('#personal-note','切后台前的笔记','input');
 b.w.dispatchEvent(new b.w.Event('pagehide'));const saved=JSON.parse(b.stored()),id=b.state().current;
 assert.equal(saved.entries[id].draft,'切后台前的最后一句');assert.equal(saved.cards[id].note,'切后台前的笔记');assert.equal(b.$('#notes-total').textContent,'1');
});
