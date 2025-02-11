import ProductCard from "./product-card";
export default function ProductList({ products }) {
    return (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (<ProductCard key={product.id} product={product}/>))}
      {products.length === 0 && (<div className="col-span-full text-center py-8 text-muted-foreground">
          No products found
        </div>)}
    </div>);
}
