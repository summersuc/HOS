const CACHE_VERSION = 'v1.1'; // Update this to force cache refresh

self.addEventListener('install', (event) => {
    console.log(`[Service Worker] Installing ${CACHE_VERSION}...`);
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    return self.clients.claim();
});

self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push Received.');
    console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

    const title = 'suki Notification';
    const options = {
        body: event.data.text() || 'New message available',
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png'
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Focus first matching client
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if ('focus' in client) {
                    return client.focus();
                }
            }
            // If no clients open, open new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
