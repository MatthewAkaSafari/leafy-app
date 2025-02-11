import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface LeafyDB extends DBSchema {
  products: {
    key: number;
    value: {
      id: number;
      name: string;
      description: string;
      price: number;
      quantity: number;
      unit: string;
      category: string;
      farmerId: number;
      pendingSync?: boolean;
    };
    indexes: { 'by-category': string };
  };
  orders: {
    key: number;
    value: {
      id: number;
      productId: number;
      buyerId: number;
      quantity: number;
      status: string;
      totalPrice: number;
      pendingSync?: boolean;
    };
  };
}

export class OfflineStore {
  private db: IDBPDatabase<LeafyDB> | null = null;

  async initialize() {
    this.db = await openDB<LeafyDB>('leafy-store', 1, {
      upgrade(db) {
        // Products store
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-category', 'category');

        // Orders store
        db.createObjectStore('orders', { keyPath: 'id' });
      },
    });
  }

  async saveProduct(product: LeafyDB['products']['value']) {
    if (!this.db) await this.initialize();
    await this.db!.put('products', { ...product, pendingSync: true });
  }

  async getProduct(id: number) {
    if (!this.db) await this.initialize();
    return await this.db!.get('products', id);
  }

  async getAllProducts() {
    if (!this.db) await this.initialize();
    return await this.db!.getAll('products');
  }

  async getProductsByCategory(category: string) {
    if (!this.db) await this.initialize();
    return await this.db!.getAllFromIndex('products', 'by-category', category);
  }

  async saveOrder(order: LeafyDB['orders']['value']) {
    if (!this.db) await this.initialize();
    await this.db!.put('orders', { ...order, pendingSync: true });
  }

  async getOrder(id: number) {
    if (!this.db) await this.initialize();
    return await this.db!.get('orders', id);
  }

  async getAllOrders() {
    if (!this.db) await this.initialize();
    return await this.db!.getAll('orders');
  }

  async getPendingSyncItems() {
    if (!this.db) await this.initialize();
    const products = await this.db!.getAll('products');
    const orders = await this.db!.getAll('orders');
    return {
      products: products.filter(p => p.pendingSync),
      orders: orders.filter(o => o.pendingSync)
    };
  }

  async markSynced(type: 'products' | 'orders', id: number) {
    if (!this.db) await this.initialize();
    const item = await this.db!.get(type, id);
    if (item) {
      item.pendingSync = false;
      await this.db!.put(type, item);
    }
  }
}

export const offlineStore = new OfflineStore();
