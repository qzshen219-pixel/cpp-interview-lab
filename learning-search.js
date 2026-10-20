(function(root){
'use strict';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold=s=>String(s??'').normalize('NFKC').toLowerCase();
const terms=q=>[...new Set(fold(q).trim().split(/\s+/).filter(Boolean))];
function createIndex(bank){return new Map(bank.map(q=>{
 const fields={question:[q.title,q.module,q.prompt,q.promptMarkdown,q.code,q.sourceRoundTitle,q.project].filter(Boolean).join('\n'),reference:[q.answerMarkdown,...(q.answer||[]),...(q.pitfalls||[]),q.follow].filter(Boolean).join('\n')};
 return [q.id,{fields,folded:{question:fold(fields.question),reference:fold(fields.reference)}}];
}));}
function match(entry,state,id,words,scope='all'){
 if(!words.length)return true;
 const parts=[];if(scope==='all'||scope==='question')parts.push(entry.folded.question);if(scope==='all'||scope==='reference')parts.push(entry.folded.reference);
 if(scope==='all'||scope==='personal')parts.push(fold([state.entries[id]?.draft,state.entries[id]?.submitted,state.cards[id]?.note].filter(Boolean).join('\n')));
 const haystack=parts.join('\n');return words.every(w=>haystack.includes(w));
}
function ranges(value,words){
 const input=String(value),map=[],chars=[];let offset=0;
 for(const character of input.match(/[^\p{M}]\p{M}*|\p{M}+/gu)||[]){const normalized=fold(character);chars.push(normalized);for(let i=0;i<normalized.length;i++)map.push([offset,offset+character.length]);offset+=character.length;}
 const haystack=chars.join(''),found=[];
 for(const word of words){let at=0;while(word&&(at=haystack.indexOf(word,at))!==-1){found.push([map[at][0],map[at+word.length-1][1]]);at+=word.length;}}
 found.sort((a,b)=>a[0]-b[0]);const joined=[];for(const range of found){const last=joined.at(-1);if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else joined.push(range);}return joined;
}
function highlight(value,query){
 const input=String(value??''),matches=ranges(input,terms(query));let out='',at=0;
 for(const [start,end] of matches){out+=escape(input.slice(at,start))+'<mark>'+escape(input.slice(start,end))+'</mark>';at=end;}return out+escape(input.slice(at));
}
function snippet(entry,state,id,query,scope='all'){
 const words=terms(query);if(!words.length)return null;
 const fields=[];if(scope==='all'||scope==='question')fields.push(['题目',entry.fields.question]);if(scope==='all'||scope==='reference')fields.push(['参考答案',entry.fields.reference]);
 if(scope==='all'||scope==='personal')fields.push(['我的作答与笔记',[state.entries[id]?.draft,state.entries[id]?.submitted,state.cards[id]?.note].filter(Boolean).join('\n')]);
 const ranked=fields.map(([label,value])=>({label,value,score:words.filter(w=>fold(value).includes(w)).length})).sort((a,b)=>b.score-a.score),best=ranked[0];if(!best?.score)return null;
 const first=ranges(best.value,words)[0]?.[0]||0,start=Math.max(0,first-30),end=Math.min(best.value.length,start+145);
 return {label:best.label,html:highlight((start?'…':'')+best.value.slice(start,end)+(end<best.value.length?'…':''),query)};
}
function highlightElement(element,query){
 const words=terms(query);if(!element||!words.length)return;
 const doc=element.ownerDocument,walker=doc.createTreeWalker(element,4),nodes=[];let node;
 while((node=walker.nextNode()))if(!node.parentElement.closest('textarea,input,script,style,mark,[data-no-highlight]')&&ranges(node.nodeValue,words).length)nodes.push(node);
 for(const original of nodes){const fragment=doc.createDocumentFragment();let at=0;for(const [start,end] of ranges(original.nodeValue,words)){fragment.append(doc.createTextNode(original.nodeValue.slice(at,start)));const mark=doc.createElement('mark');mark.textContent=original.nodeValue.slice(start,end);fragment.append(mark);at=end;}fragment.append(doc.createTextNode(original.nodeValue.slice(at)));original.replaceWith(fragment);}
}
const api={fold,terms,createIndex,match,highlight,snippet,highlightElement};if(typeof module==='object'&&module.exports)module.exports=api;else root.LearningSearch=api;
})(typeof window==='object'?window:globalThis);
