import { ThumbsUp, MessageCircle, Droplets, Cloud, Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Progress } from '@/components/ui/progress';
import { reviews, fragrances } from '@/data/dummyData';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export default function Reviews() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="border-b border-border/40 bg-secondary/30">
        <div className="container py-16 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            Community Wear Reports
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-lg">
            Real-world impressions from fragrance enthusiasts. See how scents perform outside the store.
          </p>
        </div>
      </section>

      {/* Feed */}
      <section className="container py-12 max-w-3xl space-y-6">
        {reviews.map((review) => {
          const fragrance = fragrances.find((f) => f.id === review.fragranceId);
          return (
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
                    {fragrance && (
                      <Link
                        to={`/fragrance/${fragrance.id}`}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        on {fragrance.name} by {fragrance.brand.name}
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
                  <Badge variant="secondary" className="text-xs gap-1.5">
                    <Droplets className="h-3 w-3" />
                    {review.wearContext.sprays} sprays
                  </Badge>
                  <Badge variant="secondary" className="text-xs gap-1.5">
                    <Cloud className="h-3 w-3" />
                    {review.wearContext.weather}
                  </Badge>
                  <Badge variant="secondary" className="text-xs gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    {review.wearContext.occasion}
                  </Badge>
                </div>
              )}

              {/* Impressions */}
              {review.impressions ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><span className="font-medium text-foreground">Opening:</span> {review.impressions.opening}</p>
                  <p><span className="font-medium text-foreground">Mid:</span> {review.impressions.midDrydown}</p>
                  <p><span className="font-medium text-foreground">Dry-down:</span> {review.impressions.dryDown}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{review.content}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-5 pt-2 border-t border-border/40 text-muted-foreground text-xs">
                <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {review.upvotes}
                </button>
                <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Comment
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
