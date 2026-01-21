/**
 * MusicService
 * Handles communication with the NeteaseCloudMusicApi via Vite Proxy
 */
const API_BASE = '/music-api';

export const MusicService = {
    async request(endpoint, options = {}, retries = 1) {
        try {
            // Add timestamp to prevent caching
            const url = `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}timestamp=${Date.now()}`;
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
        const data = await this.request('/login/qr/key');
        return data?.data?.unikey;
    },

    // 3. Create QR Code Image
    async getQrCreate(key) {
        const data = await this.request(`/login/qr/create?key=${key}&qrimg=true`);
        return data?.data?.qrimg;
    },

    // 4. Check QR Status
    async checkQrStatus(key) {
        return this.request(`/login/qr/check?key=${key}`);
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

    // 11. Search Songs
    async search(keywords, limit = 30, offset = 0, type = 1) {
        return this.request(`/cloudsearch?keywords=${encodeURIComponent(keywords)}&limit=${limit}&offset=${offset}&type=${type}`);
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

    // 17. Logout
    async logout() {
        return this.request(`/logout`);
    }
};
