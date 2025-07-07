const CACHE_NAME = 'site-v1';

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        const res = await fetch(location.origin + '/sitemap.xml');
        if (!res.ok) throw new Error('Failed to fetch sitemap.xml, status ' + res.status);

        const xmlText = await res.text();
        const urls = [];
        const locRe = /<loc>([^<]+)<\/loc>/g;
        let match;
        while ((match = locRe.exec(xmlText)) !== null) {
            urls.push(match[1].trim().replace(/ /g, '%20'));
        }
        console.log(`Found ${urls.length} URLs in sitemap.xml`);

        const results = await Promise.allSettled(
            urls.map(u => cache.add(new Request(u, { mode: 'same-origin', credentials: 'include' })))
        );

        const failed = results
            .map((r, i) => r.status === 'rejected' ? urls[i] : null)
            .filter(Boolean);

        if (failed.length) {
            console.warn('Could not cache:', failed);
        } else {
            console.log(`Cached ${urls.length} pages`);
        }

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
                cached || fetch(event.request)
            )
        );
    }
});
