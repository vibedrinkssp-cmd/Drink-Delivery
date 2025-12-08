import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { HeroSection } from '@/components/home/HeroSection';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { CategoryCarousel } from '@/components/home/CategoryCarousel';
import { ProductGrid } from '@/components/home/ProductGrid';
import { CartSheet } from '@/components/cart/CartSheet';
import type { Product, Category, Banner } from '@shared/schema';

export const TRENDING_CATEGORY_ID = '__trending__';

type TrendingProductResponse = {
  product: Product;
  salesCount: number;
};

export default function Home() {
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ['/api/banners'],
  });

  const { data: trendingData = [] } = useQuery<TrendingProductResponse[]>({
    queryKey: ['/api/products/trending'],
  });

  const trendingProducts = trendingData.map(t => t.product);
  const hasTrendingProducts = trendingProducts.length > 0;

  const displayProducts = selectedCategory === TRENDING_CATEGORY_ID 
    ? trendingProducts 
    : products;

  const effectiveCategory = selectedCategory === TRENDING_CATEGORY_ID 
    ? null 
    : selectedCategory;

  return (
    <div className="min-h-screen bg-background">
      <Header onCartOpen={() => setCartOpen(true)} />
      
      <main>
        <HeroSection />
        
        <BannerCarousel banners={banners} />
        
        <CategoryCarousel 
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          showTrending={hasTrendingProducts}
        />
        
        <ProductGrid 
          products={displayProducts}
          isLoading={productsLoading}
          selectedCategory={effectiveCategory}
        />
      </main>

      <footer className="bg-black border-t border-primary/20 py-8 px-4 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="font-serif text-2xl text-primary mb-2">VIBE DRINKS</h3>
          <p className="text-muted-foreground text-sm">Adega & Drinkeria Premium</p>
          <p className="text-muted-foreground text-xs mt-4">
            2024 Vibe Drinks. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
