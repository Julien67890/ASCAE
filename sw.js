const CACHE = 'ascae-ci-v53';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './logo.png'];
/* cache:'reload' / 'no-cache' : on contourne le cache HTTP du navigateur et de l'hébergeur
   (GitHub Pages garde les fichiers 10 minutes), sinon une ancienne version peut ressortir. */
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await Promise.all(ASSETS.map(u =>
      fetch(new Request(u, { cache: 'reload' })).then(r => { if (!r.ok) throw new Error(u); return c.put(u, r); })));
    /* Les fiches de contrôle : la liste d'abord, puis chaque fichier. Un échec ici n'empêche pas l'installation. */
    try {
      const r = await fetch(new Request('./fiches/index.json', { cache: 'reload' }));
      if (!r.ok) return;
      await c.put('./fiches/index.json', r.clone());
      const names = ((await r.json()).fiches || []).map(String).filter(n => /^[^\\/:*?"<>|\x00-\x1f]+\.json$/.test(n) && !n.startsWith('.'));
      await Promise.all(names.map(n => fetch(new Request('./fiches/' + encodeURIComponent(n), { cache: 'reload' }))
        .then(x => x.ok ? c.put('./fiches/' + encodeURIComponent(n), x) : null).catch(() => null)));
    } catch (err) { /* hors ligne ou liste absente : les fiches seront mises en cache à la première utilisation */ }
  }));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
// Réseau d'abord (mises à jour immédiates), cache en secours (hors connexion)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(new Request(e.request.url, { cache: 'no-cache' })).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); } return r; })
      .catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
