const PRECACHE = 'precache-v1';
const RUNTIME = 'runtime-imgs';
const MANIFEST = '/sitemap.xml';

self.addEventListener('install', evt => {
    self.skipWaiting();
    evt.waitUntil((async () => {
        const cache = await caches.open(PRECACHE);

        const xml = await fetch(MANIFEST).then(r => r.text());
        const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => (new URL(m[1])).pathname);

        urls.push('/offline.html', '/css/style.css', '/favicon.ico');

        const total = urls.length;
        let done = 0;

        for (const url of urls.slice()) {
            if (!url.endsWith('/')) continue;
            try {
                const html = await (await fetch(url)).text();
                const imgPaths = [...html.matchAll(/<img[^>]+src="(.*?)"/g)]
                    .map(m => new URL(m[1], url).pathname);
                for (const p of imgPaths) if (!urls.includes(p)) urls.push(p);
            } catch (_) {
                console.warn(`Could not fetch ${url} to find images`);
            }

            try {
                const resp = await fetch(url, { mode: 'no-cors' });
                await cache.put(url, resp);
            } catch (err) {
                console.warn(`⚠️  Could not cache ${url}`, err);
            }
            reportProgress(++done, total);
        }
        reportProgress(total, total);
    })());
});

self.addEventListener('activate', evt => {
    evt.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k.startsWith('precache-') && k !== PRECACHE)
                .map(k => caches.delete(k))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', evt => {
    const { request } = evt;
    if (request.method !== 'GET') return;

    if (request.destination === 'image') {
        evt.respondWith(cacheFirst(request, RUNTIME));
        return;
    }

    evt.respondWith(
        caches.match(request)
            .then(hit => hit || fetch(request))
            .catch(() => caches.match('/offline.html'))
    );
});

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(request);
    if (hit) return hit;
    const resp = await fetch(request, { mode: 'no-cors' });
    if (resp.ok) cache.put(request, resp.clone());
    return resp;
}

function reportProgress(done, total) {
    self.clients.matchAll({ includeUncontrolled: true }).then(clients =>
        clients.forEach(c => c.postMessage({ type: 'CACHE_PROGRESS', done, total }))
    );
}
