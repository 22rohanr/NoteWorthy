import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, Heart, Share2, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { RatingBar } from '@/components/ui/rating-bar';
import { NotePyramid } from '@/components/fragrance/NotePyramid';
import { ReviewCard } from '@/components/fragrance/ReviewCard';
import { fragrances, reviews, currentUser } from '@/data/dummyData';

export default function FragranceDetail() {
  const { id } = useParams<{ id: string }>();
  const fragrance = fragrances.find((f) => f.id === id);
  const fragranceReviews = reviews.filter((r) => r.fragranceId === id);

  const [isInCollection, setIsInCollection] = useState(
    currentUser.collection.owned.includes(id || '') ||
    currentUser.collection.sampled.includes(id || '')
  );
  const [isWishlisted, setIsWishlisted] = useState(
    currentUser.collection.wishlist.includes(id || '')
  );

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
                <Heart className={isWishlisted ? "h-5 w-5 fill-primary text-primary" : "h-5 w-5"} />
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
                  variant={isInCollection ? "secondary" : "default"}
                  className="gap-2"
                  onClick={() => setIsInCollection(!isInCollection)}
                >
                  {isInCollection ? (
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
            <TabsContent value="similar" className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {fragrances.filter((f) => f.id !== id).slice(0, 4).map((f) => (
                <Link 
                  key={f.id} 
                  to={`/fragrance/${f.id}`}
                  className="p-4 bg-card rounded-lg border border-border/50 hover:shadow-card transition-shadow"
                >
                  <p className="text-xs text-muted-foreground mb-1">{f.brand.name}</p>
                  <p className="font-display font-medium">{f.name}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span className="text-sm">{f.ratings.overall.toFixed(1)}</span>
                  </div>
                </Link>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
