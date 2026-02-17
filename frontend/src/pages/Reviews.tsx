import { useEffect } from 'react';
import { ThumbsUp, Droplets, Cloud, Sparkles, PenLine } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { useReviews, type ReviewData } from '@/hooks/use-reviews';

export default function Reviews() {
  const { reviews, isLoading, fetchReviews } = useReviews();

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const renderReview = (review: ReviewData) => (
    <article
      key={review.id}
      className="rounded-xl border border-border/60 bg-card p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
            {review.userName.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-sm">{review.userName}</p>
            {review.fragrance && (
              <Link
                to={`/fragrance/${review.fragrance.id}`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                on {review.fragrance.name} by {review.fragrance.brand.name}
              </Link>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{review.createdAt}</span>
      </div>

      {/* Performance bars */}
      <div className="grid grid-cols-3 gap-4">
        {(['longevity', 'sillage', 'value'] as const).map((metric) => (
          <div key={metric} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="capitalize text-muted-foreground">{metric}</span>
              <span className="font-semibold">{review.rating[metric]}/10</span>
            </div>
            <Progress value={review.rating[metric] * 10} className="h-2" />
          </div>
        ))}
      </div>

      {/* Context tags */}
      {review.wearContext && (
        <div className="flex flex-wrap gap-2">
          {review.wearContext.sprays > 0 && (
            <Badge variant="secondary" className="text-xs gap-1.5">
              <Droplets className="h-3 w-3" />
              {review.wearContext.sprays} sprays
            </Badge>
          )}
          {review.wearContext.weather && (
            <Badge variant="secondary" className="text-xs gap-1.5">
              <Cloud className="h-3 w-3" />
              {review.wearContext.weather}
            </Badge>
          )}
          {review.wearContext.occasion && (
            <Badge variant="secondary" className="text-xs gap-1.5">
              <Sparkles className="h-3 w-3" />
              {review.wearContext.occasion}
            </Badge>
          )}
        </div>
      )}

      {/* Impressions or content */}
      {review.impressions ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">Opening:</span> {review.impressions.opening}</p>
          <p><span className="font-medium text-foreground">Mid:</span> {review.impressions.midDrydown}</p>
          <p><span className="font-medium text-foreground">Dry-down:</span> {review.impressions.dryDown}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{review.content}</p>
      )}

      {/* Upvotes — display only */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-border/40 text-muted-foreground text-xs">
        <ThumbsUp className="h-3.5 w-3.5" />
        {review.upvotes} upvotes
      </div>
    </article>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="border-b border-border/40 bg-secondary/30">
        <div className="container py-16 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            Community Wear Reports
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-lg mb-6">
            Real-world impressions from fragrance enthusiasts. See how scents perform outside the store.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild variant="default" className="gap-2">
              <Link to="/discover">
                <PenLine className="h-4 w-4" />
                Leave a Review
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/reviews/mine">
                My Reviews
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feed */}
      <section className="container py-12 max-w-3xl space-y-6">
        {/* Loading */}
        {isLoading && (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </>
        )}

        {/* Empty state */}
        {!isLoading && reviews.length === 0 && (
          <div className="text-center py-16">
            <PenLine className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="font-display text-xl font-medium mb-2">No reviews yet</h2>
            <p className="text-muted-foreground mb-6">
              Be the first to share your fragrance experience!
            </p>
            <Button asChild variant="outline">
              <Link to="/discover">Discover Fragrances</Link>
            </Button>
          </div>
        )}

        {/* Reviews list */}
        {!isLoading && reviews.map(renderReview)}
      </section>
    </div>
  );
}
