import { useState } from 'react';
import { useLocation } from 'wouter';
import { MapPin, CreditCard, Banknote, QrCode, Truck, Tag, ArrowLeft, Loader2, Copy, Check, AlertTriangle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Settings, PaymentMethod } from '@shared/schema';
import { PAYMENT_METHOD_LABELS } from '@shared/schema';

interface DeliveryCalculation {
  distance: number;
  fee: number;
  withinRange: boolean;
  maxDistance: number;
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { items, subtotal, comboDiscount, hasCombo, clearCart } = useCart();
  const { user, address, isAuthenticated } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState('');
  const [pixCopied, setPixCopied] = useState(false);

  const { data: settings } = useQuery<Settings>({
    queryKey: ['/api/settings'],
  });

  const { data: deliveryCalc, isLoading: isCalculatingDelivery, error: deliveryError } = useQuery<DeliveryCalculation>({
    queryKey: ['/api/delivery/calculate', address?.id],
    queryFn: async () => {
      if (!address) throw new Error('No address');
      const response = await apiRequest('POST', '/api/delivery/calculate', {
        addressId: address.id,
      });
      return await response.json();
    },
    enabled: !!address,
  });

  const deliveryFee = deliveryCalc?.fee ?? 0;
  const deliveryDistance = deliveryCalc?.distance ?? 0;
  const isOutOfRange = deliveryCalc ? !deliveryCalc.withinRange : false;
  
  const totalAfterDiscount = subtotal - comboDiscount;
  const total = totalAfterDiscount + deliveryFee;

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const orderData = {
        userId: user?.id,
        addressId: address?.id,
        items: items.map(item => ({
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.product.salePrice,
          totalPrice: Number(item.product.salePrice) * item.quantity,
        })),
        subtotal,
        deliveryFee,
        deliveryDistance: deliveryDistance,
        discount: comboDiscount,
        total,
        paymentMethod,
        changeFor: paymentMethod === 'cash' && needsChange ? Number(changeFor) : null,
      };
      return apiRequest('POST', '/api/orders', orderData);
    },
    onSuccess: async () => {
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: 'Pedido realizado!', description: 'Acompanhe o status do seu pedido' });
      setLocation('/pedidos');
    },
    onError: () => {
      toast({ title: 'Erro ao criar pedido', variant: 'destructive' });
    },
  });

  const copyPixKey = () => {
    if (settings?.pixKey) {
      navigator.clipboard.writeText(settings.pixKey);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2000);
      toast({ title: 'Chave PIX copiada!' });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (!isAuthenticated || !address) {
    setLocation('/login?redirect=/checkout');
    return null;
  }

  if (items.length === 0) {
    setLocation('/');
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

        <h1 className="font-serif text-3xl text-primary mb-8">Finalizar Pedido</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <MapPin className="h-5 w-5 text-primary" />
                  Endereco de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-secondary/50 p-4 rounded-lg border border-primary/10">
                  <p className="font-medium text-foreground">{user?.name}</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {address.street}, {address.number}
                    {address.complement && ` - ${address.complement}`}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {address.neighborhood}, {address.city} - {address.state}
                  </p>
                  <p className="text-muted-foreground text-sm">CEP: {address.zipCode}</p>
                  {address.notes && (
                    <p className="text-yellow text-sm mt-2">Obs: {address.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Forma de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                  className="space-y-3"
                >
                  <div 
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                      paymentMethod === 'pix' ? 'border-primary bg-primary/10' : 'border-primary/20 bg-secondary/30'
                    }`}
                    onClick={() => setPaymentMethod('pix')}
                  >
                    <RadioGroupItem value="pix" id="pix" className="border-primary" />
                    <QrCode className="h-5 w-5 text-primary" />
                    <Label htmlFor="pix" className="flex-1 cursor-pointer text-foreground">
                      PIX
                      <span className="block text-xs text-muted-foreground">Pagamento instantaneo</span>
                    </Label>
                  </div>

                  <div 
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                      paymentMethod === 'cash' ? 'border-primary bg-primary/10' : 'border-primary/20 bg-secondary/30'
                    }`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <RadioGroupItem value="cash" id="cash" className="border-primary" />
                    <Banknote className="h-5 w-5 text-primary" />
                    <Label htmlFor="cash" className="flex-1 cursor-pointer text-foreground">
                      Dinheiro
                      <span className="block text-xs text-muted-foreground">Pague na entrega</span>
                    </Label>
                  </div>

                  <div 
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                      paymentMethod === 'card_pos' ? 'border-primary bg-primary/10' : 'border-primary/20 bg-secondary/30'
                    }`}
                    onClick={() => setPaymentMethod('card_pos')}
                  >
                    <RadioGroupItem value="card_pos" id="card_pos" className="border-primary" />
                    <CreditCard className="h-5 w-5 text-primary" />
                    <Label htmlFor="card_pos" className="flex-1 cursor-pointer text-foreground">
                      Cartao (Maquininha)
                      <span className="block text-xs text-muted-foreground">Credito ou debito na entrega</span>
                    </Label>
                  </div>
                </RadioGroup>

                {paymentMethod === 'cash' && (
                  <div className="mt-4 p-4 bg-secondary/50 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        id="needs-change"
                        checked={needsChange}
                        onChange={(e) => setNeedsChange(e.target.checked)}
                        className="rounded border-primary"
                      />
                      <Label htmlFor="needs-change" className="text-foreground">Preciso de troco</Label>
                    </div>
                    {needsChange && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Troco para quanto?</Label>
                        <Input
                          type="number"
                          placeholder="R$ 0,00"
                          value={changeFor}
                          onChange={(e) => setChangeFor(e.target.value)}
                          className="mt-1 bg-secondary border-primary/30 text-foreground"
                          data-testid="input-change-for"
                        />
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === 'pix' && settings?.pixKey && (
                  <div className="mt-4 p-4 bg-secondary/50 rounded-lg border border-primary/10">
                    <p className="text-sm text-muted-foreground mb-2">Chave PIX:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-black/50 p-2 rounded text-primary text-sm overflow-x-auto">
                        {settings.pixKey}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary text-primary"
                        onClick={copyPixKey}
                        data-testid="button-copy-pix"
                      >
                        {pixCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Efetue o pagamento e aguarde a confirmacao
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="bg-card border-primary/20 sticky top-4">
              <CardHeader>
                <CardTitle className="text-foreground">Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.quantity}x {item.product.name}
                      </span>
                      <span className="text-foreground">
                        {formatPrice(Number(item.product.salePrice) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator className="bg-primary/20" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">{formatPrice(subtotal)}</span>
                  </div>

                  {hasCombo && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400 flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Combo Vibe (-15%)
                      </span>
                      <span className="text-green-400">-{formatPrice(comboDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      Taxa de entrega ({deliveryDistance.toFixed(1)} km)
                    </span>
                    {isCalculatingDelivery ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="text-foreground">{formatPrice(deliveryFee)}</span>
                    )}
                  </div>
                </div>

                {isOutOfRange && deliveryCalc && (
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Fora da area de entrega</AlertTitle>
                    <AlertDescription>
                      A distancia de {deliveryDistance.toFixed(1)} km excede o limite de {deliveryCalc.maxDistance} km.
                    </AlertDescription>
                  </Alert>
                )}

                <Separator className="bg-primary/20" />

                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-xl text-primary">{formatPrice(total)}</span>
                </div>

                <Button
                  className="w-full bg-primary text-primary-foreground font-semibold py-6"
                  onClick={() => createOrderMutation.mutate()}
                  disabled={createOrderMutation.isPending || isCalculatingDelivery || isOutOfRange}
                  data-testid="button-place-order"
                >
                  {createOrderMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isCalculatingDelivery ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isOutOfRange ? (
                    'Endereco fora da area de entrega'
                  ) : (
                    `Confirmar Pedido - ${formatPrice(total)}`
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
