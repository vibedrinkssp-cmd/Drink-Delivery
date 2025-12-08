import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { ExpandableOrderCard } from '@/components/ExpandableOrderCard';
import type { Order, OrderItem } from '@shared/schema';

interface OrderWithItems extends Order {
  items: OrderItem[];
}

export default function Orders() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders', 'user', user?.id],
    enabled: !!user?.id,
  });

  const userOrders = orders.filter(o => o.userId === user?.id);
  const orderIds = userOrders.map(o => o.id).join(',');
  
  const { data: orderItems = [] } = useQuery<OrderItem[]>({
    queryKey: ['/api/order-items', orderIds],
    queryFn: async () => {
      if (!orderIds) return [];
      const res = await fetch(`/api/order-items?orderIds=${encodeURIComponent(orderIds)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: userOrders.length > 0,
  });

  const ordersWithItems: OrderWithItems[] = userOrders.map(order => ({
    ...order,
    items: orderItems.filter(item => item.orderId === order.id),
  }));

  if (!isAuthenticated) {
    setLocation('/login?redirect=/pedidos');
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6 text-primary"
          onClick={() => setLocation('/')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Voltar ao cardapio
        </Button>

        <h1 className="font-serif text-3xl text-primary mb-8">Meus Pedidos</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card border-primary/20">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : ordersWithItems.length === 0 ? (
          <Card className="bg-card border-primary/20">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum pedido ainda</h2>
              <p className="text-muted-foreground mb-6">
                Voce ainda nao fez nenhum pedido. Que tal explorar nosso cardapio?
              </p>
              <Button
                className="bg-primary text-primary-foreground"
                onClick={() => setLocation('/')}
                data-testid="button-explore"
              >
                Ver Cardapio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {ordersWithItems.map((order) => (
              <ExpandableOrderCard
                key={order.id}
                order={order}
                variant="customer"
                defaultExpanded={false}
                showActions={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
