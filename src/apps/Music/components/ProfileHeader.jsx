import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Zap, ChevronRight, User } from 'lucide-react';

const ProfileHeader = React.memo(({ profile, onAction }) => {
    if (!profile) return null;

    return (
        <div
            onClick={onAction}
            className="flex items-center space-x-4 p-4 mx-4 bg-white/20 dark:bg-white/5 backdrop-blur-xl saturate-150 rounded-3xl border border-white/20 shadow-lg relative overflow-hidden group cursor-pointer active:scale-98 transition-transform"
        >
            {/* ... rest of content remains same ... */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
                <img
                    src={profile.avatarUrl}
                    className="w-16 h-16 rounded-full border-2 border-white/30 shadow-md object-cover relative z-10"
                    alt="Avatar"
                />
                {profile.vipType > 0 && (
                    <div className="absolute -bottom-1 -right-1 bg-black/80 text-[#FFE1B3] p-1 rounded-full border border-[#FFE1B3]/30 z-20">
                        <Crown size={12} fill="currentColor" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0 z-10">
                <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                        {profile.nickname}
                    </h3>
                    <div className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-600 dark:text-red-400">
                        Lv.{profile.level || 8}
                    </div>
                </div>

                <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                        <span>关注 <span className="text-gray-900 dark:text-white font-medium">{profile.follows || 12}</span></span>
                    </div>
                    <div className="w-px h-3 bg-gray-300 dark:bg-white/20" />
                    <div className="flex items-center space-x-1">
                        <span>粉丝 <span className="text-gray-900 dark:text-white font-medium">{profile.followeds || 89}</span></span>
                    </div>
                </div>
            </div>

            <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition z-10">
                <ChevronRight size={16} className="text-gray-400" />
            </button>
        </div>
    );
});

export default ProfileHeader;
