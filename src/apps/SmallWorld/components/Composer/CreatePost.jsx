import React, { useState } from 'react';
import { Image, Smile, Calendar, MapPin, X } from 'lucide-react';
import { useSmallWorld } from '../../data/SmallWorldContext';

const CreatePost = () => {
    const { currentUser, addPost } = useSmallWorld();
    const [content, setContent] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const handleSubmit = () => {
        if (!content.trim()) return;
        addPost(content);
        setContent('');
        setIsFocused(false);
    };

    return (
        <div className={`p-4 border-b border-gray-200 dark:border-white/10 transition-colors ${isFocused ? 'bg-gray-50 dark:bg-white/5' : ''}`}>
            <div className="flex gap-4">
                <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 object-cover"
                />
                <div className="flex-1">
                    <div className="relative">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            placeholder="有什么新鲜事？"
                            className="w-full bg-transparent text-xl placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white outline-none resize-none min-h-[50px] py-2"
                            rows={isFocused ? 3 : 1}
                        />
                    </div>
                    {isFocused && (
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 dark:border-white/10 animate-in fade-in duration-200">
                            <div className="flex gap-2 text-blue-500">
                                <button className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                                    <Image size={20} />
                                </button>
                                <button className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                                    <Smile size={20} />
                                </button>
                                <button className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                                    <Calendar size={20} />
                                </button>
                                <button className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                                    <MapPin size={20} />
                                </button>
                            </div>
                            <button
                                onClick={handleSubmit}
                                disabled={!content.trim()}
                                className="px-5 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-full text-white font-bold text-[15px] transition-colors"
                            >
                                发布
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreatePost;
