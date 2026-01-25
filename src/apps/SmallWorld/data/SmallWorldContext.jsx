import React, { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_USERS, INITIAL_POSTS } from './mockData';

const SmallWorldContext = createContext();

export const useSmallWorld = () => useContext(SmallWorldContext);

export const SmallWorldProvider = ({ children }) => {
    const [users] = useState(MOCK_USERS);
    const [currentUser] = useState(MOCK_USERS['user_current']);
    const [posts, setPosts] = useState(() => {
        const saved = localStorage.getItem('hos_smallworld_posts');
        return saved ? JSON.parse(saved) : INITIAL_POSTS;
    });

    useEffect(() => {
        localStorage.setItem('hos_smallworld_posts', JSON.stringify(posts));
    }, [posts]);

    const addPost = (content, images = []) => {
        const newPost = {
            id: `post_${Date.now()}`,
            authorId: currentUser.id,
            content,
            images,
            timestamp: Date.now(),
            stats: { likes: 0, reposts: 0, replies: 0 },
            isLiked: false
        };
        setPosts(prev => [newPost, ...prev]);
    };

    const toggleLike = (postId) => {
        setPosts(prev => prev.map(post => {
            if (post.id === postId) {
                const isLiked = !post.isLiked;
                return {
                    ...post,
                    isLiked,
                    stats: {
                        ...post.stats,
                        likes: isLiked ? post.stats.likes + 1 : post.stats.likes - 1
                    }
                };
            }
            return post;
        }));
    };

    const value = {
        users,
        currentUser,
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
