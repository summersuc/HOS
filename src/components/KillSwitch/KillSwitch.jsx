import { useState, useEffect, useRef } from 'react';
import './KillSwitch.css';

const KILL_SWITCH_URL = '/api/status.json';
const CHECK_INTERVAL = 5 * 60 * 1000; // 每 5 分钟检查一次

/**
 * KillSwitch 组件 - 远程开关控制 (优化版)
 * 
 * 采用"乐观策略"：默认显示内容，后台静默检查
 * 只有确认服务被禁用时才显示停服页面
 */
export default function KillSwitch({ children }) {
    // 乐观策略：默认 enabled=true，不阻塞首屏
    const [isDisabled, setIsDisabled] = useState(false);
    const [disabledMessage, setDisabledMessage] = useState('');
    const hasChecked = useRef(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                // 强制绕过缓存
                const res = await fetch(KILL_SWITCH_URL, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });

                if (!res.ok) throw new Error('Status check failed');

                const data = await res.json();
                hasChecked.current = true;

                // 只有明确禁用时才显示停服页面
                if (!data.enabled) {
                    setIsDisabled(true);
                    setDisabledMessage(data.message || '');
                    await clearAllCachesAndSW();
                }
            } catch (err) {
                console.warn('[KillSwitch] 状态检查失败:', err.message);
                // 网络错误时，首次检查失败显示错误，后续静默失败不影响使用
                if (!hasChecked.current) {
                    setIsDisabled(true);
                    setDisabledMessage('无法连接服务器，请检查网络后重试');
                }
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, CHECK_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    // 清除所有缓存和注销 SW
    const clearAllCachesAndSW = async () => {
        try {
            // 1. 清除 Cache Storage
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
                console.log('[KillSwitch] 已清除所有缓存');
            }

            // 2. 注销所有 Service Worker
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(r => r.unregister()));
                console.log('[KillSwitch] 已注销所有 Service Worker');
            }

            // 3. 清除 localStorage 和 sessionStorage
            localStorage.clear();
            sessionStorage.clear();
            console.log('[KillSwitch] 已清除本地存储');
        } catch (e) {
            console.error('[KillSwitch] 清除缓存失败:', e);
        }
    };

    // 应用已禁用 - 显示全屏停服页面
    if (isDisabled) {
        return (
            <div className="kill-switch-disabled">
                <div className="kill-switch-icon">suki</div>
                <h1 className="kill-switch-title">服务已停止</h1>
                <p className="kill-switch-message">
                    {disabledMessage || '该应用已暂停提供服务'}
                </p>
                <button
                    className="kill-switch-retry-btn"
                    onClick={() => window.location.reload()}
                >
                    刷新重试
                </button>
            </div>
        );
    }

    // 乐观策略：直接显示内容，后台静默检查
    return children;
}
