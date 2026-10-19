'use strict';
const VERSION='20261019.1';
const BASE=self.registration.scope;
const PREFIX='cpp-interview-offline:'+new URL(BASE).pathname+':';
const CACHE=PREFIX+VERSION;
const INDEX=new URL('index.html',BASE).href;
const META=new URL('__offline_ready__',BASE).href;
const bundled=/\/(?:app|learning-core|learning-ui)\.js$|\/(?:styles|ui|learning)\.css$/;
function allowed(url){const u=new URL(url,BASE),base=new URL(BASE);return u.origin===base.origin&&u.pathname.startsWith(base.pathname)&&!u.username&&!u.password;}
async function refresh(){
 const response=await fetch(INDEX,{cache:'reload'});if(!response.ok)throw Error('题库页面下载失败');
 const html=await response.text();if(!html.includes('id="question"'))throw Error('题库页面内容无效');
 const urls=new Set([BASE,INDEX,new URL('manifest.webmanifest',BASE).href,new URL('icon-192.png',BASE).href,new URL('icon-512.png',BASE).href,new URL('icon.svg',BASE).href]);
 for(const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
  if(match[1].startsWith('#')||match[1].startsWith('data:'))continue;
  const u=new URL(match[1],BASE);if(allowed(u.href)&&/\.(?:js|css|png|svg|ico|webmanifest)$/.test(u.pathname))urls.add(u.href);
 }
 const assets=[...urls],cache=await caches.open(CACHE);
 await cache.addAll(assets.map(url=>new Request(url,{cache:'reload'})));
 const meta={ready:true,at:Date.now(),count:assets.length,assets};
 await cache.put(META,new Response(JSON.stringify(meta),{headers:{'Content-Type':'application/json'}}));
 return {ready:true,at:meta.at,count:meta.count};
}
async function status(){
 const cache=await caches.open(CACHE),response=await cache.match(META);if(!response)return {ready:false};
 const meta=await response.json();const found=await Promise.all(meta.assets.map(url=>cache.match(url)));
 return {ready:found.every(Boolean),at:meta.at,count:meta.count};
}
self.addEventListener('install',event=>event.waitUntil(refresh()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
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
  const cache=await caches.open(CACHE),cached=await cache.match(request);
  if(request.mode!=='navigate'&&cached&&bundled.test(url.pathname)&&url.search)return cached;
  try{
   const response=await fetch(request);
   if(response.ok){try{await cache.put(request,response.clone());}catch{}return response;}
   if(cached)return cached;
   if(request.mode==='navigate'){const page=await cache.match(INDEX);if(page)return page;}
   return response;
  }catch{
   if(cached)return cached;
   if(request.mode==='navigate'){const page=await cache.match(INDEX);if(page)return page;}
   return new Response('离线题库尚未缓存完整，请联网打开练习台后重试。',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
  }
 })());
});
