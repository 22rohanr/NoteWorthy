import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, User, Clock, Loader2, Send } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useDiscussion, useAddReply } from '@/hooks/use-api';
import { useAuth } from '@/contexts/AuthContext';
import type { DiscussionCategory } from '@/data/discussionData';

const categoryStyle: Record<DiscussionCategory, string> = {
  Recommendation: 'bg-emerald-100/80 text-emerald-800 border-emerald-200',
  Comparison: 'bg-blue-100/80 text-blue-800 border-blue-200',
  General: 'bg-secondary text-foreground border-border',
  News: 'bg-violet-100/80 text-violet-800 border-violet-200',
};

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 30) return date.toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  const minutes = Math.floor(diff / 60000);
  return minutes > 0 ? `${minutes}m ago` : 'just now';
}

export default function DiscussionDetail() {
  const { id } = useParams<{ id: string }>();
  const { discussion, replies, isLoading } = useDiscussion(id);
  const { firebaseUser } = useAuth();
  const replyMutation = useAddReply(id ?? '');

  const [replyText, setReplyText] = useState('');

  const handleReply = async () => {
    if (!replyText.trim()) return;
    await replyMutation.mutateAsync({ body: replyText.trim() });
    setReplyText('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 max-w-3xl space-y-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <p className="text-muted-foreground mb-4">Discussion not found.</p>
          <Button variant="outline" asChild>
            <Link to="/discussions">Back to Discussions</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8 max-w-3xl">
        {/* Back link */}
        <Link
          to="/discussions"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          All Discussions
        </Link>

        {/* Discussion header */}
        <article className="bg-card rounded-xl border border-border/60 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-3">
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0 ${categoryStyle[discussion.category]}`}
            >
              {discussion.category}
            </Badge>
          </div>

          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mb-4">
            {discussion.title}
          </h1>

          {discussion.body && (
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed mb-6">
              {discussion.body}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {discussion.authorName}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {formatTime(discussion.createdAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-3 w-3" />
              {discussion.commentCount} comments
            </span>
          </div>
        </article>

        <Separator className="my-8" />

        {/* Replies */}
        <div className="space-y-1 mb-8">
          <h2 className="font-display text-lg font-medium mb-4">
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </h2>

          {replies.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">
              No replies yet. Be the first to join the conversation!
            </p>
          )}

          <div className="space-y-4">
            {replies.map((reply) => (
              <div
                key={reply.id}
                className="bg-card rounded-lg border border-border/50 p-4"
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed mb-3">
                  {reply.body}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    {reply.authorName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {formatTime(reply.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reply form */}
        {firebaseUser ? (
          <div className="bg-card rounded-xl border border-border/60 p-5">
            <h3 className="font-medium mb-3">Add a Reply</h3>
            <Textarea
              placeholder="Share your thoughts..."
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="mb-3"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleReply}
                disabled={!replyText.trim() || replyMutation.isPending}
                className="gap-2"
              >
                {replyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Reply
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border/60 p-5 text-center">
            <p className="text-muted-foreground mb-3">Sign in to join the discussion.</p>
            <Button asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
