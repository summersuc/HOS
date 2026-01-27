// 示例头像和封面图 - 使用优雅的渐变占位
const PLACEHOLDER_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=SukiUser&backgroundColor=ffdfbf';
const PLACEHOLDER_COVER = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=300&fit=crop&auto=format';

// 示例图片集
const SAMPLE_IMAGES = [
    'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1682687221038-404670f01d03?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=400&fit=crop',
];

// 当前用户
export const MOCK_USER_CURRENT = {
    id: 'user_current',
    name: 'Suki用户',
    handle: '@suki_user',
    avatar: PLACEHOLDER_AVATAR,
    coverImage: PLACEHOLDER_COVER,
    bio: '✨ 在小世界里记录生活的点点滴滴\n🌸 热爱生活，热爱分享',
    stats: {
        following: 128,
        followers: 256,
    },
    metadata: {
        personaId: null,
        worldbookId: null
    }
};

// 示例帖子数据
export const INITIAL_POSTS = [
    {
        id: 'post_demo_1',
        author: {
            name: '小橙子',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Orange&backgroundColor=ffd5dc',
            verified: true
        },
        content: '今天天气真好！出门散步拍到了超美的夕阳 🌅\n\n#日常生活# #摄影分享#',
        images: [SAMPLE_IMAGES[0], SAMPLE_IMAGES[1]],
        createdAt: Date.now() - 3600000 * 2, // 2小时前
        source: 'iPhone 15 Pro',
        stats: { reposts: 12, comments: 28, likes: 156 },
        isLiked: false,
        isRepost: false
    },
    {
        id: 'post_demo_2',
        author: {
            name: '旅行日记',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Travel&backgroundColor=c0aede',
            verified: true
        },
        content: '周末去了趟山里，远离城市的喧嚣，感受大自然的宁静。强烈推荐给大家！\n\n@小橙子 上次你说想去的地方就是这里~',
        images: [SAMPLE_IMAGES[2], SAMPLE_IMAGES[3], SAMPLE_IMAGES[0], SAMPLE_IMAGES[1]],
        createdAt: Date.now() - 3600000 * 5, // 5小时前
        source: 'Suki OS',
        stats: { reposts: 45, comments: 67, likes: 523 },
        isLiked: true,
        isRepost: false
    },
    {
        id: 'post_demo_3',
        author: {
            name: '科技前沿',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tech&backgroundColor=b6e3f4'
        },
        content: '转发微博',
        images: [],
        createdAt: Date.now() - 3600000 * 8, // 8小时前
        source: 'Android',
        stats: { reposts: 234, comments: 89, likes: 1024 },
        isLiked: false,
        isRepost: true,
        originalPost: {
            author: { name: '官方发布' },
            content: '重大更新！新版本带来了全新的UI设计和更多实用功能，快来体验吧！ #产品更新#',
            images: [SAMPLE_IMAGES[2]]
        }
    },
    {
        id: 'post_demo_4',
        author: {
            name: '美食探店',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Food&backgroundColor=ffe4c4'
        },
        content: '发现一家超赞的咖啡店 ☕️\n\n环境超级好，咖啡也很香醇，适合周末来坐坐放松一下~\n\n📍 地址：市中心创意园区A栋\n💰 人均：45元',
        images: [SAMPLE_IMAGES[3]],
        createdAt: Date.now() - 86400000, // 1天前
        source: 'Suki OS',
        stats: { reposts: 67, comments: 45, likes: 289 },
        isLiked: false,
        isRepost: false
    }
];
