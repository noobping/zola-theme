const CACHE = `site-v1`;

self.addEventListener('install', event => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE);
            const xml = await fetch('/sitemap.xml').then(r => r.text());
            const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
                .map(m => new URL(m[1]).pathname.replace(/\/?$/, '/'));
            urls.push('/index.html', '/css/style.css', '/favicon.ico', '/sitemap.xml', '/404.html');
            await Promise.allSettled(
                urls.map(u => cache.add(new Request(u, { mode: 'same-origin' })))
            );
            self.skipWaiting();
        })()
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.event.request.method !== 'GET') return;
    event.respondWith(async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request).catch(() => caches.match('/404.html'));
        if (response.ok) cache.put(event.request, response.clone());
        return response;
    });
});
