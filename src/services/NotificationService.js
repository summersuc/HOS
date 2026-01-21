/**
 * HOS Notification Service
 * Provides push notification functionality for PWA
 */

const NotificationService = {
    /**
     * Check if notifications are supported
     */
    isSupported() {
        return 'Notification' in window;
    },

    /**
     * Get current permission status
     * @returns {'granted' | 'denied' | 'default'}
     */
    getPermission() {
        if (!this.isSupported()) return 'denied';
        return Notification.permission;
    },

    /**
     * Request notification permission
     * @returns {Promise<'granted' | 'denied' | 'default'>}
     */
    async requestPermission() {
        if (!this.isSupported()) {
            console.warn('Notifications not supported on this device');
            return 'denied';
        }

        try {
            const permission = await Notification.requestPermission();
            console.log('Notification permission:', permission);
            return permission;
        } catch (error) {
            console.error('Failed to request notification permission:', error);
            return 'denied';
        }
    },

    /**
     * Send a notification immediately
     * @param {string} title - Notification title
     * @param {Object} options - Notification options
     */
    async send(title, options = {}) {
        // Request permission if not granted
        if (this.getPermission() !== 'granted') {
            const permission = await this.requestPermission();
            if (permission !== 'granted') {
                alert('请先允许通知权限！');
                return null;
            }
        }

        const defaultOptions = {
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            vibrate: [200, 100, 200],
            tag: 'hos-notification',
            renotify: true,
            requireInteraction: false,
            ...options
        };

        try {
            // Try using Service Worker first (works better on mobile)
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, defaultOptions);
                console.log('Notification sent via SW:', title);
            } else {
                // Fallback to regular Notification API
                const notification = new Notification(title, defaultOptions);
                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };
                console.log('Notification sent via API:', title);
            }
            return true;
        } catch (error) {
            console.error('Failed to send notification:', error);
            return null;
        }
    },

    /**
     * Schedule a notification after a delay
     * @param {string} title - Notification title
     * @param {Object} options - Notification options
     * @param {number} delayMs - Delay in milliseconds
     */
    schedule(title, options = {}, delayMs = 5000) {
        console.log(`Scheduling notification in ${delayMs}ms:`, title);

        setTimeout(() => {
            this.send(title, options);
        }, delayMs);

        return true;
    }
};

export default NotificationService;
