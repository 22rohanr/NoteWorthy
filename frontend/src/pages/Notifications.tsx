import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  UserPlus,
  UserCheck,
  ThumbsUp,
  MessageSquare,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  useDeleteNotification,
  type Notification,
} from "@/hooks/use-notifications";

const ICON_MAP: Record<string, typeof Bell> = {
  follow: UserPlus,
  follow_request: UserPlus,
  follow_accepted: UserCheck,
  review_upvote: ThumbsUp,
  discussion_reply: MessageSquare,
};

const COLOR_MAP: Record<string, string> = {
  follow: "text-blue-500",
  follow_request: "text-amber-500",
  follow_accepted: "text-green-500",
  review_upvote: "text-rose-500",
  discussion_reply: "text-violet-500",
};

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  onNavigate,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (n: Notification) => void;
}) {
  const Icon = ICON_MAP[notification.type] || Bell;
  const iconColor = COLOR_MAP[notification.type] || "text-muted-foreground";

  return (
    <div
      className={`flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-secondary/50 ${
        !notification.read ? "bg-primary/[0.03]" : ""
      }`}
      onClick={() => onNavigate(notification)}
    >
      <div className={`mt-0.5 shrink-0 ${iconColor}`}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notification.read ? "font-medium" : "text-muted-foreground"}`}>
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {timeAgo(notification.createdAt)}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            title="Mark as read"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const { firebaseUser, loading: authLoading } = useAuth();
  const { notifications, isLoading, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const deleteNotification = useDeleteNotification();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNavigate = (n: Notification) => {
    if (!n.read) {
      markRead.mutate(n.id);
    }
    if (n.type === "follow" || n.type === "follow_request" || n.type === "follow_accepted") {
      navigate(`/profile/${n.actorId}`);
    } else if (n.type === "discussion_reply" && n.referenceId) {
      navigate(`/discussions/${n.referenceId}`);
    } else if (n.type === "review_upvote" && n.referenceId) {
      navigate(`/reviews`);
    }
  };

  if (!authLoading && !firebaseUser) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-16 text-center">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Sign in to see notifications</h1>
          <p className="text-muted-foreground mb-6">
            You need to be logged in to view your notifications.
          </p>
          <Button onClick={() => navigate("/login")}>Sign In</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-2xl py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No notifications yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                When someone follows you, upvotes your review, or replies to your discussion, you'll see it here.
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification, idx) => (
                <div key={notification.id}>
                  {idx > 0 && <Separator />}
                  <NotificationItem
                    notification={notification}
                    onMarkRead={(id) => markRead.mutate(id)}
                    onDelete={(id) => deleteNotification.mutate(id)}
                    onNavigate={handleNavigate}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
