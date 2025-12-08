import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Flame, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Category } from '@shared/schema';
import { TRENDING_CATEGORY_ID } from '@/pages/Home';
import { getCategoryIcon } from '@/lib/category-icons';

interface CategoryCarouselProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  showTrending?: boolean;
}

export function CategoryCarousel({ categories, selectedCategory, onSelectCategory, showTrending = false }: CategoryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeCategories = categories.filter(c => c.isActive).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  if (activeCategories.length === 0) return null;

  return (
    <section className="py-6 px-4" data-testid="section-categories">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary mb-6">
          Categorias
        </h2>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 bg-black/80 text-white hover:bg-black hidden md:flex"
            onClick={() => scroll('left')}
            data-testid="button-category-prev"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide py-2 px-1"
            data-testid="carousel-categories"
          >
            <button
              onClick={() => onSelectCategory(null)}
              className={`flex flex-col items-center gap-2 min-w-[100px] p-3 rounded-xl transition-all ${
                selectedCategory === null 
                  ? 'bg-primary/20 border-2 border-primary gold-glow-sm scale-105' 
                  : 'bg-secondary/50 border border-primary/20 hover:border-primary/50'
              }`}
              data-testid="button-category-all"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                selectedCategory === null ? 'bg-primary' : 'bg-secondary'
              }`}>
                <span className={`text-2xl font-bold ${selectedCategory === null ? 'text-black' : 'text-primary'}`}>
                  A
                </span>
              </div>
              <span className={`text-sm font-medium ${selectedCategory === null ? 'text-primary' : 'text-white'}`}>
                Todos
              </span>
            </button>

            {showTrending && (
              <button
                onClick={() => onSelectCategory(TRENDING_CATEGORY_ID)}
                className={`flex flex-col items-center gap-2 min-w-[100px] p-3 rounded-xl transition-all ${
                  selectedCategory === TRENDING_CATEGORY_ID 
                    ? 'bg-orange-500/20 border-2 border-orange-500 scale-105' 
                    : 'bg-secondary/50 border border-orange-500/30 hover:border-orange-500/60'
                }`}
                style={selectedCategory === TRENDING_CATEGORY_ID ? { boxShadow: '0 0 15px rgba(249, 115, 22, 0.4)' } : {}}
                data-testid="button-category-trending"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  selectedCategory === TRENDING_CATEGORY_ID ? 'bg-orange-500' : 'bg-secondary border border-orange-500/30'
                }`}>
                  <Flame className={`h-8 w-8 ${selectedCategory === TRENDING_CATEGORY_ID ? 'text-white' : 'text-orange-500'}`} />
                </div>
                <span className={`text-sm font-medium ${
                  selectedCategory === TRENDING_CATEGORY_ID ? 'text-orange-500' : 'text-white'
                }`}>
                  Em Alta
                </span>
              </button>
            )}

            {activeCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                className={`flex flex-col items-center gap-2 min-w-[100px] p-3 rounded-xl transition-all ${
                  selectedCategory === category.id 
                    ? 'bg-primary/20 border-2 border-primary gold-glow-sm scale-105' 
                    : 'bg-secondary/50 border border-primary/20 hover:border-primary/50'
                }`}
                data-testid={`button-category-${category.id}`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  selectedCategory === category.id ? 'border-2 border-primary bg-primary/10' : 'border border-primary/30 bg-secondary'
                }`}>
                  {(() => {
                    const IconComponent = getCategoryIcon(category.iconUrl);
                    return (
                      <IconComponent 
                        className={`h-7 w-7 ${selectedCategory === category.id ? 'text-primary' : 'text-primary/70'}`}
                      />
                    );
                  })()}
                </div>
                <span className={`text-sm font-medium text-center ${
                  selectedCategory === category.id ? 'text-primary' : 'text-white'
                }`}>
                  {category.name}
                </span>
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 bg-black/80 text-white hover:bg-black hidden md:flex"
            onClick={() => scroll('right')}
            data-testid="button-category-next"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
