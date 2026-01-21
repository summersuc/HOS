import React, { useState, useEffect, useRef } from 'react';
import { MusicService } from '../../services/MusicService';
import { motion } from 'framer-motion';

const LoginPage = ({ onLoginSuccess }) => {
    const [qrImg, setQrImg] = useState('');
    const [status, setStatus] = useState('Loading QR Code...');
    const [qrKey, setQrKey] = useState('');
    const checkTimerRef = useRef(null);

    // 1. Initialize Login Flow
    useEffect(() => {
        initLogin();
        return () => clearInterval(checkTimerRef.current);
    }, []);

    const initLogin = async () => {
        try {
            // Get Key
            const key = await MusicService.getQrKey();
            if (!key) throw new Error('Failed to get QR Key');
            setQrKey(key);

            // Get Image
            const imgData = await MusicService.getQrCreate(key);
            setQrImg(imgData);
            setStatus('Please scan with Netease Cloud Music App');

            // Start Polling
            startCheckingInfo(key);
        } catch (e) {
            setStatus('Error initializing login. Please retry.');
        }
    };

    const startCheckingInfo = (key) => {
        if (checkTimerRef.current) clearInterval(checkTimerRef.current);

        checkTimerRef.current = setInterval(async () => {
            const res = await MusicService.checkQrStatus(key);
            // 800: Expired, 801: Waiting, 802: Scanned, 803: Success
            if (res.code === 800) {
                setStatus('QR Code Expired. Refreshing...');
                initLogin();
            } else if (res.code === 802) {
                setStatus('Scanned! Please confirm on your phone.');
            } else if (res.code === 803) {
                clearInterval(checkTimerRef.current);
                setStatus('Login Successful! Redirecting...');
                onLoginSuccess(res.cookie);
            }
        }, 3000);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full space-y-8 bg-gradient-to-br from-red-500/5 to-purple-500/5">
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold dark:text-white">Login to Music</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[240px] mx-auto opacity-80">
                    Open Netease Cloud Music App on your phone and scan the QR code to sync your library.
                </p>
            </div>

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white/40 dark:bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl relative"
            >
                {/* corner accents */}
                <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-red-500/30 rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-red-500/30 rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-red-500/30 rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-red-500/30 rounded-br-lg" />

                {qrImg ? (
                    <img src={qrImg} alt="Login QR Code" className="w-56 h-56 rounded-2xl shadow-inner bg-white p-2" />
                ) : (
                    <div className="w-56 h-56 bg-gray-200/20 rounded-2xl animate-pulse flex items-center justify-center">
                        <span className="text-xs font-mono opacity-50">Generating Key...</span>
                    </div>
                )}
            </motion.div>

            <motion.div
                key={status}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`px-6 py-2 rounded-full text-sm font-medium backdrop-blur-md transition-colors duration-300 ${status.includes('Success')
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/20'
                    : 'bg-white/50 dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-white/20'
                    }`}
            >
                {status}
            </motion.div>
        </div>
    );
};

export default LoginPage;
