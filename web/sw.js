const CACHE='stella-v1';
const SHELL=['./index.html','./manifest.json','./icon.svg'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>
    Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch',e=>{
  const url=e.request.url;
  if(!url.startsWith('http'))return;
  // Non fare cache di API/feed esterni
  if(url.includes('api.')&&!url.includes('open-meteo'))return;
  if(url.includes('nominatim')||url.includes('rss2json')||url.includes('geocoding'))return;
  e.respondWith(
    caches.match(e.request).then(cached=>cached||fetch(e.request))
  );
});
