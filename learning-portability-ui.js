(() => {
'use strict';
const app=window.PracticeApp,C=app.C,P=window.LearningPortability,$=id=>document.getElementById(id),byId=new Map(app.bank.map(q=>[q.id,q]));
let pending=null,handlingLink=false,shared=null;
function clearQuestionHash(){if(/^#q(?:=|&|$)/.test(location.hash))history.replaceState(null,'',location.pathname+location.search);}
function renderIncoming(){
 $('incoming-question-banner').hidden=!pending;$('incoming-question-open').disabled=Boolean(app.activeAssessment());
 $('incoming-question-title').textContent=pending?byId.get(pending).title:'';
 $('incoming-question-message').textContent=app.activeAssessment()?'请先完成或退出当前自测或项目面试，再打开这道题。':'现在可以打开这道题，你的作答和学习记录会保留。';
}
function openLinkedQuestion(id){
 handlingLink=true;try{app.flush();app.openQuestion(id);}finally{handlingLink=false;}pending=null;renderIncoming();
}
function receiveLink(){
 const link=P.parseHash(location.hash,app.bank);pending=null;
 if(link.kind==='invalid'){clearQuestionHash();app.notify('题目链接无效或题目已不存在，已保留当前练习位置。');}
 else if(link.kind==='question'){
  if(app.activeAssessment())pending=link.id;else openLinkedQuestion(link.id);
 }
 renderIncoming();
}
function syncQuestionHash(){
 if(handlingLink||pending||!/^#q(?:=|&|$)/.test(location.hash))return;
 if(app.state.mode==='practice'&&byId.has(app.state.current))history.replaceState(null,'',P.questionURL(location.href,app.state.current));else clearQuestionHash();
}
$('incoming-question-open').addEventListener('click',()=>{if(pending&&!app.activeAssessment())openLinkedQuestion(pending);});
$('incoming-question-dismiss').addEventListener('click',()=>{pending=null;clearQuestionHash();renderIncoming();});
window.addEventListener('hashchange',receiveLink);
$('question').addEventListener('click',event=>{
 const button=event.target.closest('[data-question-link]');if(!button||app.activeAssessment())return;
 const q=byId.get(button.dataset.questionLink);if(!q)return;app.flush();
 shared={title:q.title,url:P.questionURL(location.href,q.id)};
 $('question-link-name').textContent=q.title;$('question-link-url').value=shared.url;$('question-link-status').textContent='';
 $('share-question-link').hidden=typeof navigator.share!=='function';$('question-link-dialog').showModal();
});
$('question-link-close').addEventListener('click',()=>$('question-link-dialog').close());
$('copy-question-link').addEventListener('click',async()=>{
 const value=shared?.url;if(!value)return;
 try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(value);$('question-link-status').textContent='链接已复制，可发送到手机或分享给朋友。';}
 catch{$('question-link-url').focus();$('question-link-url').select();$('question-link-status').textContent='自动复制不可用，链接已选中，请长按或使用 Ctrl / Command + C 复制。';}
});
$('share-question-link').addEventListener('click',async()=>{
 if(!shared||typeof navigator.share!=='function')return;const data={...shared};
 try{await navigator.share(data);$('question-link-status').textContent='已交给系统分享。';}
 catch(error){$('question-link-status').textContent=error.name==='AbortError'?'已取消分享。':'系统分享未成功，可以复制上面的链接。';}
});
function context(){
 const s=app.state,t=window.LearningPaths.TOPICS.find(t=>t.id===s.topic),stage=window.LearningPaths.stage(s.routeActive);
 const status={all:'全部状态',pending:'未作答',answered:'已作答',review:'需要强化',due:'到期复习',plan:'今日计划',favorite:'我的收藏',notes:'有笔记',calendar:'复习日历'};
 return [stage&&stage.route.label+' / '+stage.label,s.module,s.type,s.project+'项目',s.source+'来源',t?.label,status[s.status],s.query&&'已应用关键词筛选'].filter(Boolean).join(' · ');
}
function selection(){
 const list=P.select(app.bank,app.state,$('study-export-scope').value,app.filtered(),C);
 return {list,chosen:P.take(list,$('study-export-count').value)};
}
function preview(){
 const {list,chosen}=selection(),node=$('study-export-preview');node.replaceChildren();
 const strong=document.createElement('strong');strong.textContent=list.length?'此范围共 '+list.length+' 题，本次导出 '+chosen.length+' 题':'此范围暂无题目';node.append(strong);
 const info=document.createElement('p');info.textContent=list.length?(chosen.length<list.length?'按当前顺序选择前 '+chosen.length+' 题，可调整导出数量。':'将导出此范围全部题目。'):'可切换范围，或先收藏题目、记录笔记。';node.append(info);
 if(chosen.length){const ol=document.createElement('ol');chosen.slice(0,3).forEach(q=>{const li=document.createElement('li');li.textContent=q.title;ol.append(li);});node.append(ol);}
 $('study-export-download').disabled=!chosen.length||Boolean(app.activeAssessment());
}
$('study-export-open').addEventListener('click',()=>{
 if(app.activeAssessment()){app.notify('请先完成或退出当前自测或项目面试，再导出题集。');return;}
 app.flushSearch();app.flush();$('study-export-scope').value='filtered';$('study-export-count').value='20';
 $('study-export-reference').checked=false;$('study-export-personal').checked=false;$('study-export-status').textContent='';preview();$('study-export-dialog').showModal();
});
$('study-export-close').addEventListener('click',()=>$('study-export-dialog').close());
for(const id of ['study-export-scope','study-export-count','study-export-reference','study-export-personal'])$(id).addEventListener('change',()=>{preview();$('study-export-status').textContent='';});
$('study-export-download').addEventListener('click',()=>{
 try{
  if(app.activeAssessment())throw Error('请先结束当前自测或项目面试。');app.flush();const {list,chosen}=selection();
  const text=P.exportMarkdown(chosen,app.state,{base:location.href,scope:$('study-export-scope').value,total:list.length,reference:$('study-export-reference').checked,personal:$('study-export-personal').checked,context:context()});
  const blob=new Blob([text],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download='cpp-interview-'+$('study-export-scope').value+'-'+C.dayKey(Date.now())+'.md';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('study-export-status').textContent='已生成 '+chosen.length+' 道题的文件，请在浏览器下载或文件应用中查看。';
 }catch(error){$('study-export-status').textContent=error.message;}
});
document.addEventListener('study:change',event=>{
 if(event.detail?.refreshHub===false)return;
 renderIncoming();syncQuestionHash();$('study-export-open').disabled=Boolean(app.activeAssessment());
 if($('study-export-dialog').open)preview();
});
receiveLink();$('study-export-open').disabled=Boolean(app.activeAssessment());
})();
