(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.LearningPortability=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SCOPES={filtered:'当前筛选结果',favorite:'我的收藏',review:'需要强化',due:'到期复习',notes:'有个人笔记',plan:'今日计划'};
function questionURL(base,id){
 const url=new URL(base);if(!['https:','http:'].includes(url.protocol))throw Error('无效的网站网址。');
 url.search='';url.username='';url.password='';url.hash='q='+encodeURIComponent(id);return url.href;
}
function parseHash(hash,bank){
 if(!/^#q(?:=|&|$)/.test(hash))return {kind:'none'};
 const params=new URLSearchParams(hash.slice(1)),id=params.get('q');
 if([...params.keys()].length!==1||!id||!bank.some(q=>q.id===id))return {kind:'invalid'};
 return {kind:'question',id};
}
function select(bank,state,scope,filtered,core,now=Date.now()){
 if(!Object.hasOwn(SCOPES,scope))throw Error('无效的导出范围。');
 if(scope==='filtered')return filtered.slice();
 if(scope==='plan'){const byId=new Map(bank.map(q=>[q.id,q]));return (state.dailyPlan?.ids||[]).map(id=>byId.get(id)).filter(Boolean);}
 return bank.filter(q=>scope==='favorite'?state.cards[q.id]?.favorite:scope==='notes'?state.cards[q.id]?.note?.trim():scope==='review'?core.needsReview(state,q.id):core.isDue(state,q.id,now));
}
function take(list,count){
 if(count==='all')return list.slice();
 const n=Number(count);if(![10,20,50,100].includes(n))throw Error('无效的导出数量。');return list.slice(0,n);
}
const html=text=>String(text??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const line=text=>html(text).replace(/[\r\n]+/g,' ').replace(/([\\`*_[\]{}()#!|])/g,'\\$1');
function code(text,language='text'){
 const runs=String(text).match(/`+/g)||[],fence='`'.repeat(Math.max(3,...runs.map(s=>s.length+1)));
 return fence+language+'\n'+text+'\n'+fence;
}
function markdown(text){
 // Preserve source code exactly, while disabling raw HTML outside fenced code.
 let fence=null;return String(text??'').split('\n').map(row=>{
  const match=row.match(/^\s{0,3}(`{3,}|~{3,})/);
  if(match){const marker=match[1];if(!fence)fence=marker;else if(marker[0]===fence[0]&&marker.length>=fence.length&&/^\s*$/.test(row.slice(match[0].length)))fence=null;return row;}
  return fence?row:html(row);
 }).join('\n')+(fence?'\n'+fence:'');
}
function exportMarkdown(list,state,options={}){
 const {base,scope='filtered',total=list.length,reference=false,personal=false,now=Date.now(),context=''}=options;
 if(!Object.hasOwn(SCOPES,scope)||!list.length)throw Error('此范围暂无可导出的题目。');
 const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const out=['# C++ 面试复习题集','',`- 导出日期：${day}（北京时间）`,`- 题目范围：${SCOPES[scope]}`,`- 题目数量：${list.length} / ${total}`,`- 参考答案：${reference?'包含':'不包含'}`,`- 个人内容：${personal?'包含作答、草稿与笔记':'不包含'}`];
 if(context&&scope==='filtered')out.push('- 筛选条件：'+line(context));
 out.push('','本文件用于阅读和复习；恢复学习进度请使用练习台的 JSON 学习备份。','');
 for(const [i,q] of list.entries()){
  out.push('---','',`## ${i+1}. ${line(q.title)}`,'',`${line(q.module)} · ${line(q.type)}${q.sourceDate?' · '+line(q.sourceDate):''}`,'',`[打开这道题](${questionURL(base,q.id)})`,'','### 题目','',q.promptMarkdown?markdown(q.promptMarkdown):html(q.prompt||''),'');
  if(q.code)out.push(code(q.code,'cpp'),'');
  if(reference){
   out.push('### 参考答案','');
   if(q.answerMarkdown)out.push(markdown(q.answerMarkdown),'');
   else {
    for(const answer of q.answer||[])out.push('- '+html(answer));
    if(q.pitfalls?.length)out.push('','#### 易错点','',...q.pitfalls.map(p=>'- '+html(p)));
    if(q.follow)out.push('','#### 面试追问','',html(q.follow));
    out.push('');
   }
  }
  if(personal){
   const e=state.entries[q.id],note=state.cards[q.id]?.note;
   out.push('### 我的学习记录','');
   if(e?.submitted?.trim())out.push('#### 已保存作答','',code(e.submitted),'');
   if(e?.draft?.trim()&&e.draft!==e.submitted)out.push('#### 当前草稿（尚未保存为作答）','',code(e.draft),'');
   if(note?.trim())out.push('#### 个人笔记','',code(note),'');
   if(!e?.submitted?.trim()&&!e?.draft?.trim()&&!note?.trim())out.push('本题暂无个人记录。','');
  }
 }
 return out.join('\n');
}
return {SCOPES,questionURL,parseHash,select,take,exportMarkdown};
});
