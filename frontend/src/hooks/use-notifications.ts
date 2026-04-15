import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  recipientId: string;
  actorId: string;
  type: "follow" | "follow_request" | "follow_accepted" | "review_upvote" | "discussion_reply";
  referenceId: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
}

interface UnreadCountResponse {
  count: number;
}

export function useNotifications() {
  const { idToken } = useAuth();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      apiGet<NotificationsResponse>("/notifications", idToken ?? undefined),
    enabled: !!idToken,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  return {
    notifications: query.data?.notifications ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useUnreadCount() {
  const { idToken } = useAuth();

  const query = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () =>
      apiGet<UnreadCountResponse>("/notifications/unread-count", idToken ?? undefined),
    enabled: !!idToken,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  return {
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
  };
}

export function useMarkNotificationRead() {
  const { idToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiPost(`/notifications/${notificationId}/read`, {}, idToken ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useMarkAllRead() {
  const { idToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiPost("/notifications/read-all", {}, idToken ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useDeleteNotification() {
  const { idToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiDelete(`/notifications/${notificationId}`, idToken ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}
