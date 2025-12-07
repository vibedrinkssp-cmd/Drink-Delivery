import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  CreditCard, 
  Banknote, 
  QrCode,
  LogOut,
  Check,
  User,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Product, Category } from '@shared/schema';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@shared/schema';

interface CartItem {
  product: Product;
  quantity: number;
}

function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num);
}

export default function PDV() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, role, logout } = useAuth();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [changeFor, setChangeFor] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest('POST', '/api/orders', orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: 'Pedido criado com sucesso!' });
      setCart([]);
      setCustomerName('');
      setNotes('');
      setPaymentMethod(null);
      setChangeFor('');
      setIsPaymentDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Erro ao criar pedido', variant: 'destructive' });
    },
  });

  const handleLogout = () => {
    logout();
    setLocation('/admin-login');
  };

  if (role !== 'pdv' && role !== 'admin') {
    setLocation('/admin-login');
    return null;
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.salePrice) * item.quantity, 0);
  const total = subtotal;

  const handleFinalizeSale = () => {
    if (cart.length === 0) {
      toast({ title: 'Carrinho vazio', variant: 'destructive' });
      return;
    }
    setIsPaymentDialogOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!paymentMethod) {
      toast({ title: 'Selecione um metodo de pagamento', variant: 'destructive' });
      return;
    }

    const orderData = {
      userId: user?.id,
      orderType: 'counter',
      status: 'accepted',
      subtotal: subtotal.toFixed(2),
      deliveryFee: '0.00',
      total: total.toFixed(2),
      paymentMethod,
      changeFor: paymentMethod === 'cash' && changeFor ? changeFor : null,
      notes: notes || null,
      customerName: customerName || 'Cliente Balcao',
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.salePrice,
        totalPrice: (Number(item.product.salePrice) * item.quantity).toFixed(2),
      })),
    };

    createOrderMutation.mutate(orderData);
  };

  const paymentMethods: { id: PaymentMethod; label: string; icon: any }[] = [
    { id: 'cash', label: 'Dinheiro', icon: Banknote },
    { id: 'pix', label: 'PIX', icon: QrCode },
    { id: 'card_debit', label: 'Debito', icon: CreditCard },
    { id: 'card_credit', label: 'Credito', icon: CreditCard },
  ];

  const change = paymentMethod === 'cash' && changeFor ? parseFloat(changeFor) - total : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-black border-b border-primary/20 py-4 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <h1 className="font-serif text-2xl text-primary">PDV - Balcao</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm">
            Operador: {user?.name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="flex-1 flex">
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-secondary border-primary/30"
                data-testid="input-search-product"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              data-testid="button-category-all"
            >
              Todos
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                data-testid={`button-category-${cat.id}`}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => addToCart(product)}
                  data-testid={`card-product-${product.id}`}
                >
                  <CardContent className="p-4">
                    <h3 className="font-medium text-sm mb-1 line-clamp-2">{product.name}</h3>
                    <p className="text-primary font-bold">{formatCurrency(product.salePrice)}</p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Estoque: {product.stock}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="w-96 bg-card border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Nome do cliente (opcional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="bg-secondary border-primary/30"
                data-testid="input-customer-name"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-center">
                <div>
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Carrinho vazio</p>
                  <p className="text-sm">Clique em um produto para adicionar</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.product.id} className="bg-secondary rounded-lg p-3" data-testid={`cart-item-${item.product.id}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm flex-1">{item.product.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFromCart(item.product.id)}
                        data-testid={`button-remove-${item.product.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, -1)}
                          data-testid={`button-decrease-${item.product.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="font-medium w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, 1)}
                          data-testid={`button-increase-${item.product.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-bold text-primary">
                        {formatCurrency(Number(item.product.salePrice) * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border space-y-4">
            <div>
              <Label htmlFor="notes">Observacoes</Label>
              <Input
                id="notes"
                placeholder="Observacoes do pedido..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-secondary border-primary/30"
                data-testid="input-notes"
              />
            </div>

            <div className="flex justify-between text-lg">
              <span>Subtotal:</span>
              <span className="font-bold">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between text-xl font-bold text-primary">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>

            <Button
              className="w-full py-6 text-lg"
              disabled={cart.length === 0}
              onClick={handleFinalizeSale}
              data-testid="button-finalize-sale"
            >
              <Check className="h-5 w-5 mr-2" />
              Finalizar Venda
            </Button>
          </div>
        </div>
      </main>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Pagamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="text-center py-4 bg-secondary rounded-lg">
              <p className="text-muted-foreground text-sm">Total a Pagar</p>
              <p className="text-4xl font-bold text-primary">{formatCurrency(total)}</p>
            </div>

            <div>
              <Label className="mb-3 block">Forma de Pagamento</Label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => (
                  <Button
                    key={method.id}
                    variant={paymentMethod === method.id ? 'default' : 'outline'}
                    className="h-16 flex-col gap-1"
                    onClick={() => setPaymentMethod(method.id)}
                    data-testid={`button-payment-${method.id}`}
                  >
                    <method.icon className="h-5 w-5" />
                    <span className="text-xs">{method.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {paymentMethod === 'cash' && (
              <div>
                <Label htmlFor="changeFor">Troco para</Label>
                <Input
                  id="changeFor"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={changeFor}
                  onChange={(e) => setChangeFor(e.target.value)}
                  className="bg-secondary border-primary/30 text-lg"
                  data-testid="input-change-for"
                />
                {change > 0 && (
                  <p className="text-green-500 mt-2 text-lg font-semibold">
                    Troco: {formatCurrency(change)}
                  </p>
                )}
              </div>
            )}

            <Button
              className="w-full py-6 text-lg"
              disabled={!paymentMethod || createOrderMutation.isPending}
              onClick={handleConfirmPayment}
              data-testid="button-confirm-payment"
            >
              {createOrderMutation.isPending ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
