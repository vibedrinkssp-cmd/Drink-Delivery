import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCart } from '@/lib/cart';
import type { Product } from '@shared/schema';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { items, addItem, updateQuantity } = useCart();
  const cartItem = items.find(item => item.productId === product.id);
  const quantity = cartItem?.quantity ?? 0;

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(price));
  };

  const isOutOfStock = product.stock <= 0;

  return (
    <Card 
      className="group bg-card overflow-hidden border border-primary/10 hover:border-primary/50 transition-all duration-300 hover:gold-glow-sm"
      data-testid={`card-product-${product.id}`}
    >
      <div className="aspect-square relative overflow-hidden bg-secondary/50">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl font-serif text-primary/30">
              {product.name.charAt(0)}
            </span>
          </div>
        )}
        
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="text-white font-semibold text-lg">Esgotado</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 
          className="font-semibold text-card-foreground text-lg mb-1 line-clamp-2"
          data-testid={`text-product-name-${product.id}`}
        >
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 mt-auto">
          <span 
            className="text-lg font-bold text-yellow truncate min-w-0"
            data-testid={`text-product-price-${product.id}`}
          >
            {formatPrice(product.salePrice)}
          </span>

          {isOutOfStock ? (
            <Button variant="secondary" size="sm" disabled>
              Indisponivel
            </Button>
          ) : quantity > 0 ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 border-primary text-primary"
                onClick={() => updateQuantity(product.id, quantity - 1)}
                data-testid={`button-decrease-${product.id}`}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span 
                className="w-6 text-center font-semibold text-card-foreground text-sm"
                data-testid={`text-quantity-${product.id}`}
              >
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 border-primary text-primary"
                onClick={() => addItem(product)}
                data-testid={`button-increase-${product.id}`}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              size="icon"
              className="h-7 w-7 bg-primary text-primary-foreground"
              onClick={() => addItem(product)}
              data-testid={`button-add-${product.id}`}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
