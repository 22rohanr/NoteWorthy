import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, Heart, Share2, Plus, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { RatingBar } from '@/components/ui/rating-bar';
import { NotePyramid } from '@/components/fragrance/NotePyramid';
import { ReviewCard } from '@/components/fragrance/ReviewCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useFragrance } from '@/hooks/use-api';
import { useAuth } from '@/contexts/AuthContext';

export default function FragranceDetail() {
  const { id } = useParams<{ id: string }>();
  const { fragrance, reviews: fragranceReviews, isLoading, isMock } = useFragrance(id);
  const { userProfile } = useAuth();

  const [isInCollection, setIsInCollection] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Sync collection state when userProfile or fragrance load
  // (using derived state from the latest data)
  const owned = userProfile?.collection?.owned ?? [];
  const tried = userProfile?.collection?.tried ?? [];
  const wishlist = userProfile?.collection?.wishlist ?? [];
  const inCollection = isInCollection || owned.includes(id || '') || tried.includes(id || '');
  const wishlisted = isWishlisted || wishlist.includes(id || '');

  /* ── Loading state ───────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-4">
          <Skeleton className="h-4 w-32 mb-8" />
        </div>
        <div className="container pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            <Skeleton className="aspect-square lg:aspect-[3/4] w-full rounded-xl" />
            <div className="space-y-6">
              <div>
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Not found ───────────────────────────────────────────────────── */
  if (!fragrance) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Fragrance not found</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/discover">Back to Discover</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb */}
      <div className="container py-4">
        <Link 
          to="/discover" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Discover
        </Link>
      </div>

      {/* Mock data banner */}
      {isMock && (
        <div className="container mb-4">
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <Info className="h-4 w-4 shrink-0" />
            Showing sample data — the live API is currently unavailable.
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Section */}
          <div className="relative aspect-square lg:aspect-[3/4] bg-gradient-to-b from-secondary/50 to-secondary rounded-xl overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Placeholder bottle */}
              <div className="w-32 h-48 rounded-t-full bg-gradient-to-b from-primary/20 to-primary/40 flex items-end justify-center pb-6">
                <div className="w-20 h-24 bg-gradient-to-b from-primary/30 to-primary/60 rounded-sm" />
              </div>
            </div>
            
            {/* Actions overlay */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm"
                onClick={() => setIsWishlisted(!isWishlisted)}
              >
                <Heart className={wishlisted ? "h-5 w-5 fill-primary text-primary" : "h-5 w-5"} />
              </Button>
              <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">
                {fragrance.brand.name}
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-medium mb-2">
                {fragrance.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{fragrance.releaseYear}</span>
                <span>•</span>
                <span>{fragrance.concentration}</span>
                <span>•</span>
                <span>{fragrance.gender}</span>
              </div>
            </div>

            {/* Rating Summary */}
            <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <Star className="h-6 w-6 fill-primary text-primary" />
                <span className="text-2xl font-medium">{fragrance.ratings.overall.toFixed(1)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{fragrance.ratings.reviewCount.toLocaleString()}</span> reviews
              </div>
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed">
              {fragrance.description}
            </p>
            {fragrance.perfumer && (
              <p className="text-sm text-muted-foreground">
                Perfumer: <span className="text-foreground">{fragrance.perfumer}</span>
              </p>
            )}

            {/* Price & Actions */}
            <div className="flex items-center gap-4 pt-2">
              {fragrance.price && (
                <div>
                  <p className="text-2xl font-medium">${fragrance.price.amount}</p>
                  <p className="text-sm text-muted-foreground">{fragrance.price.size}</p>
                </div>
              )}
              <div className="flex gap-3 ml-auto">
                <Button
                  variant={inCollection ? "secondary" : "default"}
                  className="gap-2"
                  onClick={() => setIsInCollection(!isInCollection)}
                >
                  {inCollection ? (
                    <>
                      <Check className="h-4 w-4" />
                      In Collection
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add to Collection
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Performance Ratings */}
            <div className="p-5 bg-card rounded-lg border border-border/50 space-y-4">
              <h3 className="font-display text-lg font-medium">Performance</h3>
              <div className="space-y-3">
                <RatingBar label="Longevity" value={fragrance.ratings.longevity} />
                <RatingBar label="Sillage" value={fragrance.ratings.sillage} />
                <RatingBar label="Value" value={fragrance.ratings.value} />
              </div>
            </div>

            {/* Note Pyramid */}
            <div className="p-5 bg-card rounded-lg border border-border/50">
              <NotePyramid notes={fragrance.notes} />
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <Tabs defaultValue="reviews" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="reviews">Reviews ({fragranceReviews.length})</TabsTrigger>
              <TabsTrigger value="similar">Similar Fragrances</TabsTrigger>
            </TabsList>
            <TabsContent value="reviews" className="space-y-4">
              {fragranceReviews.length > 0 ? (
                fragranceReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No reviews yet. Be the first to share your thoughts!</p>
                  <Button className="mt-4">Write a Review</Button>
                </div>
              )}
            </TabsContent>
            <TabsContent value="similar" className="text-center py-12 text-muted-foreground">
              <p>Similar fragrances coming soon.</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
