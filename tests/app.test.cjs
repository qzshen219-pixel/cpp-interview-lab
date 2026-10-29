const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>({name:m[1].split('?')[0],code:fs.readFileSync(path.join(root,m[1].split('?')[0]),'utf8')}));
const NOW=Date.parse('2026-10-19T12:00:00+08:00');
function boot(options={}){
 let now=options.now||NOW;const errors=[],intervals=[],downloads=[],blobs=[];
 const dom=new JSDOM(html,{runScripts:'outside-only',url:options.url||'https://qzshen219-pixel.github.io/cpp-interview-lab/'}),w=dom.window;
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
function blobText(b,blob){return new Promise((resolve,reject)=>{const reader=new b.w.FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsText(blob);});}
test('October 20 through 29 each contain twelve complete rounds including Git Docker Linux and Qt',t=>{
 const b=boot({now:Date.parse('2026-10-29T12:00:00+08:00')});t.after(b.close);
 for(let d=20;d<=29;d++){
  const date=`2026-10-${d}`;b.value('#source-filter',date);const list=Array.from(b.app.filtered());
  assert.equal(list.length,60,date);assert.equal(new Set(list.map(q=>q.sourceRound)).size,12);
  for(const m of ['Git','Docker','Qt'])assert.equal(list.filter(q=>q.module===m).length,5);
  assert.equal(list.filter(q=>q.module==='Linux').length,10);assert.equal(list.filter(q=>q.type==='代码题').length,12);
 }
 b.click('#clear-all-filter');for(const m of ['Git','Docker','Qt']){
  b.click(`[data-module="${m}"]`);assert.equal(b.app.filtered().length,50);assert.ok(b.$('#question .source'));b.click('#clear-all-filter');
 }
 assert.equal(b.tools.find(t=>t.name==='filter_practice_questions').inputSchema.properties.module.enum.includes('Qt'),true);
});
test('cloud application questions without source filenames render safely and keep study records',t=>{
 const b=boot({now:Date.parse('2026-10-29T12:00:00+08:00'),mobile:true});t.after(b.close);
 b.value('#source-filter','2026-10-29');b.click('[data-module="Qt"]');
 const q=b.app.filtered().find(q=>q.project==='云盘');assert.ok(q&&!q.sourceFile);b.click(`[data-q="${q.id}"]`);
 assert.equal(b.$('#question').textContent.includes('undefined'),false);b.$('#question details.answer-details').open=true;
 b.value('#draft','Qt 信号槽、异步请求和对象生命周期的项目回答','input');b.click('#save-answer');b.click('[data-rating="basic"]');
 const c=boot({local:b.stored(),mobile:true,now:Date.parse('2026-10-29T12:00:00+08:00')});t.after(c.close);
 assert.equal(c.state().source,'2026-10-29');assert.equal(c.state().module,'Qt');assert.equal(c.state().current,q.id);assert.equal(c.state().entries[q.id].rating,'basic');
 c.click('#exam-tab');c.value('#exam-count','5');c.click('#start-exam');assert.equal(c.state().exam.ids.length,5);assert.ok(c.state().exam.ids.every(id=>id.startsWith('daily-2026-10-29-')));
});
test('new Git Docker and Qt topics are available through stable role-route stages',t=>{
 const b=boot();t.after(b.close);b.click('#paths-open');assert.ok(b.$('[data-start-stage="backend:delivery"]'));b.click('[data-start-stage="backend:delivery"]');
 assert.equal(b.app.filtered().length,10);assert.ok(b.app.filtered().every(q=>['Git','Docker','Qt'].includes(q.module)));
});
test('compact overview starts closed and preserves a visitor choice while saving and rendering',t=>{
 const b=boot({mobile:true});t.after(b.close);assert.equal(b.$('#learning-hub').open,false);b.$('#learning-hub').open=true;
 b.click('#quick-daily-start');assert.equal(b.state().status,'plan');b.value('#draft','保留概览展开与作答内容','input');b.click('#save-answer');assert.equal(b.$('#learning-hub').open,true);assert.match(b.$('#hub-compact-summary').textContent,/已完成 1 \/ 10/);assert.equal(b.$('#workspace').dataset.mode,'practice');
});
test('utility menus dismiss outside or with Escape and restore focus after a launched dialog closes',t=>{
 const b=boot();t.after(b.close);const menu=b.$('#utility-menu'),summary=menu.querySelector('summary');menu.open=true;
 b.click('#backup-open');assert.equal(menu.open,false);assert.equal(b.$('#backup-dialog').open,true);b.click('#backup-close');b.$('#backup-dialog').dispatchEvent(new b.w.Event('close'));assert.equal(b.w.document.activeElement,summary);
 menu.open=true;summary.focus();b.w.document.dispatchEvent(new b.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(menu.open,false);assert.equal(b.w.document.activeElement,summary);
 menu.open=true;b.click('#question h2');assert.equal(menu.open,false);
 menu.open=true;b.click('#device-menu summary');assert.equal(menu.open,false);assert.equal(b.$('#device-menu').open,true);
});
test('an open dialog gets Escape before utility dismissal and quick daily practice cannot interrupt an assessment',t=>{
 const b=boot();t.after(b.close);b.click('#exam-tab');b.value('#exam-count','5');b.value('#exam-minutes','5');b.click('#start-exam');const deadline=b.state().exam.deadlineAt;
 assert.equal(b.$('#workspace').dataset.mode,'exam');assert.equal(b.$('#quick-daily-start').disabled,true);b.click('#quick-daily-start');assert.equal(b.state().mode,'exam');assert.equal(b.state().exam.deadlineAt,deadline);
 b.click('#backup-open');b.$('#utility-menu').open=true;b.w.document.dispatchEvent(new b.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(b.$('#utility-menu').open,true);assert.equal(b.$('#backup-dialog').open,true);
});
test('a public deep link opens its exact question and navigation updates the linked address',t=>{
 const b=boot({url:'https://qzshen219-pixel.github.io/cpp-interview-lab/#q=q13'});t.after(b.close);
 assert.equal(b.state().current,'q13');assert.match(b.$('#question h2').textContent,/B\+/);assert.equal(b.$('.answer-details').open,false);assert.equal(b.state().mode,'practice');
 b.click('[data-nav="1"]');assert.equal(b.w.location.hash,'#q=q14');assert.equal(JSON.parse(b.stored()).current,'q14');
 b.click('#exam-tab');assert.equal(b.w.location.hash,'');
});
test('deep links escape a route filter, keep existing drafts and collapse the mobile list',t=>{
 const a=boot();t.after(a.close);a.app.openRoute('backend:stl');const id=a.state().current;a.value('#draft','仍要保留的内容','input');a.app.flush();
 const b=boot({local:a.stored(),mobile:true,url:'https://qzshen219-pixel.github.io/cpp-interview-lab/#q=q43'});t.after(b.close);
 assert.equal(b.state().current,'q43');assert.equal(b.state().routeActive,'');assert.equal(b.state().entries[id].draft,'仍要保留的内容');assert.equal(b.$('#mobile-list-toggle').getAttribute('aria-expanded'),'false');
});
test('invalid links retain the saved position and ordinary skip anchors stay functional',t=>{
 const a=boot();t.after(a.close);a.app.openQuestion('q29');
 const b=boot({local:a.stored(),url:'https://qzshen219-pixel.github.io/cpp-interview-lab/#q=missing'});t.after(b.close);assert.equal(b.state().current,'q29');assert.equal(b.w.location.hash,'');assert.match(b.$('#toast').textContent,/题目链接无效/);
 const c=boot({local:a.stored(),url:'https://qzshen219-pixel.github.io/cpp-interview-lab/#question'});t.after(c.close);assert.equal(c.state().current,'q29');assert.equal(c.w.location.hash,'#question');
});
test('incoming links preserve a running timed exam and open only when the user is ready',t=>{
 const a=boot();t.after(a.close);a.click('#exam-tab');a.value('#exam-count','5');a.value('#exam-minutes','5');a.click('#start-exam');const exam=a.state().exam;
 const b=boot({local:a.stored(),url:'https://qzshen219-pixel.github.io/cpp-interview-lab/#q=q43'});t.after(b.close);
 assert.equal(b.state().mode,'exam');assert.equal(b.state().exam.id,exam.id);assert.equal(b.state().exam.deadlineAt,exam.deadlineAt);assert.equal(b.$('.answer-details'),null);assert.equal(b.$('#incoming-question-banner').hidden,false);assert.equal(b.$('#incoming-question-open').disabled,true);assert.equal(b.$('#study-export-open').disabled,true);
 b.advance(300001);assert.equal(b.state().exam.submitted,true);assert.equal(b.$('#incoming-question-open').disabled,false);assert.equal(b.state().mode,'exam');
 b.click('#incoming-question-open');assert.equal(b.state().current,'q43');assert.equal(b.state().mode,'practice');assert.equal(b.$('#incoming-question-banner').hidden,true);assert.equal(b.w.location.hash,'#q=q43');
});
test('a link received in an open tab saves the current draft before navigating',t=>{
 const b=boot();t.after(b.close);b.value('#draft','跳转前的最新输入','input');
 b.w.history.replaceState(null,'','#q=q29');b.w.dispatchEvent(new b.w.HashChangeEvent('hashchange'));
 assert.equal(b.state().current,'q29');assert.equal(JSON.parse(b.stored()).entries.q01.draft,'跳转前的最新输入');assert.equal(b.$('.answer-details').open,false);
});
test('incoming links do not interrupt a project interview and can be dismissed',t=>{
 const a=boot();t.after(a.close);a.click('#interview-tab');a.value('#interview-minutes','0');a.click('#start-interview');a.value('#interview-draft','保留面试要点','input');a.app.flush();
 const b=boot({local:a.stored(),url:'https://qzshen219-pixel.github.io/cpp-interview-lab/#q=q01'});t.after(b.close);
 assert.equal(b.state().mode,'interview');assert.equal(b.state().interview.answers[0],'保留面试要点');assert.equal(b.$('#incoming-question-open').disabled,true);b.click('#incoming-question-dismiss');assert.equal(b.$('#incoming-question-banner').hidden,true);assert.equal(b.w.location.hash,'');assert.equal(b.state().mode,'interview');
});
test('question link copying contains only the public URL and clipboard failure keeps a manual fallback',async t=>{
 const b=boot({url:'https://qzshen219-pixel.github.io/cpp-interview-lab/?note=secret'});t.after(b.close);b.value('#draft','私人草稿','input');
 b.click('[data-question-link]');assert.equal(b.$('#question-link-dialog').open,true);assert.equal(b.$('#question-link-url').value,'https://qzshen219-pixel.github.io/cpp-interview-lab/#q=q01');assert.equal(JSON.parse(b.stored()).entries.q01.draft,'私人草稿');
 let copied;Object.defineProperty(b.w.navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copied=text;}}});b.click('#copy-question-link');await new Promise(setImmediate);assert.equal(copied,b.$('#question-link-url').value);assert.match(b.$('#question-link-status').textContent,/已复制/);
 b.w.navigator.clipboard.writeText=async()=>{throw Error('denied');};b.click('#copy-question-link');await new Promise(setImmediate);assert.match(b.$('#question-link-status').textContent,/链接已选中/);assert.equal(b.w.document.activeElement,b.$('#question-link-url'));
});
test('system sharing sends only title and URL and cancellation is recoverable',async t=>{
 const b=boot();t.after(b.close);let data;b.w.navigator.share=async value=>{data=value;};b.click('[data-question-link]');assert.equal(b.$('#share-question-link').hidden,false);b.click('#share-question-link');await new Promise(setImmediate);assert.deepEqual(Object.keys(data).sort(),['title','url']);
 b.w.navigator.share=async()=>{throw new b.w.DOMException('canceled','AbortError');};b.click('#share-question-link');await new Promise(setImmediate);assert.match(b.$('#question-link-status').textContent,/已取消/);
});
test('export settles pending search, previews every match and respects selected quantity',async t=>{
 const b=boot();t.after(b.close);b.value('#question-search','shared_ptr','input');b.click('#study-export-open');assert.equal(b.state().query,'shared_ptr');assert.match(b.$('#study-export-preview').textContent,new RegExp('共 '+b.app.filtered().length+' 题'));
 b.value('#study-export-count','10');b.click('#study-export-download');const out=await blobText(b,b.blobs.at(-1));assert.equal((out.match(/^## \d+\./gm)||[]).length,10);assert.match(b.downloads.at(-1),/^cpp-interview-filtered-2026-10-19\.md$/);assert.match(out,/已应用关键词筛选/);assert.equal(b.$('#study-export-reference').checked,false);assert.equal(b.$('#study-export-personal').checked,false);
});
test('favorite and note exports are empty-safe and never include private records without opt-in',async t=>{
 const b=boot();t.after(b.close);b.value('#draft','ONLY_PRIVATE_ANSWER','input');b.click('#save-answer');b.value('#draft','ONLY_PRIVATE_DRAFT','input');b.value('#personal-note','ONLY_PRIVATE_NOTE','input');b.click('[data-favorite]');
 b.click('#study-export-open');b.value('#study-export-scope','favorite');assert.match(b.$('#study-export-preview').textContent,/共 1 题/);b.click('#study-export-download');const plain=await blobText(b,b.blobs.at(-1));assert.doesNotMatch(plain,/ONLY_PRIVATE|参考答案\n/);
 b.value('#study-export-personal',true);b.value('#study-export-reference',true);b.click('#study-export-download');const full=await blobText(b,b.blobs.at(-1));assert.match(full,/ONLY_PRIVATE_ANSWER/);assert.match(full,/ONLY_PRIVATE_DRAFT/);assert.match(full,/ONLY_PRIVATE_NOTE/);assert.match(full,/### 参考答案/);assert.equal(JSON.parse(b.stored()).entries.q01.draft,'ONLY_PRIVATE_DRAFT');
 b.click('#study-export-close');b.click('#study-export-open');assert.equal(b.$('#study-export-personal').checked,false);assert.equal(b.$('#study-export-reference').checked,false);
 b.value('#study-export-scope','due');assert.equal(b.$('#study-export-download').disabled,true);assert.match(b.$('#study-export-preview').textContent,/暂无题目/);
});
test('route exports preserve stage order and exports never change plans or completion',async t=>{
 const b=boot();t.after(b.close);b.app.openRoute('ops:proxy');const ids=Array.from(b.state().routeSessions['ops:proxy'].ids),plan=JSON.stringify(b.state().dailyPlan);b.click('#study-export-open');b.value('#study-export-count','all');b.click('#study-export-download');const out=await blobText(b,b.blobs.at(-1));
 assert.deepEqual([...out.matchAll(/\[打开这道题\]\([^\n]*#q=([^\)]+)\)/g)].map(m=>decodeURIComponent(m[1])),ids);assert.equal(JSON.stringify(b.state().dailyPlan),plan);assert.equal(Object.values(b.state().entries).filter(e=>e.submitted).length,0);assert.match(out,/云网运维 \/ 代理、负载与服务入口/);
});
test('full current bank boots with all seven modules, projects and learning tools',t=>{
 const b=boot();t.after(b.close);assert.equal(b.app.bank.length,1879);assert.equal(new Set(b.app.bank.map(q=>q.id)).size,1879);assert.equal(new Set(b.app.bank.map(q=>q.module)).size,10);assert.ok(b.app.bank.filter(q=>q.project==='云盘').length>=24);
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

test('reference search shows matching snippets, Unicode highlights and preserved scope after reopen',t=>{
 const b=boot();t.after(b.close);const q=b.app.bank[0],phrase=q.answer[0].slice(0,16);
 b.value('#search-scope','reference');b.value('#question-search',phrase);
 assert.ok(b.app.filtered().some(item=>item.id===q.id));assert.ok(b.$('.search-hit mark'));assert.match(b.$('.search-hit').textContent,/参考答案/);
 assert.equal(b.$('#question-search').value,phrase);const c=boot({local:b.stored()});t.after(c.close);assert.equal(c.state().searchScope,'reference');assert.equal(c.state().query,phrase);
 b.click('#clear-all-filter');assert.equal(b.state().searchScope,'all');assert.equal(b.app.filtered().length,1879);
});
test('personal full text search finds notes safely and uses the same scope through WebMCP',t=>{
 const b=boot();t.after(b.close);const id=b.state().current,note='个人唯一关键字 </textarea><img src=x onerror=alert(1)> ＳＱＬ';b.value('#personal-note',note,'input');
 const tool=b.tools.find(t=>t.name==='filter_practice_questions');const result=tool.execute({module:'全部',type:'全部',query:'个人唯一关键字 sql',searchScope:'personal'});
 assert.equal(result.count,1);assert.equal(result.searchScope,'personal');assert.equal(b.state().current,id);assert.equal(b.$('#personal-note').value,note);assert.equal(b.$('#question img'),null);assert.ok(b.$('.search-hit mark'));
});
test('typing search is delayed while changing mode settles the pending query',async t=>{
 const b=boot();t.after(b.close);b.$('#question-search').focus();b.value('#question-search','shared_ptr','input');assert.equal(b.state().query,'');
 await new Promise(resolve=>setTimeout(resolve,220));assert.equal(b.state().query,'shared_ptr');assert.equal(b.w.document.activeElement,b.$('#question-search'));
 b.value('#question-search','vector','input');b.click('#exam-tab');assert.equal(b.state().query,'vector');assert.equal(b.$('#question-search').value,'vector');
 await new Promise(resolve=>setTimeout(resolve,200));assert.deepEqual(b.errors,[]);
});
test('history dialog compares versions, confirms restoration and retains unsaved content',t=>{
 const b=boot();t.after(b.close);const id=b.state().current;b.value('#draft','共同\n第一个版本','input');b.click('#save-answer');b.advance(1000);b.value('#draft','共同\n第二个版本','input');b.click('#save-answer');b.value('#draft','共同\n未保存的补充','input');
 b.click('[data-answer-history]');assert.equal(b.$('#answer-history-dialog').open,true);const version=b.app.C.answerVersions(b.state(),id).find(v=>v.answer==='共同\n第一个版本');b.value('#answer-version',version.id);
 assert.ok(b.$('#history-before del'));assert.ok(b.$('#history-after ins'));assert.match(b.$('#history-after').textContent,/未保存/);
 b.click('#restore-answer');assert.equal(b.$('#confirm-dialog').open,true);b.click('#cancel-dialog');assert.equal(b.state().entries[id].submitted,'共同\n第二个版本');
 b.click('[data-answer-history]');b.value('#answer-version',version.id);b.click('#restore-answer');b.click('#confirm-dialog-action');assert.equal(b.state().entries[id].submitted,'共同\n第一个版本');assert.equal(b.$('#draft').value,'共同\n第一个版本');assert.ok(b.app.C.answerVersions(b.state(),id).some(v=>v.answer.includes('未保存')));
 const c=boot({local:b.stored()});t.after(c.close);assert.ok(c.app.C.answerVersions(c.state(),id).some(v=>v.answer.includes('第二个版本')));
});
test('history rendering escapes saved text and clears its contents after a remote reset',t=>{
 const b=boot();t.after(b.close);b.value('#draft','<script>danger()</script>','input');b.click('#save-answer');b.click('[data-answer-history]');assert.equal(b.$('#answer-history-dialog script'),null);assert.match(b.$('#history-before').textContent,/<script>/);
 const raw=JSON.stringify(b.app.C.reset(b.app.bank,b.state(),NOW+1000));b.w.localStorage.setItem(b.app.C.KEY,raw);b.w.dispatchEvent(new b.w.StorageEvent('storage',{key:b.app.C.KEY,newValue:raw}));assert.equal(b.$('#answer-comparison').hidden,true);assert.equal(b.$('#history-before').textContent,'');
});
test('weekly report separates objective results, omissions and manual evaluations and exports selected week',t=>{
 const b=boot();t.after(b.close);b.value('#project-filter','通用');b.value('#source-filter','基础');b.click('#exam-tab');b.value('#exam-count','5');b.value('#exam-minutes','5');b.click('#start-exam');
 for(let i=0;i<2;i++){const id=b.state().exam.ids[i],q=b.app.bank.find(q=>q.id===id);b.click(`[data-q="${id}"]`);b.value(`input[name="exam-choice"][value="${i?q.correct===0?1:0:q.correct}"]`,String(i?q.correct===0?1:0:q.correct));}
 b.advance(300001);b.click('#return-practice');b.value('#draft','独立解释这道题','input');b.click('#save-answer');b.click('[data-rating="basic"]');b.click('#weekly-open');
 assert.equal(b.$('#weekly-dialog').open,true);assert.match(b.$('#weekly-report').textContent,/50%/);assert.match(b.$('#weekly-report').textContent,/另有 3 题未答/);assert.equal(b.app.C.weekReport(b.app.bank,b.state(),0,NOW+300001).selfTotal,1);assert.equal(b.$('#weekly-report table tbody').children.length,10);
 b.click('#export-weekly');assert.match(b.downloads.at(-1),/面试练习周报-2026-10-19\.md/);b.value('#weekly-offset','1');assert.match(b.$('#weekly-range').textContent,/2026-10-12/);b.click('#export-weekly');assert.match(b.downloads.at(-1),/2026-10-12\.md/);assert.match(b.$('#weekly-report').textContent,/从 2026-10-19 起记录/);
});
test('active exams never display answer search snippets',t=>{
 const b=boot();t.after(b.close);b.value('#question-search','shared_ptr');b.click('#exam-tab');b.value('#exam-count','5');b.click('#start-exam');assert.ok(b.state().exam);assert.equal(b.$('#search-scope').disabled,true);assert.equal(b.$('.search-hit'),null);assert.equal(b.$('#question .answer-details'),null);
});

test('empty history is explained and selecting reference scope opens its matching explanation',t=>{
 const b=boot();t.after(b.close);b.click('[data-answer-history]');assert.equal(b.$('#answer-history-empty').hidden,false);assert.equal(b.$('#answer-comparison').hidden,true);b.click('#answer-history-close');
 b.value('#search-scope','reference');b.value('#question-search',b.app.bank[0].answer[0].slice(0,12));assert.equal(b.$('.answer-details').open,true);
});

test('knowledge point filters, header chips and WebMCP use the same question set',t=>{
 const b=boot({mobile:true});t.after(b.close);b.value('#topic-filter','cpp-stl');assert.equal(b.state().topic,'cpp-stl');assert.ok(b.app.filtered().length>10);assert.ok(b.app.filtered().every(q=>b.w.LearningPaths.classify(q).includes('cpp-stl')));
 const expected=b.app.filtered().map(q=>q.id),tool=b.tools.find(t=>t.name==='filter_practice_questions'),r=tool.execute({module:'全部',type:'全部',topic:'cpp-stl'});assert.equal(r.count,expected.length);
 const c=boot({local:b.stored(),mobile:true});t.after(c.close);assert.equal(c.$('#topic-filter').value,'cpp-stl');assert.equal(c.$('#mobile-filter-toggle').getAttribute('aria-expanded'),'true');
 b.click('#clear-all-filter');const button=b.$('[data-topic]'),topic=button.dataset.topic;b.click('[data-topic]');assert.equal(b.state().topic,topic);assert.equal(b.state().routeActive,'');
});
test('a route stage keeps its selected questions and progress when reopening',t=>{
 const b=boot();t.after(b.close);const daily=JSON.stringify(b.state().dailyPlan);b.click('#paths-open');assert.equal(b.$('#paths-dialog').open,true);assert.equal(b.$('#path-stages').children.length,7);b.click('[data-start-stage="backend:stl"]');
 assert.equal(b.state().routeActive,'backend:stl');assert.equal(b.app.filtered().length,10);assert.equal(b.$('#route-session-banner').hidden,false);const ids=Array.from(b.state().routeSessions['backend:stl'].ids),first=b.state().current;
 b.value('#draft','阶段中的第一份作答','input');b.click('#save-answer');assert.match(b.$('#route-session-progress').textContent,/已作答 1 \/ 10/);assert.equal(JSON.stringify(b.state().dailyPlan),daily);
 const c=boot({local:b.stored()});t.after(c.close);assert.deepEqual(Array.from(c.state().routeSessions['backend:stl'].ids),ids);c.click('#paths-open');c.click('[data-start-stage="backend:stl"]');assert.notEqual(c.state().current,first);assert.deepEqual(Array.from(c.state().routeSessions['backend:stl'].ids),ids);
 c.click('#route-leave');assert.equal(c.state().routeActive,'');assert.equal(c.app.filtered().length,1879);assert.ok(c.state().routeSessions['backend:stl']);
});
test('the operations route exposes six stages and daily/favorite scopes exit a route cleanly',t=>{
 const b=boot();t.after(b.close);b.click('#paths-open');b.click('[data-path-choice="ops"]');assert.equal(b.$('#path-stages').children.length,6);b.click('[data-start-stage="ops:proxy"]');assert.equal(b.state().routeActive,'ops:proxy');assert.ok(b.app.filtered().every(q=>q.module==='Nginx'));
 b.click('[data-favorite]');b.click('[data-scope="favorite"]');assert.equal(b.state().routeActive,'');assert.equal(b.state().topic,'all');assert.equal(b.app.filtered().length,1);
 b.click('#daily-start');assert.equal(b.state().routeActive,'');assert.equal(b.state().status,'plan');assert.equal(b.app.filtered().length,10);
});
test('reselecting a stage requires confirmation and preserves existing answers and history',t=>{
 const b=boot();t.after(b.close);b.app.openRoute('backend:stl');const id=b.state().current,original=JSON.stringify(b.state().routeSessions['backend:stl'].ids);
 b.value('#draft','需要保留的旧作答','input');b.click('#save-answer');b.click('[data-rating="basic"]');b.click('#paths-open');b.click('[data-repick-stage="backend:stl"]');b.click('#cancel-dialog');assert.equal(JSON.stringify(b.state().routeSessions['backend:stl'].ids),original);
 b.click('#paths-open');b.click('[data-repick-stage="backend:stl"]');b.click('#confirm-dialog-action');assert.equal(b.state().entries[id].submitted,'需要保留的旧作答');assert.ok(b.app.C.answerVersions(b.state(),id).length);assert.ok(!b.state().routeSessions['backend:stl'].ids.includes(id));
});
test('course tests stay inside the stage and cannot switch stages while active',t=>{
 const b=boot();t.after(b.close);b.app.openRoute('backend:stl');const ids=Array.from(b.state().routeSessions['backend:stl'].ids);b.click('#exam-tab');b.value('#exam-count','20');b.click('#start-exam');assert.ok(b.state().exam.ids.every(id=>ids.includes(id)));assert.equal(b.state().exam.ids.length,10);
 assert.equal(b.$('#topic-filter').disabled,true);assert.equal(b.$('[data-topic]').disabled,true);b.click('#paths-open');assert.ok([...b.w.document.querySelectorAll('[data-start-stage]')].every(button=>button.disabled));assert.throws(()=>b.app.openRoute('ops:linux'),/先结束/);
});
test('focus layout preserves the textarea and unsaved answer, survives reopen and exits by Escape',t=>{
 const b=boot({mobile:true});t.after(b.close);const textarea=b.$('#draft');b.value('#draft','专注前尚未保存的草稿','input');b.click('#focus-toggle');assert.equal(b.state().focusMode,true);assert.equal(b.$('#draft'),textarea);assert.equal(b.$('#draft').value,'专注前尚未保存的草稿');assert.equal(b.$('#focus-bar').hidden,false);assert.ok(b.w.document.documentElement.classList.contains('focus-mode'));assert.match(b.$('#focus-save').textContent,/已自动保存/);
 const c=boot({local:b.stored(),mobile:true});t.after(c.close);assert.equal(c.state().focusMode,true);assert.equal(c.$('#focus-bar').hidden,false);
 c.w.document.dispatchEvent(new c.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(c.state().focusMode,false);assert.equal(c.$('#draft').value,'专注前尚未保存的草稿');assert.equal(c.$('#focus-bar').hidden,true);
});
test('focus does not intercept dialog Escape or interrupt a timed assessment',t=>{
 const b=boot();t.after(b.close);b.click('#focus-toggle');b.click('[data-answer-history]');b.w.document.dispatchEvent(new b.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(b.state().focusMode,true);b.click('#answer-history-close');b.click('#focus-exit');
 b.value('#project-filter','通用');b.value('#source-filter','基础');b.click('#exam-tab');b.value('#exam-count','5');b.value('#exam-minutes','5');b.click('#start-exam');const id=b.state().exam.id,deadline=b.state().exam.deadlineAt;b.click('#focus-toggle');assert.equal(b.state().exam.id,id);assert.equal(b.state().exam.deadlineAt,deadline);assert.ok(b.$('[data-countdown]'));b.advance(300001);assert.equal(b.state().exam.submitted,true);assert.equal(b.state().focusMode,true);b.click('#focus-exit');assert.equal(b.state().exam.id,id);
});
test('related-question navigation keeps learning records and clears the narrow scope',t=>{
 const b=boot();t.after(b.close);b.app.openRoute('backend:stl');const current=b.state().current;b.value('#draft','关联练习前的草稿','input');const next=b.$('[data-related-question]').dataset.relatedQuestion;b.click('[data-related-question]');assert.equal(b.state().current,next);assert.equal(b.state().routeActive,'');assert.equal(b.state().topic,'all');assert.equal(b.state().entries[current].draft,'关联练习前的草稿');
});

test('remote reset clears the focused course layout and current stage',t=>{
 const b=boot();t.after(b.close);b.app.openRoute('backend:stl');b.click('#focus-toggle');const raw=JSON.stringify(b.app.C.reset(b.app.bank,b.state(),NOW+1000));
 b.w.localStorage.setItem(b.app.C.KEY,raw);b.w.dispatchEvent(new b.w.StorageEvent('storage',{key:b.app.C.KEY,newValue:raw}));assert.equal(b.state().routeActive,'');assert.equal(b.state().focusMode,false);assert.equal(b.$('#focus-bar').hidden,true);assert.equal(b.$('#route-session-banner').hidden,true);assert.equal(b.w.document.documentElement.classList.contains('focus-mode'),false);
});

test('another page saving its first answer cannot exit this page focus mode or knowledge filter',t=>{
 const b=boot();t.after(b.close);b.value('#topic-filter','cpp-stl');b.click('#focus-toggle');const incoming=b.app.C.fresh(b.app.bank);b.app.C.submitAnswer(incoming,b.app.bank[0].id,'另一页面的新答案',NOW+1000);const raw=JSON.stringify(incoming);
 b.w.localStorage.setItem(b.app.C.KEY,raw);b.w.dispatchEvent(new b.w.StorageEvent('storage',{key:b.app.C.KEY,newValue:raw}));assert.equal(b.state().focusMode,true);assert.equal(b.state().topic,'cpp-stl');assert.equal(b.$('#focus-bar').hidden,false);assert.equal(b.state().entries[b.app.bank[0].id].submitted,'另一页面的新答案');
});

