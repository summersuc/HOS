import { db } from '../db/schema';

/**
 * Unified Storage Service
 * 
 * Manages persistence of large binary assets (Blobs) with:
 * 1. IndexedDB Priority (Performance & Capacity)
 * 2. localStorage Fallback (Safety net for iOS corruption)
 * 3. In-Memory Preloading (Instant UI rendering)
 */

class StorageService {
    constructor() {
        this.cache = new Map(); // key: "table:id" -> blobUrl
        this.tableCache = new Set(); // Tables that have been preloaded
        this.subscribers = new Set(); // Listeners for cache updates
    }

    /**
     * Subscribe to storage updates
     * @param {Function} callback 
     * @returns {Function} unsubscribe
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    notify() {
        this.subscribers.forEach(cb => cb());
    }

    /**
     * Generate a unique cache key
     */
    _getKey(table, id) {
        return `${table}:${id}`;
    }

    /**
     * Preload an entire table's avatars/blobs into memory
     * @param {string} table table name (e.g. 'userPersonas', 'characters')
     * @param {string} blobField field name containing the blob (default 'avatar')
     */
    async preloadTable(table, blobField = 'avatar') {
        if (this.tableCache.has(table)) return;

        console.log(`[Storage] Preloading table: ${table}...`);
        try {
            const records = await db.table(table).toArray();
            let added = false;
            for (const record of records) {
                if (record[blobField] instanceof Blob) {
                    const url = URL.createObjectURL(record[blobField]);
                    this.cache.set(this._getKey(table, record.id), url);
                    added = true;
                } else if (typeof record[blobField] === 'string' && record[blobField].startsWith('blob:')) {
                    // Already a blob URL (unlikely in DB, but possible in state)
                    this.cache.set(this._getKey(table, record.id), record[blobField]);
                    added = true;
                }
            }
            this.tableCache.add(table);
            console.log(`[Storage] Preloaded ${records.length} items from ${table}`);
            if (added) this.notify(); // Notify listeners that cache is ready
        } catch (e) {
            console.warn(`[Storage] Preload failed for ${table}:`, e);
            // Try localStorage fallback for known IDs? 
            // Without IDs we can't iterate localStorage easily effectively unless we scan keys
            this._recoverFromLocalStorage(table);
        }
    }

    /**
     * Scan localStorage for fallback items related to this table
     */
    _recoverFromLocalStorage(table) {
        const prefix = `hos_fb_${table}_`;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                const id = key.replace(prefix, '');
                const base64 = localStorage.getItem(key);
                if (base64) {
                    // Convert Base64 back to Blob for consistency (optional) or just store DataURL
                    // DataURL is fine for img src
                    this.cache.set(this._getKey(table, id), base64);
                }
            }
        }
    }

    /**
     * Get a cached URL for an item. 
     * If not found, returns undefined (caller should handle fallback or waiting)
     */
    getCachedBlobUrl(table, id) {
        // Support direct passing of "idb:table:id" references
        if (typeof table === 'string' && table.startsWith('idb:')) {
            const parts = table.split(':');
            if (parts.length === 3) {
                return this.cache.get(`${parts[1]}:${parts[2]}`);
            }
        }
        return this.cache.get(this._getKey(table, id));
    }

    /**
     * Async load blob with full fallback chain (Cache -> DB -> LocalStorage)
     */
    async getBlob(table, id) {
        if (!id) return null;

        // 1. Try Memory Cache
        const cached = this.getCachedBlobUrl(table, id);
        if (cached) return cached;

        // 2. Try IndexedDB
        try {
            const record = await db.table(table).get(id);
            if (record && record.data) {
                // Handle Blob vs Base64 storage
                const url = record.data instanceof Blob
                    ? URL.createObjectURL(record.data)
                    : record.data; // assume string/base64

                this.cache.set(this._getKey(table, id), url);
                return url;
            }
        } catch (e) {
            console.warn(`[Storage] DB Load failed for ${table}:${id}`, e);
        }

        // 3. Try LocalStorage Fallback
        try {
            const prefix = `hos_fb_${table}_`;
            const key = `${prefix}${id}`;
            const base64 = localStorage.getItem(key);
            if (base64) {
                this.cache.set(this._getKey(table, id), base64);
                return base64;
            }
        } catch (e) { console.error("LS Load Failed", e); }

        return null;
    }

    /**
     * Save a blob with fallback protection
     * @param {string} table 
     * @param {string|number} id - Providing an ID is crucial. If 'new', logic is complex, handled outside usually.
     * @param {Blob} blob 
     * @param {string} blobField - Field name to store the blob in (default: 'avatar')
     */
    async saveBlob(table, id, blob, blobField = 'avatar') {
        const cacheKey = this._getKey(table, id);

        // 1. Update Memory immediately
        const objectUrl = URL.createObjectURL(blob);
        this.cache.set(cacheKey, objectUrl);
        this.notify(); // Notify listeners immediately for optimistic UI

        try {
            // 2. Try IndexedDB with Timeout
            // Check if record exists first? put vs update. 
            // generic 'put' is safer if we just want to save the blob record
            // But we need to preserve other fields if they exist? 
            // For pure blob tables (chatWallpapers), put is fine. 
            // For mixed tables (characters), update is better.

            const data = {};
            data[blobField] = blob;

            // We use 'put' to ensure it creates if not exists (important for new wallpaper entries)
            // But for existing records (characters), we might want update? 
            // Dexie 'put' replaces or adds. 'update' only updates existing.
            // Since we often save new wallpapers, we should try put or checking existence.
            // For now, let's use db.table(table).put({ id, ...data }) standard?
            // But characters table has other data.
            // Let's stick to update for known existing (characters) and put for purely storage (wallpapers)?
            // Compromise: Try update, if 0 updated, try put (if it's a pure storage table).
            // Actually simplest is: if table is 'chatWallpapers', use put. Else update.

            const dbPromise = (async () => {
                if (table === 'chatWallpapers' || table === 'blobs') {
                    await db.table(table).put({ id, ...data, createdAt: Date.now() });
                } else {
                    await db.table(table).update(id, data);
                }
            })();

            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 2000));

            await Promise.race([dbPromise, timeoutPromise]);

            // Clean up localStorage if DB success
            localStorage.removeItem(`hos_fb_${table}_${id}`);

        } catch (e) {
            console.warn(`[Storage] DB Save failed for ${table}:${id}, utilizing localStorage fallback.`);

            // 3. Fallback to localStorage
            try {
                const base64 = await this._blobToBase64(blob);
                localStorage.setItem(`hos_fb_${table}_${id}`, base64);
                // Update cache to use base64 to ensure persistence across reloads matches this source
                this.cache.set(cacheKey, base64);
            } catch (lsError) {
                console.error('[Storage] CRITICAL: Both DB and LocalStorage failed.', lsError);
                throw new Error('Storage Full');
            }
        }

        return objectUrl;
    }

    _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Helper to get formatted reference for textual storage (e.g. wallpapers)
    getReference(table, id) {
        return `idb:${table}:${id}`;
    }
}

export const storageService = new StorageService();
