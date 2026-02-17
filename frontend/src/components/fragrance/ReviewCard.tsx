import { useState } from 'react';
import { ThumbsUp, Star } from 'lucide-react';
import { Review } from '@/types/fragrance';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { RatingBar } from '@/components/ui/rating-bar';

interface ReviewCardProps {
  review: Review;
  onUpvote?: (reviewId: string) => Promise<void>;
}

export function ReviewCard({ review, onUpvote }: ReviewCardProps) {
  const [upvoted, setUpvoted] = useState(false);
  const [displayCount, setDisplayCount] = useState(review.upvotes);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpvote = async () => {
    if (upvoted || isLoading || !onUpvote) return;
    setIsLoading(true);
    try {
      await onUpvote(review.id);
      setUpvoted(true);
      setDisplayCount((c) => c + 1);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="p-5 bg-card rounded-lg border border-border/50 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={review.userAvatar} />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {review.userName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{review.userName}</p>
            <p className="text-sm text-muted-foreground">{review.createdAt}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-secondary rounded">
          <Star className="h-4 w-4 fill-primary text-primary" />
          <span className="font-medium">{review.rating.overall}</span>
        </div>
      </div>

      {/* Content */}
      <p className="text-muted-foreground leading-relaxed">{review.content}</p>

      {/* Impressions */}
      {review.impressions && (
        <div className="space-y-3 p-4 bg-secondary/50 rounded-lg">
          <p className="text-sm font-medium">Wear Report</p>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground min-w-[80px]">Opening:</span>
              <span>{review.impressions.opening}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground min-w-[80px]">Mid:</span>
              <span>{review.impressions.midDrydown}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground min-w-[80px]">Dry Down:</span>
              <span>{review.impressions.dryDown}</span>
            </div>
          </div>
        </div>
      )}

      {/* Ratings breakdown */}
      <div className="grid grid-cols-3 gap-4 pt-2">
        <RatingBar label="Longevity" value={review.rating.longevity} />
        <RatingBar label="Sillage" value={review.rating.sillage} />
        <RatingBar label="Value" value={review.rating.value} />
      </div>

      {/* Context & Actions */}
      <div className="flex items-center justify-between pt-2">
        {review.wearContext && (
          <div className="flex gap-3 text-sm text-muted-foreground">
            <span>{review.wearContext.sprays} sprays</span>
            <span>•</span>
            <span>{review.wearContext.weather}</span>
            <span>•</span>
            <span>{review.wearContext.occasion}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={`gap-2 ml-auto ${upvoted ? 'text-primary' : ''}`}
          onClick={handleUpvote}
          disabled={upvoted || isLoading || !onUpvote}
        >
          <ThumbsUp className={`h-4 w-4 ${upvoted ? 'fill-primary' : ''}`} />
          <span>{displayCount} upvotes</span>
        </Button>
      </div>
    </div>
  );
}
