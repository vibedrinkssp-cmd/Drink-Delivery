import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Package, 
  Truck, 
  DollarSign, 
  Users, 
  ShoppingBag, 
  Grid3X3, 
  Image, 
  Bike, 
  Settings,
  LogOut,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Clock,
  ChefHat,
  MapPin,
  ShoppingCart,
  User as UserIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Order, Product, Category, Banner, Motoboy, User, Settings as SettingsType } from '@shared/schema';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, ORDER_TYPE_LABELS, type OrderStatus, type PaymentMethod, type OrderType } from '@shared/schema';

const tabs = [
  { id: 'pedidos', label: 'Pedidos', icon: Package },
  { id: 'pdv', label: 'PDV', icon: ShoppingCart },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'produtos', label: 'Produtos', icon: ShoppingBag },
  { id: 'categorias', label: 'Categorias', icon: Grid3X3 },
  { id: 'banners', label: 'Banners', icon: Image },
  { id: 'motoboys', label: 'Motoboys', icon: Bike },
  { id: 'configuracoes', label: 'Configuracoes', icon: Settings },
];

function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num);
}

function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const colors: Record<OrderStatus, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    accepted: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    preparing: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    ready: 'bg-green-500/20 text-green-300 border-green-500/30',
    dispatched: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    delivered: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
  };
  
  return (
    <Badge className={`${colors[status]} border`}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      return apiRequest('PATCH', `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: 'Status atualizado!' });
    },
  });

  const filteredOrders = orders.filter(order => 
    statusFilter === 'all' || order.status === statusFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-primary">Pedidos</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-secondary border-primary/30" data-testid="select-status-filter">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1,2,3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum pedido encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map(order => (
            <Card key={order.id} data-testid={`card-order-${order.id}`}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">Pedido #{order.id.slice(0, 8)}</CardTitle>
                  <StatusBadge status={order.status as OrderStatus} />
                </div>
                <span className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</span>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-semibold text-primary">{formatCurrency(order.total)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pagamento: </span>
                    <span>{PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod]}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Entrega: </span>
                    <span>{formatCurrency(order.deliveryFee)}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {order.status === 'pending' && (
                    <Button 
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'accepted' })}
                      data-testid={`button-accept-${order.id}`}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Aceitar
                    </Button>
                  )}
                  {order.status === 'accepted' && (
                    <Button 
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'preparing' })}
                      data-testid={`button-prepare-${order.id}`}
                    >
                      <ChefHat className="w-4 h-4 mr-1" />
                      Iniciar Producao
                    </Button>
                  )}
                  {order.status === 'preparing' && (
                    <Button 
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'ready' })}
                      data-testid={`button-ready-${order.id}`}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Marcar Pronto
                    </Button>
                  )}
                  {order.status !== 'cancelled' && order.status !== 'delivered' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'cancelled' })}
                      data-testid={`button-cancel-${order.id}`}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DeliveryTab() {
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: motoboys = [] } = useQuery<Motoboy[]>({
    queryKey: ['/api/motoboys'],
  });

  const { toast } = useToast();

  const assignMotoboyMutation = useMutation({
    mutationFn: async ({ orderId, motoboyId }: { orderId: string; motoboyId: string }) => {
      return apiRequest('PATCH', `/api/orders/${orderId}/assign`, { motoboyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: 'Motoboy atribuido!' });
    },
  });

  const readyOrders = orders.filter(o => o.status === 'ready');
  const dispatchedOrders = orders.filter(o => o.status === 'dispatched');
  const activeMotoboys = motoboys.filter(m => m.isActive);

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-3xl text-primary">Delivery</h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow" />
            Prontos para Entrega ({readyOrders.length})
          </h3>
          <div className="space-y-4">
            {readyOrders.map(order => (
              <Card key={order.id} data-testid={`card-ready-order-${order.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">Pedido #{order.id.slice(0, 8)}</span>
                    <span className="text-primary font-bold">{formatCurrency(order.total)}</span>
                  </div>
                  <Select 
                    onValueChange={(motoboyId) => assignMotoboyMutation.mutate({ orderId: order.id, motoboyId })}
                  >
                    <SelectTrigger className="bg-secondary border-primary/30" data-testid={`select-motoboy-${order.id}`}>
                      <SelectValue placeholder="Atribuir motoboy" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeMotoboys.map(motoboy => (
                        <SelectItem key={motoboy.id} value={motoboy.id}>
                          {motoboy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))}
            {readyOrders.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum pedido pronto para entrega
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Em Rota ({dispatchedOrders.length})
          </h3>
          <div className="space-y-4">
            {dispatchedOrders.map(order => (
              <Card key={order.id} data-testid={`card-dispatched-order-${order.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">Pedido #{order.id.slice(0, 8)}</span>
                    <StatusBadge status="dispatched" />
                  </div>
                </CardContent>
              </Card>
            ))}
            {dispatchedOrders.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum pedido em rota
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceiroTab() {
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayOrders = deliveredOrders.filter(o => {
    const orderDate = new Date(o.createdAt!);
    return orderDate >= today;
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const weekOrders = deliveredOrders.filter(o => {
    const orderDate = new Date(o.createdAt!);
    return orderDate >= weekAgo;
  });

  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  
  const monthOrders = deliveredOrders.filter(o => {
    const orderDate = new Date(o.createdAt!);
    return orderDate >= monthAgo;
  });

  const totalToday = todayOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalWeek = weekOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalMonth = monthOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalAll = deliveredOrders.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-3xl text-primary">Financeiro</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-today-total">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Hoje</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalToday)}</div>
            <div className="text-xs text-muted-foreground mt-1">{todayOrders.length} pedidos</div>
          </CardContent>
        </Card>
        <Card data-testid="card-week-total">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Semana</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalWeek)}</div>
            <div className="text-xs text-muted-foreground mt-1">{weekOrders.length} pedidos</div>
          </CardContent>
        </Card>
        <Card data-testid="card-month-total">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Mes</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalMonth)}</div>
            <div className="text-xs text-muted-foreground mt-1">{monthOrders.length} pedidos</div>
          </CardContent>
        </Card>
        <Card data-testid="card-total">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Total</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalAll)}</div>
            <div className="text-xs text-muted-foreground mt-1">{deliveredOrders.length} pedidos</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ultimas Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {deliveredOrders.slice(0, 10).map(order => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border/20 last:border-0">
                <div>
                  <span className="font-medium">Pedido #{order.id.slice(0, 8)}</span>
                  <span className="text-muted-foreground text-sm ml-2">
                    {PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod]}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground text-sm">{formatDate(order.createdAt)}</span>
                  <span className="font-bold text-primary">{formatCurrency(order.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PDVTab() {
  const { toast } = useToast();
  
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      return apiRequest('PATCH', `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: 'Status atualizado!' });
    },
  });

  const counterOrders = orders.filter(order => order.orderType === 'counter');

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-3xl text-primary">Vendas Balcao (PDV)</h2>
      
      {isLoading ? (
        <div className="grid gap-4">
          {[1,2,3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : counterOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma venda de balcao encontrada
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {counterOrders.map(order => (
            <Card key={order.id} data-testid={`card-pdv-order-${order.id}`}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">Venda #{order.id.slice(0, 8)}</CardTitle>
                  <StatusBadge status={order.status as OrderStatus} />
                </div>
                <span className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</span>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cliente: </span>
                    <span className="font-medium">{order.customerName || 'Balcao'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-semibold text-primary">{formatCurrency(order.total)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pagamento: </span>
                    <span>{PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod]}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {order.status === 'pending' && (
                    <Button 
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'accepted' })}
                      data-testid={`button-accept-pdv-${order.id}`}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Aceitar
                    </Button>
                  )}
                  {(order.status === 'accepted' || order.status === 'preparing') && (
                    <Button 
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'delivered' })}
                      data-testid={`button-deliver-pdv-${order.id}`}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Finalizar Venda
                    </Button>
                  )}
                  {order.status !== 'cancelled' && order.status !== 'delivered' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'cancelled' })}
                      data-testid={`button-cancel-pdv-${order.id}`}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientesTab() {
  const { toast } = useToast();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const toggleBlockMutation = useMutation({
    mutationFn: async ({ userId, isBlocked }: { userId: string; isBlocked: boolean }) => {
      return apiRequest('PATCH', `/api/users/${userId}`, { isBlocked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'Usuario atualizado!' });
    },
  });

  const customers = users.filter(u => u.role === 'customer');

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-3xl text-primary">Clientes</h2>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border/30">
                <tr>
                  <th className="text-left p-4 text-muted-foreground font-medium">Nome</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">WhatsApp</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Cadastro</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                  <th className="text-right p-4 text-muted-foreground font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(user => (
                  <tr key={user.id} className="border-b border-border/20 last:border-0" data-testid={`row-user-${user.id}`}>
                    <td className="p-4 font-medium">{user.name}</td>
                    <td className="p-4 text-muted-foreground">{user.whatsapp}</td>
                    <td className="p-4 text-muted-foreground">{formatDate(user.createdAt)}</td>
                    <td className="p-4">
                      <Badge className={user.isBlocked ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}>
                        {user.isBlocked ? 'Bloqueado' : 'Ativo'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button 
                        size="sm" 
                        variant={user.isBlocked ? 'default' : 'outline'}
                        onClick={() => toggleBlockMutation.mutate({ userId: user.id, isBlocked: !user.isBlocked })}
                        data-testid={`button-toggle-block-${user.id}`}
                      >
                        {user.isBlocked ? 'Desbloquear' : 'Bloquear'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {customers.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              Nenhum cliente cadastrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProdutosTab() {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      return apiRequest('POST', '/api/products', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: 'Produto criado!' });
      setIsDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      return apiRequest('PATCH', `/api/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: 'Produto atualizado!' });
      setIsDialogOpen(false);
      setEditingProduct(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({ title: 'Produto excluido!' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      categoryId: formData.get('categoryId') as string,
      costPrice: formData.get('costPrice') as string,
      profitMargin: formData.get('profitMargin') as string,
      salePrice: formData.get('salePrice') as string,
      stock: parseInt(formData.get('stock') as string) || 0,
      imageUrl: formData.get('imageUrl') as string,
      productType: formData.get('productType') as string || null,
      isActive: true,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-primary">Produtos</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingProduct(null)} data-testid="button-add-product">
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" defaultValue={editingProduct?.name} required data-testid="input-product-name" />
              </div>
              <div>
                <Label htmlFor="description">Descricao</Label>
                <Textarea id="description" name="description" defaultValue={editingProduct?.description || ''} data-testid="input-product-description" />
              </div>
              <div>
                <Label htmlFor="categoryId">Categoria</Label>
                <Select name="categoryId" defaultValue={editingProduct?.categoryId}>
                  <SelectTrigger data-testid="select-product-category">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="costPrice">Custo</Label>
                  <Input id="costPrice" name="costPrice" type="number" step="0.01" defaultValue={editingProduct?.costPrice || ''} required data-testid="input-product-cost" />
                </div>
                <div>
                  <Label htmlFor="profitMargin">Margem %</Label>
                  <Input id="profitMargin" name="profitMargin" type="number" step="0.01" defaultValue={editingProduct?.profitMargin || ''} required data-testid="input-product-margin" />
                </div>
                <div>
                  <Label htmlFor="salePrice">Venda</Label>
                  <Input id="salePrice" name="salePrice" type="number" step="0.01" defaultValue={editingProduct?.salePrice || ''} required data-testid="input-product-price" />
                </div>
              </div>
              <div>
                <Label htmlFor="stock">Estoque</Label>
                <Input id="stock" name="stock" type="number" defaultValue={editingProduct?.stock || 0} data-testid="input-product-stock" />
              </div>
              <div>
                <Label htmlFor="imageUrl">URL da Imagem</Label>
                <Input id="imageUrl" name="imageUrl" defaultValue={editingProduct?.imageUrl || ''} data-testid="input-product-image" />
              </div>
              <div>
                <Label htmlFor="productType">Tipo (para combo)</Label>
                <Select name="productType" defaultValue={editingProduct?.productType || ''}>
                  <SelectTrigger data-testid="select-product-type">
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="destilado">Destilado</SelectItem>
                    <SelectItem value="gelo">Gelo</SelectItem>
                    <SelectItem value="energetico">Energetico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" data-testid="button-submit-product">
                {editingProduct ? 'Salvar' : 'Criar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map(product => (
          <Card key={product.id} data-testid={`card-product-${product.id}`}>
            <CardContent className="p-4">
              {product.imageUrl && (
                <img src={product.imageUrl} alt={product.name} className="w-full h-32 object-contain mb-3 rounded-lg bg-white/10" />
              )}
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                <span className="text-lg font-bold text-primary">{formatCurrency(product.salePrice)}</span>
                <Badge className={product.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                  {product.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => { setEditingProduct(product); setIsDialogOpen(true); }}
                  data-testid={`button-edit-product-${product.id}`}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => deleteMutation.mutate(product.id)}
                  data-testid={`button-delete-product-${product.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CategoriasTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Category>) => {
      return apiRequest('POST', '/api/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({ title: 'Categoria criada!' });
      setIsDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Category> }) => {
      return apiRequest('PATCH', `/api/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({ title: 'Categoria atualizada!' });
      setIsDialogOpen(false);
      setEditingCategory(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({ title: 'Categoria excluida!' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      iconUrl: formData.get('iconUrl') as string || null,
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
      isActive: true,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-primary">Categorias</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCategory(null)} data-testid="button-add-category">
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" defaultValue={editingCategory?.name} required data-testid="input-category-name" />
              </div>
              <div>
                <Label htmlFor="iconUrl">URL do Icone</Label>
                <Input id="iconUrl" name="iconUrl" defaultValue={editingCategory?.iconUrl || ''} data-testid="input-category-icon" />
              </div>
              <div>
                <Label htmlFor="sortOrder">Ordem</Label>
                <Input id="sortOrder" name="sortOrder" type="number" defaultValue={editingCategory?.sortOrder || 0} data-testid="input-category-order" />
              </div>
              <Button type="submit" className="w-full" data-testid="button-submit-category">
                {editingCategory ? 'Salvar' : 'Criar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map(category => (
          <Card key={category.id} data-testid={`card-category-${category.id}`}>
            <CardContent className="p-4 flex items-center gap-4">
              {category.iconUrl && (
                <img src={category.iconUrl} alt={category.name} className="w-12 h-12 object-contain rounded-full bg-white/10" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{category.name}</h3>
                <p className="text-sm text-muted-foreground">Ordem: {category.sortOrder}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => { setEditingCategory(category); setIsDialogOpen(true); }}
                  data-testid={`button-edit-category-${category.id}`}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(category.id)}
                  data-testid={`button-delete-category-${category.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BannersTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const { toast } = useToast();

  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ['/api/banners'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Banner>) => {
      return apiRequest('POST', '/api/banners', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banners'] });
      toast({ title: 'Banner criado!' });
      setIsDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Banner> }) => {
      return apiRequest('PATCH', `/api/banners/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banners'] });
      toast({ title: 'Banner atualizado!' });
      setIsDialogOpen(false);
      setEditingBanner(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/banners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banners'] });
      toast({ title: 'Banner excluido!' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      description: formData.get('description') as string || null,
      imageUrl: formData.get('imageUrl') as string,
      linkUrl: formData.get('linkUrl') as string || null,
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
      isActive: true,
    };

    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-primary">Banners</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingBanner(null)} data-testid="button-add-banner">
              <Plus className="w-4 h-4 mr-2" />
              Novo Banner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBanner ? 'Editar Banner' : 'Novo Banner'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Titulo</Label>
                <Input id="title" name="title" defaultValue={editingBanner?.title} required data-testid="input-banner-title" />
              </div>
              <div>
                <Label htmlFor="description">Descricao</Label>
                <Textarea id="description" name="description" defaultValue={editingBanner?.description || ''} data-testid="input-banner-description" />
              </div>
              <div>
                <Label htmlFor="imageUrl">URL da Imagem</Label>
                <Input id="imageUrl" name="imageUrl" defaultValue={editingBanner?.imageUrl} required data-testid="input-banner-image" />
              </div>
              <div>
                <Label htmlFor="linkUrl">URL do Link (opcional)</Label>
                <Input id="linkUrl" name="linkUrl" defaultValue={editingBanner?.linkUrl || ''} data-testid="input-banner-link" />
              </div>
              <div>
                <Label htmlFor="sortOrder">Ordem</Label>
                <Input id="sortOrder" name="sortOrder" type="number" defaultValue={editingBanner?.sortOrder || 0} data-testid="input-banner-order" />
              </div>
              <Button type="submit" className="w-full" data-testid="button-submit-banner">
                {editingBanner ? 'Salvar' : 'Criar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {banners.map(banner => (
          <Card key={banner.id} data-testid={`card-banner-${banner.id}`}>
            <CardContent className="p-4 flex flex-wrap items-center gap-4">
              <img src={banner.imageUrl} alt={banner.title} className="w-32 h-16 object-cover rounded-lg" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{banner.title}</h3>
                <p className="text-sm text-muted-foreground truncate">{banner.description}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => { setEditingBanner(banner); setIsDialogOpen(true); }}
                  data-testid={`button-edit-banner-${banner.id}`}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(banner.id)}
                  data-testid={`button-delete-banner-${banner.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MotoboysTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMotoboy, setEditingMotoboy] = useState<Motoboy | null>(null);
  const { toast } = useToast();

  const { data: motoboys = [] } = useQuery<Motoboy[]>({
    queryKey: ['/api/motoboys'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Motoboy>) => {
      return apiRequest('POST', '/api/motoboys', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/motoboys'] });
      toast({ title: 'Motoboy criado!' });
      setIsDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Motoboy> }) => {
      return apiRequest('PATCH', `/api/motoboys/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/motoboys'] });
      toast({ title: 'Motoboy atualizado!' });
      setIsDialogOpen(false);
      setEditingMotoboy(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/motoboys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/motoboys'] });
      toast({ title: 'Motoboy excluido!' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      whatsapp: formData.get('whatsapp') as string,
      photoUrl: formData.get('photoUrl') as string || null,
      isActive: true,
    };

    if (editingMotoboy) {
      updateMutation.mutate({ id: editingMotoboy.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-primary">Motoboys</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingMotoboy(null)} data-testid="button-add-motoboy">
              <Plus className="w-4 h-4 mr-2" />
              Novo Motoboy
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMotoboy ? 'Editar Motoboy' : 'Novo Motoboy'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" defaultValue={editingMotoboy?.name} required data-testid="input-motoboy-name" />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" defaultValue={editingMotoboy?.whatsapp} required data-testid="input-motoboy-whatsapp" />
              </div>
              <div>
                <Label htmlFor="photoUrl">URL da Foto (opcional)</Label>
                <Input id="photoUrl" name="photoUrl" defaultValue={editingMotoboy?.photoUrl || ''} data-testid="input-motoboy-photo" />
              </div>
              <Button type="submit" className="w-full" data-testid="button-submit-motoboy">
                {editingMotoboy ? 'Salvar' : 'Criar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {motoboys.map(motoboy => (
          <Card key={motoboy.id} data-testid={`card-motoboy-${motoboy.id}`}>
            <CardContent className="p-4 flex items-center gap-4">
              {motoboy.photoUrl ? (
                <img src={motoboy.photoUrl} alt={motoboy.name} className="w-12 h-12 object-cover rounded-full" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bike className="w-6 h-6 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{motoboy.name}</h3>
                <p className="text-sm text-muted-foreground">{motoboy.whatsapp}</p>
              </div>
              <Badge className={motoboy.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                {motoboy.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
              <div className="flex gap-2">
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => { setEditingMotoboy(motoboy); setIsDialogOpen(true); }}
                  data-testid={`button-edit-motoboy-${motoboy.id}`}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(motoboy.id)}
                  data-testid={`button-delete-motoboy-${motoboy.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ConfiguracoesTab() {
  const { toast } = useToast();

  const { data: settings } = useQuery<SettingsType>({
    queryKey: ['/api/settings'],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SettingsType>) => {
      return apiRequest('PATCH', '/api/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({ title: 'Configuracoes salvas!' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      storeAddress: formData.get('storeAddress') as string,
      pixKey: formData.get('pixKey') as string,
      deliveryRatePerKm: formData.get('deliveryRatePerKm') as string,
      minDeliveryFee: formData.get('minDeliveryFee') as string,
      maxDeliveryDistance: formData.get('maxDeliveryDistance') as string,
      isOpen: formData.get('isOpen') === 'on',
    };
    updateMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-3xl text-primary">Configuracoes</h2>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="storeAddress">Endereco da Loja</Label>
                <Textarea 
                  id="storeAddress" 
                  name="storeAddress" 
                  defaultValue={settings?.storeAddress || ''} 
                  placeholder="Rua, numero, bairro, cidade"
                  data-testid="input-store-address"
                />
              </div>
              <div>
                <Label htmlFor="pixKey">Chave PIX</Label>
                <Input 
                  id="pixKey" 
                  name="pixKey" 
                  defaultValue={settings?.pixKey || ''} 
                  placeholder="CPF, CNPJ, email ou celular"
                  data-testid="input-pix-key"
                />
              </div>
              <div>
                <Label htmlFor="deliveryRatePerKm">Taxa por KM (R$)</Label>
                <Input 
                  id="deliveryRatePerKm" 
                  name="deliveryRatePerKm" 
                  type="number"
                  step="0.01"
                  defaultValue={settings?.deliveryRatePerKm || '1.25'} 
                  data-testid="input-rate-per-km"
                />
              </div>
              <div>
                <Label htmlFor="minDeliveryFee">Taxa Minima (R$)</Label>
                <Input 
                  id="minDeliveryFee" 
                  name="minDeliveryFee" 
                  type="number"
                  step="0.01"
                  defaultValue={settings?.minDeliveryFee || '5.00'} 
                  data-testid="input-min-fee"
                />
              </div>
              <div>
                <Label htmlFor="maxDeliveryDistance">Distancia Maxima (KM)</Label>
                <Input 
                  id="maxDeliveryDistance" 
                  name="maxDeliveryDistance" 
                  type="number"
                  step="0.1"
                  defaultValue={settings?.maxDeliveryDistance || '15'} 
                  data-testid="input-max-distance"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-secondary rounded-lg">
              <Switch 
                id="isOpen" 
                name="isOpen" 
                defaultChecked={settings?.isOpen ?? true}
                data-testid="switch-store-open"
              />
              <Label htmlFor="isOpen" className="cursor-pointer">
                Loja aberta para pedidos
              </Label>
            </div>

            <Button type="submit" className="w-full" data-testid="button-save-settings">
              <Check className="w-4 h-4 mr-2" />
              Salvar Configuracoes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('pedidos');
  const { user, role, logout } = useAuth();
  const [, setLocation] = useLocation();

  if (role !== 'admin') {
    setLocation('/admin-login');
    return null;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'pedidos': return <OrdersTab />;
      case 'pdv': return <PDVTab />;
      case 'delivery': return <DeliveryTab />;
      case 'financeiro': return <FinanceiroTab />;
      case 'clientes': return <ClientesTab />;
      case 'produtos': return <ProdutosTab />;
      case 'categorias': return <CategoriasTab />;
      case 'banners': return <BannersTab />;
      case 'motoboys': return <MotoboysTab />;
      case 'configuracoes': return <ConfiguracoesTab />;
      default: return <OrdersTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden lg:block">
        <div className="p-6">
          <h1 className="font-serif text-2xl text-primary">VIBE DRINKS</h1>
          <p className="text-sm text-muted-foreground mt-1">Painel Admin</p>
        </div>
        
        <nav className="px-3 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  isActive 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                    : 'text-sidebar-foreground hover-elevate'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground">Administrador</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => { logout(); setLocation('/'); }}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="lg:hidden mb-6">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full bg-secondary" data-testid="select-mobile-tab">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabs.map(tab => (
                <SelectItem key={tab.id} value={tab.id}>{tab.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {renderTab()}
      </main>
    </div>
  );
}
