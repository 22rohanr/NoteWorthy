import { Link } from 'react-router-dom';
import { TrendingUp, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteBadge } from '@/components/ui/note-badge';
import { useTrending } from '@/hooks/use-api';

export function TrendingSidebar() {
  const { notes, brands, isLoading } = useTrending();

  return (
    <aside className="rounded-xl border border-border/60 bg-card p-5 sticky top-24">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="font-display text-lg font-semibold tracking-tight">
          Trending Now
        </h3>
      </div>

      {/* Top Notes */}
      <section className="mb-6">
        <div className="flex items-center gap-1.5 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top Notes
          </h4>
        </div>

        {isLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-full" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data yet</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {notes.map((note) => (
              <Link
                key={note.name}
                to={`/discover?notes=${encodeURIComponent(note.name)}`}
              >
                <NoteBadge
                  note={{ id: note.name, name: note.name, family: note.family }}
                  size="sm"
                  className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-shadow"
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Top Brands */}
      <section>
        <div className="flex items-center gap-1.5 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top Brands
          </h4>
        </div>

        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        ) : brands.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data yet</p>
        ) : (
          <ul className="space-y-2">
            {brands.map((brand, i) => (
              <li key={brand.name}>
                <Link
                  to={`/discover?brand=${encodeURIComponent(brand.name)}`}
                  className="flex items-center justify-between group"
                >
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    <span className="text-muted-foreground mr-1.5 text-xs">{i + 1}.</span>
                    {brand.name}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {brand.count} {brand.count === 1 ? 'review' : 'reviews'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
