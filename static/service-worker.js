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
            try {
                const netResp = await fetch(event.request);
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, netResp.clone());
                return netResp;
            } catch (err) {
                console.error('Network request failed:', event.request.url, err);
                return caches.match(OFFLINE_URL);
            }
        })());
        return;
    }

    if (event.request.method === 'GET' && /\.(webp|avif|png|jpe?g|gif|svg)$/.test(url.pathname)) {
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(event.request);
            if (cached) return cached;
            try {
                const netResp = await fetch(event.request);
                if (netResp.ok) cache.put(event.request, netResp.clone());
                return netResp;
            } catch (err) {
                console.error('Failed to fetch image:', event.request.url, err);
                return new Response('Image not found', { status: 404 });
            }
        })());
        return;
    }

    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then(cached =>
                cached || fetch(event.request).catch(() => {
                    console.error('Fetch failed:', event.request.url);
                    return new Response('Not found', { status: 404 });
                })
            )
        );
    }
});
