import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/layout/Header';
import { FragranceCard } from '@/components/fragrance/FragranceCard';
import { NoteBadge } from '@/components/ui/note-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFragrances } from '@/hooks/use-api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

const concentrations = ['EDP', 'EDT', 'Parfum', 'EDC', 'Cologne'] as const;
const genders = ['Unisex', 'Masculine', 'Feminine'] as const;

export default function Discover() {
  const { fragrances, brands, notes, isLoading, isMock } = useFragrances();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedConcentration, setSelectedConcentration] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');

  // Seed filters from URL query params (e.g. ?brand=Chanel&note=Bergamot)
  useEffect(() => {
    if (isLoading) return;

    const brandParam = searchParams.get('brand');
    const noteParam = searchParams.get('note');
    let filtersApplied = false;

    if (brandParam && brands.length > 0) {
      const match = brands.find(
        (b) => b.name.toLowerCase() === brandParam.toLowerCase()
      );
      if (match) {
        setSelectedBrand(match.id);
        filtersApplied = true;
      }
    }

    if (noteParam && notes.length > 0) {
      const match = notes.find(
        (n) => n.name.toLowerCase() === noteParam.toLowerCase()
      );
      if (match) {
        setSelectedNotes([match.id]);
        filtersApplied = true;
      }
    }

    if (filtersApplied) {
      setShowFilters(true);
      // Clear the query params so refreshing resets, and so that
      // manually changing filters later doesn't conflict
      setSearchParams({}, { replace: true });
    }
  }, [isLoading, brands, notes]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleNote = (noteId: string) => {
    setSelectedNotes((prev) =>
      prev.includes(noteId)
        ? prev.filter((id) => id !== noteId)
        : [...prev, noteId]
    );
  };

  const clearFilters = () => {
    setSelectedNotes([]);
    setSelectedBrand('all');
    setSelectedConcentration('all');
    setSelectedGender('all');
    setSearchQuery('');
  };

  const filteredFragrances = fragrances
    .filter((f) => {
      if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !f.brand.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedBrand !== 'all' && f.brand.id !== selectedBrand) return false;
      if (selectedConcentration !== 'all' && f.concentration !== selectedConcentration) return false;
      if (selectedGender !== 'all' && f.gender !== selectedGender) return false;
      if (selectedNotes.length > 0) {
        const allNotes = [...f.notes.top, ...f.notes.middle, ...f.notes.base];
        const hasNote = selectedNotes.some((noteId) =>
          allNotes.some((n) => n.id === noteId)
        );
        if (!hasNote) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.ratings.overall - a.ratings.overall;
        case 'reviews':
          return b.ratings.reviewCount - a.ratings.reviewCount;
        case 'price-low':
          return (a.price?.amount || 0) - (b.price?.amount || 0);
        case 'price-high':
          return (b.price?.amount || 0) - (a.price?.amount || 0);
        case 'newest':
          return b.releaseYear - a.releaseYear;
        default:
          return 0;
      }
    });

  const hasActiveFilters = selectedNotes.length > 0 || selectedBrand !== 'all' ||
    selectedConcentration !== 'all' || selectedGender !== 'all';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-medium mb-2">Discover Fragrances</h1>
          <p className="text-muted-foreground">
            Explore {fragrances.length} fragrances from {brands.length} brands
          </p>
        </div>

        {/* Search & Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="reviews">Most Reviews</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              className="gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {selectedNotes.length + (selectedBrand !== 'all' ? 1 : 0) +
                    (selectedConcentration !== 'all' ? 1 : 0) + (selectedGender !== 'all' ? 1 : 0)}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="mb-6 p-5 bg-card rounded-lg border border-border/50 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Filter by</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  Clear all
                  <X className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Brand, Concentration, Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="All brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All brands</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Concentration</Label>
                <Select value={selectedConcentration} onValueChange={setSelectedConcentration}>
                  <SelectTrigger>
                    <SelectValue placeholder="All concentrations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All concentrations</SelectItem>
                    {concentrations.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={selectedGender} onValueChange={setSelectedGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {genders.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes filter */}
            <div className="space-y-3">
              <Label>Notes</Label>
              <div className="flex flex-wrap gap-2">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => toggleNote(note.id)}
                    className={`transition-all ${selectedNotes.includes(note.id) ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                  >
                    <NoteBadge note={note} size="sm" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mock data banner */}
        {isMock && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <Info className="h-4 w-4 shrink-0" />
            Showing sample data — the live API is currently unavailable.
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <>
            <Skeleton className="h-4 w-40 mb-6" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[3/4] w-full rounded-xl" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Loaded content */}
        {!isLoading && (
          <>
            {/* Results count */}
            <p className="text-sm text-muted-foreground mb-6">
              Showing {filteredFragrances.length} fragrance{filteredFragrances.length !== 1 ? 's' : ''}
            </p>

            {/* Fragrance Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredFragrances.map((fragrance, index) => (
                <FragranceCard
                  key={fragrance.id}
                  fragrance={fragrance}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
                />
              ))}
            </div>

            {filteredFragrances.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">No fragrances match your filters</p>
                <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
