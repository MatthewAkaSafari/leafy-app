import { offlineStore } from './db';
import { apiRequest } from './queryClient';
import { queryClient } from './queryClient';
export async function syncOfflineData() {
    if (!navigator.onLine)
        return;
    const pendingItems = await offlineStore.getPendingSyncItems();
    // Sync products
    for (const product of pendingItems.products) {
        try {
            await apiRequest('POST', '/api/products', product);
            await offlineStore.markSynced('products', product.id);
            queryClient.invalidateQueries({ queryKey: ['/api/products'] });
        }
        catch (error) {
            console.error('Failed to sync product:', error);
        }
    }
    // Sync orders
    for (const order of pendingItems.orders) {
        try {
            await apiRequest('POST', '/api/orders', order);
            await offlineStore.markSynced('orders', order.id);
            queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        }
        catch (error) {
            console.error('Failed to sync order:', error);
        }
    }
}
// Listen for online status changes
export function setupOfflineSync() {
    window.addEventListener('online', () => {
        syncOfflineData();
    });
}
