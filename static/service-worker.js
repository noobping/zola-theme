const CACHE = `site-v1`;

self.addEventListener('install', event => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE);
            const xml = await fetch('/sitemap.xml').then(r => r.text());
            const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
                .map(m => new URL(m[1]).pathname.replace(/\/?$/, '/'));
            urls.push('/index.html', '/css/style.css', '/favicon.ico');
            await cache.addAll(urls);
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
    if (event.request.method !== 'GET') { return; }
    event.respondWith(
        caches.match(event.request)
            .then(res => res || fetch(event.request))
            .catch(() => caches.match('/index.html'))
    );
});
