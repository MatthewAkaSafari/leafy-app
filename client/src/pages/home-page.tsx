import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Product } from "shared/schema";
import { Button } from "@/components/ui/button";
import ProductList from "@/components/product-list";
import SearchFilters from "@/components/search-filters";
import Recommendations from "@/components/recommendations";
import { useState } from "react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const filteredProducts = products.filter((product) => {
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Leafy Market</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.name}
            </span>
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {!user?.isFarmer && <Recommendations />}

        <div className="space-y-8">
          <SearchFilters
            onCategoryChange={setCategoryFilter}
            onSearchChange={setSearchTerm}
            selectedCategory={categoryFilter}
            searchTerm={searchTerm}
          />

          <ProductList products={filteredProducts} />
        </div>
      </main>
    </div>
  );
}