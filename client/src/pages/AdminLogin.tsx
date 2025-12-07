import { useState } from 'react';
import { useLocation } from 'wouter';
import { Lock, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import logoImage from '@assets/VIBE_DRINKS_1765072715257.png';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/login', { username, password });
      const data = await response.json();
      
      if (data.success && data.user) {
        login(data.user, data.role);
        toast({ title: 'Login realizado!', description: `Bem-vindo, ${data.user.name}!` });
        
        setTimeout(() => {
          if (data.role === 'admin') {
            window.location.href = '/admin';
          } else if (data.role === 'kitchen') {
            window.location.href = '/cozinha';
          } else if (data.role === 'motoboy') {
            window.location.href = '/motoboy';
          } else if (data.role === 'pdv') {
            window.location.href = '/pdv';
          }
        }, 100);
      } else {
        toast({ title: 'Credenciais invalidas', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Erro ao fazer login', description: 'Verifique suas credenciais', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-primary/20">
        <CardHeader className="text-center">
          <img src={logoImage} alt="Vibe Drinks" className="h-16 mx-auto mb-4" />
          <CardTitle className="font-serif text-2xl text-primary">
            Acesso Restrito
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Login para administradores, cozinha e motoboys
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-foreground">Usuario</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                placeholder="Digite seu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 bg-secondary border-primary/30 text-foreground"
                data-testid="input-username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-secondary border-primary/30 text-foreground"
                data-testid="input-password"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground"
            onClick={handleLogin}
            disabled={isLoading}
            data-testid="button-login"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Entrar'
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
        </CardContent>
      </Card>
    </div>
  );
}
