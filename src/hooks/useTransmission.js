import { useCallback } from 'react';
import { appRegistry } from '../config/appRegistry';
import { db } from '../db/schema'; // 假设数据库导出为 db

/**
 * Three-Mode Transmission Hook (三模通讯核心逻辑)
 * 
 * Modes:
 * - 'A' (Aggressive/Immediate): 立即发送给 AI。
 * - 'B' (Buffer/Silent): 存入缓冲区，仅在特定时机打包发送。
 * - 'C' (Cold/Privacy): 仅存本地，绝不发送给 AI。
 */

export const useTransmission = (appId) => {

    // 1. 获取当前 App 的通讯模式
    // TODO: 未来这里应该优先从数据库(User Settings)读取，如果没设置才读注册表(Default)
    const getMode = useCallback(async () => {
        // 模拟从数据库读取用户覆盖配置
        // const userConfig = await db.settings.get(`mode_${appId}`);
        // return userConfig?.value || appRegistry[appId]?.transmissionMode || 'C';

        return appRegistry[appId]?.transmissionMode || 'C';
    }, [appId]);

    // 2. 核心发送函数
    const transmit = useCallback(async (data) => {
        const mode = await getMode();
        const payload = {
            appId,
            timestamp: Date.now(),
            content: data,
            mode,
            status: 'pending' // pending, sent, buffered
        };

        console.log(`[Transmission] App: ${appId} | Mode: ${mode} | Data:`, data);

        // --- 模式逻辑分支 ---

        if (mode === 'C') {
            // [模式 C] 绝对隐私：只存本地，不联网
            await db.messages.add({
                ...payload,
                status: 'local_only' // 标记为仅本地
            });
            console.log('🔒 Data saved locally. No transmission.');
            return { status: 'saved_local' };
        }

        if (mode === 'B') {
            // [模式 B] 静默缓冲：存入 Buffer 表，不触发 AI
            await db.messages.add({
                ...payload,
                status: 'buffered'
            });
            // TODO: 这里可以触发一个“检查缓冲区”的逻辑，看是否堆满了用于打包
            console.log('📦 Data buffered correctly.');
            return { status: 'buffered' };
        }

        if (mode === 'A') {
            // [模式 A] 立即响应：存入库 + 立即调用 AI 接口
            const msgId = await db.messages.add({
                ...payload,
                status: 'sending'
            });

            // 模拟调用 AI 接口 (未来替换为真实 fetch)
            try {
                // await callAI(payload); 
                console.log('🚀 Sending to AI immediately...');

                // 更新状态为已发送
                await db.messages.update(msgId, { status: 'sent', sentAt: Date.now() });

                // 模拟 AI 回复 (Echo)
                return { status: 'sent', response: 'AI Received' };
            } catch (error) {
                console.error('❌ AI Transmission failed:', error);
                await db.messages.update(msgId, { status: 'failed' });
                return { status: 'failed', error };
            }
        }

        return { status: 'unknown_mode' };

    }, [appId, getMode]);

    return {
        transmit,
        getMode
    };
};
