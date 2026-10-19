(() => {
'use strict';
const app=window.PracticeApp;if(!app)return;
const C=app.C,$=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let importGeneration=0,pendingImport=null,registration=null,installPrompt=null,reloadForUpdate=false,offlineReady=false,lastHubDay='';
const timeLabel=n=>n?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(n):'尚未导出';
function renderHub(){
 const state=app.state,now=Date.now(),day=C.dayKey(now),plan=state.dailyPlan,activity=new Set(state.activity[day]?.ids||[]);
 const done=plan.ids.filter(id=>activity.has(id)).length,due=app.bank.filter(q=>C.isDue(state,q.id,now)).length;
 const favorite=Object.values(state.cards).filter(c=>c.favorite).length,notes=Object.values(state.cards).filter(c=>c.note.trim()).length;
 $('hub-date').textContent=day+' · 北京时间';$('today-completed').textContent=done;$('today-total').textContent=plan.ids.length;
 $('daily-progress').max=Math.max(1,plan.ids.length);$('daily-progress').value=done;
 $('daily-message').textContent=!plan.ids.length?'今天暂无新的待练题，可进入题库自由练习。':done===plan.ids.length?'今日计划已完成，下一次复习已为你安排。':'新题、到期复习与薄弱知识点，组成今天的一小步。';
 $('daily-start').textContent=done===plan.ids.length&&plan.ids.length?'回顾今日练习':'开始今日练习';$('daily-start').disabled=!plan.ids.length;
 $('due-total').textContent=due;$('favorite-total').textContent=favorite;$('notes-total').textContent=notes;
 $('all-today-count').textContent=activity.size;
 const calendars=Array.from({length:7},(_,i)=>{const date=C.addDays(day,i);const count=app.bank.filter(q=>C.inReviewDay(state,q.id,date,now)).length;return {date,count,i};});
 $('review-calendar').innerHTML=calendars.map(({date,count,i})=>`<button class="calendar-day ${i===0?'is-today':''}" data-calendar="${date}" aria-label="${date}，${count} 道${i===0?'已到期':'计划复习'}题"><span>${i===0?'今天':new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',weekday:'short'}).format(Date.parse(date+'T12:00:00+08:00'))}</span><strong>${date.slice(8)}</strong><span>${count} 题</span></button>`).join('');
 const stats=C.mastery(app.bank,state);
 $('mastery-list').innerHTML=stats.map(m=>`<div class="mastery-item"><div><strong>${esc(m.module)}</strong><span>${m.score==null?'尚未自评':m.score+'% 掌握度'} · 已答 ${m.completed}/${m.total}</span></div><progress max="100" value="${m.score||0}" aria-label="${esc(m.module)}掌握度"></progress></div>`).join('');
 const weak=stats.filter(m=>m.rated>0).sort((a,b)=>a.score-b.score).slice(0,2);
 $('weak-focus').textContent=weak.length?'下一轮可强化：'+weak.map(m=>m.module).join('、'):'完成作答并自评后，这里会给出下一轮强化方向。';
 if(document.activeElement!==$('daily-target'))$('daily-target').value=state.settings.dailyTarget;
 if(document.activeElement!==$('daily-project'))$('daily-project').value=state.settings.dailyProject;
 $('backup-last').textContent='最近导出：'+timeLabel(state.lastBackupAt);
 $('backup-status').textContent=app.storageOK?'答案、草稿、收藏、笔记和计划已自动保存在此设备。':'本机自动保存未成功，请导出备份后再离开页面。';
 $('hub-due-caption').textContent=due?'包含此前尚未完成的到期复习':'目前没有到期题，先完成今天的新题';
 lastHubDay=day;
}
document.addEventListener('study:change',renderHub);
$('learning-hub').addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.scope){app.openScope(button.dataset.scope);return;}
 if(button.dataset.calendar){app.openScope('calendar',button.dataset.calendar);return;}
 if(button.id==='apply-daily-plan'){
  try{app.updatePlan(Number($('daily-target').value),$('daily-project').value);app.notify('今日计划已更新，已完成的匹配题目会保留。');}catch(error){app.notify(error.message);}
 }
});
$('backup-open').addEventListener('click',()=>{renderHub();$('backup-dialog').showModal();});
for(const id of ['backup-close','install-close'])$(id).addEventListener('click',()=>$(id==='backup-close'?'backup-dialog':'install-dialog').close());
$('export-learning').addEventListener('click',()=>{
 try{
  const now=Date.now();app.state.lastBackupAt=now;app.persist();const blob=new Blob([C.backup(app.state,now)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='面试练习台-学习备份-'+C.dayKey(now)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);app.notify('已生成学习备份，请保存下载的 JSON 文件。');
 }catch{app.notify('备份下载未能开始，请更换浏览器后重试。');}
});
$('import-learning').addEventListener('change',async event=>{
 const generation=++importGeneration,file=event.target.files?.[0];pendingImport=null;$('confirm-import').disabled=true;$('import-preview').textContent='';if(!file)return;
 if(app.activeAssessment()){$('import-preview').textContent='请先完成或退出当前自测或项目面试，再导入备份。';event.target.value='';return;}
 try{
  if(file.size>12*1024*1024)throw Error('请选择 12 MB 以内的 JSON 备份文件。');
  const content=typeof file.text==='function'?await file.text():await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsText(file);});
  if(generation!==importGeneration)return;pendingImport=C.parseBackup(content,app.bank);
  $('import-preview').textContent=`备份中有 ${pendingImport.answers} 条作答、${pendingImport.notes} 条笔记和 ${pendingImport.favorites} 道收藏题。确认后合并到本机，已有记录优先保留较新的版本。${pendingImport.unknown?'有 '+pendingImport.unknown+' 道题暂未在当前题库中找到，将忽略这些条目。':''}`;
  $('confirm-import').disabled=false;
 }catch(error){if(generation!==importGeneration)return;$('import-preview').textContent=error.message||'无法读取该文件，请检查备份。';}
 event.target.value='';
});
$('confirm-import').addEventListener('click',()=>{
 if(!pendingImport)return;
 try{app.mergeImport(pendingImport.state);pendingImport=null;$('confirm-import').disabled=true;$('import-preview').textContent='备份已合并，学习记录已更新。';app.notify('学习备份已合并。');}catch(error){$('import-preview').textContent=error.message;}
});
function offlineLabel(message,ready=false){offlineReady=ready;$('offline-status').textContent=message;$('offline-status').classList.toggle('offline-ready',ready);}
function askWorker(type,timeout=12000){
 return new Promise((resolve,reject)=>{
  const worker=registration?.active||navigator.serviceWorker?.controller;if(!worker){reject(Error('离线组件尚未就绪'));return;}
  const channel=new MessageChannel(),timer=setTimeout(()=>reject(Error('离线状态查询超时')),timeout);
  channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data);};worker.postMessage({type},[channel.port2]);
 });
}
async function readOfflineStatus(){
 try{const status=await askWorker('STATUS');if(status.ready)offlineLabel(navigator.onLine===false?'离线可用 · 已缓存题库':'离线题库已就绪',true);else offlineLabel('离线题库尚未缓存完整');}catch{offlineLabel(navigator.onLine===false?'当前离线，等待已缓存题库':'正在准备离线题库…');}
}
function showUpdate(){if(registration?.waiting){$('apply-update').hidden=false;$('apply-update').textContent='更新到新版本';}}
async function registerOffline(){
 if(!('serviceWorker' in navigator)||!window.isSecureContext){offlineLabel('此浏览器暂不支持离线缓存');$('refresh-offline').disabled=true;return;}
 try{
  registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});showUpdate();
  registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'){showUpdate();if(!registration.waiting)readOfflineStatus();}if(worker.state==='redundant')offlineLabel('离线缓存未完成，可点击重新缓存');});});
  navigator.serviceWorker.ready.then(()=>readOfflineStatus());
  if(registration.active)readOfflineStatus();
 }catch{offlineLabel('离线缓存未能启用，可稍后重试');}
}
$('refresh-offline').addEventListener('click',async()=>{
 if(navigator.onLine===false){app.notify('当前离线，可继续练习。联网后再更新离线题库。');return;}
 const button=$('refresh-offline'),wasReady=offlineReady;button.disabled=true;offlineLabel('正在重新缓存题库…',wasReady);
 try{if(!registration)await registerOffline();const result=await askWorker('REFRESH',90000);if(!result.ready)throw Error(result.error||'下载未完成');offlineLabel('离线题库已更新',true);app.notify('题库缓存已更新，断网后仍可练习。');}
 catch{offlineLabel(wasReady?'更新未完成，仍可使用原有离线题库':'离线题库尚未完整缓存，请联网后重试',wasReady);app.notify('离线题库更新未完成，请在网络稳定时重试。');}
 finally{button.disabled=false;}
});
$('apply-update').addEventListener('click',()=>{
 if(app.activeAssessment()){app.notify('先结束当前自测或项目面试，再更新页面。');return;}
 if(registration?.waiting){app.persist();reloadForUpdate=true;registration.waiting.postMessage({type:'SKIP_WAITING'});}
});
navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(reloadForUpdate)location.reload();else readOfflineStatus();});
window.addEventListener('online',()=>{readOfflineStatus();app.notify('网络已恢复，学习记录仍保存在本机。');});
window.addEventListener('offline',()=>offlineLabel(offlineReady?'离线可用 · 已缓存题库':'当前离线，请保持此页面打开',offlineReady));
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('install-app').textContent='安装练习台';});
window.addEventListener('appinstalled',()=>{installPrompt=null;$('install-app').textContent='已添加到桌面';});
$('install-app').addEventListener('click',async()=>{
 if(installPrompt){const prompt=installPrompt;installPrompt=null;try{await prompt.prompt();await prompt.userChoice;}catch{$('install-dialog').showModal();}}
 else $('install-dialog').showModal();
});
setInterval(()=>{const day=C.dayKey();if(day!==lastHubDay){C.ensurePlan(app.bank,app.state);app.persist();}else renderHub();},60000);
renderHub();registerOffline();
})();
