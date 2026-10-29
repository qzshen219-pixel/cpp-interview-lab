const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const P=require('../learning-paths.js'),C=require('../learning-core.js'),root=path.resolve(__dirname,'..'),ctx=vm.createContext({window:{}}),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)){const file=m[1].split('?')[0];if(file.includes('questions'))vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);}
const bank=ctx.window.QUESTION_BANK,now=Date.parse('2026-10-20T11:00:00+08:00');
test('the full bank has known module-compatible tags without changing question data',()=>{
 const before=JSON.stringify(bank),tags=P.index(bank);assert.equal(P.TOPICS.length,40);assert.equal(tags.size,1879);
 for(const q of bank){assert.ok(tags.get(q.id).length);for(const id of tags.get(q.id))assert.equal(P.TOPICS.find(t=>t.id===id).module,q.module);}
 assert.equal(JSON.stringify(bank),before);assert.equal(P.index(bank),tags);
});
test('classification reads the question instead of incidental reference-answer keywords',()=>{
 assert.ok(P.classify({module:'C++',title:'vector 扩容与迭代器失效'}).includes('cpp-stl'));
 assert.ok(P.classify({module:'Linux',prompt:'epoll 配合 timerfd'}).includes('linux-io'));
 assert.ok(P.classify({module:'项目追问',title:'云盘分片上传校验'}).includes('project-files'));
 const tags=P.classify({module:'Redis',title:'缓存过期',answer:['使用 Sentinel 哨兵']});assert.ok(tags.includes('redis-cache'));assert.equal(tags.includes('redis-ha'),false);
 assert.deepEqual(P.classify({module:'MySQL',title:'一个未归入细分类的问题'}),['mysql-fundamentals']);
});
test('both role routes offer usable stages and never duplicate a question between their stages',()=>{
 const pools=P.routePools(bank);assert.equal(P.ROUTES[0].stages.length,7);assert.equal(P.ROUTES[1].stages.length,6);
 for(const route of P.ROUTES){const used=new Set();for(const stage of route.stages){const key=route.id+':'+stage.id,questions=pools.get(key);assert.ok(questions.length>=10,key);for(const q of questions){assert.ok(!used.has(q.id));used.add(q.id);}}}
});
test('stage sampling prioritizes due work and stores a stable unique group of ten',()=>{
 const s=C.fresh(bank),pool=P.routePools(bank).get('backend:stl'),due=pool.at(-1).id;
 C.submitAnswer(s,due,'需复习的回答',now-2*C.DAY);C.rate(s,due,'review',now-2*C.DAY);
 const ids=P.pick(bank,'backend:stl',s,C,now);assert.equal(ids.length,10);assert.equal(new Set(ids).size,10);assert.equal(ids[0],due);assert.ok(ids.every(id=>pool.some(q=>q.id===id)));
 s.routeSessions['backend:stl']={ids,startedAt:now,updatedAt:now};s.routeActive='backend:stl';s.topic='cpp-stl';s.focusMode=true;
 const restored=C.parseBackup(C.backup(s,now),bank,now).state;assert.deepEqual(Array.from(restored.routeSessions['backend:stl'].ids),ids);assert.equal(restored.routeActive,'backend:stl');assert.equal(restored.topic,'cpp-stl');assert.equal(restored.focusMode,true);
});
test('malformed and unrelated stage IDs are discarded during backup normalization',()=>{
 const allowed=P.routePools(bank).get('backend:stl').slice(0,13).map(q=>q.id),wrong=P.routePools(bank).get('ops:network')[0].id;
 const s=C.normalize({version:2,topic:'not-a-topic',focusMode:'true',routeActive:'backend:stl',routeSessions:{'backend:stl':{ids:[wrong,'unknown',...allowed,...allowed],startedAt:now,updatedAt:now},'fake:stage':{ids:allowed}}},bank,now);
 assert.equal(s.topic,'all');assert.equal(s.focusMode,false);assert.equal(s.routeSessions['backend:stl'].ids.length,10);assert.ok(!s.routeSessions['backend:stl'].ids.includes(wrong));assert.equal(s.routeSessions['fake:stage'],undefined);
});
test('stage re-selection wins over an older backup while reset clears course and focus state',()=>{
 const a=C.fresh(bank),ids=P.pick(bank,'ops:network',a,C,now);a.routeSessions['ops:network']={ids,startedAt:now,updatedAt:now};a.routeActive='ops:network';a.focusMode=true;
 const b=C.clone(a);b.routeSessions['ops:network'].ids=ids.slice().reverse();b.routeSessions['ops:network'].updatedAt=now+1000;
 const merged=C.merge(a,b,bank,now+1000);assert.deepEqual(Array.from(merged.routeSessions['ops:network'].ids),Array.from(b.routeSessions['ops:network'].ids));
 const reset=C.sync(merged,C.reset(bank,merged,now+2000),bank,now+2000);assert.equal(reset.routeActive,'');assert.equal(Object.keys(reset.routeSessions).length,0);assert.equal(reset.focusMode,false);
});
test('related questions share tags, exclude the current question and stay in the same module',()=>{
 const q=bank[0],related=P.related(bank,q.id),tags=P.index(bank);assert.ok(related.length>0);assert.ok(related.length<=4);
 for(const other of related){assert.notEqual(other.id,q.id);assert.equal(other.module,q.module);assert.ok(tags.get(other.id).some(id=>tags.get(q.id).includes(id)));}
});

test('prototype-named active stages cannot escape normalization or break filtering',()=>{
 for(const value of ['__proto__','constructor','toString']){const s=C.normalize({version:2,routeActive:value,routeSessions:{}},bank,now);assert.equal(s.routeActive,'');assert.equal(Object.keys(s.routeSessions).length,0);}
});

test('same-browser record sync preserves an empty page view while explicit backup import can restore it',()=>{
 const a=C.fresh(bank),b=C.fresh(bank);a.focusMode=true;a.topic='cpp-stl';a.query='vector';a.mode='exam';C.submitAnswer(b,bank[0].id,'来自另一页面的作答',now);
 const synced=C.sync(a,b,bank,now);assert.equal(synced.focusMode,true);assert.equal(synced.topic,'cpp-stl');assert.equal(synced.query,'vector');assert.equal(synced.mode,'exam');assert.equal(synced.entries[bank[0].id].submitted,'来自另一页面的作答');
 b.focusMode=true;b.topic='cpp-memory';const imported=C.merge(C.fresh(bank),b,bank,now);assert.equal(imported.focusMode,true);assert.equal(imported.topic,'cpp-memory');
});

