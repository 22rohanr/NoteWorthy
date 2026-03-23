import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search as SearchIcon,
  Star,
  ArrowRight,
  MessageSquare,
  Droplets,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteBadge } from '@/components/ui/note-badge';
import { FragranceCard } from '@/components/fragrance/FragranceCard';
import { apiGet } from '@/lib/api';

interface SearchResults {
  query: string;
  fragrances: Array<{
    id: string;
    name: string;
    brand: { id: string; name: string; country: string };
    imageUrl: string;
    ratings: { overall: number; reviewCount: number; longevity: number; sillage: number; value: number };
    concentration: string;
    gender: string;
    releaseYear: number;
    description: string;
    notes: {
      top: Array<{ id: string; name: string; family?: string }>;
      middle: Array<{ id: string; name: string; family?: string }>;
      base: Array<{ id: string; name: string; family?: string }>;
    };
    price?: { amount: number; currency: string; size: string };
  }>;
  fragranceCount: number;
  brands: Array<{ id: string; name: string; country: string }>;
  brandCount: number;
  notes: Array<{ id: string; name: string; family?: string }>;
  noteCount: number;
  discussions: Array<{
    id: string;
    title: string;
    category: string;
    authorName: string;
    commentCount: number;
    createdAt: string;
  }>;
  discussionCount: number;
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [inputValue, setInputValue] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setIsLoading(true);
    try {
      const data = await apiGet<SearchResults>(
        `/search?q=${encodeURIComponent(query.trim())}`
      );
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setInputValue(q);
    if (q) performSearch(q);
  }, [searchParams, performSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputValue.trim();
    if (!q) return;
    setSearchParams({ q }, { replace: true });
  };

  const totalResults = results
    ? results.fragranceCount + results.brandCount + results.noteCount + results.discussionCount
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8 max-w-4xl">
        {/* Search bar */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search fragrances, brands, notes, discussions..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="pl-12 pr-4 h-12 text-base"
              autoFocus
            />
          </div>
        </form>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Skeleton className="h-32 rounded-lg" />
                  <Skeleton className="h-32 rounded-lg" />
                  <Skeleton className="h-32 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No query */}
        {!isLoading && !results && !initialQuery && (
          <div className="text-center py-16">
            <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground text-lg">
              Search across fragrances, brands, notes, and discussions
            </p>
          </div>
        )}

        {/* No results */}
        {!isLoading && results && totalResults === 0 && (
          <div className="text-center py-16">
            <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="font-display text-xl font-medium mb-2">
              No results for &ldquo;{results.query}&rdquo;
            </h2>
            <p className="text-muted-foreground">
              Try a different search term or browse our{' '}
              <Link to="/discover" className="text-primary hover:underline">catalogue</Link>.
            </p>
          </div>
        )}

        {/* Results */}
        {!isLoading && results && totalResults > 0 && (
          <div className="space-y-10">
            <p className="text-sm text-muted-foreground">
              Found {totalResults} result{totalResults !== 1 ? 's' : ''} for &ldquo;{results.query}&rdquo;
            </p>

            {/* Fragrances */}
            {results.fragrances.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-medium flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-primary" />
                    Fragrances
                    <span className="text-sm font-normal text-muted-foreground">
                      ({results.fragranceCount})
                    </span>
                  </h2>
                  {results.fragranceCount > results.fragrances.length && (
                    <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
                      <Link to={`/discover?search=${encodeURIComponent(results.query)}`}>
                        View all
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {results.fragrances.map((fragrance) => (
                    <FragranceCard key={fragrance.id} fragrance={fragrance} />
                  ))}
                </div>
              </section>
            )}

            {/* Brands */}
            {results.brands.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-medium flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    Brands
                    <span className="text-sm font-normal text-muted-foreground">
                      ({results.brandCount})
                    </span>
                  </h2>
                  {results.brandCount > results.brands.length && (
                    <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
                      <Link to="/brands">
                        View all
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {results.brands.map((brand) => (
                    <Link
                      key={brand.id}
                      to={`/discover?brand=${encodeURIComponent(brand.name)}`}
                      className="p-4 bg-card rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <p className="font-medium">{brand.name}</p>
                      {brand.country && (
                        <p className="text-xs text-muted-foreground mt-0.5">{brand.country}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Notes */}
            {results.notes.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-medium">
                    Notes
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({results.noteCount})
                    </span>
                  </h2>
                  {results.noteCount > results.notes.length && (
                    <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
                      <Link to="/notes">
                        View all
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {results.notes.map((note) => (
                    <Link
                      key={note.id}
                      to={`/discover?note=${encodeURIComponent(note.name)}`}
                    >
                      <NoteBadge note={note} size="sm" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Discussions */}
            {results.discussions.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Discussions
                    <span className="text-sm font-normal text-muted-foreground">
                      ({results.discussionCount})
                    </span>
                  </h2>
                  {results.discussionCount > results.discussions.length && (
                    <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild>
                      <Link to="/discussions">
                        View all
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {results.discussions.map((disc) => (
                    <Link
                      key={disc.id}
                      to={`/discussions/${disc.id}`}
                      className="block p-4 bg-card rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-medium truncate">{disc.title}</h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">{disc.category}</Badge>
                            <span>by {disc.authorName}</span>
                            <span>{disc.commentCount} replies</span>
                          </div>
                        </div>
                        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
