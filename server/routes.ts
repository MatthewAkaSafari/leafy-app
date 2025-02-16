import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertProductSchema, insertOrderSchema } from "shared/schema";
import { generateRecommendations } from "./recommendations";
import { createPaymentIntent } from "./payment";

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    isFarmer: boolean;
  } & { [key: string]: any };
  isAuthenticated: () => this is AuthenticatedRequest;
}

export function registerRoutes(app: Express): Server | undefined {
  setupAuth(app);

  // Products
  app.get("/api/products", async (_req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.sendStatus(404);
    res.json(product);
  });

  // New recommendations endpoint
  app.get("/api/recommendations", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.sendStatus(401);
    try {
      const recommendations = await generateRecommendations((req as AuthenticatedRequest).user.id);
      res.json(recommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  app.post("/api/products", async (req, res) => {
    if (!(req as AuthenticatedRequest).isAuthenticated() || !(req as AuthenticatedRequest).user?.isFarmer) {
      return res.status(403).send("Forbidden: Only farmers can add products");
    }

    const parsed = insertProductSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const product = await storage.createProduct({
      ...parsed.data,
      farmerId: (req as AuthenticatedRequest).user.id,
    });
    res.status(201).json(product);
  });

  // Orders
  app.post("/api/orders", async (req, res) => {
    if (!req.isAuthenticated() || (req as AuthenticatedRequest).user.isFarmer) return res.sendStatus(401);

    const parsed = insertOrderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    const product = await storage.getProduct(parsed.data.productId);
    if (!product) return res.status(404).send("Product not found");
    if (product.quantity < parsed.data.quantity) {
      return res.status(400).send("Insufficient quantity");
    }

    // Update product quantity
    await storage.updateProduct(
      product.id,
      product.quantity - parsed.data.quantity
    );

    const order = await storage.createOrder({
      ...parsed.data,
      buyerId: (req as AuthenticatedRequest).user.id,
      status: "pending"
    });
    res.status(201).json(order);
  });

  app.get("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const orders = await storage.getUserOrders((req as AuthenticatedRequest).user.id);
    res.json(orders);
  });

  // Payment routes
  app.post("/api/create-payment-intent", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const orderId = req.body.orderId;

    try {
      if (!req.user || !(req as AuthenticatedRequest).isAuthenticated()) return res.sendStatus(401);

      const order = await storage.getOrder(orderId);
      if (!order) return res.status(404).send("Order not found");
      if (order.buyerId !== (req as AuthenticatedRequest).user.id) return res.sendStatus(403);

      const paymentIntent = await createPaymentIntent(order);
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import express from 'express';
import { messaging } from './firebaseAdmin';

const router = express.Router();

// Endpoint to send notification
router.post('/send-notification', async (req, res) => {
  const { token, title, body } = req.body;

  const message = {
    notification: {
      title: title,
      body: body,
    },
    token: token,
  };

  try {
    const response = await messaging.send(message);
    res.status(200).send('Notification sent successfully: ' + response);
  } catch (error) {
    res.status(500).send('Error sending notification: ' + error);
  }
});

export default router;