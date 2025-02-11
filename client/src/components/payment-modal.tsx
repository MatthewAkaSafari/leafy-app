import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentModalProps {
  orderId: number;
  totalAmount: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({
  orderId,
  totalAmount,
  open,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const initializePayment = async () => {
      try {
        setLoading(true);
        setError(null);

        // Create payment intent
        const response = await apiRequest('POST', '/api/create-payment-intent', { orderId });
        const { clientSecret } = await response.json();

        // Load Stripe
        const stripe = await stripePromise;
        if (!stripe) throw new Error('Failed to load Stripe');

        // Confirm the payment
        const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: {
              token: 'tok_visa', // Test card token
            },
          },
        });

        if (stripeError) {
          throw stripeError;
        }

        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Payment failed');
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [open, orderId, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-center text-muted-foreground">
            Total Amount: R{totalAmount.toFixed(2)}
          </p>
          {loading ? (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive">{error}</div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}