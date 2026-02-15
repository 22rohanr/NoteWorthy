import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Fragrance, Brand, Note, Review } from "@/types/fragrance";
import {
  fragrances as mockFragrances,
  brands as mockBrands,
  notes as mockNotes,
  reviews as mockReviews,
} from "@/data/dummyData";

/* ------------------------------------------------------------------ */
/*  Response shapes returned by the Flask backend                      */
/* ------------------------------------------------------------------ */

interface FragrancesResponse {
  fragrances: Fragrance[];
}

interface BrandsResponse {
  brands: (Brand & { fragranceCount?: number })[];
}

interface NotesResponse {
  notes: Note[];
  families: string[];
}

interface FragranceResponse {
  fragrance: Fragrance;
}

interface ReviewsResponse {
  reviews: Review[];
}

/* ------------------------------------------------------------------ */
/*  useFragrances – Discover page                                      */
/* ------------------------------------------------------------------ */

/**
 * Fetches fragrances, brands, and notes in parallel.
 * Falls back to mock data if the API is unreachable.
 */
export function useFragrances() {
  const { idToken } = useAuth();

  const query = useQuery({
    queryKey: ["discover-data"],
    queryFn: async () => {
      const [fragRes, brandRes, noteRes] = await Promise.all([
        apiGet<FragrancesResponse>("/fragrances", idToken ?? undefined),
        apiGet<BrandsResponse>("/discovery/brands", idToken ?? undefined),
        apiGet<NotesResponse>("/discovery/notes", idToken ?? undefined),
      ]);
      return {
        fragrances: fragRes.fragrances,
        brands: brandRes.brands,
        notes: noteRes.notes,
        isMock: false,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1, // only retry once before giving up
  });

  // Fall back to mock data when the API fails
  const useMock = !!query.error;

  return {
    fragrances: useMock ? mockFragrances : (query.data?.fragrances ?? []),
    brands: useMock
      ? mockBrands.map((b) => ({
          ...b,
          fragranceCount: mockFragrances.filter((f) => f.brand.id === b.id).length,
        }))
      : (query.data?.brands ?? []),
    notes: useMock ? mockNotes : (query.data?.notes ?? []),
    isLoading: query.isLoading,
    isMock: useMock,
    error: null, // swallow error when falling back
    refetch: query.refetch,
  };
}

/* ------------------------------------------------------------------ */
/*  useBrands – Brands page                                            */
/* ------------------------------------------------------------------ */

/**
 * Fetches all brands with their fragrance counts.
 * Falls back to mock data if the API is unreachable.
 */
export function useBrands() {
  const { idToken } = useAuth();

  const query = useQuery({
    queryKey: ["brands"],
    queryFn: () =>
      apiGet<BrandsResponse>("/discovery/brands", idToken ?? undefined),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const useMock = !!query.error;

  return {
    brands: useMock
      ? mockBrands.map((b) => ({
          ...b,
          fragranceCount: mockFragrances.filter((f) => f.brand.id === b.id).length,
        }))
      : (query.data?.brands ?? []),
    isLoading: query.isLoading,
    isMock: useMock,
    error: null,
    refetch: query.refetch,
  };
}

/* ------------------------------------------------------------------ */
/*  useFragrance – Fragrance Detail page                               */
/* ------------------------------------------------------------------ */

/**
 * Fetches a single fragrance and its reviews by ID.
 * Falls back to mock data if the API is unreachable.
 */
export function useFragrance(id: string | undefined) {
  const { idToken } = useAuth();

  const fragranceQuery = useQuery({
    queryKey: ["fragrance", id],
    queryFn: () =>
      apiGet<FragranceResponse>(`/fragrances/${id}`, idToken ?? undefined),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const reviewsQuery = useQuery({
    queryKey: ["fragrance-reviews", id],
    queryFn: () =>
      apiGet<ReviewsResponse>(
        `/fragrances/${id}/reviews`,
        idToken ?? undefined,
      ),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const useMock = !!fragranceQuery.error;

  // Look up mock data by ID
  const mockFragrance = mockFragrances.find((f) => f.id === id) ?? null;
  const mockFragReviews = mockReviews.filter((r) => r.fragranceId === id);

  return {
    fragrance: useMock ? mockFragrance : (fragranceQuery.data?.fragrance ?? null),
    reviews: useMock ? mockFragReviews : (reviewsQuery.data?.reviews ?? []),
    isLoading: fragranceQuery.isLoading || reviewsQuery.isLoading,
    isMock: useMock,
    error: null,
    refetch: () => {
      fragranceQuery.refetch();
      reviewsQuery.refetch();
    },
  };
}
