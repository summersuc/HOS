import { useEffect } from 'react';
import { db } from '../db/schema';
import { llmService } from '../services/LLMService';
import NotificationService from '../services/NotificationService';

export const useProactiveWatchdog = () => {
    useEffect(() => {
        const checkProactive = async () => {
            try {
                // Find candidates
                const candidates = await db.conversations
                    .filter(c => c.proactiveWaitHours && c.proactiveWaitHours > 0)
                    .toArray();

                for (const conv of candidates) {
                    const lastMsg = await db.messengerMessages
                        .where('[conversationType+conversationId]')
                        .equals(['single', conv.id])
                        .last();

                    if (lastMsg && lastMsg.role === 'assistant') {
                        // Check if it's already a proactive msg to prevent spam
                        if (lastMsg.metadata?.isProactive) continue;

                        // --- DND Check ---
                        if (conv.proactiveDndEnabled && conv.proactiveDndStart && conv.proactiveDndEnd) {
                            const now = new Date();
                            const currentMinutes = now.getHours() * 60 + now.getMinutes();

                            const [startH, startM] = conv.proactiveDndStart.split(':').map(Number);
                            const [endH, endM] = conv.proactiveDndEnd.split(':').map(Number);

                            const startMinutes = startH * 60 + startM;
                            const endMinutes = endH * 60 + endM;

                            let isDnd = false;

                            if (startMinutes <= endMinutes) {
                                // Standard day range (e.g. 12:00 - 14:00)
                                isDnd = currentMinutes >= startMinutes && currentMinutes < endMinutes;
                            } else {
                                // Overnight range (e.g. 23:00 - 08:00)
                                // True if After Start OR Before End
                                isDnd = currentMinutes >= startMinutes || currentMinutes < endMinutes;
                            }

                            if (isDnd) {
                                console.log(`[Proactive] Skipped ${conv.title} due to DND (${conv.proactiveDndStart} - ${conv.proactiveDndEnd})`);
                                continue;
                            }
                        }
                        // -----------------

                        const diffHours = (Date.now() - lastMsg.timestamp) / (1000 * 60 * 60);

                        // Debug log for dev (visible if F12 open)
                        // console.log(`[Watchdog] ${conv.title}: Silent ${diffHours.toFixed(4)}h / Limit ${conv.proactiveWaitHours}h`);

                        if (diffHours >= conv.proactiveWaitHours) {
                            console.log(`[Proactive] Triggering for ${conv.title}`);

                            // Trigger AI
                            const result = await llmService.triggerProactiveMessage(conv.id);

                            // Notify
                            if (result && result.text) {
                                const userNotify = await db.notificationSettings.get('messenger');
                                if (!userNotify || userNotify.enabled) {
                                    NotificationService.send(conv.title || '新消息', {
                                        body: result.text,
                                        tag: `messenger-${conv.id}`
                                    });
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Proactive Watchdog Error:', e);
            }
        };

        // Run immediately on mount, then every 60s
        checkProactive();
        const interval = setInterval(checkProactive, 60 * 1000);
        return () => clearInterval(interval);
    }, []);
};
