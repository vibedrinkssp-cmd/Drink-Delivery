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
  User as UserIcon,
  Wine,
  Beer,
  Grape,
  Snowflake,
  Zap,
  GlassWater,
  Utensils,
  Droplets,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Eye,
  Phone,
  Key,
  Power,
  Wifi,
  WifiOff,
  Search,
  GripVertical,
  FileText,
  Download,
  Warehouse,
  AlertTriangle,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useRef} from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
import { useOrderUpdates } from '@/hooks/use-order-updates';
import { useNotificationSound } from '@/hooks/use-notification-sound';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ProductImageUploader } from '@/components/ProductImageUploader';
import { ExpandableOrderCard } from '@/components/ExpandableOrderCard';
import type { Order, Product, Category, Motoboy, User, Settings as SettingsType, OrderItem, Address, DeliveryZone, Neighborhood } from '@shared/schema';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, ORDER_TYPE_LABELS, type OrderStatus, type PaymentMethod, type OrderType } from '@shared/schema';

const tabs = [
  { id: 'pedidos', label: 'Pedidos', icon: Package },
  { id: 'pdv', label: 'PDV', icon: ShoppingCart },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'estoque', label: 'Estoque', icon: Warehouse },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'produtos', label: 'Produtos', icon: ShoppingBag },
  { id: 'categorias', label: 'Categorias', icon: Grid3X3 },
  { id: 'motoboys', label: 'Motoboys', icon: Bike },
  { id: 'zonas', label: 'Zonas', icon: MapPin },
  { id: 'configuracoes', label: 'Configuracoes', icon: Settings },
];

import { getCategoryIcon, CATEGORY_ICONS, suggestIconForCategory } from '@/lib/category-icons';

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
    arrived: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    delivered: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
  };
  
  return (
    <Badge className={`${colors[status]} border`}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

interface OrderWithDetails extends Order {
  items?: OrderItem[];
  userName?: string;
  userWhatsapp?: string;
  motoboy?: Motoboy;
}

function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ORDERS_PER_PAGE = 30;
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: motoboysData = [] } = useQuery<Motoboy[]>({
    queryKey: ['/api/motoboys'],
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
  });

  const ordersWithDetails: OrderWithDetails[] = orders.map(order => {
    const user = users.find(u => u.id === order.userId);
    const motoboy = order.motoboyId ? motoboysData.find(m => m.id === order.motoboyId) : undefined;
    return {
      ...order,
      items: orderItems.filter(item => item.orderId === order.id),
      userName: user?.name || order.customerName || 'Cliente',
      userWhatsapp: user?.whatsapp,
      motoboy,
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
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest('DELETE', `/api/orders/${orderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/order-items'] });
      toast({ title: 'Pedido excluido!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir pedido', variant: 'destructive' });
    },
  });

  const editDeliveryFeeMutation = useMutation({
    mutationFn: async ({ orderId, newFee }: { orderId: string; newFee: number }) => {
      return apiRequest('PATCH', `/api/orders/${orderId}/delivery-fee`, { deliveryFee: newFee });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: 'Taxa de entrega atualizada!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar taxa de entrega', variant: 'destructive' });
    },
  });

  const handleEditDeliveryFee = (orderId: string, newFee: number) => {
    editDeliveryFeeMutation.mutate({ orderId, newFee });
  };

  const filteredOrders = ordersWithDetails.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = searchLower === '' || 
      order.id.toLowerCase().includes(searchLower) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
      (order.userName && order.userName.toLowerCase().includes(searchLower));
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const renderOrderActions = (order: OrderWithDetails) => {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {order.status === 'pending' && (
          <>
            <Button 
              size="sm"
              onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'accepted' })}
              disabled={updateStatusMutation.isPending}
              data-testid={`button-accept-${order.id}`}
            >
              <Check className="w-4 h-4 mr-1" />
              Aceitar
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'cancelled' })}
              disabled={updateStatusMutation.isPending}
              data-testid={`button-cancel-${order.id}`}
            >
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground/50"
          onClick={() => {
            if (confirm('Tem certeza que deseja excluir este pedido?')) {
              deleteOrderMutation.mutate(order.id);
            }
          }}
          disabled={deleteOrderMutation.isPending}
          data-testid={`button-delete-order-${order.id}`}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Excluir
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-primary">Pedidos</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID ou cliente..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 w-64 bg-secondary border-primary/30"
              data-testid="input-search-orders"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
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
        <>
          <div className="text-sm text-muted-foreground">
            Mostrando {(currentPage - 1) * ORDERS_PER_PAGE + 1} - {Math.min(currentPage * ORDERS_PER_PAGE, filteredOrders.length)} de {filteredOrders.length} pedidos
          </div>
          <div className="grid gap-4">
            {paginatedOrders.map(order => (
              <ExpandableOrderCard
                key={order.id}
                order={order}
                variant="admin"
                defaultExpanded={false}
                showActions={true}
                actions={renderOrderActions(order)}
                onEditDeliveryFee={handleEditDeliveryFee}
                isEditingDeliveryFee={editDeliveryFeeMutation.isPending}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Pagina {currentPage} de {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page"
              >
                Proxima
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DeliveryTab() {
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: motoboys = [] } = useQuery<Motoboy[]>({
    queryKey: ['/api/motoboys'],
  });

  const { toast } = useToast();

  const orderIds = orders.map(o => o.id).join(',');
  
  const { data: orderItems = [] } = useQuery<OrderItem[]>({
    queryKey: ['/api/order-items', 'delivery', orderIds],
    queryFn: async () => {
      if (!orderIds) return [];
      const res = await fetch(`/api/order-items?orderIds=${encodeURIComponent(orderIds)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: orders.length > 0,
  });

  const ordersWithDetails: OrderWithDetails[] = orders.map(order => {
    const user = users.find(u => u.id === order.userId);
    const motoboy = order.motoboyId ? motoboys.find(m => m.id === order.motoboyId) : undefined;
    return {
      ...order,
      items: orderItems.filter(item => item.orderId === order.id),
      userName: user?.name || order.customerName || 'Cliente',
      userWhatsapp: user?.whatsapp,
      motoboy,
    };
  });

  const assignMotoboyMutation = useMutation({
    mutationFn: async ({ orderId, motoboyId }: { orderId: string; motoboyId: string }) => {
      return apiRequest('PATCH', `/api/orders/${orderId}/assign`, { motoboyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: 'Motoboy atribuido!' });
    },
  });

  const readyOrders = ordersWithDetails.filter(o => o.status === 'ready');
  const dispatchedOrders = ordersWithDetails.filter(o => o.status === 'dispatched');
  const activeMotoboys = motoboys.filter(m => m.isActive);

  const renderReadyOrderActions = (order: OrderWithDetails) => (
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
  );

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
              <ExpandableOrderCard
                key={order.id}
                order={order}
                variant="admin"
                defaultExpanded={false}
                showActions={true}
                actions={renderReadyOrderActions(order)}
              />
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
              <ExpandableOrderCard
                key={order.id}
                order={order}
                variant="admin"
                defaultExpanded={false}
                showActions={false}
              />
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
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  
  const getDateRange = (): { start: Date; end: Date } => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    let start = new Date();
    
    switch (dateFilter) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (customStartDate) {
          start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
        }
        if (customEndDate) {
          const customEnd = new Date(customEndDate);
          customEnd.setHours(23, 59, 59, 999);
          return { start, end: customEnd };
        }
        break;
    }
    return { start, end };
  };

  const { start: filterStart, end: filterEnd } = getDateRange();
  
  const filteredOrders = deliveredOrders.filter(o => {
    const orderDate = new Date(o.createdAt!);
    return orderDate >= filterStart && orderDate <= filterEnd;
  });

  const filteredOrderIds = filteredOrders.map(o => o.id).join(',');
  
  const { data: orderItems = [] } = useQuery<(typeof import('@shared/schema').orderItems.$inferSelect)[]>({
    queryKey: ['/api/order-items', filteredOrderIds],
    queryFn: async () => {
      if (!filteredOrderIds) return [];
      const res = await fetch(`/api/order-items?orderIds=${encodeURIComponent(filteredOrderIds)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: filteredOrders.length > 0,
  });

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalDeliveryFees = filteredOrders.reduce((sum, o) => sum + Number(o.deliveryFee), 0);
  const totalSubtotal = filteredOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
  const totalDiscount = filteredOrders.reduce((sum, o) => sum + Number(o.discount || 0), 0);
  const avgTicket = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

  const paymentBreakdown = filteredOrders.reduce((acc, order) => {
    const method = order.paymentMethod as PaymentMethod;
    acc[method] = (acc[method] || 0) + Number(order.total);
    return acc;
  }, {} as Record<PaymentMethod, number>);

  const paymentChartData = Object.entries(paymentBreakdown).map(([method, value]) => ({
    name: PAYMENT_METHOD_LABELS[method as PaymentMethod] || method,
    value: Number(value.toFixed(2)),
  }));

  const orderTypeBreakdown = filteredOrders.reduce((acc, order) => {
    const type = order.orderType as OrderType;
    acc[type] = (acc[type] || 0) + Number(order.total);
    return acc;
  }, {} as Record<OrderType, number>);

  const orderTypeChartData = Object.entries(orderTypeBreakdown).map(([type, value]) => ({
    name: ORDER_TYPE_LABELS[type as OrderType] || type,
    value: Number(value.toFixed(2)),
  }));

  const revenueByDay = filteredOrders.reduce((acc, order) => {
    const date = new Date(order.createdAt!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    acc[date] = (acc[date] || 0) + Number(order.total);
    return acc;
  }, {} as Record<string, number>);

  const revenueChartData = Object.entries(revenueByDay)
    .map(([date, revenue]) => ({ date, revenue: Number(revenue.toFixed(2)) }))
    .sort((a, b) => {
      const [dayA, monthA] = a.date.split('/').map(Number);
      const [dayB, monthB] = b.date.split('/').map(Number);
      if (monthA !== monthB) return monthA - monthB;
      return dayA - dayB;
    });

  const productSales = orderItems
    .reduce((acc, item) => {
      const key = item.productId;
      if (!acc[key]) {
        acc[key] = { productId: key, productName: item.productName, quantity: 0, revenue: 0 };
      }
      acc[key].quantity += item.quantity;
      acc[key].revenue += Number(item.totalPrice);
      return acc;
    }, {} as Record<string, { productId: string; productName: string; quantity: number; revenue: number }>);

  const allProductSales = Object.values(productSales);
  
  const topProducts = allProductSales
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const estimatedCost = allProductSales.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      return sum + (Number(product.costPrice) * item.quantity);
    }
    return sum;
  }, 0);

  const estimatedProfit = totalSubtotal - estimatedCost;
  const profitMargin = totalSubtotal > 0 ? (estimatedProfit / totalSubtotal) * 100 : 0;

  const CHART_COLORS = ['#FFD700', '#FFC400', '#DAA520', '#B8860B', '#CD853F'];

  const handleExport = () => {
    const csvData = [
      ['Relatorio Financeiro - Vibe Drinks'],
      [`Periodo: ${filterStart.toLocaleDateString('pt-BR')} - ${filterEnd.toLocaleDateString('pt-BR')}`],
      [''],
      ['Resumo Geral'],
      ['Total de Pedidos', filteredOrders.length.toString()],
      ['Receita Total', formatCurrency(totalRevenue)],
      ['Subtotal Produtos', formatCurrency(totalSubtotal)],
      ['Taxa de Entrega', formatCurrency(totalDeliveryFees)],
      ['Descontos', formatCurrency(totalDiscount)],
      ['Ticket Medio', formatCurrency(avgTicket)],
      ['Lucro Estimado', formatCurrency(estimatedProfit)],
      [`Margem de Lucro`, `${profitMargin.toFixed(1)}%`],
      [''],
      ['Vendas por Forma de Pagamento'],
      ...paymentChartData.map(p => [p.name, formatCurrency(p.value)]),
      [''],
      ['Vendas por Tipo de Pedido'],
      ...orderTypeChartData.map(o => [o.name, formatCurrency(o.value)]),
      [''],
      ['Top 10 Produtos'],
      ['Produto', 'Quantidade', 'Receita'],
      ...topProducts.map(p => [p.productName, p.quantity.toString(), formatCurrency(p.revenue)]),
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-primary">Financeiro</h2>
        <Button onClick={handleExport} variant="outline" data-testid="button-export-report">
          <DollarSign className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <Card data-testid="card-date-filter">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Periodo:</span>
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                variant={dateFilter === 'today' ? 'default' : 'outline'}
                onClick={() => setDateFilter('today')}
                data-testid="button-filter-today"
              >
                Hoje
              </Button>
              <Button 
                size="sm" 
                variant={dateFilter === 'week' ? 'default' : 'outline'}
                onClick={() => setDateFilter('week')}
                data-testid="button-filter-week"
              >
                7 dias
              </Button>
              <Button 
                size="sm" 
                variant={dateFilter === 'month' ? 'default' : 'outline'}
                onClick={() => setDateFilter('month')}
                data-testid="button-filter-month"
              >
                30 dias
              </Button>
              <Button 
                size="sm" 
                variant={dateFilter === 'custom' ? 'default' : 'outline'}
                onClick={() => setDateFilter('custom')}
                data-testid="button-filter-custom"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Personalizado
              </Button>
            </div>
            {dateFilter === 'custom' && (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-40"
                  data-testid="input-start-date"
                />
                <span className="text-muted-foreground">ate</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-40"
                  data-testid="input-end-date"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-revenue">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Receita Total</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</div>
            <div className="text-xs text-muted-foreground mt-1">{filteredOrders.length} pedidos</div>
          </CardContent>
        </Card>
        <Card data-testid="card-avg-ticket">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Ticket Medio</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(avgTicket)}</div>
            <div className="text-xs text-muted-foreground mt-1">por pedido</div>
          </CardContent>
        </Card>
        <Card data-testid="card-profit">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Lucro Estimado</div>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(estimatedProfit)}</div>
            <div className="text-xs text-muted-foreground mt-1">margem: {profitMargin.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card data-testid="card-delivery-fees">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-1">Taxa de Entrega</div>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalDeliveryFees)}</div>
            <div className="text-xs text-muted-foreground mt-1">descontos: {formatCurrency(totalDiscount)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-revenue-chart">
          <CardHeader>
            <CardTitle className="text-lg">Receita por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData}>
                    <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#888', fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Receita']}
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="revenue" fill="#FFD700" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Sem dados para o periodo selecionado
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-payment-chart">
          <CardHeader>
            <CardTitle className="text-lg">Formas de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {paymentChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Total']}
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Sem dados para o periodo selecionado
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-order-type-chart">
          <CardHeader>
            <CardTitle className="text-lg">Tipo de Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            {orderTypeChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={orderTypeChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {orderTypeChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Total']}
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Sem dados para o periodo selecionado
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-top-products">
          <CardHeader>
            <CardTitle className="text-lg">Top 10 Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {topProducts.map((product, index) => (
                  <div 
                    key={product.productId} 
                    className="flex items-center justify-between py-2 border-b border-border/20 last:border-0"
                    data-testid={`row-top-product-${index}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-muted-foreground w-5">#{index + 1}</span>
                      <span className="truncate font-medium">{product.productName}</span>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <Badge variant="secondary" className="text-xs">{product.quantity}x</Badge>
                      <span className="font-bold text-primary">{formatCurrency(product.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Sem dados para o periodo selecionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ultimas Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredOrders.slice(0, 15).map(order => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border/20 last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">Pedido #{order.id.slice(0, 8)}</span>
                  <Badge variant="outline" className="text-xs">
                    {PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod]}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {ORDER_TYPE_LABELS[order.orderType as OrderType]}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground text-sm">{formatDate(order.createdAt)}</span>
                  <span className="font-bold text-primary">{formatCurrency(order.total)}</span>
                </div>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                Nenhuma venda no periodo selecionado
              </div>
            )}
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

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest('DELETE', `/api/orders/${orderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: 'Venda excluida!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir venda', variant: 'destructive' });
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
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground/50 hover:text-destructive"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir esta venda?')) {
                        deleteOrderMutation.mutate(order.id);
                      }
                    }}
                    disabled={deleteOrderMutation.isPending}
                    data-testid={`button-delete-pdv-order-${order.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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

interface StockReportSummary {
  totalProducts: number;
  activeProducts: number;
  totalUnitsInStock: number;
  totalCostValue: number;
  totalSaleValue: number;
  totalPotentialProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface StockReportProduct {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  stock: number;
  costPrice: number;
  salePrice: number;
  profitMargin: number;
  profitPerUnit: number;
  totalCostValue: number;
  totalSaleValue: number;
  totalPotentialProfit: number;
  isActive: boolean;
}

interface StockReportData {
  summary: StockReportSummary;
  products: StockReportProduct[];
}

interface LowStockProduct {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  currentStock: number;
  suggestedPurchase: number;
  costPrice: number;
  estimatedPurchaseCost: number;
}

interface LowStockData {
  summary: {
    totalLowStockItems: number;
    totalEstimatedPurchaseCost: number;
    threshold: number;
  };
  products: LowStockProduct[];
}

function EstoqueTab() {
  const [showReport, setShowReport] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);
  const { toast } = useToast();

  const { data: stockReport, isLoading: isLoadingReport, refetch: refetchReport } = useQuery<StockReportData>({
    queryKey: ['/api/stock/report'],
    enabled: showReport,
  });

  const { data: lowStockData, isLoading: isLoadingLowStock, refetch: refetchLowStock } = useQuery<LowStockData>({
    queryKey: ['/api/stock/low-stock'],
    enabled: showLowStock,
  });

  const handleGenerateReport = () => {
    setShowReport(true);
    setShowLowStock(false);
    if (showReport) {
      refetchReport();
    }
  };

  const handleShowLowStock = () => {
    setShowLowStock(true);
    setShowReport(false);
    if (showLowStock) {
      refetchLowStock();
    }
  };

  const handleExportStockReport = () => {
    if (!stockReport) return;
    
    const csvData = [
      ['Relatorio de Estoque - Vibe Drinks'],
      ['Data:', new Date().toLocaleDateString('pt-BR')],
      [],
      ['RESUMO'],
      ['Total de Produtos:', stockReport.summary.totalProducts],
      ['Produtos Ativos:', stockReport.summary.activeProducts],
      ['Unidades em Estoque:', stockReport.summary.totalUnitsInStock],
      ['Valor Total em Custo:', formatCurrency(stockReport.summary.totalCostValue)],
      ['Valor Total em Venda:', formatCurrency(stockReport.summary.totalSaleValue)],
      ['Lucro Potencial:', formatCurrency(stockReport.summary.totalPotentialProfit)],
      ['Produtos com Estoque Baixo:', stockReport.summary.lowStockCount],
      ['Produtos sem Estoque:', stockReport.summary.outOfStockCount],
      [],
      ['PRODUTOS'],
      ['Nome', 'Categoria', 'Estoque', 'Custo Unit.', 'Venda Unit.', 'Margem %', 'Valor Custo Total', 'Valor Venda Total', 'Lucro Potencial', 'Ativo'],
      ...stockReport.products.map(p => [
        p.name,
        p.categoryName,
        p.stock,
        p.costPrice.toFixed(2),
        p.salePrice.toFixed(2),
        p.profitMargin.toFixed(1) + '%',
        p.totalCostValue.toFixed(2),
        p.totalSaleValue.toFixed(2),
        p.totalPotentialProfit.toFixed(2),
        p.isActive ? 'Sim' : 'Nao',
      ]),
    ];
    
    const csv = csvData.map(row => Array.isArray(row) ? row.join(',') : row).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-estoque-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Relatorio exportado!' });
  };

  const handleExportLowStock = () => {
    if (!lowStockData) return;
    
    const csvData = [
      ['Lista de Compras - Vibe Drinks'],
      ['Data:', new Date().toLocaleDateString('pt-BR')],
      [],
      ['RESUMO'],
      ['Produtos com Estoque Baixo:', lowStockData.summary.totalLowStockItems],
      ['Custo Estimado de Compra:', formatCurrency(lowStockData.summary.totalEstimatedPurchaseCost)],
      [],
      ['PRODUTOS PARA COMPRAR'],
      ['Nome', 'Categoria', 'Estoque Atual', 'Qtd Sugerida', 'Custo Unit.', 'Custo Estimado'],
      ...lowStockData.products.map(p => [
        p.name,
        p.categoryName,
        p.currentStock,
        p.suggestedPurchase,
        p.costPrice.toFixed(2),
        p.estimatedPurchaseCost.toFixed(2),
      ]),
    ];
    
    const csv = csvData.map(row => Array.isArray(row) ? row.join(',') : row).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lista-compras-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Lista de compras exportada!' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-primary">Estoque</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleGenerateReport} data-testid="button-generate-stock-report">
            <BarChart3 className="w-4 h-4 mr-2" />
            Relatorio de Estoque
          </Button>
          <Button variant="outline" onClick={handleShowLowStock} data-testid="button-show-low-stock">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Lista de Compras
          </Button>
        </div>
      </div>

      {!showReport && !showLowStock && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Warehouse className="w-16 h-16 mx-auto mb-4 text-primary/50" />
            <p className="text-lg mb-2">Gerenciamento de Estoque</p>
            <p className="text-sm">Clique em um dos botoes acima para gerar relatorios ou ver a lista de compras</p>
          </CardContent>
        </Card>
      )}

      {showReport && (
        <div className="space-y-6">
          {isLoadingReport ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-24" />
                </Card>
              ))}
            </div>
          ) : stockReport && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-xl font-semibold">Relatorio Completo de Estoque</h3>
                <Button variant="outline" size="sm" onClick={handleExportStockReport} data-testid="button-export-stock-report">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Produtos</CardTitle>
                    <Package className="w-4 h-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" data-testid="text-total-products">{stockReport.summary.totalProducts}</p>
                    <p className="text-xs text-muted-foreground">{stockReport.summary.activeProducts} ativos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Unidades em Estoque</CardTitle>
                    <Warehouse className="w-4 h-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" data-testid="text-total-units">{stockReport.summary.totalUnitsInStock}</p>
                    <p className="text-xs text-muted-foreground">unidades totais</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Valor em Custo</CardTitle>
                    <DollarSign className="w-4 h-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" data-testid="text-total-cost">{formatCurrency(stockReport.summary.totalCostValue)}</p>
                    <p className="text-xs text-muted-foreground">investido em estoque</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Valor em Venda</CardTitle>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-500" data-testid="text-total-sale">{formatCurrency(stockReport.summary.totalSaleValue)}</p>
                    <p className="text-xs text-muted-foreground">potencial de faturamento</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Potencial</CardTitle>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-primary" data-testid="text-potential-profit">{formatCurrency(stockReport.summary.totalPotentialProfit)}</p>
                    <p className="text-xs text-muted-foreground">se tudo for vendido</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Estoque Baixo</CardTitle>
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-yellow-500" data-testid="text-low-stock-count">{stockReport.summary.lowStockCount}</p>
                    <p className="text-xs text-muted-foreground">produtos com menos de 10 un</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Sem Estoque</CardTitle>
                    <X className="w-4 h-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-destructive" data-testid="text-out-of-stock">{stockReport.summary.outOfStockCount}</p>
                    <p className="text-xs text-muted-foreground">produtos zerados</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Detalhes por Produto</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-border/30">
                        <tr>
                          <th className="text-left p-4 text-muted-foreground font-medium">Produto</th>
                          <th className="text-left p-4 text-muted-foreground font-medium">Categoria</th>
                          <th className="text-right p-4 text-muted-foreground font-medium">Estoque</th>
                          <th className="text-right p-4 text-muted-foreground font-medium">Custo</th>
                          <th className="text-right p-4 text-muted-foreground font-medium">Venda</th>
                          <th className="text-right p-4 text-muted-foreground font-medium">Margem</th>
                          <th className="text-right p-4 text-muted-foreground font-medium">Valor Custo</th>
                          <th className="text-right p-4 text-muted-foreground font-medium">Valor Venda</th>
                          <th className="text-center p-4 text-muted-foreground font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockReport.products.map(product => (
                          <tr key={product.id} className="border-b border-border/20 last:border-0" data-testid={`row-stock-${product.id}`}>
                            <td className="p-4 font-medium">{product.name}</td>
                            <td className="p-4 text-muted-foreground">{product.categoryName}</td>
                            <td className="p-4 text-right">
                              <span className={`font-medium ${product.stock === 0 ? 'text-destructive' : product.stock < 10 ? 'text-yellow-500' : ''}`}>
                                {product.stock}
                              </span>
                            </td>
                            <td className="p-4 text-right">{formatCurrency(product.costPrice)}</td>
                            <td className="p-4 text-right font-medium">{formatCurrency(product.salePrice)}</td>
                            <td className="p-4 text-right">{product.profitMargin.toFixed(1)}%</td>
                            <td className="p-4 text-right">{formatCurrency(product.totalCostValue)}</td>
                            <td className="p-4 text-right font-medium text-primary">{formatCurrency(product.totalSaleValue)}</td>
                            <td className="p-4 text-center">
                              <Badge className={product.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                                {product.isActive ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {stockReport.products.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground">
                      Nenhum produto cadastrado
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {showLowStock && (
        <div className="space-y-6">
          {isLoadingLowStock ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-24" />
                </Card>
              ))}
            </div>
          ) : lowStockData && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-xl font-semibold">Lista de Compras Sugerida</h3>
                <Button variant="outline" size="sm" onClick={handleExportLowStock} data-testid="button-export-low-stock">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Produtos com Estoque Baixo</CardTitle>
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-yellow-500" data-testid="text-low-stock-items">{lowStockData.summary.totalLowStockItems}</p>
                    <p className="text-xs text-muted-foreground">produtos precisam repor</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Custo Estimado de Compra</CardTitle>
                    <DollarSign className="w-4 h-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold" data-testid="text-estimated-cost">{formatCurrency(lowStockData.summary.totalEstimatedPurchaseCost)}</p>
                    <p className="text-xs text-muted-foreground">para repor todos os itens</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Produtos para Comprar</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-border/30">
                        <tr>
                          <th className="text-left p-4 text-muted-foreground font-medium">Produto</th>
                          <th className="text-left p-4 text-muted-foreground font-medium">Categoria</th>
                          <th className="text-right p-4 text-muted-foreground font-medium">Estoque Atual</th>
                          <th className="text-right p-4 text-muted-foreground font-medium">Qtd Sugerida</th>
                          <th className="text-right p-4 text-muted-foreground font-medium">Custo Unit.</th>
                          <th className="text-right p-4 text-muted-foreground font-medium">Custo Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockData.products.map(product => (
                          <tr key={product.id} className="border-b border-border/20 last:border-0" data-testid={`row-low-stock-${product.id}`}>
                            <td className="p-4 font-medium">{product.name}</td>
                            <td className="p-4 text-muted-foreground">{product.categoryName}</td>
                            <td className="p-4 text-right">
                              <span className={`font-medium ${product.currentStock === 0 ? 'text-destructive' : 'text-yellow-500'}`}>
                                {product.currentStock}
                              </span>
                            </td>
                            <td className="p-4 text-right font-medium text-primary">{product.suggestedPurchase}</td>
                            <td className="p-4 text-right">{formatCurrency(product.costPrice)}</td>
                            <td className="p-4 text-right font-medium">{formatCurrency(product.estimatedPurchaseCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {lowStockData.products.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground">
                      <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                      <p>Todos os produtos estao com estoque adequado!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ClientesTab() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const CUSTOMERS_PER_PAGE = 20;

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: customerAddresses = [] } = useQuery<Address[]>({
    queryKey: ['/api/addresses', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return [];
      const res = await fetch(`/api/addresses/${selectedCustomer.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedCustomer?.id && detailsOpen,
  });

  const { data: customerOrders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders/user', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return [];
      const res = await fetch(`/api/orders/user/${selectedCustomer.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedCustomer?.id && detailsOpen,
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

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest('DELETE', `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'Cliente excluido!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir cliente', variant: 'destructive' });
    },
  });

  const customers = users.filter(u => u.role === 'customer');

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = searchLower === '' ||
      customer.name.toLowerCase().includes(searchLower) ||
      customer.whatsapp.toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && !customer.isBlocked) ||
      (statusFilter === 'blocked' && customer.isBlocked);
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * CUSTOMERS_PER_PAGE,
    currentPage * CUSTOMERS_PER_PAGE
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as 'all' | 'active' | 'blocked');
    setCurrentPage(1);
  };

  const openCustomerDetails = (customer: User) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);
  };

  const customerTotalSpent = customerOrders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-primary">Clientes</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou WhatsApp..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 w-64 bg-secondary border-primary/30"
              data-testid="input-search-customers"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-40 bg-secondary border-primary/30" data-testid="select-status-filter-customers">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="blocked">Bloqueados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-16" />
            </Card>
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchTerm || statusFilter !== 'all' ? 'Nenhum cliente encontrado com os filtros aplicados' : 'Nenhum cliente cadastrado'}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            Mostrando {(currentPage - 1) * CUSTOMERS_PER_PAGE + 1} - {Math.min(currentPage * CUSTOMERS_PER_PAGE, filteredCustomers.length)} de {filteredCustomers.length} clientes
          </div>
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
                    {paginatedCustomers.map(user => (
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
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openCustomerDetails(user)}
                              data-testid={`button-view-customer-${user.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant={user.isBlocked ? 'default' : 'outline'}
                              onClick={() => toggleBlockMutation.mutate({ userId: user.id, isBlocked: !user.isBlocked })}
                              data-testid={`button-toggle-block-${user.id}`}
                            >
                              {user.isBlocked ? 'Desbloquear' : 'Bloquear'}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground/50"
                              onClick={() => {
                                if (confirm('Tem certeza que deseja excluir este cliente? Esta acao nao pode ser desfeita.')) {
                                  deleteMutation.mutate(user.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                data-testid="button-prev-page-customers"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Pagina {currentPage} de {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                data-testid="button-next-page-customers"
              >
                Proxima
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <UserIcon className="w-5 h-5 text-primary" />
              Detalhes do Cliente
            </DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Nome</Label>
                      <p className="font-medium" data-testid="text-customer-name">{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">WhatsApp</Label>
                      <p className="font-medium flex items-center gap-1" data-testid="text-customer-whatsapp">
                        <Phone className="w-3 h-3" />
                        {selectedCustomer.whatsapp}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Cadastrado em</Label>
                      <p className="font-medium" data-testid="text-customer-created">{formatDate(selectedCustomer.createdAt)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Status</Label>
                      <Badge className={selectedCustomer.isBlocked ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}>
                        {selectedCustomer.isBlocked ? 'Bloqueado' : 'Ativo'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-primary" />
                  Enderecos ({customerAddresses.length})
                </h3>
                {customerAddresses.length === 0 ? (
                  <Card>
                    <CardContent className="py-6 text-center text-muted-foreground">
                      Nenhum endereco cadastrado
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {customerAddresses.map(addr => (
                      <Card key={addr.id}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">
                                {addr.street}, {addr.number}
                                {addr.complement && ` - ${addr.complement}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {addr.neighborhood} - {addr.city}/{addr.state}
                              </p>
                              <p className="text-xs text-muted-foreground">CEP: {addr.zipCode}</p>
                              {addr.notes && (
                                <p className="text-xs text-muted-foreground mt-1">Obs: {addr.notes}</p>
                              )}
                            </div>
                            {addr.isDefault && (
                              <Badge variant="outline" className="text-xs">Principal</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  Historico de Pedidos ({customerOrders.length})
                </h3>
                {customerOrders.length === 0 ? (
                  <Card>
                    <CardContent className="py-6 text-center text-muted-foreground">
                      Nenhum pedido realizado
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <Card className="mb-3">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div>
                            <p className="text-xs text-muted-foreground">Total de Pedidos</p>
                            <p className="font-semibold">{customerOrders.length}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Entregues</p>
                            <p className="font-semibold">{customerOrders.filter(o => o.status === 'delivered').length}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Gasto</p>
                            <p className="font-semibold text-primary">{formatCurrency(customerTotalSpent)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <ScrollArea className="h-48">
                      <div className="space-y-2 pr-4">
                        {customerOrders.slice(0, 10).map(order => (
                          <Card key={order.id}>
                            <CardContent className="py-2 px-4">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div>
                                  <p className="text-xs text-muted-foreground">#{order.id.slice(0, 8)}</p>
                                  <p className="text-sm">{formatDate(order.createdAt)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={order.status as OrderStatus} />
                                  <span className="font-medium text-primary">{formatCurrency(order.total)}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <ScrollBar orientation="vertical" />
                    </ScrollArea>
                    {customerOrders.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Mostrando os 10 ultimos pedidos
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableProductItem({ 
  product, 
  category,
  onEdit, 
  onDelete,
  formatCurrency 
}: { 
  product: Product; 
  category: Category | undefined;
  onEdit: (prod: Product) => void; 
  onDelete: (id: string) => void;
  formatCurrency: (value: number | string) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style}
      className={isDragging ? 'z-50' : ''}
      data-testid={`card-product-${product.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted mt-1 flex-shrink-0"
            data-testid={`drag-handle-product-${product.id}`}
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-16 h-16 object-contain rounded-lg bg-white/10 flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{product.name}</h3>
            {category && (
              <p className="text-xs text-muted-foreground">{category.name}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge className={product.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                {product.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
              {product.productType && (
                <Badge className="bg-primary/20 text-primary">
                  {product.productType}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          <div className="bg-secondary/50 rounded-md p-2">
            <span className="text-muted-foreground text-xs block">Custo</span>
            <span className="font-medium">{formatCurrency(product.costPrice)}</span>
          </div>
          <div className="bg-secondary/50 rounded-md p-2">
            <span className="text-muted-foreground text-xs block">Venda</span>
            <span className="font-bold text-primary">{formatCurrency(product.salePrice)}</span>
          </div>
          <div className="bg-secondary/50 rounded-md p-2">
            <span className="text-muted-foreground text-xs block">Margem</span>
            <span className="font-medium">{product.profitMargin}%</span>
          </div>
          <div className="bg-secondary/50 rounded-md p-2">
            <span className="text-muted-foreground text-xs block">Estoque</span>
            <span className={`font-medium ${product.stock <= 5 ? 'text-destructive' : product.stock <= 15 ? 'text-primary' : 'text-foreground'}`}>
              {product.stock} un
            </span>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => onEdit(product)}
            data-testid={`button-edit-product-${product.id}`}
          >
            <Edit2 className="w-4 h-4 mr-1" />
            Editar
          </Button>
          <Button 
            size="icon" 
            variant="ghost"
            onClick={() => onDelete(product.id)}
            data-testid={`button-delete-product-${product.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProdutosTab() {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [costPrice, setCostPrice] = useState<string>('');
  const [profitMargin, setProfitMargin] = useState<string>('');
  const [salePrice, setSalePrice] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [isImporting, setIsImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleOpenDialog = (product: Product | null) => {
    setEditingProduct(product);
    setUploadedImageUrl(product?.imageUrl || null);
    setCostPrice(product?.costPrice || '');
    setProfitMargin(product?.profitMargin || '');
    setSalePrice(product?.salePrice || '');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      setEditingProduct(null);
      setUploadedImageUrl(null);
      setCostPrice('');
      setProfitMargin('');
      setSalePrice('');
    }
    setIsDialogOpen(open);
  };

  const handleCostPriceChange = (value: string) => {
    setCostPrice(value);
    const cost = parseFloat(value);
    const margin = parseFloat(profitMargin);
    if (!isNaN(cost) && !isNaN(margin) && cost > 0) {
      const newSalePrice = cost * (1 + margin / 100);
      setSalePrice(newSalePrice.toFixed(2));
    }
  };

  const handleProfitMarginChange = (value: string) => {
    setProfitMargin(value);
    const cost = parseFloat(costPrice);
    const margin = parseFloat(value);
    if (!isNaN(cost) && !isNaN(margin) && cost > 0) {
      const newSalePrice = cost * (1 + margin / 100);
      setSalePrice(newSalePrice.toFixed(2));
    }
  };

  const handleSalePriceChange = (value: string) => {
    setSalePrice(value);
    const cost = parseFloat(costPrice);
    const sale = parseFloat(value);
    if (!isNaN(cost) && !isNaN(sale) && cost > 0) {
      const newMargin = ((sale - cost) / cost) * 100;
      setProfitMargin(newMargin.toFixed(2));
    }
  };

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const reorderMutation = useMutation({
    mutationFn: async (data: { items: { id: string; sortOrder: number }[]; previousData: Product[] }) => {
      return apiRequest('PATCH', '/api/products/reorder', { items: data.items });
    },
    onError: (_error, variables) => {
      queryClient.setQueryData(['/api/products'], variables.previousData);
      toast({ title: 'Erro ao reordenar', variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && !reorderMutation.isPending) {
      const currentProducts = queryClient.getQueryData<Product[]>(['/api/products']) ?? [];
      const previousData = [...currentProducts];
      
      const oldIndex = currentProducts.findIndex((p) => p.id === active.id);
      const newIndex = currentProducts.findIndex((p) => p.id === over.id);
      
      const reordered = arrayMove([...currentProducts], oldIndex, newIndex).map((prod, index) => ({
        ...prod,
        sortOrder: index + 1,
      }));
      
      queryClient.setQueryData(['/api/products'], reordered);
      
      const items = reordered.map((prod) => ({
        id: prod.id,
        sortOrder: prod.sortOrder ?? 0,
      }));
      
      reorderMutation.mutate({ items, previousData });
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/products/import-csv', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
        queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
        toast({ 
          title: 'Importacao concluida!',
          description: result.message,
        });
      } else {
        toast({ 
          title: 'Erro na importacao',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({ 
        title: 'Erro na importacao',
        description: 'Falha ao processar o arquivo CSV',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (csvInputRef.current) {
        csvInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      categoryId: formData.get('categoryId') as string,
      costPrice: costPrice,
      profitMargin: profitMargin,
      salePrice: salePrice,
      stock: parseInt(formData.get('stock') as string) || 0,
      imageUrl: uploadedImageUrl || editingProduct?.imageUrl || null,
      productType: formData.get('productType') as string || null,
      isActive: true,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
    setUploadedImageUrl(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl text-primary">Produtos</h2>
          <p className="text-sm text-muted-foreground mt-1">Arraste para reordenar</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVImport}
            className="hidden"
            data-testid="input-csv-file"
          />
          <Button
            variant="outline"
            onClick={() => csvInputRef.current?.click()}
            disabled={isImporting}
            data-testid="button-import-csv"
          >
            <FileText className="w-4 h-4 mr-2" />
            {isImporting ? 'Importando...' : 'Importar CSV'}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog(null)} data-testid="button-add-product">
                <Plus className="w-4 h-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
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
                  <Input 
                    id="costPrice" 
                    name="costPrice" 
                    type="number" 
                    step="0.01" 
                    value={costPrice} 
                    onChange={(e) => handleCostPriceChange(e.target.value)}
                    required 
                    data-testid="input-product-cost" 
                  />
                </div>
                <div>
                  <Label htmlFor="profitMargin">Margem %</Label>
                  <Input 
                    id="profitMargin" 
                    name="profitMargin" 
                    type="number" 
                    step="0.01" 
                    value={profitMargin} 
                    onChange={(e) => handleProfitMarginChange(e.target.value)}
                    required 
                    data-testid="input-product-margin" 
                  />
                </div>
                <div>
                  <Label htmlFor="salePrice">Venda</Label>
                  <Input 
                    id="salePrice" 
                    name="salePrice" 
                    type="number" 
                    step="0.01" 
                    value={salePrice} 
                    onChange={(e) => handleSalePriceChange(e.target.value)}
                    required 
                    data-testid="input-product-price" 
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="stock">Estoque</Label>
                <Input id="stock" name="stock" type="number" defaultValue={editingProduct?.stock || 0} data-testid="input-product-stock" />
              </div>
              <div>
                <Label>Imagem do Produto</Label>
                <ProductImageUploader
                  currentImageUrl={uploadedImageUrl || editingProduct?.imageUrl}
                  onImageUploaded={(url) => setUploadedImageUrl(url)}
                  onImageRemoved={() => setUploadedImageUrl(null)}
                />
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
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-products"
          />
        </div>
        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-filter-category">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(() => {
        const filteredProducts = products.filter(product => {
          const matchesSearch = searchTerm === '' || 
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
          const matchesCategory = selectedCategoryId === 'all' || product.categoryId === selectedCategoryId;
          return matchesSearch && matchesCategory;
        });

        return (
          <>
            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </p>
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={filteredProducts.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProducts.map(product => {
                    const category = categories.find(c => c.id === product.categoryId);
                    return (
                      <SortableProductItem
                        key={product.id}
                        product={product}
                        category={category}
                        onEdit={handleOpenDialog}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        formatCurrency={formatCurrency}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </>
        );
      })()}
    </div>
  );
}

function SortableCategoryItem({ 
  category, 
  productCount,
  onEdit, 
  onDelete,
  onView
}: { 
  category: Category;
  productCount: number;
  onEdit: (cat: Category) => void; 
  onDelete: (id: string) => void;
  onView: (cat: Category) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = getCategoryIcon(category.iconUrl);

  return (
    <Card 
      ref={setNodeRef} 
      style={style}
      className={isDragging ? 'z-50' : ''}
      data-testid={`card-category-${category.id}`}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
          data-testid={`drag-handle-category-${category.id}`}
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <IconComponent className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{category.name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Ordem: {category.sortOrder}</span>
            <span>|</span>
            <span>{productCount} produto{productCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            size="icon" 
            variant="ghost"
            onClick={() => onView(category)}
            data-testid={`button-view-category-${category.id}`}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost"
            onClick={() => onEdit(category)}
            data-testid={`button-edit-category-${category.id}`}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost"
            onClick={() => onDelete(category.id)}
            data-testid={`button-delete-category-${category.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoriasTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<string>('glass-water');
  const { toast } = useToast();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const getProductCountByCategory = (categoryId: string) => {
    return products.filter(p => p.categoryId === categoryId).length;
  };

  const getProductsByCategory = (categoryId: string) => {
    return products.filter(p => p.categoryId === categoryId);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      const response = await apiRequest('DELETE', `/api/categories/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({ title: 'Categoria excluida!' });
    },
    onError: (error: Error) => {
      let description = 'Nao foi possivel excluir a categoria. Verifique se nao existem produtos vinculados.';
      try {
        const match = error.message.match(/^\d+:\s*(.+)$/);
        if (match) {
          const parsed = JSON.parse(match[1]);
          if (parsed.error) description = parsed.error;
        }
      } catch {
        // Use default description
      }
      toast({ 
        title: 'Erro ao excluir categoria', 
        description,
        variant: 'destructive' 
      });
    },
  });

  const handleViewCategory = (category: Category) => {
    setViewingCategory(category);
    setIsViewDialogOpen(true);
  };

  const reorderMutation = useMutation({
    mutationFn: async (data: { items: { id: string; sortOrder: number }[]; previousData: Category[] }) => {
      return apiRequest('PATCH', '/api/categories/reorder', { items: data.items });
    },
    onError: (_error, variables) => {
      queryClient.setQueryData(['/api/categories'], variables.previousData);
      toast({ title: 'Erro ao reordenar', variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && !reorderMutation.isPending) {
      const currentCategories = queryClient.getQueryData<Category[]>(['/api/categories']) ?? [];
      const previousData = [...currentCategories];
      
      const oldIndex = currentCategories.findIndex((c) => c.id === active.id);
      const newIndex = currentCategories.findIndex((c) => c.id === over.id);
      
      const reordered = arrayMove([...currentCategories], oldIndex, newIndex).map((cat, index) => ({
        ...cat,
        sortOrder: index + 1,
      }));
      
      queryClient.setQueryData(['/api/categories'], reordered);
      
      const items = reordered.map((cat) => ({
        id: cat.id,
        sortOrder: cat.sortOrder ?? 0,
      }));
      
      reorderMutation.mutate({ items, previousData });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      iconUrl: selectedIcon,
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
      isActive: true,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleOpenCategoryDialog = (cat: Category | null) => {
    setEditingCategory(cat);
    if (cat) {
      setSelectedIcon(cat.iconUrl || 'glass-water');
    } else {
      setSelectedIcon('glass-water');
    }
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl text-primary">Categorias</h2>
          <p className="text-sm text-muted-foreground mt-1">Arraste para reordenar</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenCategoryDialog(null)} data-testid="button-add-category">
              <Plus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" defaultValue={editingCategory?.name} required data-testid="input-category-name" />
              </div>
              <div>
                <Label>Icone</Label>
                <div className="grid grid-cols-6 gap-2 mt-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
                  {CATEGORY_ICONS.map((iconOption) => {
                    const IconComp = iconOption.icon;
                    return (
                      <button
                        key={iconOption.id}
                        type="button"
                        onClick={() => setSelectedIcon(iconOption.id)}
                        className={`p-2 rounded-md flex flex-col items-center gap-1 transition-all ${
                          selectedIcon === iconOption.id 
                            ? 'bg-primary/20 border-2 border-primary' 
                            : 'bg-muted/50 border border-transparent hover:border-primary/30'
                        }`}
                        title={iconOption.name}
                        data-testid={`button-icon-${iconOption.id}`}
                      >
                        <IconComp className={`w-5 h-5 ${selectedIcon === iconOption.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecionado: {CATEGORY_ICONS.find(i => i.id === selectedIcon)?.name || 'Agua'}
                </p>
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

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={categories.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map(category => (
              <SortableCategoryItem
                key={category.id}
                category={category}
                productCount={getProductCountByCategory(category.id)}
                onEdit={(cat) => handleOpenCategoryDialog(cat)}
                onDelete={(id) => deleteMutation.mutate(id)}
                onView={handleViewCategory}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingCategory && (
                <>
                  {(() => {
                    const IconComp = getCategoryIcon(viewingCategory.iconUrl);
                    return <IconComp className="w-5 h-5 text-primary" />;
                  })()}
                  Produtos em: {viewingCategory.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {viewingCategory && (
            <div className="space-y-4">
              {getProductsByCategory(viewingCategory.id).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum produto nesta categoria
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {getProductsByCategory(viewingCategory.id).map(product => (
                    <Card key={product.id}>
                      <CardContent className="p-4 flex items-center gap-4">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className="w-14 h-14 object-contain rounded-lg bg-white/10" 
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{product.name}</h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={product.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                              {product.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Estoque: {product.stock}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">{formatCurrency(product.salePrice)}</p>
                          <p className="text-xs text-muted-foreground">Custo: {formatCurrency(product.costPrice)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MotoboyDetails extends Motoboy {
  hasPassword?: boolean;
  userId?: string | null;
}

function MotoboysTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [editingMotoboy, setEditingMotoboy] = useState<Motoboy | null>(null);
  const [viewingMotoboyId, setViewingMotoboyId] = useState<string | null>(null);
  const [reportMotoboyId, setReportMotoboyId] = useState<string | null>(null);
  const [reportStartDate, setReportStartDate] = useState<string>('');
  const [reportEndDate, setReportEndDate] = useState<string>('');
  const [reportSearchTerm, setReportSearchTerm] = useState<string>('');
  const { toast } = useToast();

  const { data: motoboys = [] } = useQuery<Motoboy[]>({
    queryKey: ['/api/motoboys'],
  });

  const { data: motoboyDetails } = useQuery<MotoboyDetails>({
    queryKey: ['/api/motoboys', viewingMotoboyId, 'details'],
    enabled: !!viewingMotoboyId,
    queryFn: async () => {
      const res = await fetch(`/api/motoboys/${viewingMotoboyId}/details`);
      if (!res.ok) throw new Error('Failed to fetch motoboy details');
      return res.json();
    }
  });

  const { data: motoboyOrders = [], isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ['/api/motoboys', reportMotoboyId, 'orders', reportStartDate, reportEndDate],
    enabled: !!reportMotoboyId && isReportDialogOpen,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (reportStartDate) params.append('startDate', reportStartDate);
      if (reportEndDate) params.append('endDate', reportEndDate);
      const url = `/api/motoboys/${reportMotoboyId}/orders${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch motoboy orders');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Motoboy> & { password?: string }) => {
      const res = await apiRequest('POST', '/api/motoboys', data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao criar motoboy');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/motoboys'] });
      toast({ title: 'Motoboy criado!' });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Motoboy> & { password?: string } }) => {
      const res = await apiRequest('PATCH', `/api/motoboys/${id}`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao atualizar motoboy');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/motoboys'] });
      toast({ title: 'Motoboy atualizado!' });
      setIsDialogOpen(false);
      setEditingMotoboy(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest('PATCH', `/api/motoboys/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/motoboys'] });
      toast({ title: 'Status atualizado!' });
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
    const password = formData.get('password') as string;
    
    // Validate password format (6 digits)
    if (password && !/^\d{6}$/.test(password)) {
      toast({ 
        title: 'Erro', 
        description: 'A senha deve ter exatamente 6 digitos numericos',
        variant: 'destructive' 
      });
      return;
    }
    
    const data: Partial<Motoboy> & { password?: string } = {
      name: formData.get('name') as string,
      whatsapp: formData.get('whatsapp') as string,
      isActive: formData.get('isActive') === 'on',
    };
    
    if (password) {
      data.password = password;
    }

    if (editingMotoboy) {
      updateMutation.mutate({ id: editingMotoboy.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleViewDetails = (motoboyId: string) => {
    setViewingMotoboyId(motoboyId);
    setIsDetailDialogOpen(true);
  };

  const handleOpenReport = (motoboyId: string) => {
    setReportMotoboyId(motoboyId);
    setReportStartDate('');
    setReportEndDate('');
    setReportSearchTerm('');
    setIsReportDialogOpen(true);
  };

  const reportMotoboy = motoboys.find(m => m.id === reportMotoboyId);
  
  const filteredReportOrders = motoboyOrders.filter(order => {
    if (!reportSearchTerm) return true;
    const searchLower = reportSearchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchLower)) ||
      (order.notes && order.notes.toLowerCase().includes(searchLower))
    );
  });

  const reportTotals = filteredReportOrders.reduce((acc, order) => {
    acc.count += 1;
    acc.total += Number(order.total);
    acc.deliveryFees += Number(order.deliveryFee);
    return acc;
  }, { count: 0, total: 0, deliveryFees: 0 });

  const handleExportReport = () => {
    if (!reportMotoboy) return;
    const csvData = [
      ['Relatorio de Entregas - ' + reportMotoboy.name],
      ['Periodo: ' + (reportStartDate || 'Inicio') + ' ate ' + (reportEndDate || 'Hoje')],
      [''],
      ['Resumo'],
      ['Total de Entregas', reportTotals.count.toString()],
      ['Valor Total', formatCurrency(reportTotals.total)],
      ['Taxas de Entrega', formatCurrency(reportTotals.deliveryFees)],
      [''],
      ['Pedidos'],
      ['ID', 'Data', 'Cliente', 'Valor', 'Taxa Entrega', 'Status'],
      ...filteredReportOrders.map(order => [
        order.id,
        formatDate(order.createdAt),
        order.customerName || '-',
        formatCurrency(order.total),
        formatCurrency(order.deliveryFee),
        ORDER_STATUS_LABELS[order.status as OrderStatus]
      ])
    ];
    const csvContent = csvData.map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${reportMotoboy.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast({ title: 'Relatorio exportado!' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-primary">Motoboys</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { 
          setIsDialogOpen(open); 
          if (!open) setEditingMotoboy(null);
        }}>
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
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={editingMotoboy?.name} 
                  required 
                  data-testid="input-motoboy-name" 
                />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input 
                  id="whatsapp" 
                  name="whatsapp" 
                  placeholder="11999999999"
                  defaultValue={editingMotoboy?.whatsapp} 
                  required 
                  data-testid="input-motoboy-whatsapp" 
                />
              </div>
              <div>
                <Label htmlFor="password">
                  Senha (6 digitos) {editingMotoboy && '- deixe vazio para manter atual'}
                </Label>
                <Input 
                  id="password" 
                  name="password" 
                  type="password"
                  maxLength={6}
                  pattern="\d{6}"
                  placeholder={editingMotoboy ? "******" : "123456"}
                  data-testid="input-motoboy-password" 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A senha e usada para o motoboy acessar o app
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch 
                  id="isActive" 
                  name="isActive"
                  defaultChecked={editingMotoboy?.isActive ?? true}
                  data-testid="switch-motoboy-active"
                />
                <Label htmlFor="isActive">Motoboy Ativo</Label>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-motoboy"
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : (editingMotoboy ? 'Salvar' : 'Criar')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Detail View Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={(open) => {
        setIsDetailDialogOpen(open);
        if (!open) setViewingMotoboyId(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Motoboy</DialogTitle>
          </DialogHeader>
          {motoboyDetails ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {motoboyDetails.photoUrl ? (
                  <img 
                    src={motoboyDetails.photoUrl} 
                    alt={motoboyDetails.name} 
                    className="w-16 h-16 object-cover rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bike className="w-8 h-8 text-primary" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold">{motoboyDetails.name}</h3>
                  <Badge className={motoboyDetails.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                    {motoboyDetails.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-md">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                    <p className="font-medium" data-testid="text-motoboy-whatsapp">{motoboyDetails.whatsapp}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-md">
                  <Key className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Senha de Acesso</p>
                    <p className="font-medium" data-testid="text-motoboy-password-status">
                      {motoboyDetails.hasPassword ? 'Configurada' : 'Nao configurada'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-md">
                  <Power className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-medium" data-testid="text-motoboy-status">
                      {motoboyDetails.isActive ? 'Pode receber entregas' : 'Bloqueado para entregas'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  className="flex-1"
                  onClick={() => { 
                    const motoboy = motoboys.find(m => m.id === viewingMotoboyId);
                    if (motoboy) {
                      setEditingMotoboy(motoboy);
                      setIsDetailDialogOpen(false);
                      setIsDialogOpen(true);
                    }
                  }}
                  data-testid="button-edit-from-details"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Carregando...
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={(open) => {
        setIsReportDialogOpen(open);
        if (!open) setReportMotoboyId(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Relatorio de Entregas - {reportMotoboy?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label htmlFor="reportStartDate" className="text-xs">Data Inicio</Label>
                <Input
                  id="reportStartDate"
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-40"
                  data-testid="input-report-start-date"
                />
              </div>
              <div>
                <Label htmlFor="reportEndDate" className="text-xs">Data Fim</Label>
                <Input
                  id="reportEndDate"
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="w-40"
                  data-testid="input-report-end-date"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="reportSearch" className="text-xs">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reportSearch"
                    placeholder="Buscar por ID, cliente ou endereco..."
                    value={reportSearchTerm}
                    onChange={(e) => setReportSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-report-search"
                  />
                </div>
              </div>
              <Button onClick={handleExportReport} variant="outline" data-testid="button-export-report">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card data-testid="card-report-deliveries">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary" data-testid="text-report-count">{reportTotals.count}</p>
                  <p className="text-sm text-muted-foreground">Entregas</p>
                </CardContent>
              </Card>
              <Card data-testid="card-report-total">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary" data-testid="text-report-total">{formatCurrency(reportTotals.total)}</p>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                </CardContent>
              </Card>
              <Card data-testid="card-report-fees">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary" data-testid="text-report-fees">{formatCurrency(reportTotals.deliveryFees)}</p>
                  <p className="text-sm text-muted-foreground">Taxas de Entrega</p>
                </CardContent>
              </Card>
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-auto min-h-0">
              {isLoadingOrders ? (
                <div className="py-8 text-center text-muted-foreground">
                  Carregando pedidos...
                </div>
              ) : filteredReportOrders.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nenhum pedido encontrado para este periodo
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredReportOrders.map(order => (
                    <Card key={order.id} className="hover-elevate" data-testid={`card-report-order-${order.id}`}>
                      <CardContent className="p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm">#{order.id.slice(-6)}</span>
                              <Badge className={order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300'}>
                                {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                              </Badge>
                            </div>
                            <p className="text-sm truncate">{order.customerName || '-'}</p>
                            <p className="text-xs text-muted-foreground truncate">{order.notes || '-'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(order.total)}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {motoboys.map(motoboy => (
          <Card key={motoboy.id} data-testid={`card-motoboy-${motoboy.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {motoboy.photoUrl ? (
                  <img src={motoboy.photoUrl} alt={motoboy.name} className="w-12 h-12 object-cover rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bike className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{motoboy.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{motoboy.whatsapp}</p>
                </div>
                <Badge className={motoboy.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                  {motoboy.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleViewDetails(motoboy.id)}
                  data-testid={`button-view-motoboy-${motoboy.id}`}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setEditingMotoboy(motoboy); setIsDialogOpen(true); }}
                  data-testid={`button-edit-motoboy-${motoboy.id}`}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => handleOpenReport(motoboy.id)}
                  data-testid={`button-report-motoboy-${motoboy.id}`}
                  title="Relatorio de Entregas"
                >
                  <FileText className="w-4 h-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => toggleActiveMutation.mutate({ id: motoboy.id, isActive: !motoboy.isActive })}
                  data-testid={`button-toggle-motoboy-${motoboy.id}`}
                  title={motoboy.isActive ? 'Desativar' : 'Ativar'}
                >
                  <Power className={`w-4 h-4 ${motoboy.isActive ? 'text-green-500' : 'text-red-500'}`} />
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

function ZonasTab() {
  const { toast } = useToast();
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [editingNeighborhood, setEditingNeighborhood] = useState<Neighborhood | null>(null);
  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  const [isNeighborhoodDialogOpen, setIsNeighborhoodDialogOpen] = useState(false);
  const [selectedZoneForNeighborhood, setSelectedZoneForNeighborhood] = useState<string>('');

  const { data: zones = [], isLoading: zonesLoading } = useQuery<DeliveryZone[]>({
    queryKey: ['/api/delivery-zones'],
  });

  const { data: neighborhoods = [], isLoading: neighborhoodsLoading } = useQuery<Neighborhood[]>({
    queryKey: ['/api/neighborhoods'],
  });

  const createZoneMutation = useMutation({
    mutationFn: async (data: Partial<DeliveryZone>) => {
      return apiRequest('POST', '/api/delivery-zones', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-zones'] });
      toast({ title: 'Zona criada com sucesso!' });
      setIsZoneDialogOpen(false);
      setEditingZone(null);
    },
    onError: () => {
      toast({ title: 'Erro ao criar zona', variant: 'destructive' });
    },
  });

  const updateZoneMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DeliveryZone> }) => {
      return apiRequest('PATCH', `/api/delivery-zones/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-zones'] });
      toast({ title: 'Zona atualizada!' });
      setIsZoneDialogOpen(false);
      setEditingZone(null);
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar zona', variant: 'destructive' });
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/delivery-zones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-zones'] });
      queryClient.invalidateQueries({ queryKey: ['/api/neighborhoods'] });
      toast({ title: 'Zona excluida!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir zona. Remova os bairros primeiro.', variant: 'destructive' });
    },
  });

  const createNeighborhoodMutation = useMutation({
    mutationFn: async (data: Partial<Neighborhood>) => {
      return apiRequest('POST', '/api/neighborhoods', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/neighborhoods'] });
      toast({ title: 'Bairro criado com sucesso!' });
      setIsNeighborhoodDialogOpen(false);
      setEditingNeighborhood(null);
    },
    onError: () => {
      toast({ title: 'Erro ao criar bairro', variant: 'destructive' });
    },
  });

  const updateNeighborhoodMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Neighborhood> }) => {
      return apiRequest('PATCH', `/api/neighborhoods/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/neighborhoods'] });
      toast({ title: 'Bairro atualizado!' });
      setIsNeighborhoodDialogOpen(false);
      setEditingNeighborhood(null);
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar bairro', variant: 'destructive' });
    },
  });

  const deleteNeighborhoodMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/neighborhoods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/neighborhoods'] });
      toast({ title: 'Bairro excluido!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir bairro', variant: 'destructive' });
    },
  });

  const handleZoneSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      code: (formData.get('code') as string).toUpperCase(),
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      fee: formData.get('fee') as string,
      isActive: formData.get('isActive') === 'on',
    };

    if (editingZone) {
      updateZoneMutation.mutate({ id: editingZone.id, data });
    } else {
      createZoneMutation.mutate(data);
    }
  };

  const handleNeighborhoodSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const zoneId = formData.get('zoneId') as string;
    
    if (!zoneId) {
      toast({ title: 'Selecione uma zona', variant: 'destructive' });
      return;
    }
    
    const data = {
      name: formData.get('name') as string,
      zoneId,
      isActive: formData.get('isActive') === 'on',
    };

    if (editingNeighborhood) {
      updateNeighborhoodMutation.mutate({ id: editingNeighborhood.id, data });
    } else {
      createNeighborhoodMutation.mutate(data);
    }
  };

  const openCreateZone = () => {
    setEditingZone(null);
    setIsZoneDialogOpen(true);
  };

  const openEditZone = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setIsZoneDialogOpen(true);
  };

  const openCreateNeighborhood = (zoneId?: string) => {
    setEditingNeighborhood(null);
    setSelectedZoneForNeighborhood(zoneId || '');
    setIsNeighborhoodDialogOpen(true);
  };

  const openEditNeighborhood = (neighborhood: Neighborhood) => {
    setEditingNeighborhood(neighborhood);
    setSelectedZoneForNeighborhood(neighborhood.zoneId);
    setIsNeighborhoodDialogOpen(true);
  };

  const getNeighborhoodsByZone = (zoneId: string) => {
    return neighborhoods.filter(n => n.zoneId === zoneId);
  };

  const sortedZones = [...zones].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-primary">Zonas de Entrega</h2>
        <div className="flex gap-2">
          <Button onClick={openCreateZone} data-testid="button-create-zone">
            <Plus className="w-4 h-4 mr-2" />
            Nova Zona
          </Button>
          <Button onClick={() => openCreateNeighborhood()} variant="outline" data-testid="button-create-neighborhood">
            <Plus className="w-4 h-4 mr-2" />
            Novo Bairro
          </Button>
        </div>
      </div>

      {zonesLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      ) : sortedZones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma zona cadastrada. Clique em "Nova Zona" para criar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedZones.map(zone => {
            const zoneNeighborhoods = getNeighborhoodsByZone(zone.id);
            return (
              <Card key={zone.id} data-testid={`card-zone-${zone.id}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                  <div className="flex items-center gap-3">
                    <Badge className={zone.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                      {zone.code}
                    </Badge>
                    <CardTitle className="text-lg">{zone.name}</CardTitle>
                    <Badge variant="outline" className="text-primary border-primary">
                      {formatCurrency(zone.fee)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openCreateNeighborhood(zone.id)}
                      data-testid={`button-add-neighborhood-${zone.id}`}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Bairro
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditZone(zone)}
                      data-testid={`button-edit-zone-${zone.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (zoneNeighborhoods.length > 0) {
                          toast({ title: 'Remova os bairros antes de excluir a zona', variant: 'destructive' });
                          return;
                        }
                        if (confirm('Tem certeza que deseja excluir esta zona?')) {
                          deleteZoneMutation.mutate(zone.id);
                        }
                      }}
                      data-testid={`button-delete-zone-${zone.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {zone.description && (
                    <p className="text-sm text-muted-foreground mb-3">{zone.description}</p>
                  )}
                  {zoneNeighborhoods.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum bairro cadastrado nesta zona.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {zoneNeighborhoods.map(neighborhood => (
                        <Badge
                          key={neighborhood.id}
                          variant="secondary"
                          className={`cursor-pointer ${neighborhood.isActive ? '' : 'opacity-50'}`}
                          onClick={() => openEditNeighborhood(neighborhood)}
                          data-testid={`badge-neighborhood-${neighborhood.id}`}
                        >
                          {neighborhood.name}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-4 w-4 ml-1 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Excluir bairro "${neighborhood.name}"?`)) {
                                deleteNeighborhoodMutation.mutate(neighborhood.id);
                              }
                            }}
                            data-testid={`button-delete-neighborhood-${neighborhood.id}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isZoneDialogOpen} onOpenChange={setIsZoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Editar Zona' : 'Nova Zona'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleZoneSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="code">Codigo (ex: Z1, Z2)</Label>
                <Input
                  id="code"
                  name="code"
                  defaultValue={editingZone?.code || ''}
                  required
                  maxLength={5}
                  className="uppercase"
                  data-testid="input-zone-code"
                />
              </div>
              <div>
                <Label htmlFor="fee">Taxa de Entrega (R$)</Label>
                <Input
                  id="fee"
                  name="fee"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingZone?.fee || ''}
                  required
                  data-testid="input-zone-fee"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="name">Nome da Zona</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingZone?.name || ''}
                required
                data-testid="input-zone-name"
              />
            </div>
            <div>
              <Label htmlFor="description">Descricao (opcional)</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editingZone?.description || ''}
                data-testid="input-zone-description"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={editingZone?.isActive ?? true}
                data-testid="switch-zone-active"
              />
              <Label htmlFor="isActive">Zona ativa</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsZoneDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createZoneMutation.isPending || updateZoneMutation.isPending} data-testid="button-save-zone">
                {editingZone ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isNeighborhoodDialogOpen} onOpenChange={setIsNeighborhoodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNeighborhood ? 'Editar Bairro' : 'Novo Bairro'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNeighborhoodSubmit} className="space-y-4">
            <div>
              <Label htmlFor="neighborhoodName">Nome do Bairro</Label>
              <Input
                id="neighborhoodName"
                name="name"
                defaultValue={editingNeighborhood?.name || ''}
                required
                data-testid="input-neighborhood-name"
              />
            </div>
            <div>
              <Label htmlFor="zoneId">Zona</Label>
              <input type="hidden" name="zoneId" value={selectedZoneForNeighborhood} />
              <Select value={selectedZoneForNeighborhood} onValueChange={setSelectedZoneForNeighborhood}>
                <SelectTrigger data-testid="select-neighborhood-zone">
                  <SelectValue placeholder="Selecione a zona" />
                </SelectTrigger>
                <SelectContent>
                  {sortedZones.map(zone => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.code} - {zone.name} ({formatCurrency(zone.fee)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="neighborhoodIsActive"
                name="isActive"
                defaultChecked={editingNeighborhood?.isActive ?? true}
                data-testid="switch-neighborhood-active"
              />
              <Label htmlFor="neighborhoodIsActive">Bairro ativo</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsNeighborhoodDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createNeighborhoodMutation.isPending || updateNeighborhoodMutation.isPending} data-testid="button-save-neighborhood">
                {editingNeighborhood ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isSSEConnected, setIsSSEConnected] = useState(false);
  const { playMultiple } = useNotificationSound();

  useOrderUpdates({
    onConnected: () => setIsSSEConnected(true),
    onDisconnected: () => setIsSSEConnected(false),
    onOrderCreated: (data) => {
      if (data.orderType !== 'counter') {
        playMultiple(5);
      }
      toast({ title: 'Novo pedido recebido!' });
    },
  });

  if (role !== 'admin') {
    setLocation('/admin-login');
    return null;
  }

  const scrollTabs = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'pedidos': return <OrdersTab />;
      case 'pdv': return <PDVTab />;
      case 'delivery': return <DeliveryTab />;
      case 'financeiro': return <FinanceiroTab />;
      case 'estoque': return <EstoqueTab />;
      case 'clientes': return <ClientesTab />;
      case 'produtos': return <ProdutosTab />;
      case 'categorias': return <CategoriasTab />;
      case 'motoboys': return <MotoboysTab />;
      case 'zonas': return <ZonasTab />;
      case 'configuracoes': return <ConfiguracoesTab />;
      default: return <OrdersTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-xl text-primary whitespace-nowrap">VIBE DRINKS</h1>
            <Badge className="bg-primary/20 text-primary hidden sm:inline-flex">Admin</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={isSSEConnected ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}
              data-testid="badge-sse-status"
            >
              {isSSEConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
              {isSSEConnected ? 'Ao Vivo' : 'Offline'}
            </Badge>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name}</span>
            <Button 
              size="sm"
              variant="ghost" 
              onClick={() => { logout(); setLocation('/'); }}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
      </header>

      {/* Horizontal Carousel Tab Menu */}
      <div className="bg-secondary/50 border-b border-border sticky top-[57px] z-40">
        <div className="relative flex items-center">
          <Button
            size="icon"
            variant="ghost"
            className="absolute left-1 z-10 bg-background/80 backdrop-blur-sm shadow-md hidden md:flex"
            onClick={() => scrollTabs('left')}
            data-testid="button-scroll-left"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto px-2 md:px-12 gap-2 py-3 w-full"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  variant={isActive ? "default" : "outline"}
                  className={`flex items-center gap-2 px-4 py-2 whitespace-nowrap flex-shrink-0 min-w-fit ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' 
                      : 'bg-background border-border/50'
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </Button>
              );
            })}
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 z-10 bg-background/80 backdrop-blur-sm shadow-md hidden md:flex"
            onClick={() => scrollTabs('right')}
            data-testid="button-scroll-right"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
        {renderTab()}
      </main>
    </div>
  );
}
