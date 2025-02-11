import Stripe from 'stripe';
import { Order } from '@shared/schema';
import { storage } from './storage';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY must be set");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia",
});

export async function createPaymentIntent(order: Order) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(order.totalPrice) * 100), // Convert to cents
      currency: 'zar',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: order.id.toString(),
        buyerId: order.buyerId.toString(),
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  databaseURL: 'https://leafy-app-c420-default-rtdb.firebaseio.com'
});

export default admin;