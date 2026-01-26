import React from 'react';
import IOSPage from '../../components/AppWindow/IOSPage';
import { motion } from 'framer-motion';
import { HeartbeatIcon } from '../../components/common/HandDrawnIcons';

const Heartbeat = ({ onBack }) => {
    return (
        <IOSPage
            title="心动"
            onBack={onBack}
            bgClassName="bg-white dark:bg-black"
        >
            <div className="flex flex-col items-center justify-center h-full space-y-8 pb-20">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="text-[#FF2D55]"
                >
                    <HeartbeatIcon size={120} />
                </motion.div>

                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">每一次心动，都值得被记录</h2>
                    <p className="text-gray-500 dark:text-gray-400">正在感受你的呼吸...</p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full px-8">
                    {[
                        { label: '今日心跳', value: '72', unit: 'bpm' },
                        { label: '心情指数', value: '98', unit: '%' },
                    ].map((item, i) => (
                        <div key={i} className="bg-gray-100 dark:bg-white/10 p-4 rounded-3xl">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                {item.value} <span className="text-sm font-normal opacity-60">{item.unit}</span>
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </IOSPage>
    );
};

export default Heartbeat;
