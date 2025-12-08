import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Clock, ChefHat, Package, LogOut, RefreshCw, Truck, User as UserIcon, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useOrderUpdates } from '@/hooks/use-order-updates';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Order, OrderItem } from '@shared/schema';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, ORDER_TYPE_LABELS, type OrderStatus, type PaymentMethod, type OrderType } from '@shared/schema';
import { useEffect, useState } from 'react';

interface OrderWithItems extends Order {
  items: OrderItem[];
  userName?: string;
}

function getElapsedTime(date: Date | string | null): string {
  if (!date) return '0min';
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}min`;
}

export default function Kitchen() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { role, logout } = useAuth();
  const [now, setNow] = useState(Date.now());
  const [isSSEConnected, setIsSSEConnected] = useState(false);

  // Real-time order updates via SSE
  useOrderUpdates({
    onConnected: () => setIsSSEConnected(true),
    onDisconnected: () => setIsSSEConnected(false),
    onOrderStatusChanged: (data) => {
      if (data.status === 'accepted') {
        toast({ title: 'Novo pedido na fila!' });
      }
    },
  });

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const { data: orders = [], isLoading, refetch } = useQuery<OrderWithItems[]>({
    queryKey: ['/api/orders', 'kitchen'],
    refetchInterval: isSSEConnected ? 30000 : 5000, // Slower polling when SSE connected
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

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(price));
  };

  const handleLogout = () => {
    logout();
    setLocation('/admin-login');
  };

  if (role !== 'kitchen' && role !== 'admin') {
    setLocation('/admin-login');
    return null;
  }

  const acceptedOrders = orders.filter(o => o.status === 'accepted');
  const preparingOrders = orders.filter(o => o.status === 'preparing');

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                    <Card key={order.id} className="bg-card border-primary/20" data-testid={`order-${order.id}`}>
                      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-foreground text-xl">
                              #{order.id.slice(-6).toUpperCase()}
                            </CardTitle>
                            <Badge className={order.orderType === 'counter' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-violet-500/20 text-violet-400 border-violet-500/30'}>
                              {order.orderType === 'counter' ? <UserIcon className="h-3 w-3 mr-1" /> : <Truck className="h-3 w-3 mr-1" />}
                              {ORDER_TYPE_LABELS[(order.orderType as OrderType) || 'delivery']}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">
                            {order.customerName || order.userName || 'Cliente'}
                          </p>
                        </div>
                        <Badge className="bg-yellow/20 text-yellow border-yellow/30 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getElapsedTime(order.acceptedAt || order.createdAt)}
                        </Badge>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span className="text-foreground font-medium text-lg">
                                {item.quantity}x {item.productName}
                              </span>
                            </div>
                          ))}
                        </div>

                        {order.notes && (
                          <div className="bg-yellow/10 border border-yellow/30 rounded-lg p-3">
                            <p className="text-yellow text-sm font-medium">Observacoes:</p>
                            <p className="text-foreground text-sm">{order.notes}</p>
                          </div>
                        )}

                        <Button
                          className="w-full bg-primary text-primary-foreground py-6 text-lg font-semibold"
                          onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'preparing' })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-start-${order.id}`}
                        >
                          <ChefHat className="h-5 w-5 mr-2" />
                          Iniciar Producao
                        </Button>
                      </CardContent>
                    </Card>
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
                    <Card key={order.id} className="bg-card border-orange-500/30" data-testid={`order-${order.id}`}>
                      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-foreground text-xl">
                              #{order.id.slice(-6).toUpperCase()}
                            </CardTitle>
                            <Badge className={order.orderType === 'counter' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-violet-500/20 text-violet-400 border-violet-500/30'}>
                              {order.orderType === 'counter' ? <UserIcon className="h-3 w-3 mr-1" /> : <Truck className="h-3 w-3 mr-1" />}
                              {ORDER_TYPE_LABELS[(order.orderType as OrderType) || 'delivery']}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">
                            {order.customerName || order.userName || 'Cliente'}
                          </p>
                        </div>
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getElapsedTime(order.preparingAt || order.createdAt)}
                        </Badge>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span className="text-foreground font-medium text-lg">
                                {item.quantity}x {item.productName}
                              </span>
                            </div>
                          ))}
                        </div>

                        {order.notes && (
                          <div className="bg-yellow/10 border border-yellow/30 rounded-lg p-3">
                            <p className="text-yellow text-sm font-medium">Observacoes:</p>
                            <p className="text-foreground text-sm">{order.notes}</p>
                          </div>
                        )}

                        <Button
                          className="w-full bg-green-600 text-white py-6 text-lg font-semibold"
                          onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'ready' })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-ready-${order.id}`}
                        >
                          <Package className="h-5 w-5 mr-2" />
                          Pedido Pronto
                        </Button>
                      </CardContent>
                    </Card>
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
