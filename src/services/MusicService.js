/**
 * MusicService
 * Handles communication with the NeteaseCloudMusicApi via Vite Proxy
 */
// Use environment variable for API URL in production, fallback to local proxy for dev
const API_BASE = 'https://api-enhanced-smoky.vercel.app';

export const MusicService = {
    async request(endpoint, options = {}, retries = 1) {
        try {
            // 确保 endpoint 正确格式化
            const safeEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

            // 构造 URL
            const hasQuery = safeEndpoint.includes('?');
            let separator = hasQuery ? '&' : '?';
            let url = `${API_BASE}${safeEndpoint}`;

            // 1. 注入 Global Parameters (randomCNIP)
            url += `${separator}randomCNIP=true`;
            separator = '&';

            // 2. 注入 Auth Cookie (手动管理跨域 Cookie)
            const isNoCookie = url.includes('noCookie=true');
            const storedCookie = localStorage.getItem('NETEASE_COOKIE');
            if (storedCookie && !isNoCookie) {
                // 部分接口可能需要对其编码，但通常直接传即可，保险起见 encodeURIComponent
                url += `${separator}cookie=${encodeURIComponent(storedCookie)}`;
                separator = '&';
            }

            // 3. 注入 Timestamp 防止缓存
            url += `${separator}timestamp=${Date.now()}`;

            const res = await fetch(url, { ...options, credentials: 'include' });

            if (!res.ok) {
                if ((res.status === 502 || res.status === 504) && retries > 0) {
                    console.warn(`Gateway Error ${res.status}, retrying...`);
                    return this.request(endpoint, options, retries - 1);
                }
                throw new Error(`API Error: ${res.status}`);
            }

            const data = await res.json();
            return this.fixHttps(data);
        } catch (e) {
            // Suppress common proxy errors but return useful info
            const isGateway = e.message.includes('502') || e.message.includes('504');
            console.warn(`Music API Request Failed (${isGateway ? 'Gateway' : 'Network'}):`, e.message);
            return {
                error: isGateway ? '502' : 'NW_ERR',
                message: isGateway ? 'Network Busy' : 'Connection Failed'
            };
        }
    },

    // Manually save cookie (from QR login)
    saveCookie(cookie) {
        if (!cookie) return;
        localStorage.setItem('NETEASE_COOKIE', cookie);
    },

    getCookie() {
        return localStorage.getItem('NETEASE_COOKIE');
    },

    // Helper to upgrade (http -> https) to avoid Mixed Content errors
    fixHttps(obj) {
        if (typeof obj === 'string') {
            if (obj.startsWith('http://')) {
                return obj.replace(/^http:\/\//i, 'https://');
            }
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.fixHttps(item));
        }
        if (obj && typeof obj === 'object') {
            // Mutate object values for efficiency
            Object.keys(obj).forEach(key => {
                obj[key] = this.fixHttps(obj[key]);
            });
            return obj;
        }
        return obj;
    },

    // 1. Check Login Status
    async checkLogin() {
        return this.request('/login/status');
    },

    // 2. Get QR Key
    async getQrKey() {
        const data = await this.request('/login/qr/key?noCookie=true');
        return data?.data?.unikey;
    },

    // 3. Create QR Code Image
    async getQrCreate(key) {
        const data = await this.request(`/login/qr/create?key=${key}&qrimg=true&noCookie=true`);
        return data?.data?.qrimg;
    },

    // 4. Check QR Status
    async checkQrStatus(key) {
        return this.request(`/login/qr/check?key=${key}&noCookie=true`);
    },

    // --- Core Music Features ---

    // 5. Get User Playlists
    async getUserPlaylist(uid) {
        return this.request(`/user/playlist?uid=${uid}`);
    },

    // 6. Get Playlist Detail (All songs)
    async getPlaylistDetail(id) {
        return this.request(`/playlist/track/all?id=${id}&limit=100&offset=0`);
    },

    // 7. Get Song URL
    async getSongUrl(id) {
        // level: standard, higher, exhigh, lossless, hires
        return this.request(`/song/url/v1?id=${id}&level=standard`);
    },

    // 8. Get Song Detail (Cover art, etc.)
    async getSongDetail(ids) {
        return this.request(`/song/detail?ids=${ids}`);
    },

    // 9. Get Lyrics
    async getLyric(id) {
        return this.request(`/lyric?id=${id}`);
    },

    // 10. Like / Unlike Song
    async like(id, like = true) {
        // like=true for like, false for cancel
        const timestamp = Date.now();
        return this.request(`/like?id=${id}&like=${like}&timestamp=${timestamp}`);
    },

    // 11. Search Songs (Basic, Cloud, & Advanced)
    async search(keywords, limit = 30, offset = 0, type = 1) {
        // type 1018 = 综合
        return this.request(`/cloudsearch?keywords=${encodeURIComponent(keywords)}&limit=${limit}&offset=${offset}&type=${type}`);
    },

    // 11a. Default Search Keywords
    async searchDefault() {
        return this.request(`/search/default`);
    },

    // 11b. Hot Search List (Detail)
    async searchHot() {
        return this.request(`/search/hot/detail`);
    },

    // 11c. Search Suggestions
    async searchSuggest(keywords, type = 'mobile') {
        return this.request(`/search/suggest?keywords=${encodeURIComponent(keywords)}&type=${type}`);
    },

    // 11d. Multimatch Search
    async searchMultimatch(keywords) {
        return this.request(`/search/multimatch?keywords=${encodeURIComponent(keywords)}`);
    },

    // 12. Recommend Playlists (Requires Login)
    async getRecommendPlaylists() {
        // /recommend/resource returns daily recommended playlists
        return this.request(`/recommend/resource`);
    },

    // 13. Recommend Songs (Daily Drops - Requires Login)
    async getRecommendSongs() {
        return this.request(`/recommend/songs`);
    },

    // 14. Get Banners
    async getBanners() {
        return this.request(`/banner?type=2`); // type=2 for iPhone/Mobile
    },

    // 15. Personal FM
    async getPersonalFM() {
        return this.request(`/personal_fm`);
    },

    // 16. Get User Likelist (IDs)
    async getLikelist(uid) {
        return this.request(`/likelist?uid=${uid}`);
    },

    // 37. 创建歌单
    async createPlaylist(name, privacy = 0) {
        // privacy: 0 = public, 10 = private
        return this.request(`/playlist/create?name=${encodeURIComponent(name)}&privacy=${privacy}`);
    },

    // 38. 删除歌单
    async deletePlaylist(id) {
        return this.request(`/playlist/delete?id=${id}`);
    },

    // 39. 收藏/取消收藏歌单 (t: 1 = 收藏, 2 = 取消)
    async subscribePlaylist(id, t = 1) {
        return this.request(`/playlist/subscribe?t=${t}&id=${id}`);
    },

    // 17. Logout
    async logout() {
        return this.request(`/logout`);
    },

    // =============================================
    // --- 新增 API (用户与资产) ---
    // =============================================

    // 18. 获取用户详情 (头像、等级、听歌数量等)
    async getUserDetail(uid) {
        return this.request(`/user/detail?uid=${uid}`);
    },

    // 19. 获取用户播放记录 (type: 1 = 近一周, 0 = 所有时间)
    async getUserRecord(uid, type = 1) {
        return this.request(`/user/record?uid=${uid}&type=${type}`);
    },

    // 20. 获取收藏的歌手列表
    async getArtistSublist() {
        return this.request(`/artist/sublist`);
    },

    // 21. 收藏/取消收藏歌手 (t: 1 = 收藏, 0 = 取消)
    async subArtist(artistId, t = 1) {
        return this.request(`/artist/sub?id=${artistId}&t=${t}`);
    },

    // 22. 获取歌手热门 50 首歌曲
    async getArtistTopSongs(artistId) {
        return this.request(`/artist/top/song?id=${artistId}`);
    },

    // 23. 获取歌手全部歌曲 (支持分页)
    async getArtistSongs(artistId, limit = 50, offset = 0, order = 'time') {
        return this.request(`/artist/songs?id=${artistId}&limit=${limit}&offset=${offset}&order=${order}`);
    },

    // 24. 获取歌手详情
    async getArtistDetail(artistId) {
        return this.request(`/artist/detail?id=${artistId}`);
    },

    // =============================================
    // --- 新增 API (发现与推荐) ---
    // =============================================

    // 25. 获取所有榜单
    async getToplists() {
        return this.request(`/toplist`);
    },

    // 26. 获取榜单详情 (歌曲列表)
    async getToplistDetail(id) {
        return this.request(`/playlist/track/all?id=${id}&limit=100`);
    },

    // 27. 获取热门歌单分类
    async getHotPlaylistCategories() {
        return this.request(`/playlist/hot`);
    },

    // 28. 获取歌单分类 (网友精选碟)
    async getTopPlaylists(cat = '全部', limit = 30, offset = 0) {
        return this.request(`/top/playlist?cat=${encodeURIComponent(cat)}&limit=${limit}&offset=${offset}`);
    },

    // 29. 心动模式 / 智能播放
    async getIntelligenceList(songId, playlistId) {
        return this.request(`/playmode/intelligence/list?id=${songId}&pid=${playlistId}`);
    },

    // 30. FM 垃圾桶 (不再推荐此歌)
    async fmTrash(id) {
        return this.request(`/fm_trash?id=${id}`);
    },

    // 31. 新歌速递 (type: 0 = 全部, 7 = 华语, 96 = 欧美, 8 = 日本, 16 = 韩国)
    async getNewSongs(type = 0) {
        return this.request(`/top/song?type=${type}`);
    },

    // 32. 最新专辑
    async getNewestAlbums() {
        return this.request(`/album/newest`);
    },

    // =============================================
    // --- 新增 API (评论) ---
    // =============================================

    // 33. 获取歌曲评论 (支持分页, sortType: 1 = 按推荐, 2 = 按热度, 3 = 按时间)
    async getSongComments(id, limit = 20, offset = 0, sortType = 2) {
        return this.request(`/comment/music?id=${id}&limit=${limit}&offset=${offset}&sortType=${sortType}`);
    },

    // 34. 获取热门评论
    async getHotComments(id, type = 0, limit = 15, offset = 0) {
        // type: 0 = 歌曲, 1 = MV, 2 = 歌单, 3 = 专辑, 4 = 电台节目, 5 = 视频
        return this.request(`/comment/hot?id=${id}&type=${type}&limit=${limit}&offset=${offset}`);
    },

    // 35. 给评论点赞 (t: 1 = 点赞, 0 = 取消)
    async likeComment(id, cid, t = 1, type = 0) {
        return this.request(`/comment/like?id=${id}&cid=${cid}&t=${t}&type=${type}`);
    },

    // =============================================
    // --- 新增 API (歌词 - 高级) ---
    // =============================================

    // 36. 获取逐字歌词 (新版)
    async getNewLyric(id) {
        return this.request(`/lyric/new?id=${id}`);
    }
};
