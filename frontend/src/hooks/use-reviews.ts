import { useState, useCallback } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

export interface ReviewFragrance {
    id: string;
    name: string;
    brand: { name: string };
}

export interface ReviewData {
    id: string;
    fragranceId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    rating: {
        overall: number;
        longevity: number;
        sillage: number;
        value: number;
    };
    content: string;
    wearContext?: {
        sprays: number;
        weather: string;
        occasion: string;
    };
    impressions?: {
        opening: string;
        midDrydown: string;
        dryDown: string;
    };
    upvotes: number;
    createdAt: string;
    fragrance?: ReviewFragrance;
}

/**
 * Fetch the global reviews feed (enriched with fragrance info, sorted by upvotes).
 */
export function useReviews() {
    const [reviews, setReviews] = useState<ReviewData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchReviews = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiGet<{ reviews: ReviewData[] }>("/reviews");
            setReviews(data.reviews ?? []);
        } catch {
            setReviews([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { reviews, isLoading, fetchReviews };
}

/**
 * Upvote a review.  Returns a simple helper that POSTs the upvote.
 */
export function useUpvoteReview() {
    const [isUpvoting, setIsUpvoting] = useState(false);

    const upvote = useCallback(async (reviewId: string) => {
        setIsUpvoting(true);
        try {
            await apiPost(`/reviews/${reviewId}/upvote`, {});
        } finally {
            setIsUpvoting(false);
        }
    }, []);

    return { upvote, isUpvoting };
}

/**
 * Create a review (requires the auth token to be set on the apiPost helper).
 */
export interface CreateReviewPayload {
    fragranceId: string;
    rating: {
        overall: number;
        longevity: number;
        sillage: number;
        value: number;
    };
    content: string;
    wearContext?: {
        sprays: number;
        weather: string;
        occasion: string;
    };
}

export function useCreateReview() {
    const [isCreating, setIsCreating] = useState(false);

    const createReview = useCallback(
        async (payload: CreateReviewPayload, idToken: string) => {
            setIsCreating(true);
            try {
                const res = await apiPost<{ id: string }>(
                    "/reviews",
                    payload as unknown as Record<string, unknown>,
                    idToken,
                );
                return res.id;
            } finally {
                setIsCreating(false);
            }
        },
        []
    );

    return { createReview, isCreating };
}

/**
 * Fetch the authenticated user's reviews.
 */
export function useMyReviews() {
    const [reviews, setReviews] = useState<ReviewData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchMyReviews = useCallback(async (idToken: string) => {
        setIsLoading(true);
        try {
            const data = await apiGet<{ reviews: ReviewData[] }>(
                "/reviews/mine",
                idToken,
            );
            setReviews(data.reviews ?? []);
        } catch {
            setReviews([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { reviews, isLoading, fetchMyReviews };
}

/**
 * Delete a review by ID.
 */
export function useDeleteReview() {
    const [isDeleting, setIsDeleting] = useState(false);

    const deleteReview = useCallback(async (reviewId: string, idToken: string) => {
        setIsDeleting(true);
        try {
            await apiDelete(`/reviews/${reviewId}`, idToken);
        } finally {
            setIsDeleting(false);
        }
    }, []);

    return { deleteReview, isDeleting };
}
