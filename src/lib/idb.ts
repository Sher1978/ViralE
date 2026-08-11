export const idb = {
  dbName: 'ViralEngineDB',
  version: 2,
  stores: {
    drafts: 'ProjectDrafts',
    media: 'MediaBuffer'
  },

  async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('IndexedDB open timeout after 3000ms'));
      }, 3000);

      const request = indexedDB.open(this.dbName, this.version);
      
      request.onupgradeneeded = (event: any) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.stores.drafts)) {
          db.createObjectStore(this.stores.drafts);
        }
        if (!db.objectStoreNames.contains(this.stores.media)) {
          db.createObjectStore(this.stores.media);
        }
      };

      request.onsuccess = () => {
        clearTimeout(timeout);
        resolve(request.result);
      };

      request.onerror = () => {
        clearTimeout(timeout);
        reject(request.error);
      };
    });
  },

  async set(key: string, value: any, storeName: string = 'ProjectDrafts') {
    const db = await this.getDB();
    const timestamp = Date.now();
    let payload = value;
    
    if (value instanceof Blob) {
      payload = { _isBlobWrapper: true, data: value, timestamp };
    } else if (value && typeof value === 'object' && !(value instanceof Uint8Array)) {
      payload = { ...value, _idb_timestamp: timestamp };
    }

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(payload, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async get(key: string, storeName: string = 'ProjectDrafts') {
    const db = await this.getDB();
    return new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) return resolve(null);

        const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours
        const itemTimestamp = result?._idb_timestamp || result?.timestamp;

        if (itemTimestamp && (Date.now() - itemTimestamp) > MAX_AGE_MS) {
          console.log(`[IDB] Item '${key}' in '${storeName}' expired (>48h). Purging...`);
          this.delete(key, storeName).catch(() => {});
          return resolve(null);
        }

        if (result && typeof result === 'object' && result._isBlobWrapper) {
          return resolve(result.data);
        }
        
        return resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async delete(key: string, storeName: string = 'ProjectDrafts') {
    const db = await this.getDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async clear(storeName: string = 'ProjectDrafts') {
    const db = await this.getDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async cleanExpired(maxAgeMs: number = 48 * 60 * 60 * 1000): Promise<number> {
    let purgedCount = 0;
    try {
      const db = await this.getDB();
      const storeNames = [this.stores.drafts, this.stores.media];

      for (const storeName of storeNames) {
        if (!db.objectStoreNames.contains(storeName)) continue;
        
        await new Promise<void>((resolve) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const cursorReq = store.openCursor();

          cursorReq.onsuccess = (e: any) => {
            const cursor = e.target.result;
            if (cursor) {
              const val = cursor.value;
              const timestamp = val?._idb_timestamp || val?.timestamp;
              if (timestamp && (Date.now() - timestamp) > maxAgeMs) {
                console.log(`[IDB CleanExpired] Deleting expired key '${cursor.key}' from ${storeName}`);
                cursor.delete();
                purgedCount++;
              }
              cursor.continue();
            } else {
              resolve();
            }
          };

          cursorReq.onerror = () => resolve();
        });
      }
    } catch (err) {
      console.warn('[IDB CleanExpired] Failed cleanup scan:', err);
    }
    return purgedCount;
  }
};

// Trigger auto-cleanup scan on load in browser
if (typeof window !== 'undefined') {
  setTimeout(() => {
    idb.cleanExpired().then(count => {
      if (count > 0) {
        console.log(`[IDB] Auto-cleaned ${count} expired draft/media item(s) older than 48h.`);
      }
    }).catch(() => {});
  }, 2000);
}

