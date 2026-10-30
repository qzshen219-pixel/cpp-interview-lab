'use strict';
const VERSION='20261030.1';
const BASE=self.registration.scope;
const PREFIX='cpp-interview-offline:'+new URL(BASE).pathname+':';
const CACHE=PREFIX+VERSION;
const INDEX=new URL('index.html',BASE).href;
const META=new URL('__offline_ready__',BASE).href;
let refreshJob=null;
function allowed(url){const u=new URL(url,BASE),base=new URL(BASE);return u.origin===base.origin&&u.pathname.startsWith(base.pathname)&&!u.username&&!u.password;}
async function download(request,timeout=12000){
 const controller=new AbortController();let timer;
 try{
  return await Promise.race([
   (async()=>{
    const response=await fetch(request,{cache:'reload',signal:controller.signal});
    if(!response.ok)throw Error('资源下载失败：'+response.status);
    // Buffer the body within the timeout, so a stalled body cannot block the update.
    const body=await response.arrayBuffer();
    return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
   })(),
   new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('网络请求超时'));},timeout);})
  ]);
 }finally{clearTimeout(timer);}
}
async function metadata(){
 const control=await caches.open(CACHE),response=await control.match(META);
 if(!response)return null;
 try{const meta=await response.json();return typeof meta.cacheName==='string'&&meta.cacheName.startsWith(CACHE+':snapshot:')&&Array.isArray(meta.assets)?meta:null;}catch{return null;}
}
async function clean(meta,allVersions=false){
 const keep=new Set([CACHE,meta?.cacheName,meta?.previous]);
 for(const name of await caches.keys())if(name.startsWith(allVersions?PREFIX:CACHE+':snapshot:')&&!keep.has(name))await caches.delete(name);
}
async function createSnapshot(){
 const old=await metadata(),name=CACHE+':snapshot:'+Date.now()+'-'+Math.random().toString(36).slice(2);
 try{
  const response=await download(INDEX),html=await response.clone().text();
  if(!html.includes('id="question"'))throw Error('题库页面内容无效');
  const urls=new Set([BASE,INDEX,new URL('manifest.webmanifest',BASE).href,new URL('icon-192.png',BASE).href,new URL('icon-512.png',BASE).href,new URL('icon.svg',BASE).href]);
  for(const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
   if(match[1].startsWith('#')||match[1].startsWith('data:'))continue;
   const u=new URL(match[1],BASE);if(allowed(u.href)&&/\.(?:js|css|png|svg|ico|webmanifest)$/.test(u.pathname))urls.add(u.href);
  }
  const cache=await caches.open(name),assets=[...urls];
  // Both entry URLs use this exact HTML. Never refetch the page while building
  // its assets, because another deployment could otherwise mix two releases.
  await cache.put(BASE,response.clone());await cache.put(INDEX,response.clone());
  const results=await Promise.allSettled(assets.filter(url=>url!==BASE&&url!==INDEX).map(async url=>{
   await cache.put(url,await download(url));
  }));
  const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;
  const complete=await Promise.all(assets.map(url=>cache.match(url)));if(!complete.every(Boolean))throw Error('离线缓存不完整');
  const meta={ready:true,at:Date.now(),count:assets.length,assets,cacheName:name,previous:old?.cacheName||null};
  const control=await caches.open(CACHE);
  // This single pointer write commits a complete snapshot. Failure before here
  // leaves the old page, scripts and readiness information untouched.
  await control.put(META,new Response(JSON.stringify(meta),{headers:{'Content-Type':'application/json'}}));
  try{await clean(meta);}catch{}
  return {ready:true,at:meta.at,count:meta.count};
 }catch(error){await caches.delete(name);throw error;}
}
function refresh(){
 if(!refreshJob)refreshJob=createSnapshot().finally(()=>{refreshJob=null;});
 return refreshJob;
}
async function status(){
 const meta=await metadata();if(!meta)return {ready:false};
 const cache=await caches.open(meta.cacheName),found=await Promise.all(meta.assets.map(url=>cache.match(url)));
 return {ready:found.every(Boolean),at:meta.at,count:meta.count};
}
self.addEventListener('install',event=>event.waitUntil(refresh()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 await clean(await metadata(),true);await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 const type=event.data?.type;
 if(type==='SKIP_WAITING'){event.waitUntil(self.skipWaiting());return;}
 if(!['STATUS','REFRESH'].includes(type))return;
 event.waitUntil((async()=>{
  let result;try{result=type==='REFRESH'?await refresh():await status();}catch(error){result={ready:false,error:error.message};}
  event.ports?.[0]?.postMessage(result);
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||!allowed(url.href)||url.pathname.endsWith('/sw.js'))return;
 if(request.mode!=='navigate'&&!/\.(?:js|css|png|svg|ico|webmanifest)$/.test(url.pathname))return;
 event.respondWith((async()=>{
  const meta=await metadata();
  if(meta){
   const cache=await caches.open(meta.cacheName),cached=await cache.match(request.mode==='navigate'?INDEX:request);
   if(cached)return cached;
  }
  // Unknown URLs have a bounded network fallback and never mutate the committed
  // snapshot. New HTML is published only together with all of its resources.
  try{return await download(request,4000);}catch{
   return new Response('离线题库尚未缓存完整，请联网打开练习台后重试。',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
  }
 })());
});

