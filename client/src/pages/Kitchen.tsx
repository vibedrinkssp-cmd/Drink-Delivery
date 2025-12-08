import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChefHat, Package, LogOut, RefreshCw, Truck, User as UserIcon, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useOrderUpdates } from '@/hooks/use-order-updates';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ExpandableOrderCard } from '@/components/ExpandableOrderCard';
import type { Order, OrderItem } from '@shared/schema';
import { ORDER_TYPE_LABELS, type OrderStatus, type OrderType } from '@shared/schema';
import { useEffect, useState } from 'react';

interface OrderWithItems extends Order {
  items: OrderItem[];
  userName?: string;
  userWhatsapp?: string;
}

export default function Kitchen() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { role, logout } = useAuth();
  const [isSSEConnected, setIsSSEConnected] = useState(false);

  useOrderUpdates({
    onConnected: () => setIsSSEConnected(true),
    onDisconnected: () => setIsSSEConnected(false),
    onOrderStatusChanged: (data) => {
      if (data.status === 'accepted') {
        toast({ title: 'Novo pedido na fila!' });
      }
    },
  });

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    refetchInterval: isSSEConnected ? 30000 : 5000,
  });

  const { data: users = [] } = useQuery<{ id: string; name: string; whatsapp: string }[]>({
    queryKey: ['/api/users'],
  });

  const orderIds = orders.map(o => o.id).join(',');
  
  const { data: orderItems = [] } = useQuery<OrderItem[]>({
    queryKey: ['/api/order-items', orderIds],
    queryFn: async () => {
      if (!orderIds) return [];
      const res = await fetch(`/api/order-items?orderIds=${encodeURIComponent(orderIds)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: orders.length > 0,
    refetchInterval: isSSEConnected ? 30000 : 5000,
  });

  const ordersWithItems: OrderWithItems[] = orders.map(order => {
    const user = users.find(u => u.id === order.userId);
    return {
      ...order,
      items: orderItems.filter(item => item.orderId === order.id),
      userName: user?.name,
      userWhatsapp: user?.whatsapp,
    };
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      return apiRequest('PATCH', `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: 'Status atualizado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    },
  });

  const handleLogout = () => {
    logout();
    setLocation('/admin-login');
  };

  if (role !== 'kitchen' && role !== 'admin') {
    setLocation('/admin-login');
    return null;
  }

  const acceptedOrders = ordersWithItems.filter(o => o.status === 'accepted');
  const preparingOrders = ordersWithItems.filter(o => o.status === 'preparing');
  const readyOrders = ordersWithItems.filter(o => o.status === 'ready');

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${formattedPhone}`, '_blank');
  };

  const renderOrderActions = (order: OrderWithItems, status: string) => {
    if (status === 'accepted') {
      return (
        <Button
          className="w-full bg-primary text-primary-foreground py-4 text-base font-semibold"
          onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'preparing' })}
          disabled={updateStatusMutation.isPending}
          data-testid={`button-start-${order.id}`}
        >
          <ChefHat className="h-5 w-5 mr-2" />
          Iniciar Producao
        </Button>
      );
    }
    if (status === 'preparing') {
      return (
        <Button
          className="w-full bg-green-600 text-white py-4 text-base font-semibold"
          onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'ready' })}
          disabled={updateStatusMutation.isPending}
          data-testid={`button-ready-${order.id}`}
        >
          <Package className="h-5 w-5 mr-2" />
          Pedido Pronto
        </Button>
      );
    }
    if (status === 'ready') {
      const isDelivery = order.orderType === 'delivery';
      if (!isDelivery) {
        return (
          <Button
            className="w-full bg-cyan-600 text-white py-4 text-base font-semibold"
            onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'delivered' })}
            disabled={updateStatusMutation.isPending}
            data-testid={`button-pickup-${order.id}`}
          >
            <UserIcon className="h-5 w-5 mr-2" />
            Cliente Retirou
          </Button>
        );
      }
      return null;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-black border-b border-primary/20 py-4 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-primary" />
          <h1 className="font-serif text-2xl text-primary">Cozinha - KDE</h1>
        </div>
        <div className="flex items-center gap-4">
          <Badge 
            className={isSSEConnected 
              ? "bg-green-500/20 text-green-400 border-green-500/30" 
              : "bg-red-500/20 text-red-400 border-red-500/30"
            }
            data-testid="badge-connection-status"
          >
            {isSSEConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {isSSEConnected ? 'Ao Vivo' : 'Offline'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="border-primary/50 text-primary"
            onClick={() => refetch()}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
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

      <main className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-card border-primary/20">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-lg px-4 py-1">
                  Novos Pedidos ({acceptedOrders.length})
                </Badge>
              </div>
              <div className="space-y-4">
                {acceptedOrders.length === 0 ? (
                  <Card className="bg-card/50 border-dashed border-primary/20">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Nenhum pedido aguardando producao
                    </CardContent>
                  </Card>
                ) : (
                  acceptedOrders.map((order) => (
                    <ExpandableOrderCard
                      key={order.id}
                      order={order}
                      variant="kitchen"
                      defaultExpanded={true}
                      showElapsedTime={true}
                      elapsedTimeDate={order.acceptedAt || order.createdAt}
                      statusColor="bg-blue-500/20 text-blue-400 border-blue-500/30"
                      actions={renderOrderActions(order, 'accepted')}
                      onOpenWhatsApp={openWhatsApp}
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-lg px-4 py-1">
                  Em Producao ({preparingOrders.length})
                </Badge>
              </div>
              <div className="space-y-4">
                {preparingOrders.length === 0 ? (
                  <Card className="bg-card/50 border-dashed border-primary/20">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Nenhum pedido em producao
                    </CardContent>
                  </Card>
                ) : (
                  preparingOrders.map((order) => (
                    <ExpandableOrderCard
                      key={order.id}
                      order={order}
                      variant="kitchen"
                      defaultExpanded={true}
                      showElapsedTime={true}
                      elapsedTimeDate={order.preparingAt || order.createdAt}
                      statusColor="bg-orange-500/20 text-orange-400 border-orange-500/30"
                      actions={renderOrderActions(order, 'preparing')}
                      onOpenWhatsApp={openWhatsApp}
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-lg px-4 py-1">
                  Prontos ({readyOrders.length})
                </Badge>
              </div>
              <div className="space-y-4">
                {readyOrders.length === 0 ? (
                  <Card className="bg-card/50 border-dashed border-primary/20">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Nenhum pedido pronto
                    </CardContent>
                  </Card>
                ) : (
                  readyOrders.map((order) => (
                    <ExpandableOrderCard
                      key={order.id}
                      order={order}
                      variant="kitchen"
                      defaultExpanded={true}
                      showElapsedTime={true}
                      elapsedTimeDate={order.readyAt || order.createdAt}
                      statusColor="bg-green-500/20 text-green-400 border-green-500/30"
                      actions={renderOrderActions(order, 'ready')}
                      onOpenWhatsApp={openWhatsApp}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
