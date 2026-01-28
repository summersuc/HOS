import { useState, useEffect, useRef } from 'react';

/**
 * 打字机效果 Hook
 * 将流式传输的内容以平滑的速度逐字显示
 * 
 * @param {string} content - API 推流的完整内容
 * @param {boolean} enabled - 是否启用打字机效果
 * @param {number} speed - 每个字符的显示间隔（毫秒）
 * @returns {string} - 当前应该显示的内容
 */
export const useTypewriter = (content, enabled = true, speed = 25) => {
    const [displayedContent, setDisplayedContent] = useState('');
    const indexRef = useRef(0);
    const timerRef = useRef(null);

    useEffect(() => {
        // 如果禁用打字机效果，直接显示全部内容
        if (!enabled) {
            setDisplayedContent(content);
            indexRef.current = content.length;
            return;
        }

        // 如果内容为空，重置状态
        if (!content) {
            setDisplayedContent('');
            indexRef.current = 0;
            return;
        }

        // 如果当前索引已经超过内容长度（内容被截断的情况），重置
        if (indexRef.current > content.length) {
            indexRef.current = 0;
            setDisplayedContent('');
        }

        // 清除之前的定时器
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        // 设置新的定时器，逐字显示
        timerRef.current = setInterval(() => {
            if (indexRef.current < content.length) {
                indexRef.current += 1;
                setDisplayedContent(content.slice(0, indexRef.current));
            } else {
                // 已经显示完毕，清除定时器
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }, speed);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [content, enabled, speed]);

    // 当内容完全变化时（新的对话开始），重置索引
    useEffect(() => {
        if (content === '') {
            indexRef.current = 0;
            setDisplayedContent('');
        }
    }, [content]);

    return displayedContent;
};

export default useTypewriter;
