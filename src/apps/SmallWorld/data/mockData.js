export const MOCK_USERS = {
    'user_current': {
        id: 'user_current',
        name: 'HandlerOne',
        handle: '@handler_one',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Felix',
        bio: 'HOS System Administrator | Digital Nomad'
    },
    'user_1': {
        id: 'user_1',
        name: 'Neon Samurai',
        handle: '@neon_blade',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Samurai',
        bio: 'Chasing neon lights in the digital void.'
    },
    'user_2': {
        id: 'user_2',
        name: 'Cyber Oracle',
        handle: '@future_sight',
        avatar: 'https://api.dicebear.com/9.x/bottts/svg?seed=Oracle',
        bio: 'Predicting the next glitch.'
    }
};

export const INITIAL_POSTS = [
    {
        id: 'post_1',
        authorId: 'user_1',
        content: '刚刚接入HOS系统，感觉这里的空气都充满了数据的味道。🌌 #NewWorld #HOS',
        images: [],
        timestamp: Date.now() - 3600000,
        stats: { likes: 42, reposts: 5, replies: 12 },
        isLiked: true
    },
    {
        id: 'post_2',
        authorId: 'user_2',
        content: '检测到微小的现实波动...难道是HandlerOne上线了？👀',
        images: [],
        timestamp: Date.now() - 7200000,
        stats: { likes: 128, reposts: 32, replies: 4 },
        isLiked: false
    }
];
