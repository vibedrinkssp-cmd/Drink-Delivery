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
  GripVertical
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
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ProductImageUploader } from '@/components/ProductImageUploader';
import type { Order, Product, Category, Motoboy, User, Settings as SettingsType } from '@shared/schema';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, ORDER_TYPE_LABELS, type OrderStatus, type PaymentMethod, type OrderType } from '@shared/schema';

const tabs = [
  { id: 'pedidos', label: 'Pedidos', icon: Package },
  { id: 'pdv', label: 'PDV', icon: ShoppingCart },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'produtos', label: 'Produtos', icon: ShoppingBag },
  { id: 'categorias', label: 'Categorias', icon: Grid3X3 },
  { id: 'motoboys', label: 'Motoboys', icon: Bike },
  { id: 'configuracoes', label: 'Configuracoes', icon: Settings },
];

function getCategoryIcon(iconUrl: string | null) {
  switch (iconUrl) {
    case 'wine': return Wine;
    case 'beer': return Beer;
    case 'grape': return Grape;
    case 'snowflake': return Snowflake;
    case 'zap': return Zap;
    case 'glass-water': return GlassWater;
    case 'utensils': return Utensils;
    case 'droplets': return Droplets;
    default: return Grid3X3;
  }
}

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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ORDERS_PER_PAGE = 30;
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
      toast({ title: 'Pedido excluido!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir pedido', variant: 'destructive' });
    },
  });

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = searchLower === '' || 
      order.id.toLowerCase().includes(searchLower) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchLower));
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
              <Card key={order.id} data-testid={`card-order-${order.id}`}>
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg">Pedido #{order.id.slice(0, 8)}</CardTitle>
                    <StatusBadge status={order.status as OrderStatus} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground/50 hover:text-destructive"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este pedido?')) {
                          deleteOrderMutation.mutate(order.id);
                        }
                      }}
                      disabled={deleteOrderMutation.isPending}
                      data-testid={`button-delete-order-${order.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
                    {order.status === 'pending' && (
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
                      <div className="flex items-center justify-end gap-2">
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
                          className="text-muted-foreground/50 hover:text-destructive"
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
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleOpenDialog = (product: Product | null) => {
    setEditingProduct(product);
    setUploadedImageUrl(product?.imageUrl || null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open) {
      setEditingProduct(null);
      setUploadedImageUrl(null);
    }
    setIsDialogOpen(open);
  };

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
        <h2 className="font-serif text-3xl text-primary">Produtos</h2>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map(product => {
          const category = categories.find(c => c.id === product.categoryId);
          return (
            <Card key={product.id} data-testid={`card-product-${product.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
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
                    onClick={() => handleOpenDialog(product)}
                    data-testid={`button-edit-product-${product.id}`}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(product.id)}
                    data-testid={`button-delete-product-${product.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SortableCategoryItem({ 
  category, 
  onEdit, 
  onDelete 
}: { 
  category: Category; 
  onEdit: (cat: Category) => void; 
  onDelete: (id: string) => void;
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
          <p className="text-sm text-muted-foreground">Ordem: {category.sortOrder}</p>
        </div>
        <div className="flex gap-2">
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
  const { toast } = useToast();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
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
      return apiRequest('DELETE', `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({ title: 'Categoria excluida!' });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; sortOrder: number }[]) => {
      return apiRequest('PATCH', '/api/categories/reorder', { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({ title: 'Ordem atualizada!' });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);
      
      const reordered = arrayMove(categories, oldIndex, newIndex);
      const items = reordered.map((cat, index) => ({
        id: cat.id,
        sortOrder: index + 1,
      }));
      
      reorderMutation.mutate(items);
    }
  };

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
        <div>
          <h2 className="font-serif text-3xl text-primary">Categorias</h2>
          <p className="text-sm text-muted-foreground mt-1">Arraste para reordenar</p>
        </div>
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
                onEdit={(cat) => { setEditingCategory(cat); setIsDialogOpen(true); }}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
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
  const [editingMotoboy, setEditingMotoboy] = useState<Motoboy | null>(null);
  const [viewingMotoboyId, setViewingMotoboyId] = useState<string | null>(null);
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
      photoUrl: formData.get('photoUrl') as string || null,
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
              <div>
                <Label htmlFor="photoUrl">URL da Foto (opcional)</Label>
                <Input 
                  id="photoUrl" 
                  name="photoUrl" 
                  defaultValue={editingMotoboy?.photoUrl || ''} 
                  data-testid="input-motoboy-photo" 
                />
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

  useOrderUpdates({
    onConnected: () => setIsSSEConnected(true),
    onDisconnected: () => setIsSSEConnected(false),
    onOrderCreated: () => {
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
      case 'clientes': return <ClientesTab />;
      case 'produtos': return <ProdutosTab />;
      case 'categorias': return <CategoriasTab />;
      case 'motoboys': return <MotoboysTab />;
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
