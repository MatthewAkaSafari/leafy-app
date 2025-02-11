import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStatus } from "@/hooks/use-offline-status";
import { offlineStore } from "@/lib/db";
import { WifiOff, MapPin } from "lucide-react";
import { useState } from 'react';
import PaymentModal from './payment-modal';
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}
export default function ProductCard({ product }) {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [currentOrder, setCurrentOrder] = useState(null);
    const { user } = useAuth();
    const { toast } = useToast();
    const isOffline = useOfflineStatus();
    const [distance, setDistance] = useState(null);
    const orderMutation = useMutation({
        mutationFn: async () => {
            const orderData = {
                productId: product.id,
                buyerId: user.id,
                quantity: 1,
                totalPrice: Number(product.price) // Convert to number as expected by schema
            };
            if (isOffline) {
                await offlineStore.saveOrder({
                    ...orderData,
                    id: Date.now(),
                    status: 'pending'
                });
                return;
            }
            const response = await apiRequest("POST", "/api/orders", orderData);
            const createdOrder = await response.json();
            setCurrentOrder(createdOrder.id);
            setShowPaymentModal(true);
            return createdOrder;
        },
        onSuccess: () => {
            if (!isOffline)
                return;
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            toast({
                title: "Order saved offline",
                description: `You ordered ${product.name} (will sync when online)`,
            });
        },
        onError: (error) => {
            toast({
                title: "Failed to place order",
                description: error.message,
                variant: "destructive",
            });
        },
    });
    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        setCurrentOrder(null);
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        toast({
            title: "Payment successful",
            description: `Thank you for ordering ${product.name}`,
        });
    };
    return (<>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">{product.name}</h3>
              {isOffline && (<WifiOff className="h-4 w-4 text-muted-foreground"/>)}
            </div>
            <p className="text-sm text-muted-foreground">{product.description}</p>
            <div className="text-sm space-y-1">
              <p>Price: R{Number(product.price).toFixed(2)} per {product.unit}</p>
              <p>Available: {product.quantity} {product.unit}</p>
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4"/>
                <span>{product.locationName}</span>
                {/*distance !== null && (
          <span>({distance} km away)</span>
        )*/}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          {!user?.isFarmer && product.quantity > 0 && (<Button className="w-full" onClick={() => orderMutation.mutate()} disabled={orderMutation.isPending}>
              {isOffline ? "Save Order Offline" : "Order Now"}
            </Button>)}
          {product.quantity === 0 && (<Button className="w-full" disabled>
              Out of Stock
            </Button>)}
        </CardFooter>
      </Card>

      {currentOrder && (<PaymentModal orderId={currentOrder} totalAmount={Number(product.price)} open={showPaymentModal} onClose={() => setShowPaymentModal(false)} onSuccess={handlePaymentSuccess}/>)}
    </>);
}
