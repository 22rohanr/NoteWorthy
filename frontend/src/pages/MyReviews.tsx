import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp, Droplets, Cloud, Sparkles, Trash2, PenLine, LogIn } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useMyReviews, useDeleteReview, type ReviewData } from '@/hooks/use-reviews';

export default function MyReviews() {
    const { userProfile, idToken } = useAuth();
    const { reviews, isLoading, fetchMyReviews } = useMyReviews();
    const { deleteReview, isDeleting } = useDeleteReview();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (idToken) {
            fetchMyReviews(idToken);
        }
    }, [idToken, fetchMyReviews]);

    const handleDelete = async (reviewId: string) => {
        if (!idToken || isDeleting) return;
        if (!window.confirm('Are you sure you want to delete this review?')) return;
        setDeletingId(reviewId);
        await deleteReview(reviewId, idToken);
        setDeletingId(null);
        fetchMyReviews(idToken);
    };

    const renderReview = (review: ReviewData) => (
        <article
            key={review.id}
            className={`rounded-xl border border-border/60 bg-card p-6 space-y-5 transition-opacity ${deletingId === review.id ? 'opacity-50' : ''
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    {review.fragrance && (
                        <Link
                            to={`/fragrance/${review.fragrance.id}`}
                            className="font-medium hover:text-primary transition-colors"
                        >
                            {review.fragrance.name}
                            <span className="text-muted-foreground font-normal">
                                {' '}by {review.fragrance.brand.name}
                            </span>
                        </Link>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{review.createdAt}</p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(review.id)}
                    disabled={isDeleting}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
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

            {/* Content */}
            <p className="text-sm text-muted-foreground">{review.content}</p>

            {/* Upvotes */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/40 text-muted-foreground text-xs">
                <ThumbsUp className="h-3.5 w-3.5" />
                {review.upvotes} upvotes
            </div>
        </article>
    );

    // Not signed in
    if (!userProfile) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <div className="container py-16 text-center max-w-lg">
                    <PenLine className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h1 className="font-display text-3xl font-medium mb-2">My Reviews</h1>
                    <p className="text-muted-foreground mb-6">
                        Sign in to see your reviews.
                    </p>
                    <Button asChild>
                        <Link to="/login" className="gap-2">
                            <LogIn className="h-4 w-4" />
                            Sign In
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <div className="container py-8 max-w-3xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="font-display text-3xl font-medium mb-1">My Reviews</h1>
                        <p className="text-muted-foreground text-sm">
                            {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <Button variant="outline" className="gap-2" asChild>
                        <Link to="/reviews">
                            View All Reviews
                        </Link>
                    </Button>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="space-y-6">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="rounded-xl border border-border/60 bg-card p-6 space-y-4">
                                <Skeleton className="h-5 w-48" />
                                <div className="grid grid-cols-3 gap-4">
                                    <Skeleton className="h-6 w-full" />
                                    <Skeleton className="h-6 w-full" />
                                    <Skeleton className="h-6 w-full" />
                                </div>
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && reviews.length === 0 && (
                    <div className="text-center py-16">
                        <PenLine className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h2 className="font-display text-xl font-medium mb-2">No reviews yet</h2>
                        <p className="text-muted-foreground mb-6">
                            Share your fragrance experiences with the community!
                        </p>
                        <Button asChild variant="outline">
                            <Link to="/discover">Discover Fragrances</Link>
                        </Button>
                    </div>
                )}

                {/* Reviews list */}
                {!isLoading && (
                    <div className="space-y-6">
                        {reviews.map(renderReview)}
                    </div>
                )}
            </div>
        </div>
    );
}
