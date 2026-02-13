import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Grid3X3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { FragranceCard } from '@/components/fragrance/FragranceCard';
import { fragrances, currentUser } from '@/data/dummyData';
import { CollectionTab } from '@/types/fragrance';

export default function Collection() {
  const [activeTab, setActiveTab] = useState<CollectionTab>('owned');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const getFragrancesByCollection = (collection: CollectionTab) => {
    const ids = currentUser.collection[collection];
    return fragrances.filter((f) => ids.includes(f.id));
  };

  const ownedFragrances = getFragrancesByCollection('owned');
  const sampledFragrances = getFragrancesByCollection('sampled');
  const wishlistFragrances = getFragrancesByCollection('wishlist');

  const renderFragranceList = (items: typeof fragrances) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">No fragrances in this collection yet</p>
          <Button variant="outline" asChild>
            <Link to="/discover">Discover Fragrances</Link>
          </Button>
        </div>
      );
    }

    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((fragrance) => (
            <FragranceCard key={fragrance.id} fragrance={fragrance} />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((fragrance) => (
          <Link
            key={fragrance.id}
            to={`/fragrance/${fragrance.id}`}
            className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50 hover:shadow-card transition-shadow"
          >
            <div className="w-16 h-20 bg-secondary rounded flex-shrink-0 flex items-center justify-center">
              <div className="w-6 h-10 bg-primary/30 rounded-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{fragrance.brand.name}</p>
              <h3 className="font-display text-lg font-medium truncate">{fragrance.name}</h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span>{fragrance.concentration}</span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  {fragrance.ratings.overall.toFixed(1)}
                </span>
              </div>
            </div>
            {fragrance.price && (
              <div className="text-right">
                <p className="font-medium">${fragrance.price.amount}</p>
                <p className="text-xs text-muted-foreground">{fragrance.price.size}</p>
              </div>
            )}
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8">
        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-medium mb-2">My Collection</h1>
            <p className="text-muted-foreground">
              {ownedFragrances.length} owned • {sampledFragrances.length} sampled • {wishlistFragrances.length} wishlisted
            </p>
          </div>
          <div className="flex gap-1 bg-secondary rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CollectionTab)} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="owned" className="gap-2">
              Owned
              <span className="px-1.5 py-0.5 text-xs bg-secondary rounded">{ownedFragrances.length}</span>
            </TabsTrigger>
            <TabsTrigger value="sampled" className="gap-2">
              Sampled
              <span className="px-1.5 py-0.5 text-xs bg-secondary rounded">{sampledFragrances.length}</span>
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="gap-2">
              Wishlist
              <span className="px-1.5 py-0.5 text-xs bg-secondary rounded">{wishlistFragrances.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="owned">
            {renderFragranceList(ownedFragrances)}
          </TabsContent>
          <TabsContent value="sampled">
            {renderFragranceList(sampledFragrances)}
          </TabsContent>
          <TabsContent value="wishlist">
            {renderFragranceList(wishlistFragrances)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
