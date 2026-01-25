import React from 'react';
import { ArrowLeft, MapPin, Calendar, Link as LinkIcon } from 'lucide-react';
import Post from '../components/Feed/Post';
import { useSmallWorld } from '../data/SmallWorldContext';

const Profile = ({ onBack }) => {
    const { currentUser, posts } = useSmallWorld();

    // Filter posts for current user (mock)
    const myPosts = posts.filter(p => p.authorId === currentUser.id);

    return (
        <div className="min-h-full pb-20 bg-white dark:bg-black">
            {/* Header / Banner - Consistent with App Header */}
            <div className="sticky top-0 z-10 flex items-center gap-4 px-4 py-2 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-white/10 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
                {onBack && (
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                )}
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentUser.name}</h2>
                    <p className="text-sm text-gray-500">{myPosts.length} 帖子</p>
                </div>
            </div>

            {/* Banner Image */}
            <div className="h-[200px] bg-gradient-to-r from-blue-400 to-indigo-500 dark:from-purple-800 dark:to-blue-600 relative">
                {/* Optional: Add actual banner image if available */}
            </div>

            {/* Profile Info */}
            <div className="px-4 relative mb-4">
                <div className="absolute -top-[70px] left-4 border-4 border-white dark:border-black rounded-full p-0.5 bg-white dark:bg-black">
                    <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-[136px] h-[136px] rounded-full object-cover bg-gray-200 dark:bg-gray-800"
                    />
                </div>
                <div className="flex justify-end py-3">
                    <button className="px-4 py-1.5 border border-gray-300 dark:border-white/30 rounded-full font-bold hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-900 dark:text-white">
                        编辑资料
                    </button>
                </div>

                <div className="mt-2">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{currentUser.name}</h1>
                    <p className="text-gray-500 text-[15px]">{currentUser.handle}</p>
                </div>

                <p className="mt-3 text-gray-900 dark:text-white leading-snug">
                    {currentUser.bio}
                </p>

                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-gray-500 text-[15px]">
                    <div className="flex items-center gap-1">
                        <MapPin size={18} />
                        <span>Hoshino OS</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <LinkIcon size={18} />
                        <a href="#" className="text-blue-500 hover:underline">hoshino.os</a>
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar size={18} />
                        <span>加入于 2026年1月</span>
                    </div>
                </div>

                <div className="flex gap-4 mt-3 text-[15px]">
                    <div className="flex gap-1 hover:underline cursor-pointer">
                        <span className="font-bold text-gray-900 dark:text-white">123</span>
                        <span className="text-gray-500">正在关注</span>
                    </div>
                    <div className="flex gap-1 hover:underline cursor-pointer">
                        <span className="font-bold text-gray-900 dark:text-white">456</span>
                        <span className="text-gray-500">关注者</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-white/10 mt-2">
                <div className="flex-1 text-center py-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer font-bold text-gray-900 dark:text-white relative">
                    帖子
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-full"></div>
                </div>
                <div className="flex-1 text-center py-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-gray-500 font-medium">
                    回复
                </div>
                <div className="flex-1 text-center py-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-gray-500 font-medium">
                    媒体
                </div>
                <div className="flex-1 text-center py-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-gray-500 font-medium">
                    喜爱
                </div>
            </div>

            {/* Posts Feed for Profile */}
            <div className="bg-white dark:bg-black">
                {myPosts.length > 0 ? (
                    myPosts.map(post => <Post key={post.id} post={post} />)
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        在这里还没有发布过内容
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
