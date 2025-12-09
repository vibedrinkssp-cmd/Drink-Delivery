import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { MapPin, CreditCard, Banknote, QrCode, Truck, Tag, ArrowLeft, Loader2, Copy, Check, Clock } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Settings, PaymentMethod, Address } from '@shared/schema';
import { PAYMENT_METHOD_LABELS } from '@shared/schema';

interface DeliveryCalculation {
  distanciaKm: number;
  taxaEntrega: number;
  tempoEstimadoMinutos: number;
  clienteLat: number;
  clienteLng: number;
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { items, subtotal, comboDiscount, hasCombo, clearCart } = useCart();
  const { user, address, isAuthenticated, setAddress } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState('');
  const [pixCopied, setPixCopied] = useState(false);

  // Address form state for users without an address
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [notes, setNotes] = useState('');

  // Delivery calculation state
  const [deliveryCalc, setDeliveryCalc] = useState<DeliveryCalculation | null>(null);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // CEP lookup state
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // Search address by CEP using backend API
  const searchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setCepError('CEP deve ter 8 digitos');
      return;
    }

    setIsSearchingCep(true);
    setCepError(null);

    try {
      const response = await fetch(`/api/cep/${cleanCep}`);
      const data = await response.json();

      if (!response.ok) {
        setCepError(data.error || 'CEP nao encontrado');
        toast({ title: data.error || 'CEP nao encontrado', variant: 'destructive' });
      } else {
        setStreet(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setCity(data.localidade || '');
        setState(data.uf || '');
        setCepError(null);
        toast({ title: 'Endereco encontrado!' });
      }
    } catch (error) {
      setCepError('Erro ao buscar CEP');
      toast({ title: 'Erro ao buscar CEP', variant: 'destructive' });
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Auto-search when CEP has 8 digits
  const handleCepChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    setZipCode(cleanValue);
    if (cleanValue.length === 8) {
      searchAddressByCep(cleanValue);
    }
  };

  const { data: settings } = useQuery<Settings>({
    queryKey: ['/api/settings'],
  });

  // Calculate delivery when address changes
  const calculateDeliveryFee = async (addressData: {
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  }) => {
    setIsCalculatingDelivery(true);
    setDeliveryError(null);
    
    try {
      const response = await apiRequest('POST', '/api/delivery/calculate', addressData);
      const data = await response.json();
      
      if (response.ok) {
        setDeliveryCalc(data);
        setDeliveryError(null);
      } else {
        setDeliveryError(data.error || 'Erro ao calcular entrega');
        setDeliveryCalc(null);
      }
    } catch (error) {
      setDeliveryError('Erro ao calcular entrega');
      setDeliveryCalc(null);
    } finally {
      setIsCalculatingDelivery(false);
    }
  };

  // Calculate delivery when existing address is available
  useEffect(() => {
    if (address && address.zipCode) {
      calculateDeliveryFee({
        cep: address.zipCode,
        street: address.street,
        number: address.number,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
      });
    }
  }, [address]);

  // Use calculated delivery fee or fallback to minimum
  const deliveryFee = deliveryCalc?.taxaEntrega ?? Number(settings?.minDeliveryFee ?? 6.90);
  const estimatedDistance = deliveryCalc?.distanciaKm ?? 0;
  const estimatedTime = deliveryCalc?.tempoEstimadoMinutos ?? 0;
  
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
        deliveryDistance: estimatedDistance,
        discount: comboDiscount,
        total,
        paymentMethod,
        changeFor: paymentMethod === 'cash' && needsChange ? Number(changeFor) : null,
        customerLat: deliveryCalc?.clienteLat?.toString() || null,
        customerLng: deliveryCalc?.clienteLng?.toString() || null,
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

  const createAddressMutation = useMutation({
    mutationFn: async (): Promise<Address> => {
      const addressData = {
        userId: user?.id,
        street,
        number,
        complement: complement || null,
        neighborhood,
        city,
        state,
        zipCode,
        notes: notes || null,
        isDefault: true,
      };
      const response = await apiRequest('POST', '/api/addresses', addressData);
      const data = await response.json();
      return data as Address;
    },
    onSuccess: (data: Address) => {
      setAddress(data);
      queryClient.invalidateQueries({ queryKey: ['/api/addresses'] });
      toast({ title: 'Endereco salvo!', description: 'Calculando taxa de entrega...' });
      
      // Calculate delivery fee for the newly saved address
      calculateDeliveryFee({
        cep: data.zipCode,
        street: data.street,
        number: data.number,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
      });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar endereco', variant: 'destructive' });
    },
  });

  const handleSaveAddress = () => {
    if (!street || !number || !neighborhood || !city || !state || !zipCode) {
      toast({ title: 'Endereco incompleto', description: 'Preencha todos os campos obrigatorios', variant: 'destructive' });
      return;
    }
    createAddressMutation.mutate();
  };

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

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/login?redirect=/checkout');
    } else if (items.length === 0) {
      setLocation('/');
    }
  }, [isAuthenticated, items.length, setLocation]);

  if (!isAuthenticated || items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show address form if user is authenticated but has no address
  const needsAddress = !address;

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
                {needsAddress ? (
                  <div className="space-y-4">
                    <p className="text-muted-foreground text-sm mb-4">
                      Adicione seu endereco de entrega para continuar
                    </p>
                    
                    <div className="flex gap-2">
                      <Input
                        placeholder="CEP"
                        value={zipCode}
                        onChange={(e) => handleCepChange(e.target.value)}
                        className="bg-secondary border-primary/30 text-foreground flex-1"
                        maxLength={9}
                        data-testid="input-checkout-zipcode"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => searchAddressByCep(zipCode)}
                        disabled={isSearchingCep || zipCode.length !== 8}
                        className="border-primary/30"
                        data-testid="button-search-cep"
                      >
                        {isSearchingCep ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Buscar'
                        )}
                      </Button>
                    </div>
                    {cepError && (
                      <p className="text-destructive text-sm">{cepError}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Estado"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="bg-secondary border-primary/30 text-foreground"
                        data-testid="input-checkout-state"
                      />
                      <Input
                        placeholder="Cidade"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="bg-secondary border-primary/30 text-foreground"
                        data-testid="input-checkout-city"
                      />
                    </div>

                    <Input
                      placeholder="Bairro"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="bg-secondary border-primary/30 text-foreground"
                      data-testid="input-checkout-neighborhood"
                    />

                    <div className="grid grid-cols-4 gap-2">
                      <Input
                        placeholder="Rua"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="col-span-3 bg-secondary border-primary/30 text-foreground"
                        data-testid="input-checkout-street"
                      />
                      <Input
                        placeholder="Nro"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        className="bg-secondary border-primary/30 text-foreground"
                        data-testid="input-checkout-number"
                      />
                    </div>

                    <Input
                      placeholder="Complemento (opcional)"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      className="bg-secondary border-primary/30 text-foreground"
                      data-testid="input-checkout-complement"
                    />

                    <Textarea
                      placeholder="Observacoes para entrega (ex: portao azul, casa dos fundos...)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="bg-secondary border-primary/30 text-foreground resize-none"
                      rows={2}
                      data-testid="input-checkout-notes"
                    />

                    <Button
                      className="w-full bg-primary text-primary-foreground"
                      onClick={handleSaveAddress}
                      disabled={createAddressMutation.isPending}
                      data-testid="button-save-address"
                    >
                      {createAddressMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        'Salvar Endereco'
                      )}
                    </Button>
                  </div>
                ) : (
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
                )}
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
                      Taxa de entrega
                      {estimatedDistance > 0 && (
                        <span className="text-xs">({estimatedDistance.toFixed(1)} km)</span>
                      )}
                    </span>
                    {isCalculatingDelivery ? (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Calculando...
                      </span>
                    ) : (
                      <span className="text-foreground">{formatPrice(deliveryFee)}</span>
                    )}
                  </div>

                  {estimatedTime > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Tempo estimado
                      </span>
                      <span className="text-foreground">{estimatedTime} min</span>
                    </div>
                  )}

                  {deliveryError && (
                    <div className="text-destructive text-xs mt-1">
                      {deliveryError}
                    </div>
                  )}
                </div>

                <Separator className="bg-primary/20" />

                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-xl text-primary">{formatPrice(total)}</span>
                </div>

                <Button
                  className="w-full bg-primary text-primary-foreground font-semibold py-6"
                  onClick={() => createOrderMutation.mutate()}
                  disabled={createOrderMutation.isPending || needsAddress || isCalculatingDelivery || (!deliveryCalc && !deliveryError)}
                  data-testid="button-place-order"
                >
                  {createOrderMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : needsAddress ? (
                    'Adicione um endereco primeiro'
                  ) : isCalculatingDelivery ? (
                    'Calculando entrega...'
                  ) : !deliveryCalc && !deliveryError ? (
                    'Aguardando calculo de entrega...'
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
