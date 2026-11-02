(() => {
'use strict';
const app=window.PracticeApp,$=id=>document.getElementById(id),dialog=$('practice-navigation-dialog'),number=$('practice-position');
let moving=false;
const available=()=>app.state.mode==='practice'&&!app.activeAssessment();
function preview(){
 const list=app.filtered(),raw=number.value,n=Number(raw),valid=/^\d+$/.test(raw)&&Number.isSafeInteger(n)&&n>=1&&n<=list.length;
 number.max=String(list.length);number.setAttribute('aria-invalid',String(!valid));
 $('practice-range').textContent=`当前筛选范围共 ${list.length} 题，按列表序号跳转；筛选条件与顺序保持不变。`;
 $('practice-jump-go').disabled=!valid||!available();$('practice-random').disabled=list.length<2||!available();
 $('practice-jump-preview').textContent=valid?`${n} / ${list.length} · ${list[n-1].module} · ${list[n-1].title}`:'';
 $('practice-jump-error').textContent=valid?'':list.length?`请输入 1 到 ${list.length} 之间的整数。`:'当前范围没有可练习的题目，请先调整筛选。';
 return valid?list[n-1]:null;
}
function openNavigation(){
 if(!available())return;
 app.flushSearch();app.flush();if(!available())return;
 const list=app.filtered();if(!list.length){app.notify('当前范围没有题目，请先调整筛选。');return;}
 moving=false;
 number.value=String(Math.max(0,list.findIndex(q=>q.id===app.state.current))+1);preview();
 dialog.showModal();number.focus();number.select();
}
function go(id){
 if(!available())return;
 if(!app.navigatePractice(id)){preview();$('practice-jump-error').textContent='题目范围已变化，请重新选择。';return;}
 moving=true;dialog.close();$('question').scrollIntoView?.({block:'start',behavior:'auto'});$('question').focus({preventScroll:true});
}
$('question').addEventListener('click',event=>{if(event.target.closest('[data-practice-jump]'))openNavigation();});
$('practice-navigation-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{
 const navigated=moving;moving=false;
 if(!navigated&&available())$('question').querySelector('[data-practice-jump]')?.focus({preventScroll:true});
});
number.addEventListener('input',preview);
$('practice-jump-form').addEventListener('submit',event=>{
 event.preventDefault();if(!available())return;app.flushSearch();app.flush();const q=preview();if(q)go(q.id);
});
$('practice-random').addEventListener('click',()=>{
 if(!available())return;app.flushSearch();app.flush();
 const list=app.filtered().filter(q=>q.id!==app.state.current);
 if(!list.length){preview();return;}
 go(list[Math.floor(Math.random()*list.length)].id);
});
document.addEventListener('study:change',event=>{
 if(event.detail?.refreshHub===false||!dialog.open)return;
 if(!available())dialog.close();else preview();
});
document.addEventListener('keydown',event=>{
 if(event.defaultPrevented||event.repeat||event.isComposing||event.keyCode===229||!available()||document.querySelector('dialog[open]'))return;
 const target=event.target;
 if((event.ctrlKey||event.metaKey)&&!event.altKey&&!event.shiftKey&&event.key==='Enter'&&target.id==='draft'){
  event.preventDefault();$('save-answer')?.click();return;
 }
 if(!event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.getModifierState?.('AltGraph')||target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')||document.querySelector('.utility-menu[open],.device-menu[open]'))return;
 const key=event.key.toLowerCase();if(!['g','n','p'].includes(key))return;event.preventDefault();
 if(key==='g')openNavigation();
 else if(app.movePractice(key==='n'?1:-1)){$('question').scrollIntoView?.({block:'start',behavior:'auto'});$('question').focus({preventScroll:true});}
 else app.notify(key==='n'?'已经是当前范围的最后一题。':'已经是当前范围的第一题。');
});
})();
