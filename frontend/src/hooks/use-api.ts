import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Fragrance, Brand, Note, Review } from "@/types/fragrance";
import type { Discussion, Reply } from "@/data/discussionData";
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

interface SimilarFragrancesResponse {
  fragrances: Fragrance[];
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

/* ------------------------------------------------------------------ */
/*  useSimilarFragrances – Similar scents for a given fragrance        */
/* ------------------------------------------------------------------ */

function computeSimilarLocally(target: Fragrance, all: Fragrance[]): Fragrance[] {
  const targetNotes = new Set(
    [...target.notes.top, ...target.notes.middle, ...target.notes.base].map((n) => n.id),
  );

  const scoreFor = (other: Fragrance): number => {
    if (other.id === target.id) return 0;

    const otherNotes = new Set(
      [...other.notes.top, ...other.notes.middle, ...other.notes.base].map((n) => n.id),
    );

    let noteScore = 0;
    if (targetNotes.size > 0 && otherNotes.size > 0) {
      const intersectionSize = [...targetNotes].filter((id) => otherNotes.has(id)).length;
      const unionSize = new Set([...targetNotes, ...otherNotes]).size;
      noteScore = unionSize > 0 ? intersectionSize / unionSize : 0;
    }

    const brandScore = target.brand.id === other.brand.id ? 0.15 : 0;
    const genderScore = target.gender === other.gender ? 0.1 : 0;
    const concentrationScore = target.concentration === other.concentration ? 0.05 : 0;

    return 2 * noteScore + brandScore + genderScore + concentrationScore;
  };

  const scored = all
    .filter((f) => f.id !== target.id)
    .map((f) => ({ fragrance: f, score: scoreFor(f) }))
    .filter(({ score }) => score > 0);

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 6).map(({ fragrance }) => fragrance);
}

export function useSimilarFragrances(id: string | undefined) {
  const { idToken } = useAuth();

  const query = useQuery({
    queryKey: ["fragrance-similar", id],
    queryFn: () =>
      apiGet<SimilarFragrancesResponse>(`/fragrances/${id}/similar`, idToken ?? undefined),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const useMock = !!query.error;

  const targetMock = mockFragrances.find((f) => f.id === id) ?? null;
  const similarFromMock = targetMock ? computeSimilarLocally(targetMock, mockFragrances) : [];

  return {
    fragrances: useMock ? similarFromMock : (query.data?.fragrances ?? []),
    isLoading: query.isLoading,
    isMock: useMock,
    error: null,
    refetch: query.refetch,
  };
}

/* ------------------------------------------------------------------ */
/*  useDiscussions – Discussions list page                              */
/* ------------------------------------------------------------------ */

interface DiscussionsResponse {
  discussions: Discussion[];
}

export function useDiscussions() {
  const query = useQuery({
    queryKey: ["discussions"],
    queryFn: () => apiGet<DiscussionsResponse>("/discussions"),
    staleTime: 60 * 1000,
  });

  return {
    discussions: query.data?.discussions ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/* ------------------------------------------------------------------ */
/*  useDiscussion – Single discussion detail with replies               */
/* ------------------------------------------------------------------ */

interface DiscussionDetailResponse {
  discussion: Discussion;
  replies: Reply[];
}

export function useDiscussion(id: string | undefined) {
  const query = useQuery({
    queryKey: ["discussion", id],
    queryFn: () => apiGet<DiscussionDetailResponse>(`/discussions/${id}`),
    enabled: !!id,
    staleTime: 30 * 1000,
  });

  return {
    discussion: query.data?.discussion ?? null,
    replies: query.data?.replies ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/* ------------------------------------------------------------------ */
/*  useCreateDiscussion                                                 */
/* ------------------------------------------------------------------ */

export function useCreateDiscussion() {
  const { idToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { title: string; body: string; category: string }) =>
      apiPost<{ discussion: Discussion }>("/discussions", data, idToken ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discussions"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/*  useAddReply                                                         */
/* ------------------------------------------------------------------ */

export function useAddReply(discussionId: string) {
  const { idToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { body: string }) =>
      apiPost<{ reply: Reply }>(
        `/discussions/${discussionId}/replies`,
        data,
        idToken ?? undefined,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discussion", discussionId] });
      queryClient.invalidateQueries({ queryKey: ["discussions"] });
    },
  });
}
