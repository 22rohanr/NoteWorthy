import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Calendar, ChevronRight, Info } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useBrands } from '@/hooks/use-api';

export default function Brands() {
  const { brands, isLoading, isMock } = useBrands();
  const [search, setSearch] = useState('');

  const filtered = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="border-b border-border/40 bg-secondary/30">
        <div className="container py-16 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            Fragrance Houses
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-lg">
            Explore the world's most prestigious perfume houses — from heritage maisons to modern independents.
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto mt-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brands..."
              className="pl-11 h-12 bg-background border-border/60 focus-visible:ring-primary/30"
            />
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="container py-12">
        {/* Mock data banner */}
        {isMock && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <Info className="h-4 w-4 shrink-0" />
            Showing sample data — the live API is currently unavailable.
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-card p-6 space-y-3">
                <Skeleton className="h-6 w-40" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-px w-full mt-4" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
        )}

        {/* Loaded content */}
        {!isLoading && (
          <>
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-20">No brands match your search.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((brand) => {
                  const count = brand.fragranceCount ?? 0;
                  return (
                    <Link
                      key={brand.id}
                      to={`/discover?brand=${encodeURIComponent(brand.name)}`}
                      className="group rounded-xl border border-border/60 bg-card p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="font-display text-xl font-semibold tracking-tight group-hover:text-primary transition-colors">
                            {brand.name}
                          </h2>
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {brand.country}
                            </span>
                            {brand.foundedYear && (
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Est. {brand.foundedYear}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary transition-colors mt-1" />
                      </div>

                      <div className="mt-4 pt-4 border-t border-border/40 text-xs text-muted-foreground">
                        {count} fragrance{count !== 1 ? 's' : ''} listed
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
