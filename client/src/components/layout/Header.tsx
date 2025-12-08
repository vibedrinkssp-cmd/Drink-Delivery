import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ShoppingCart, User, Menu, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import logoImage from '@assets/VIBE_DRINKS_1765072715257.png';

interface HeaderProps {
  onCartOpen: () => void;
}

export function Header({ onCartOpen }: HeaderProps) {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-primary/20">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <img 
              src={logoImage} 
              alt="Vibe Drinks" 
              className="h-10 w-auto"
              data-testid="img-logo"
            />
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white"
              onClick={onCartOpen}
              data-testid="button-cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-primary text-primary-foreground text-xs"
                  data-testid="badge-cart-count"
                >
                  {itemCount}
                </Badge>
              )}
            </Button>

            {isAuthenticated ? (
              <Button
                variant="ghost"
                size="icon"
                className="text-white"
                onClick={() => setLocation('/perfil')}
                data-testid="button-profile"
              >
                <User className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-primary border-primary/50"
                onClick={() => setLocation('/login')}
                data-testid="button-login"
              >
                Entrar
              </Button>
            )}

            <Link href="/admin-login" className="text-muted-foreground/50 hover:text-primary transition-colors">
              <Settings className="h-4 w-4" />
            </Link>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-white" data-testid="button-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-black border-primary/20">
                <div className="flex flex-col gap-6 mt-8">
                  {isAuthenticated && (
                    <>
                      <Link 
                        href="/perfil" 
                        className="text-white text-lg font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid="link-profile-mobile"
                      >
                        Meu Perfil
                      </Link>
                      <Link 
                        href="/pedidos" 
                        className="text-white text-lg font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                        data-testid="link-orders-mobile"
                      >
                        Meus Pedidos
                      </Link>
                      <Button 
                        variant="ghost" 
                        className="justify-start text-destructive"
                        onClick={() => { logout(); setMobileMenuOpen(false); }}
                      >
                        Sair
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
