// server/index.ts
import express3 from "express";

// server/routes.ts
import { createServer as createServer2 } from "http";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// server/storage.ts
import { users, products, orders } from "@shared/schema";

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";
import { createServer } from "http";
import { Server } from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema });
var server = createServer();
var wss = new Server({ server });
wss.on("connection", (ws2) => {
  ws2.on("message", (message) => {
    console.log(`Received message => ${message}`);
  });
  ws2.send("Hello! Message From Server!!");
});
server.listen(8080, () => {
  console.log("Server started on port 8080");
});

// server/storage.ts
import { eq } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
var MemoryStore = createMemoryStore(session);
var DatabaseStorage = class {
  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 864e5
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
    const [updatedProduct] = await db.update(products).set({ quantity }).where(eq(products.id, id)).returning();
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
    const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return order;
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.REPL_ID,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore
  };
  if (app2.get("env") === "production") {
    app2.set("trust proxy", 1);
  }
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !await comparePasswords(password, user.password)) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const user = await storage.getUser(id);
    done(null, user || false);
  });
  app2.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }
    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password)
    });
    req.login(user, (err) => {
      if (err)
        return next(err);
      res.status(201).json(user);
    });
  });
  app2.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err)
        return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated())
      return res.sendStatus(401);
    res.json(req.user);
  });
}

// server/routes.ts
import { insertProductSchema, insertOrderSchema } from "@shared/schema";

// server/recommendations.ts
import OpenAI from "openai";
var openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
async function generateRecommendations(userId) {
  const orders2 = await storage.getUserOrders(userId);
  const products2 = await storage.getProducts();
  if (orders2.length === 0) {
    return products2.slice(0, 3);
  }
  const userHistory = orders2.map((order) => ({
    productId: order.productId,
    quantity: order.quantity
  }));
  const productsContext = products2.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description
  }));
  const prompt = `Given a user's purchase history: ${JSON.stringify(userHistory)}
    And available products: ${JSON.stringify(productsContext)}
    Recommend 3 product IDs that this user might be interested in. Consider:
    - Seasonal variations in produce
    - Complementary products (e.g., if they buy vegetables, suggest fruits)
    - Local availability
    Return only the product IDs as a JSON array, e.g. [1, 2, 3]`;
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 100
    });
    const recommendedIds = JSON.parse(completion.choices[0].message.content || "[]");
    return products2.filter((p) => recommendedIds.includes(p.id));
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return products2.slice(0, 3);
  }
}

// server/payment.ts
import Stripe from "stripe";
import admin from "firebase-admin";

// server/serviceAccountKey.json
var serviceAccountKey_default = {
  type: "service_account",
  project_id: "leafy-app-c420",
  private_key_id: "3eeda1fccb1fe80b49936f4d41b4d869210fec84",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC9Mngtledr7MtG\ngooy3UlLnGxXWc/C7Q9rM+9m0tsD3RSwIT0hdu01BSMGC37/mMI288pQO34hx0Ib\nouLhbmOvJy6fFcKU1l8XTgWmcub5duojhyJyxm+DIYcKToXRulc0ESuXsa1KtTei\nZqclWgiGv3fNmR6r615vwJLfM99RLF53/PHJQmCPJpIe8p+rS2KTJZ1dOR24IEnz\n+0BVgY46qowlZKsZ1xtb/QfbHisRm87YAi7mjBP2QJzWsu6j69TTolBC2v/pW8hE\nPJX3co4liAYbid+S562LFdBCZYfGDVMiulryC/2drr4aZFrZ/OcZhuE9KXGBYcBR\nofP5IMm/AgMBAAECggEAIBxXv0zo6S1YVtBDClz6WqXi0XSByZCYhFZdNHNnDqHQ\nKBCMIojfu5bymc0Lse/ITrFTzgg64RrDgpNDtIUa0BhzVjbIPqCfpQHt/ZEU2JQx\nKvR9iUNam8Pt+nbXSYA52rFrV6SlR7+4AI0xoypDtjL6718kkIMzFP53LwDLzyfQ\n25CmWy8C/WXOY1CA/HmXNQ1HFSfsmtUvAN5/Tq1/+SmUfQBIozaoL6L/8vCgEq08\n5o1+jnzM3t/QSpKJo6eCSV42b9TSEzIexBLsG+OsZtYctOVHsacqvOa+20+nVWG1\nixKyAzFSpoK7UFWAjGWi/3/TyHapv4cxyVkqrSVaAQKBgQDmkj/UNHo6rrh4kXfO\n1V5f8DWut3hdY0+D31Ss0kmU3c3UzYJsSm4P8UXB4F4eMGPx08ZVf8u8WEe1Mo4Y\nwpuuzsAvCALpuXiOPdss8nw2hGstpOD8m1wjVTBtawJfisBbm9eA4T4PQro6MHQH\nJI7IKmw2ydyn7+6nb1TnsQyKvwKBgQDSEBktya+KYBneVNGB/Ed30ONFSlXxRICj\nU4Rk8s02usCNrA5lq/W6dwxBcmTXEBfnm8IGvfis9y/oZE2dJI+C3a040dGq45ZP\nZthZdx+gDAfAQEw2j3MidKXYofrcEq1y9p7LG7S7nDfLE2qt7ml2b3EgyetnipG/\nFql6JlaBAQKBgEe4woYd9M+APf2zMlNyZ7LsI6a/h391PuzEcbB4kU7vV/GUI7fP\nx0DKSmquglhdsRkuSQmbgSKLS3L/0Ne+4XKU+Y8nrNBLU0bb0uu+WgkTU8uU+C9b\nnGOZQkEnAkv5+zAD4BtE9WsF1Kv5Gn6GTqvRFmxMiojqx4/pv716g249AoGBAM1K\nTlEhOhzRrnZKDjYqhu3hhzrAWx1fBRiZFlpRr5w9BtFtxOQ4Gf4ROjj7wvErGTGQ\nVx6fqdff+0HyRKe+g0Ixwog1BeMsaElRCT7l3FJdb3XDYLgxmSOjPDFqm+9XkYs4\n2hdFDGwNT7l3UFqLFSZZ4wVYUGbwVV+aliZ6MTABAoGBANvxG184+EsOBR4UhgSf\n9KiAOJQV0r3Vh81KELX5FXRIiqRhXSdg1Y7V6aMuZys1RIwbIr18SAu53686ueLu\nDc97sNdaFsq5sOFfr6JkR9UnFeIt/miSZ16E54suZON0gqrzlaQ1bfSdooYdqljs\n2Zu417amUal0c0ANDlGS2nE+\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@leafy-app-c420.iam.gserviceaccount.com",
  client_id: "111275048018455481869",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40leafy-app-c420.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

// server/payment.ts
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY must be set");
}
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia"
});
async function createPaymentIntent(order) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(order.totalPrice) * 100),
      // Convert to cents
      currency: "zar",
      automatic_payment_methods: {
        enabled: true
      },
      metadata: {
        orderId: order.id.toString(),
        buyerId: order.buyerId.toString()
      }
    });
    return paymentIntent;
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw error;
  }
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey_default),
  databaseURL: "https://leafy-app-c420-default-rtdb.firebaseio.com"
});

// server/routes.ts
import express from "express";

// server/firebaseAdmin.ts
import admin2 from "firebase-admin";
admin2.initializeApp({
  credential: admin2.credential.cert(serviceAccountKey_default),
  databaseURL: "https://leafy-app-c420-default-rtdb.firebaseio.com/"
});
var messaging = admin2.messaging();

// server/routes.ts
function registerRoutes(app2) {
  setupAuth(app2);
  app2.get("/api/products", async (_req, res) => {
    const products2 = await storage.getProducts();
    res.json(products2);
  });
  app2.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product)
      return res.sendStatus(404);
    res.json(product);
  });
  app2.get("/api/recommendations", async (req, res) => {
    if (!req.isAuthenticated())
      return res.sendStatus(401);
    const recommendations = await generateRecommendations(req.user.id);
    res.json(recommendations);
  });
  app2.post("/api/products", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isFarmer) {
      return res.sendStatus(403);
    }
    const parsed = insertProductSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json(parsed.error);
    const product = await storage.createProduct({
      ...parsed.data,
      farmerId: req.user.id
    });
    res.status(201).json(product);
  });
  app2.post("/api/orders", async (req, res) => {
    if (!req.isAuthenticated())
      return res.sendStatus(401);
    if (req.user.isFarmer)
      return res.sendStatus(403);
    const parsed = insertOrderSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json(parsed.error);
    const product = await storage.getProduct(parsed.data.productId);
    if (!product)
      return res.status(404).send("Product not found");
    if (product.quantity < parsed.data.quantity) {
      return res.status(400).send("Insufficient quantity");
    }
    await storage.updateProduct(
      product.id,
      product.quantity - parsed.data.quantity
    );
    const order = await storage.createOrder({
      ...parsed.data,
      buyerId: req.user.id,
      status: "pending"
    });
    res.status(201).json(order);
  });
  app2.get("/api/orders", async (req, res) => {
    if (!req.isAuthenticated())
      return res.sendStatus(401);
    const orders2 = await storage.getUserOrders(req.user.id);
    res.json(orders2);
  });
  app2.post("/api/create-payment-intent", async (req, res) => {
    if (!req.isAuthenticated())
      return res.sendStatus(401);
    const orderId = req.body.orderId;
    try {
      const order = await storage.getOrder(orderId);
      if (!order)
        return res.status(404).send("Order not found");
      if (order.buyerId !== req.user.id)
        return res.sendStatus(403);
      const paymentIntent = await createPaymentIntent(order);
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });
  const httpServer2 = createServer2(app2);
  return httpServer2;
}
var router = express.Router();
router.post("/send-notification", async (req, res) => {
  const { token, title, body } = req.body;
  const message = {
    notification: {
      title,
      body
    },
    token
  };
  try {
    const response = await messaging.send(message);
    res.status(200).send("Notification sent successfully: " + response);
  } catch (error) {
    res.status(500).send("Error sending notification: " + error);
  }
});

// server/vite.ts
import express2 from "express";
import fs from "fs";
import path2, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { createServer as createHttpServer } from "http";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared")
      // Ensure this points to the shared directory
    }
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "client/index.html")
      }
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename = fileURLToPath(import.meta.url);
var __dirname2 = dirname(__filename);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server2) {
  const serverOptions = {
    server: {
      middlewareMode: true,
      hmr: { server: server2 },
      allowedHosts: void 0
    }
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions.server,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}
var httpServer = createHttpServer();
var inlineConfig = {
  server: {
    middlewareMode: true,
    hmr: {
      server: httpServer
    },
    allowedHosts: void 0
  }
};
(async () => {
  const server2 = await createViteServer(inlineConfig);
  httpServer.on("request", server2.middlewares);
  httpServer.listen(3e3, () => {
    console.log("Vite server is running on port 3000");
  });
})();

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server2 = registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server2);
  } else {
    serveStatic(app);
  }
  const PORT = 5e3;
  server2.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
