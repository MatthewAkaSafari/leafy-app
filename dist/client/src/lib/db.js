import { openDB } from 'idb';
export class OfflineStore {
    constructor() {
        this.db = null;
    }
    async initialize() {
        this.db = await openDB('leafy-store', 1, {
            upgrade(db) {
                // Products store
                const productStore = db.createObjectStore('products', { keyPath: 'id' });
                productStore.createIndex('by-category', 'category');
                // Orders store
                db.createObjectStore('orders', { keyPath: 'id' });
            },
        });
    }
    async saveProduct(product) {
        if (!this.db)
            await this.initialize();
        await this.db.put('products', { ...product, pendingSync: true });
    }
    async getProduct(id) {
        if (!this.db)
            await this.initialize();
        return await this.db.get('products', id);
    }
    async getAllProducts() {
        if (!this.db)
            await this.initialize();
        return await this.db.getAll('products');
    }
    async getProductsByCategory(category) {
        if (!this.db)
            await this.initialize();
        return await this.db.getAllFromIndex('products', 'by-category', category);
    }
    async saveOrder(order) {
        if (!this.db)
            await this.initialize();
        await this.db.put('orders', { ...order, pendingSync: true });
    }
    async getOrder(id) {
        if (!this.db)
            await this.initialize();
        return await this.db.get('orders', id);
    }
    async getAllOrders() {
        if (!this.db)
            await this.initialize();
        return await this.db.getAll('orders');
    }
    async getPendingSyncItems() {
        if (!this.db)
            await this.initialize();
        const products = await this.db.getAll('products');
        const orders = await this.db.getAll('orders');
        return {
            products: products.filter(p => p.pendingSync),
            orders: orders.filter(o => o.pendingSync)
        };
    }
    async markSynced(type, id) {
        if (!this.db)
            await this.initialize();
        const item = await this.db.get(type, id);
        if (item) {
            item.pendingSync = false;
            await this.db.put(type, item);
        }
    }
}
export const offlineStore = new OfflineStore();
