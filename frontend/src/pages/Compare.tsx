import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, X, Star, ArrowLeft, Plus, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/Header';
import { RatingBar } from '@/components/ui/rating-bar';
import { NoteBadge } from '@/components/ui/note-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFragrances } from '@/hooks/use-api';
import type { Fragrance, Note } from '@/types/fragrance';

const MAX_COMPARE = 3;

export default function Compare() {
  const { fragrances, isLoading } = useFragrances();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const dropdownRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Sync from URL on mount / when fragrances load
  useEffect(() => {
    const idsParam = searchParams.get('ids');
    if (idsParam && fragrances.length > 0) {
      const ids = idsParam.split(',').filter((id) =>
        fragrances.some((f) => f.id === id)
      );
      setSelectedIds(ids.slice(0, MAX_COMPARE));
    }
  }, [searchParams, fragrances]);

  // Sync to URL when selection changes
  useEffect(() => {
    if (selectedIds.length > 0) {
      setSearchParams({ ids: selectedIds.join(',') }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [selectedIds, setSearchParams]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (activeSlot !== null) {
        const ref = dropdownRefs.current[activeSlot];
        if (ref && !ref.contains(e.target as Node)) {
          setActiveSlot(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [activeSlot]);

  const selected = useMemo(
    () => selectedIds.map((id) => fragrances.find((f) => f.id === id)).filter(Boolean) as Fragrance[],
    [selectedIds, fragrances]
  );

  const filteredForSlot = (slot: number) => {
    const q = (searchQueries[slot] || '').toLowerCase();
    return fragrances
      .filter((f) => !selectedIds.includes(f.id))
      .filter(
        (f) =>
          !q ||
          f.name.toLowerCase().includes(q) ||
          f.brand.name.toLowerCase().includes(q)
      )
      .slice(0, 20);
  };

  const addFragrance = (id: string, slot: number) => {
    setSelectedIds((prev) => {
      const updated = [...prev];
      if (slot < updated.length) {
        updated[slot] = id;
      } else {
        updated.push(id);
      }
      return updated.slice(0, MAX_COMPARE);
    });
    setActiveSlot(null);
    setSearchQueries((prev) => ({ ...prev, [slot]: '' }));
  };

  const removeFragrance = (index: number) => {
    setSelectedIds((prev) => prev.filter((_, i) => i !== index));
  };

  // Find shared notes across all selected fragrances
  const sharedNoteIds = useMemo(() => {
    if (selected.length < 2) return new Set<string>();
    const allNotes = selected.map((f) => {
      const ids = new Set<string>();
      [...f.notes.top, ...f.notes.middle, ...f.notes.base].forEach((n) => ids.add(n.id));
      return ids;
    });
    const counts = new Map<string, number>();
    allNotes.forEach((noteSet) => {
      noteSet.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
    });
    const shared = new Set<string>();
    counts.forEach((count, id) => {
      if (count >= 2) shared.add(id);
    });
    return shared;
  }, [selected]);

  // Find the best value in each rating category
  const bestRatings = useMemo(() => {
    if (selected.length < 2) return null;
    return {
      overall: Math.max(...selected.map((f) => f.ratings.overall)),
      longevity: Math.max(...selected.map((f) => f.ratings.longevity)),
      sillage: Math.max(...selected.map((f) => f.ratings.sillage)),
      value: Math.max(...selected.map((f) => f.ratings.value)),
    };
  }, [selected]);

  const lowestPrice = useMemo(() => {
    const withPrice = selected.filter((f) => f.price);
    if (withPrice.length < 2) return null;
    return Math.min(...withPrice.map((f) => f.price!.amount));
  }, [selected]);

  const renderNotes = (notes: Note[], fragranceIndex: number) => (
    <div className="flex flex-wrap gap-1.5">
      {notes.map((note) => (
        <NoteBadge
          key={`${fragranceIndex}-${note.id}`}
          note={note}
          size="sm"
          className={sharedNoteIds.has(note.id) ? 'ring-2 ring-primary/50 ring-offset-1' : ''}
        />
      ))}
      {notes.length === 0 && (
        <span className="text-xs text-muted-foreground italic">None listed</span>
      )}
    </div>
  );

  const renderSlot = (slotIndex: number) => {
    const fragrance = selected[slotIndex];

    if (fragrance) {
      return (
        <div className="relative group">
          <button
            onClick={() => removeFragrance(slotIndex)}
            className="absolute -top-2 -right-2 z-10 p-1 rounded-full bg-destructive text-destructive-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <SlotCard fragrance={fragrance} />
        </div>
      );
    }

    return (
      <div
        ref={(el) => { dropdownRefs.current[slotIndex] = el; }}
        className="relative"
      >
        <div
          className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-border/60 rounded-xl hover:border-primary/40 transition-colors cursor-pointer min-h-[200px]"
          onClick={() => setActiveSlot(slotIndex)}
        >
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {selectedIds.length === 0 ? 'Add a fragrance to compare' : 'Add another fragrance'}
          </p>
        </div>

        {activeSlot === slotIndex && (
          <div className="absolute top-full left-0 right-0 z-30 mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search fragrances..."
                  className="pl-8 h-9"
                  autoFocus
                  value={searchQueries[slotIndex] || ''}
                  onChange={(e) =>
                    setSearchQueries((prev) => ({ ...prev, [slotIndex]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setActiveSlot(null);
                  }}
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredForSlot(slotIndex).map((f) => (
                <button
                  key={f.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left transition-colors"
                  onClick={() => addFragrance(f.id, slotIndex)}
                >
                  <FragranceMiniImage fragrance={f} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{f.brand.name}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span className="text-xs font-medium">{f.ratings.overall.toFixed(1)}</span>
                  </div>
                </button>
              ))}
              {filteredForSlot(slotIndex).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No matches found</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[200px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const slotCount = Math.max(selected.length + 1, 2);
  const slots = Array.from({ length: Math.min(slotCount, MAX_COMPARE) }, (_, i) => i);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8">
        {/* Breadcrumb */}
        <Link
          to="/discover"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Discover
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Scale className="h-7 w-7 text-primary" />
            <h1 className="font-display text-3xl md:text-4xl font-medium">Compare Fragrances</h1>
          </div>
          <p className="text-muted-foreground">
            Select up to {MAX_COMPARE} fragrances to compare side by side
          </p>
        </div>

        {/* Picker Slots */}
        <div className={`grid gap-6 mb-10 ${slots.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {slots.map((i) => (
            <div key={i}>{renderSlot(i)}</div>
          ))}
        </div>

        {/* Comparison Table */}
        {selected.length >= 2 && (
          <div className="space-y-0">
            {sharedNoteIds.size > 0 && (
              <p className="text-xs text-muted-foreground mb-6">
                Notes shared between fragrances are <span className="inline-block px-1.5 py-0.5 rounded ring-2 ring-primary/50 ring-offset-1 text-xs">highlighted</span>
              </p>
            )}

            {/* Overall Rating */}
            <ComparisonSection title="Overall Rating">
              <div className={`grid gap-6 ${selected.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {selected.map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <Star className={`h-5 w-5 ${bestRatings && f.ratings.overall === bestRatings.overall ? 'fill-primary text-primary' : 'fill-muted-foreground/40 text-muted-foreground/40'}`} />
                    <span className={`text-2xl font-medium tabular-nums ${bestRatings && f.ratings.overall === bestRatings.overall ? 'text-primary' : ''}`}>
                      {f.ratings.overall.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({f.ratings.reviewCount} review{f.ratings.reviewCount !== 1 ? 's' : ''})
                    </span>
                  </div>
                ))}
              </div>
            </ComparisonSection>

            {/* Performance */}
            <ComparisonSection title="Performance">
              <div className={`grid gap-6 ${selected.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {selected.map((f) => (
                  <div key={f.id} className="space-y-3">
                    <RatingBar
                      label="Longevity"
                      value={f.ratings.longevity}
                      className={bestRatings && f.ratings.longevity === bestRatings.longevity ? '[&_div:last-child>div]:bg-primary' : '[&_div:last-child>div]:bg-muted-foreground/30'}
                    />
                    <RatingBar
                      label="Sillage"
                      value={f.ratings.sillage}
                      className={bestRatings && f.ratings.sillage === bestRatings.sillage ? '[&_div:last-child>div]:bg-primary' : '[&_div:last-child>div]:bg-muted-foreground/30'}
                    />
                    <RatingBar
                      label="Value"
                      value={f.ratings.value}
                      className={bestRatings && f.ratings.value === bestRatings.value ? '[&_div:last-child>div]:bg-primary' : '[&_div:last-child>div]:bg-muted-foreground/30'}
                    />
                  </div>
                ))}
              </div>
            </ComparisonSection>

            {/* Details */}
            <ComparisonSection title="Details">
              <div className={`grid gap-6 ${selected.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {selected.map((f) => (
                  <div key={f.id} className="space-y-2 text-sm">
                    <DetailRow label="Brand" value={f.brand.name} />
                    <DetailRow label="Year" value={String(f.releaseYear)} />
                    <DetailRow label="Concentration" value={f.concentration} />
                    <DetailRow label="Gender" value={f.gender} />
                    {f.perfumer && <DetailRow label="Perfumer" value={f.perfumer} />}
                  </div>
                ))}
              </div>
            </ComparisonSection>

            {/* Price */}
            <ComparisonSection title="Price">
              <div className={`grid gap-6 ${selected.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {selected.map((f) => (
                  <div key={f.id}>
                    {f.price ? (
                      <div>
                        <p className={`text-xl font-medium tabular-nums ${lowestPrice !== null && f.price.amount === lowestPrice ? 'text-green-600 dark:text-green-400' : ''}`}>
                          ${f.price.amount}
                        </p>
                        <p className="text-sm text-muted-foreground">{f.price.size}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Price not available</p>
                    )}
                  </div>
                ))}
              </div>
            </ComparisonSection>

            {/* Notes */}
            {(['top', 'middle', 'base'] as const).map((layer) => (
              <ComparisonSection key={layer} title={`${layer === 'middle' ? 'Heart' : layer.charAt(0).toUpperCase() + layer.slice(1)} Notes`}>
                <div className={`grid gap-6 ${selected.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {selected.map((f, i) => (
                    <div key={f.id}>{renderNotes(f.notes[layer], i)}</div>
                  ))}
                </div>
              </ComparisonSection>
            ))}

            {/* Links to detail pages */}
            <ComparisonSection title="">
              <div className={`grid gap-6 ${selected.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {selected.map((f) => (
                  <Button key={f.id} variant="outline" className="w-full" asChild>
                    <Link to={`/fragrance/${f.id}`}>View Full Details</Link>
                  </Button>
                ))}
              </div>
            </ComparisonSection>
          </div>
        )}

        {/* Empty state when nothing selected */}
        {selected.length === 0 && (
          <div className="text-center py-16">
            <Scale className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-medium mb-2">Start Comparing</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Select fragrances above to see how they stack up against each other.
              Compare ratings, notes, prices, and more.
            </p>
            <Button variant="outline" asChild>
              <Link to="/discover">Browse Fragrances</Link>
            </Button>
          </div>
        )}

        {/* Partial state: 1 selected */}
        {selected.length === 1 && (
          <div className="text-center py-10">
            <p className="text-muted-foreground">
              Add at least one more fragrance to start comparing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SlotCard({ fragrance }: { fragrance: Fragrance }) {
  return (
    <Link
      to={`/fragrance/${fragrance.id}`}
      className="flex flex-col items-center gap-3 p-6 bg-card border border-border/50 rounded-xl hover:shadow-md transition-shadow min-h-[200px]"
      onClick={(e) => e.preventDefault()}
    >
      <FragranceMiniImage fragrance={fragrance} size="lg" />
      <div className="text-center min-w-0 w-full">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
          {fragrance.brand.name}
        </p>
        <p className="font-display text-base font-medium truncate">{fragrance.name}</p>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          <span className="text-sm font-medium">{fragrance.ratings.overall.toFixed(1)}</span>
        </div>
      </div>
    </Link>
  );
}

function FragranceMiniImage({ fragrance, size }: { fragrance: Fragrance; size: 'sm' | 'lg' }) {
  const [imgError, setImgError] = useState(false);
  const hasImage = !!fragrance.imageUrl && !imgError;
  const brandInitial = fragrance.brand.name?.charAt(0)?.toUpperCase() || '?';

  const dimensions = size === 'lg' ? 'w-20 h-20' : 'w-9 h-9';
  const textSize = size === 'lg' ? 'text-2xl' : 'text-sm';

  if (hasImage) {
    return (
      <div className={`${dimensions} rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden shrink-0`}>
        <img
          src={fragrance.imageUrl}
          alt={fragrance.name}
          className="max-w-[80%] max-h-[80%] object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${dimensions} rounded-lg bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shrink-0`}>
      <span className={`${textSize} font-display font-semibold text-primary-foreground/80`}>
        {brandInitial}
      </span>
    </div>
  );
}

function ComparisonSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-5 border-b border-border/40 last:border-0">
      {title && (
        <h3 className="font-display text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
