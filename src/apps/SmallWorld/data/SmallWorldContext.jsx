import React, { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_USER_CURRENT, INITIAL_POSTS } from './mockData';

const SmallWorldContext = createContext();

export const useSmallWorld = () => useContext(SmallWorldContext);

export const SmallWorldProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(MOCK_USER_CURRENT);
    const [posts, setPosts] = useState(() => {
        const saved = localStorage.getItem('suki_weibo_posts_v4');
        return saved ? JSON.parse(saved) : INITIAL_POSTS;
    });

    useEffect(() => {
        localStorage.setItem('suki_weibo_posts_v4', JSON.stringify(posts));
    }, [posts]);

    // Update Profile (Avatar, Cover, Bio, Stats)
    const updateProfile = (updates) => {
        setCurrentUser(prev => ({ ...prev, ...updates }));
    };

    // Post Action (New Post or Repost)
    const addPost = (content, images = [], originalPost = null) => {
        const newPost = {
            id: `p_${Date.now()}`,
            author: {
                name: currentUser.name,
                avatar: currentUser.avatar
            },
            content,
            images,
            createdAt: Date.now(),
            source: 'suki OS',
            stats: { reposts: 0, comments: 0, likes: 0 },
            isRepost: !!originalPost,
            originalPost: originalPost
        };
        setPosts(prev => [newPost, ...prev]);
    };

    const toggleLike = (postId) => {
        // Simple mock implementation
        setPosts(prev => prev.map(p =>
            p.id === postId
                ? { ...p, stats: { ...p.stats, likes: p.stats.likes + 1 } }
                : p
        ));
    };

    const value = {
        currentUser,
        updateProfile,
        posts,
        addPost,
        toggleLike
    };

    return (
        <SmallWorldContext.Provider value={value}>
            {children}
        </SmallWorldContext.Provider>
    );
};
