import { users, products, orders } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
const MemoryStore = createMemoryStore(session);
export class DatabaseStorage {
    constructor() {
        this.sessionStore = new MemoryStore({
            checkPeriod: 86400000,
        });
    }
    async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
    }
    async getUserByUsername(username) {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        return user;
    }
    async createUser(insertUser) {
        const [user] = await db.insert(users).values({
            ...insertUser,
            isFarmer: insertUser.isFarmer || false
        }).returning();
        return user;
    }
    async getProducts() {
        return await db.select().from(products);
    }
    async getProduct(id) {
        const [product] = await db.select().from(products).where(eq(products.id, id));
        return product;
    }
    async createProduct(product) {
        const [newProduct] = await db.insert(products).values(product).returning();
        return newProduct;
    }
    async updateProduct(id, quantity) {
        const [updatedProduct] = await db
            .update(products)
            .set({ quantity })
            .where(eq(products.id, id))
            .returning();
        return updatedProduct;
    }
    async createOrder(order) {
        const [newOrder] = await db.insert(orders).values({
            ...order,
            status: order.status || "pending"
        }).returning();
        return newOrder;
    }
    async getUserOrders(userId) {
        return await db.select().from(orders).where(eq(orders.buyerId, userId));
    }
    async getOrder(id) {
        const [order] = await db.select().from(orders).where(eq(orders.id, id));
        return order;
    }
    async updateOrderStatus(id, status) {
        const [order] = await db
            .update(orders)
            .set({ status })
            .where(eq(orders.id, id))
            .returning();
        return order;
    }
}
export const storage = new DatabaseStorage();
