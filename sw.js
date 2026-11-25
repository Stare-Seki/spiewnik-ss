// Śpiewnik 1.6 — plik songs.json: sieć najpierw, kopia offline w razie braku internetu.
const CACHE='ss-pwa-v160-20261125';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon.svg','./songs.json','./logo-kregu.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(path=>new Request(path,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 const url=new URL(request.url);
 // Nagrania i żądania zakresów bajtów obsługuje bezpośrednio sieć.
 if(url.pathname.startsWith(new URL("./mp3/",self.registration.scope).pathname)||request.headers.has("range"))return;
 if(url.pathname.endsWith('/songs.json')){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   try{
    const response=await fetch(request,{cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status);
    // Aktualizujemy kopię offline wyłącznie dla poprawnego JSON z listą piosenek.
    const data=await response.clone().json();
    if(!data||!Array.isArray(data.piosenki)||!data.piosenki.length||!data.piosenki.every(s=>s&&typeof s.tytul==='string'&&Array.isArray(s.wersy)))throw Error('Błędne dane');
    await cache.put(request,response.clone());
    return response;
   }catch(error){const cached=await cache.match(request);if(cached)return cached;return Response.error();}
  })());
  return;
 }
 if(request.mode==='navigate'||url.pathname.endsWith('/index.html')){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   try{const response=await fetch(request,{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);await cache.put('./index.html',response.clone());return response;}
   catch(error){return (await cache.match('./index.html'))||Response.error();}
  })());return;
 }
 event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
});
