import { useState } from 'react';
import { useLocation } from 'wouter';
import { Phone, User, MapPin, ArrowRight, Loader2, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import logoImage from '@assets/VIBE_DRINKS_1765072715257.png';
import { NEIGHBORHOODS, DELIVERY_ZONES, DELIVERY_FEE_WARNING, type DeliveryZone } from '@shared/delivery-zones';

type Step = 'phone' | 'password' | 'register';

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, setAddress } = useAuth();
  
  const [step, setStep] = useState<Step>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('');
  
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [notes, setNotes] = useState('');

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatPhone(e.target.value));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPassword(value);
  };

  const handleCheckPhone = async () => {
    const cleanPhone = whatsapp.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast({ title: 'Numero invalido', description: 'Digite um numero de WhatsApp valido', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/check-phone', { whatsapp: cleanPhone });
      const data = await response.json();
      
      if (data.isMotoboy) {
        toast({ 
          title: 'Acesso de motoboy', 
          description: 'Use o login de funcionarios para acessar', 
          variant: 'destructive' 
        });
        setTimeout(() => setLocation('/admin-login'), 2000);
        return;
      }
      
      if (data.exists) {
        setUserName(data.userName);
        setStep('password');
      } else {
        setStep('register');
      }
    } catch (error) {
      setStep('register');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (password.length !== 6) {
      toast({ title: 'Senha invalida', description: 'A senha deve ter 6 digitos', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const cleanPhone = whatsapp.replace(/\D/g, '');
      const response = await apiRequest('POST', '/api/auth/customer-login', { 
        whatsapp: cleanPhone, 
        password 
      });
      const data = await response.json();
      
      if (data.success) {
        login(data.user, 'customer');
        if (data.address) {
          setAddress(data.address);
        }
        toast({ title: 'Bem-vindo de volta!', description: `Ola, ${data.user.name}!` });
        
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect') || '/';
        setLocation(redirect);
      } else {
        toast({ title: 'Erro', description: data.error || 'Senha incorreta', variant: 'destructive' });
      }
    } catch (error: any) {
      let errorMsg = 'Verifique sua senha e tente novamente';
      if (error instanceof Response) {
        try {
          const errorData = await error.json();
          if (errorData?.error) errorMsg = errorData.error;
        } catch {}
      }
      toast({ 
        title: 'Erro ao entrar', 
        description: errorMsg, 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      toast({ title: 'Nome obrigatorio', variant: 'destructive' });
      return;
    }
    if (password.length !== 6) {
      toast({ title: 'Senha invalida', description: 'A senha deve ter 6 digitos', variant: 'destructive' });
      return;
    }
    if (!street || !number || !neighborhood || !city || !state || !zipCode) {
      toast({ title: 'Endereco incompleto', description: 'Preencha todos os campos obrigatorios', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const cleanPhone = whatsapp.replace(/\D/g, '');
      const response = await apiRequest('POST', '/api/auth/register', {
        user: { name, whatsapp: cleanPhone, password },
        address: { street, number, complement, neighborhood, city, state, zipCode, notes }
      });
      const data = await response.json();
      
      login(data.user, 'customer');
      setAddress(data.address);
      toast({ title: 'Cadastro realizado!', description: `Bem-vindo, ${name}!` });
      
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect') || '/';
      setLocation(redirect);
    } catch (error: any) {
      let errorMsg = 'Tente novamente';
      if (error instanceof Response) {
        try {
          const errorData = await error.json();
          if (errorData?.error) errorMsg = errorData.error;
        } catch {}
      }
      toast({ 
        title: 'Erro ao cadastrar', 
        description: errorMsg, 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'phone': return 'Entrar';
      case 'password': return `Ola, ${userName}!`;
      case 'register': return 'Criar Conta';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'phone': return 'Digite seu numero de WhatsApp para continuar';
      case 'password': return 'Digite sua senha de 6 digitos';
      case 'register': return 'Complete seu cadastro para fazer pedidos';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-primary/20">
        <CardHeader className="text-center">
          <img src={logoImage} alt="Vibe Drinks" className="h-16 mx-auto mb-4" />
          <CardTitle className="font-serif text-2xl text-primary">
            {getStepTitle()}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {getStepDescription()}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {step === 'phone' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-foreground">WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={whatsapp}
                    onChange={handlePhoneChange}
                    className="pl-10 bg-secondary border-primary/30 text-foreground"
                    data-testid="input-whatsapp"
                  />
                </div>
              </div>

              <Button
                className="w-full bg-primary text-primary-foreground"
                onClick={handleCheckPhone}
                disabled={isLoading}
                data-testid="button-continue"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setLocation('/')}
                data-testid="button-back-home"
              >
                Voltar para o site
              </Button>
            </>
          )}

          {step === 'password' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Senha (6 digitos)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    inputMode="numeric"
                    placeholder="000000"
                    value={password}
                    onChange={handlePasswordChange}
                    maxLength={6}
                    className="pl-10 bg-secondary border-primary/30 text-foreground text-center text-xl tracking-widest"
                    data-testid="input-password"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-primary/50 text-primary"
                  onClick={() => {
                    setStep('phone');
                    setPassword('');
                  }}
                  data-testid="button-back-password"
                >
                  Voltar
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground"
                  onClick={handleLogin}
                  disabled={isLoading || password.length !== 6}
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 'register' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-secondary border-primary/30 text-foreground"
                    data-testid="input-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-foreground">Crie uma senha (6 digitos)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="register-password"
                    type="password"
                    inputMode="numeric"
                    placeholder="000000"
                    value={password}
                    onChange={handlePasswordChange}
                    maxLength={6}
                    className="pl-10 bg-secondary border-primary/30 text-foreground text-center text-xl tracking-widest"
                    data-testid="input-register-password"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Apenas numeros, 6 digitos</p>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereco de entrega
                </Label>
                
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="CEP"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="bg-secondary border-primary/30 text-foreground"
                    data-testid="input-zipcode"
                  />
                  <Input
                    placeholder="Estado"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="bg-secondary border-primary/30 text-foreground"
                    data-testid="input-state"
                  />
                  <Input
                    placeholder="Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-secondary border-primary/30 text-foreground"
                    data-testid="input-city"
                  />
                </div>

                <Select value={neighborhood} onValueChange={setNeighborhood}>
                  <SelectTrigger className="bg-secondary border-primary/30 text-foreground" data-testid="select-neighborhood">
                    <SelectValue placeholder="Selecione o bairro" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-primary/20 max-h-[300px]">
                    {(['S', 'A', 'B', 'C', 'D', 'E'] as DeliveryZone[]).map((zone) => {
                      const zoneInfo = DELIVERY_ZONES[zone];
                      const zoneNeighborhoods = NEIGHBORHOODS.filter(n => n.zone === zone);
                      if (zoneNeighborhoods.length === 0) return null;
                      return (
                        <SelectGroup key={zone}>
                          <SelectLabel className="text-primary font-semibold">
                            {zoneInfo.name} - R$ {zoneInfo.fee.toFixed(2).replace('.', ',')}
                          </SelectLabel>
                          {zoneNeighborhoods.map((n) => (
                            <SelectItem key={n.name} value={n.name} className="text-foreground">
                              {n.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
                
                <div className="flex items-start gap-2 p-3 bg-yellow/10 border border-yellow/30 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow">{DELIVERY_FEE_WARNING}</p>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <Input
                    placeholder="Rua"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="col-span-3 bg-secondary border-primary/30 text-foreground"
                    data-testid="input-street"
                  />
                  <Input
                    placeholder="Nro"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="bg-secondary border-primary/30 text-foreground"
                    data-testid="input-number"
                  />
                </div>

                <Input
                  placeholder="Complemento (opcional)"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  className="bg-secondary border-primary/30 text-foreground"
                  data-testid="input-complement"
                />

                <Textarea
                  placeholder="Observacoes para entrega (ex: portao azul, casa dos fundos...)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-secondary border-primary/30 text-foreground resize-none"
                  rows={2}
                  data-testid="input-notes"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-primary/50 text-primary"
                  onClick={() => {
                    setStep('phone');
                    setPassword('');
                  }}
                  data-testid="button-back-register"
                >
                  Voltar
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground"
                  onClick={handleRegister}
                  disabled={isLoading}
                  data-testid="button-register"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Cadastrar'
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
