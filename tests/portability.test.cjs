const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../learning-portability.js'),C=require('../learning-core.js');
const bank=[
 {id:'q01',title:'智能指针 <T>',module:'C++',type:'代码题',prompt:'如何持有 <T>？',code:'auto p = make_shared<T>();',answer:['公开参考要点'],pitfalls:['易错提醒'],follow:'后续追问'},
 {id:'中文 & #/题',title:'第二题',module:'Linux',type:'场景题',promptMarkdown:'问题 <script>x</script>\n\n```cpp\nvector<int> v;\n```',answerMarkdown:'参考 <b>内容</b>'}
],base='https://qzshen219-pixel.github.io/cpp-interview-lab/?private=secret#old',now=Date.parse('2026-10-20T12:00:00+08:00');
test('public question links preserve the Pages base path and omit query parameters',()=>{
 const url=P.questionURL(base,bank[1].id);assert.equal(new URL(url).pathname,'/cpp-interview-lab/');assert.equal(new URL(url).search,'');assert.equal(P.parseHash(new URL(url).hash,bank).id,bank[1].id);
 assert.throws(()=>P.questionURL('javascript:alert(1)','q01'));
});
test('fragment parser ignores ordinary anchors and rejects unknown or ambiguous question links',()=>{
 assert.equal(P.parseHash('#question',bank).kind,'none');assert.equal(P.parseHash('#q=q01',bank).id,'q01');
 for(const hash of ['#q=nope','#q=','#q=q01&q=q01','#q=q01&note=secret','#q=%ZZ','#q'])assert.equal(P.parseHash(hash,bank).kind,'invalid',hash);
});
test('export scopes select only their own data and retain a plan or filtered order',()=>{
 const s=C.fresh(bank);C.editCard(s,'q01',{favorite:true,note:'私人笔记'});C.submitAnswer(s,'q01','私人作答',now);C.rate(s,'q01','review',now);
 s.dailyPlan={ids:[bank[1].id,'q01']};const ids=list=>list.map(q=>q.id);
 assert.deepEqual(ids(P.select(bank,s,'filtered',[bank[1]],C,now)),[bank[1].id]);
 for(const scope of ['favorite','notes','review'])assert.deepEqual(ids(P.select(bank,s,scope,[],C,now)),['q01']);
 assert.equal(P.select(bank,s,'due',[],C,now).length,0);assert.equal(P.select(bank,s,'due',[],C,now+600001).length,1);
 assert.deepEqual(ids(P.select(bank,s,'plan',[],C,now)),[bank[1].id,'q01']);assert.throws(()=>P.select(bank,s,'toString',[],C));
});
test('default Markdown includes questions and public links while excluding reference and private content',()=>{
 const s=C.fresh(bank);s.entries.q01={submitted:'PRIVATE_ANSWER',draft:'PRIVATE_DRAFT'};s.cards.q01={note:'PRIVATE_NOTE'};
 const out=P.exportMarkdown(bank,s,{base,now});assert.match(out,/## 1\. 智能指针 &lt;T&gt;/);assert.match(out,/auto p = make_shared<T>\(\);/);assert.match(out,/#q=q01/);assert.match(out,/2026-10-20/);
 assert.doesNotMatch(out,/PRIVATE_|公开参考要点|易错提醒|后续追问|private=secret/);assert.match(out,/&lt;script&gt;x&lt;\/script&gt;/);assert.match(out,/vector<int> v;/);
});
test('explicit reference export includes both answer formats and supplementary material',()=>{
 const out=P.exportMarkdown(bank,C.fresh(bank),{base,reference:true,now});
 for(const value of ['公开参考要点','易错提醒','后续追问','参考 &lt;b&gt;内容&lt;/b&gt;'])assert.ok(out.includes(value));
});
test('personal export safely fences saved answers, differing drafts, notes and arbitrary backticks',()=>{
 const s=C.fresh(bank);s.entries.q01={submitted:'```\n<script>saved</script>\n````',draft:'未提交草稿'};s.cards.q01={note:'[private](javascript:alert(1))'};
 const before=JSON.stringify(s),out=P.exportMarkdown(bank,s,{base,personal:true,now});
 assert.match(out,/`````text\n```\n<script>saved<\/script>\n````\n`````/);assert.match(out,/当前草稿（尚未保存为作答）/);assert.match(out,/```text\n\[private\]/);assert.equal(JSON.stringify(s),before);
 s.entries.q01.draft=s.entries.q01.submitted;assert.doesNotMatch(P.exportMarkdown([bank[0]],s,{base,personal:true,now}),/当前草稿/);
});
test('export count validation prevents hidden truncation and does not mutate input order',()=>{
 const list=Array.from({length:125},(_,i)=>({id:i}));assert.equal(P.take(list,'20').length,20);assert.equal(P.take(list,'all').length,125);assert.equal(P.take(list,'100').length,100);assert.equal(list.length,125);
 for(const count of [0,1,-1,Infinity,'invalid'])assert.throws(()=>P.take(list,count));assert.throws(()=>P.exportMarkdown([],C.fresh(bank),{base}));
});
test('an unclosed source code fence is closed before the following question',()=>{
 const q={...bank[1],promptMarkdown:'```cpp\nvector<int> v;'},out=P.exportMarkdown([q,bank[0]],C.fresh(bank),{base});
 assert.match(out,/vector<int> v;\n```\n\n---\n\n## 2\./);
});
