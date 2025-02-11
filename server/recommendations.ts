import OpenAI from "openai";
import { storage } from "./storage";
import { Product, Order } from "../shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateRecommendations(userId: number): Promise<Product[]> {
  // Get user's order history
  const orders = await storage.getUserOrders(userId);
  const products = await storage.getProducts();

  // If user has no orders, return popular products
  if (orders.length === 0) {
    return products.slice(0, 3); // Return top 3 products
  }

  // Prepare context for OpenAI
  const userHistory = orders.map(order => ({
    productId: order.productId,
    quantity: order.quantity,
}));

const productsContext = products.map(p => ({
  id: p.id,
  name: p.name,
  category: p.category,
  description: p.description
}));

  // Generate recommendations using OpenAI
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
    return products.filter(p => recommendedIds.includes(p.id));
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return products.slice(0, 3); // Fallback to top products
  }
}
