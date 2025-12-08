import { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Package, Truck, MapPin, Phone, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Order, OrderItem, Address, Motoboy } from '@shared/schema';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, ORDER_TYPE_LABELS, type OrderStatus, type PaymentMethod, type OrderType } from '@shared/schema';

interface OrderWithDetails extends Order {
  items?: OrderItem[];
  userName?: string;
  userWhatsapp?: string;
  address?: Address;
  motoboy?: Motoboy;
}

interface ExpandableOrderCardProps {
  order: OrderWithDetails;
  defaultExpanded?: boolean;
  showActions?: boolean;
  actions?: React.ReactNode;
  variant?: 'default' | 'customer' | 'kitchen' | 'motoboy' | 'admin';
  statusColor?: string;
  showElapsedTime?: boolean;
  elapsedTimeDate?: Date | string | null;
  onOpenMaps?: (address: Address) => void;
  onOpenWhatsApp?: (phone: string) => void;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  accepted: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  preparing: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  ready: 'bg-green-500/20 text-green-300 border-green-500/30',
  dispatched: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  delivered: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
};

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

function getElapsedTime(date: Date | string | null): string {
  if (!date) return '0min';
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}min`;
}

export function ExpandableOrderCard({
  order,
  defaultExpanded = false,
  showActions = true,
  actions,
  variant = 'default',
  statusColor,
  showElapsedTime = false,
  elapsedTimeDate,
  onOpenMaps,
  onOpenWhatsApp,
}: ExpandableOrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const status = order.status as OrderStatus;
  const paymentMethod = order.paymentMethod as PaymentMethod;
  const orderType = order.orderType as OrderType;
  const colorClass = statusColor || STATUS_COLORS[status];

  const orderId = order.id.slice(-6).toUpperCase();
  const customerName = order.customerName || order.userName || 'Cliente';

  return (
    <Card 
      className={`bg-card border-primary/20 ${variant === 'kitchen' ? 'border-l-4' : ''}`}
      style={variant === 'kitchen' ? { borderLeftColor: status === 'preparing' ? '#f97316' : status === 'ready' ? '#22c55e' : '#3b82f6' } : undefined}
      data-testid={`order-card-${order.id}`}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover-elevate py-3 px-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground text-lg">#{orderId}</span>
                    <Badge className={`${colorClass} border text-xs`}>
                      {ORDER_STATUS_LABELS[status]}
                    </Badge>
                    {orderType && (
                      <Badge variant="outline" className="text-xs">
                        {orderType === 'counter' ? <UserIcon className="h-3 w-3 mr-1" /> : <Truck className="h-3 w-3 mr-1" />}
                        {ORDER_TYPE_LABELS[orderType]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span className="truncate">{customerName}</span>
                    <span className="text-muted-foreground/50">|</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {showElapsedTime && elapsedTimeDate && (
                  <Badge className={`${colorClass} border flex items-center gap-1`}>
                    <Clock className="h-3 w-3" />
                    {getElapsedTime(elapsedTimeDate)}
                  </Badge>
                )}
                <span className="font-bold text-primary">{formatCurrency(order.total)}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-toggle-${order.id}`}>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-4">
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Itens do Pedido</h4>
              <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {item.quantity}x {item.productName}
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="ml-2 text-foreground">{formatCurrency(order.subtotal)}</span>
              </div>
              {Number(order.discount || 0) > 0 && (
                <div>
                  <span className="text-green-400">Desconto:</span>
                  <span className="ml-2 text-green-400">-{formatCurrency(order.discount || 0)}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Taxa Entrega:</span>
                <span className="ml-2 text-foreground">{formatCurrency(order.deliveryFee)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Pagamento:</span>
                <span className="ml-2 text-foreground">{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
              </div>
              {paymentMethod === 'cash' && order.changeFor && Number(order.changeFor) > 0 && (
                <div className="col-span-2">
                  <span className="text-yellow-400">Troco para:</span>
                  <span className="ml-2 text-yellow-400">{formatCurrency(order.changeFor)}</span>
                </div>
              )}
            </div>

            {order.notes && (
              <div className="bg-yellow/10 border border-yellow/30 rounded-lg p-3">
                <p className="text-yellow text-sm font-medium">Observacoes:</p>
                <p className="text-foreground text-sm">{order.notes}</p>
              </div>
            )}

            {order.address && (
              <div 
                className={`bg-secondary/50 rounded-lg p-3 ${onOpenMaps ? 'cursor-pointer hover-elevate' : ''}`}
                onClick={() => onOpenMaps && order.address && onOpenMaps(order.address)}
                data-testid={`address-${order.id}`}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-foreground font-medium">
                      {order.address.street}, {order.address.number}
                    </p>
                    <p className="text-muted-foreground">
                      {order.address.neighborhood}, {order.address.city}
                    </p>
                    {order.address.complement && (
                      <p className="text-muted-foreground">{order.address.complement}</p>
                    )}
                    {order.address.notes && (
                      <p className="text-yellow text-xs mt-1">Ref: {order.address.notes}</p>
                    )}
                    {onOpenMaps && (
                      <p className="text-primary text-xs mt-1">Toque para abrir no Maps</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {order.userWhatsapp && onOpenWhatsApp && (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-green-500/50 text-green-400"
                onClick={() => onOpenWhatsApp(order.userWhatsapp!)}
                data-testid={`button-whatsapp-${order.id}`}
              >
                <Phone className="h-4 w-4 mr-2" />
                Contatar Cliente
              </Button>
            )}

            {order.motoboy && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-purple-300">
                    Motoboy: <span className="font-medium">{order.motoboy.name}</span>
                  </span>
                </div>
              </div>
            )}

            {order.motoboyId && !order.motoboy && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-purple-300">Motoboy atribuido</span>
                </div>
              </div>
            )}

            {orderType === 'delivery' && status === 'ready' && !order.motoboyId && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
                <Truck className="h-6 w-6 text-purple-400 mx-auto mb-1" />
                <p className="text-purple-300 text-sm">Aguardando atribuicao de motoboy</p>
              </div>
            )}

            {showActions && actions && (
              <div className="pt-2 border-t border-border">
                {actions}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
