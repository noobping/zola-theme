const CACHE_NAME = 'site-v1';

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        let urls = ['/', '/index.html', '/css/styles.css', '/service-worker.js', '/js/share.js'];

        try {
            const res = await fetch('/sitemap.xml', { mode: 'same-origin' });
            if (!res.ok) throw new Error('status ' + res.status);
            const xml = await res.text();
            const locRe = /<loc>([^<]+)<\/loc>/g;
            urls = [];
            let m;
            while ((m = locRe.exec(xml))) urls.push(m[1].trim());
            console.log(`Caching ${urls.length} pages from sitemap`);
        } catch (err) {
            console.warn('Could not fetch sitemap, using default assets:', err);
        }

        await Promise.allSettled(
            urls.map(u => cache.add(new Request(u, { mode: 'same-origin' })))
        );
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.mode === 'navigate') {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse) return cachedResponse;
            try {
                const networkResponse = await fetch(event.request);
                if (networkResponse.ok) {
                    cache.put(event.request, networkResponse.clone());
                }
                return networkResponse;
            } catch (err) {
                console.error('Fetch failed; returning offline page instead.', err);
                return caches.match('/index.html');
            }
        })());
        return;
    }

    if (event.request.method === 'GET' && /\.(webp|avif|png|jpe?g|gif|svg)$/.test(url.pathname)) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            const cachedImage = await cache.match(event.request);
            if (cachedImage) return cachedImage;
            try {
                const resp = await fetch(event.request);
                if (resp.ok) {
                    cache.put(event.request, resp.clone());
                }
                return resp;
            } catch {
                return new Response('Image not found', { status: 404 });
            }
        })());
        return;
    }

    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request)
                .then(cached => cached || fetch(event.request))
                .catch(() => new Response('Not found', { status: 404 }))
        );
    }
});
