import { useQuery } from "@tanstack/react-query";
import ProductList from "./product-list";
import { Loader2 } from "lucide-react";
export default function Recommendations() {
    const { data: recommendations, isLoading } = useQuery({
        queryKey: ["/api/recommendations"],
    });
    if (isLoading) {
        return (<div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
      </div>);
    }
    if (!recommendations?.length) {
        return null;
    }
    return (<div className="space-y-4">
      <h2 className="text-2xl font-semibold">Recommended for You</h2>
      <ProductList products={recommendations}/>
    </div>);
}
