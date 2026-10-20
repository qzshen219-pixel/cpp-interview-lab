(() => {
'use strict';
const app=window.PracticeApp,C=app.C,$=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel=at=>at?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(at):'升级前保存的版本';
const sourceLabels={practice:'逐题练习',exam:'自测作答',restore:'历史恢复',saved:'先前保存',draft:'恢复前草稿'};
let historyQuestion=null,weekly=null;
function renderHistory(){
 const id=historyQuestion;if(!id)return;
 const q=app.bank.find(q=>q.id===id),versions=C.answerVersions(app.state,id),selected=$('answer-version').value,current=app.state.entries[id],answer=current?.draft??current?.submitted??'';
 $('answer-history-question').textContent=q?.title||'';
 $('answer-version').innerHTML=versions.map(v=>`<option value="${esc(v.id)}">${esc(dateLabel(v.at))} · ${sourceLabels[v.source]||'已保存'}${v.answer===current?.submitted&&v.at===(current?.submittedAt||0)?' · 当前已保存':''}</option>`).join('');
 const target=versions.find(v=>v.id===selected)||versions.find(v=>v.answer!==answer)||versions[0];
 $('answer-history-empty').hidden=versions.length>0;$('answer-comparison').hidden=!versions.length;$('answer-version').disabled=!versions.length;
 if(!target){$('history-before').textContent='';$('history-after').textContent='';$('restore-answer').disabled=true;return;}
 $('answer-version').value=target.id;$('history-version-label').textContent=dateLabel(target.at);
 const comparison=C.diffAnswers(target.answer,answer);
 $('history-before').innerHTML=comparison.before.map(p=>p.changed?'<del>'+esc(p.text)+'</del>':esc(p.text)).join('');
 $('history-after').innerHTML=comparison.after.map(p=>p.changed?'<ins>'+esc(p.text)+'</ins>':esc(p.text)).join('');
 $('restore-answer').disabled=target.answer===answer&&target.answer===current?.submitted;
}
$('question').addEventListener('click',event=>{
 const button=event.target.closest('[data-answer-history]');if(!button)return;
 app.flush();historyQuestion=button.dataset.answerHistory;$('answer-version').innerHTML='';renderHistory();$('answer-history-dialog').showModal();
});
$('answer-version').addEventListener('change',renderHistory);
$('answer-history-close').addEventListener('click',()=>$('answer-history-dialog').close());
$('restore-answer').addEventListener('click',()=>{
 const id=historyQuestion,version=$('answer-version').value;if(!id||!version||app.activeAssessment())return;
 $('answer-history-dialog').close();app.confirm('恢复这个答案版本？','当前已保存作答和非空草稿会保留在历史中。恢复后可以重新对照参考答案自评。',()=>{
  try{C.restoreAnswer(app.state,id,version);app.render();app.notify('历史答案已恢复，原内容已保留在历史中。');}catch(error){app.notify(error.message);}
 });
});
function renderWeekly(){
 weekly=C.weekReport(app.bank,app.state,Number($('weekly-offset').value));const previous=C.weekReport(app.bank,app.state,Number($('weekly-offset').value)+1),o=weekly.objective,r=weekly.reviews;
 $('weekly-range').textContent=weekly.start+' — '+weekly.end+' · 周一至周日 · 北京时间';
 const delta=weekly.practiceCount-previous.practiceCount,max=Math.max(1,...weekly.days.map(d=>d.ids.length));
 const weak=weekly.modules.filter(m=>m.needsReview>0||m.objective>m.correct).sort((a,b)=>(b.needsReview+b.objective-b.correct)-(a.needsReview+a.objective-a.correct)).slice(0,2);
 $('weekly-report').innerHTML=`<div class="weekly-summary-grid"><section><span>练习题次</span><strong>${weekly.practiceCount}</strong><p>覆盖 ${weekly.unique} 道题 · 练习 ${weekly.activeDays} 天</p><small>较前一周 ${delta>=0?'+':''}${delta} 题次</small></section><section><span>客观题正确率</span><strong>${o.accuracy==null?'—':o.accuracy+'%'}</strong><p>答对 ${o.correct} / 已答 ${o.answered}</p><small>另有 ${o.missed} 题未答，未计入正确率</small></section><section><span>到期复习完成率</span><strong>${r.rate==null?'—':r.rate+'%'}</strong><p>完成 ${r.done} / ${r.total} 个任务</p><small>${r.pending} 个到期任务尚未完成</small></section></div><section class="weekly-section"><h3>每天，留下一点积累</h3><div class="weekly-bars" aria-label="本周每日练习题数">${weekly.days.map(d=>`<div aria-label="${d.day}，${d.ids.length} 道题"><strong>${d.ids.length}</strong><div class="week-bar-track"><span style="height:${Math.round(d.ids.length/max*100)}%"></span></div><span>${d.day.slice(5)}</span></div>`).join('')}</div><p class="muted">同一天同题只计一次；跨天复习会再次计入题次。</p></section><section class="weekly-section"><h3>文字表达自评</h3><div class="weekly-self"><span>需要复习 <strong>${weekly.self.review}</strong></span><span>基本掌握 <strong>${weekly.self.basic}</strong></span><span>熟练表达 <strong>${weekly.self.fluent}</strong></span></div><p class="muted">${weekly.selfTotal} 道题取本周最后一次自评，与客观题正确率分开统计。</p></section><section class="weekly-section"><h3>模块练习与成绩</h3><div class="weekly-table-wrap"><table><thead><tr><th>模块</th><th>练习题数</th><th>客观题答对 / 已答</th><th>表达自评题数</th></tr></thead><tbody>${weekly.modules.map(m=>`<tr><th scope="row">${esc(m.module)}</th><td>${m.practiced}</td><td>${m.correct} / ${m.objective}</td><td>${m.self}</td></tr>`).join('')}</tbody></table></div></section><p class="weekly-recommendation">${weak.length?'下一轮优先强化：'+weak.map(m=>esc(m.module)).join('、')+'。可从“需要强化”或“到期复习”进入。':'完成自测或文字自评后，这里会给出下一轮强化方向。'}</p><details class="weekly-method"><summary>统计口径与旧记录说明</summary><p>练习量沿用已有每日记录；客观成绩、自评和复习任务明细从 ${C.dayKey(weekly.trackedSince)} 起记录。旧记录没有日期明细的成绩不回填。</p><p>到期任务包括所选周到期及此前未完成任务；提前调整的任务不计入。未答题不会算作已完成复习。明细保留最近 90 天，最多 2000 条成绩和 1000 条已结束任务；筛选题库不会改变周报范围。</p></details>`;
}
$('weekly-open').addEventListener('click',()=>{app.flush();renderWeekly();$('weekly-dialog').showModal();});
$('weekly-close').addEventListener('click',()=>$('weekly-dialog').close());
$('weekly-offset').addEventListener('change',renderWeekly);
$('export-weekly').addEventListener('click',()=>{
 app.flush();renderWeekly();const blob=new Blob([C.reportMarkdown(weekly)],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='面试练习周报-'+weekly.start+'.md';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);app.notify('周报已生成，请保存下载文件。');
});
document.addEventListener('study:change',event=>{if(event.detail?.refreshHub===false)return;if($('answer-history-dialog').open)renderHistory();if($('weekly-dialog').open)renderWeekly();});
})();
