const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),base='https://example.test/cpp-interview-lab/';
function worker(){
 let online=true,failedPath='';const listeners={},stores=new Map(),requests=[];
 const key=v=>typeof v==='string'?v:v.url;
 const fetcher=async value=>{
  const url=new URL(key(value));requests.push(url.href);if(!online||url.pathname.endsWith(failedPath||'__never__'))throw Error('offline');
  const rel=url.pathname.replace('/cpp-interview-lab/','')||'index.html',p=path.join(root,rel);
  if(!fs.existsSync(p)||!fs.statSync(p).isFile())return new Response('not found',{status:404});
  return new Response(fs.readFileSync(p),{status:200,headers:{'Content-Type':rel.endsWith('.html')?'text/html':'application/octet-stream'}});
 };
 const caches={keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),open:async name=>{
  if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);
  return {match:async request=>store.get(key(request))?.clone(),put:async(request,response)=>{store.set(key(request),response.clone());},addAll:async values=>{
   const loaded=await Promise.all(values.map(async request=>{const response=await fetcher(request);if(!response.ok)throw Error('asset missing');return [key(request),response];}));
   for(const [url,response] of loaded)store.set(url,response.clone());
  }};
 }};
 const self={registration:{scope:base},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(type,fn)=>listeners[type]=fn};
 vm.runInNewContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),{self,caches,fetch:fetcher,URL,Request,Response,Date,Set,Promise});
 async function event(type,props={}){const waits=[];listeners[type]({...props,waitUntil:p=>waits.push(p)});await Promise.all(waits);}
 async function message(type){let result;await event('message',{data:{type},ports:[{postMessage:r=>result=r}]});return result;}
 async function get(url,navigate=false){let response;listeners.fetch({request:{url,method:'GET',mode:navigate?'navigate':'same-origin'},respondWith:r=>response=r});return response?await response:null;}
 return {event,message,get,stores,requests,caches,offline:()=>online=false,online:()=>online=true,fail:path=>failedPath=path};
}
test('installation caches every referenced question and app asset before reporting offline readiness',async()=>{
 const w=worker();await w.event('install');const s=await w.message('STATUS');assert.equal(s.ready,true);assert.ok(s.count>=26);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of html.matchAll(/<script[^>]+src="([^"]+)"/g))assert.ok(w.requests.includes(new URL(m[1],base).href),m[1]);
});
test('offline navigation and question requests return cached content while unknown assets fail clearly',async()=>{
 const w=worker();await w.event('install');w.offline();const page=await w.get(base,true);assert.equal(page.status,200);assert.match(await page.text(),/learning-hub/);
 const question=await w.get(base+'daily-questions.js');assert.equal(question.status,200);assert.ok((await question.text()).length>1000000);
 const missing=await w.get(base+'missing-question-file.js');assert.equal(missing.status,503);assert.match(await missing.text(),/尚未缓存完整/);
 assert.equal(await w.get('https://other.example/private.js'),null);
});
test('failed refresh leaves a complete previous cache usable',async()=>{
 const w=worker();await w.event('install');w.fail('daily-questions.js');const result=await w.message('REFRESH');assert.equal(result.ready,false);assert.equal((await w.message('STATUS')).ready,true);w.offline();assert.equal((await w.get(base,true)).status,200);
});
test('activation only removes obsolete caches belonging to this app scope',async()=>{
 const w=worker();await w.event('install');await w.caches.open('cpp-interview-offline:/cpp-interview-lab/:old');await w.caches.open('cpp-interview-offline:/another-app/:old');await w.caches.open('unrelated-cache');await w.event('activate');
 const names=await w.caches.keys();assert.ok(!names.includes('cpp-interview-offline:/cpp-interview-lab/:old'));assert.ok(names.includes('cpp-interview-offline:/another-app/:old'));assert.ok(names.includes('unrelated-cache'));
});
test('incomplete cached asset sets never report ready',async()=>{
 const w=worker();await w.event('install');const store=[...w.stores.values()][0];store.delete(base+'daily-questions.js');assert.equal((await w.message('STATUS')).ready,false);
});
