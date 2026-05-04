export const idb = {
  dbName: 'ViralEngineDB',
  version: 2,
  stores: {
    drafts: 'ProjectDrafts',
    media: 'MediaBuffer'
  },

  async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
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
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async set(key: string, value: any, storeName: string = 'ProjectDrafts') {
    const db = await this.getDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value, key);
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
      request.onsuccess = () => resolve(request.result);
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
  }
};
