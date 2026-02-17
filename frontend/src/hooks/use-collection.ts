import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiPost, apiGet } from "@/lib/api";
import type { Fragrance } from "@/types/fragrance";

/* ------------------------------------------------------------------ */
/*  Response shapes                                                    */
/* ------------------------------------------------------------------ */

interface CollectionResponse {
    collection: {
        owned: Fragrance[];
        sampled: Fragrance[];
        wishlist: Fragrance[];
    };
}

export type CollectionTab = "owned" | "sampled" | "wishlist";

/* ------------------------------------------------------------------ */
/*  useCollection                                                      */
/* ------------------------------------------------------------------ */

/**
 * Hook that provides collection state and mutation helpers.
 *
 * - Reads the user's collection IDs from `userProfile` (via AuthContext).
 * - `fetchCollection()` fetches full fragrance objects from the API.
 * - `addToCollection` / `removeFromCollection` mutate Firestore and
 *   refresh the local profile.
 */
export function useCollection() {
    const { userProfile, idToken, refreshProfile } = useAuth();

    const [resolvedCollection, setResolvedCollection] = useState<
        CollectionResponse["collection"] | null
    >(null);
    const [isLoadingCollection, setIsLoadingCollection] = useState(false);
    const [isMutating, setIsMutating] = useState(false);

    /* ── derived ID lists from userProfile ────────────────────────────── */
    const collectionIds = useMemo(
        () =>
            userProfile?.collection ?? { owned: [], sampled: [], wishlist: [] },
        [userProfile],
    );

    /* ── fetch resolved fragrances ───────────────────────────────────── */

    const fetchCollection = useCallback(async () => {
        if (!idToken) return;
        setIsLoadingCollection(true);
        try {
            const data = await apiGet<CollectionResponse>(
                "/collection",
                idToken,
            );
            setResolvedCollection(data.collection);
        } catch {
            // swallow – caller can check resolvedCollection === null
        } finally {
            setIsLoadingCollection(false);
        }
    }, [idToken]);

    /* ── mutations ───────────────────────────────────────────────────── */

    const addToCollection = useCallback(
        async (fragranceId: string, tab: CollectionTab) => {
            if (!idToken) return;
            setIsMutating(true);
            try {
                await apiPost("/collection/add", { fragranceId, tab }, idToken);
                await refreshProfile();
            } finally {
                setIsMutating(false);
            }
        },
        [idToken, refreshProfile],
    );

    const removeFromCollection = useCallback(
        async (fragranceId: string, tab: CollectionTab) => {
            if (!idToken) return;
            setIsMutating(true);
            try {
                await apiPost("/collection/remove", { fragranceId, tab }, idToken);
                await refreshProfile();
            } finally {
                setIsMutating(false);
            }
        },
        [idToken, refreshProfile],
    );

    /* ── query helpers ───────────────────────────────────────────────── */

    /** Returns which tabs a fragrance belongs to. */
    const getTabsForFragrance = useCallback(
        (fragranceId: string): CollectionTab[] => {
            const tabs: CollectionTab[] = [];
            if (collectionIds.owned.includes(fragranceId)) tabs.push("owned");
            if (collectionIds.sampled.includes(fragranceId)) tabs.push("sampled");
            if (collectionIds.wishlist.includes(fragranceId))
                tabs.push("wishlist");
            return tabs;
        },
        [collectionIds],
    );

    const isInAnyCollection = useCallback(
        (fragranceId: string) => getTabsForFragrance(fragranceId).length > 0,
        [getTabsForFragrance],
    );

    return {
        /** Raw ID lists from the user profile. */
        collectionIds,
        /** Resolved fragrance objects (populated after fetchCollection). */
        resolvedCollection,
        /** Whether a fetchCollection call is in-flight. */
        isLoadingCollection,
        /** Whether an add/remove mutation is in-flight. */
        isMutating,
        fetchCollection,
        addToCollection,
        removeFromCollection,
        getTabsForFragrance,
        isInAnyCollection,
    };
}
