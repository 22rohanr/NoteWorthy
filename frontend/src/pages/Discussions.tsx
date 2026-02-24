import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquarePlus, MessageCircle, User, Clock, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDiscussions, useCreateDiscussion } from '@/hooks/use-api';
import { useAuth } from '@/contexts/AuthContext';
import type { DiscussionCategory } from '@/data/discussionData';
import { cn } from '@/lib/utils';

const CATEGORIES: DiscussionCategory[] = ['Recommendation', 'Comparison', 'General', 'News'];

const categoryStyle: Record<DiscussionCategory, string> = {
  Recommendation: 'bg-emerald-100/80 text-emerald-800 border-emerald-200',
  Comparison: 'bg-blue-100/80 text-blue-800 border-blue-200',
  General: 'bg-secondary text-foreground border-border',
  News: 'bg-violet-100/80 text-violet-800 border-violet-200',
};

function timeAgo(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 30) return `${Math.floor(days / 30)}mo ago`;
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  const minutes = Math.floor(diff / 60000);
  return minutes > 0 ? `${minutes}m ago` : 'just now';
}

export default function Discussions() {
  const { discussions, isLoading } = useDiscussions();
  const { firebaseUser } = useAuth();
  const createMutation = useCreateDiscussion();

  const [filter, setFilter] = useState<DiscussionCategory | 'All'>('All');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState<DiscussionCategory>('General');

  const filtered = filter === 'All'
    ? discussions
    : discussions.filter((d) => d.category === filter);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createMutation.mutateAsync({
      title: newTitle.trim(),
      body: newBody.trim(),
      category: newCategory,
    });
    setNewTitle('');
    setNewBody('');
    setNewCategory('General');
    setDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="border-b border-border/40 bg-secondary/30">
        <div className="container py-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-4">
              Discussions
            </h1>
            <p className="text-muted-foreground max-w-lg text-lg">
              Join the conversation — get recommendations, compare scents, and share your experiences.
            </p>
          </div>

          {firebaseUser ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 self-start md:self-auto">
                  <MessageSquarePlus className="h-4 w-4" />
                  Start a Discussion
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Start a Discussion</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="disc-category">Category</Label>
                    <Select value={newCategory} onValueChange={(v) => setNewCategory(v as DiscussionCategory)}>
                      <SelectTrigger id="disc-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="disc-title">Title</Label>
                    <Input
                      id="disc-title"
                      placeholder="What do you want to discuss?"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="disc-body">Details (optional)</Label>
                    <Textarea
                      id="disc-body"
                      placeholder="Add more context..."
                      rows={4}
                      value={newBody}
                      onChange={(e) => setNewBody(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={!newTitle.trim() || createMutation.isPending}
                    >
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Post
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button className="gap-2 self-start md:self-auto" asChild>
              <Link to="/login">
                <MessageSquarePlus className="h-4 w-4" />
                Sign in to Discuss
              </Link>
            </Button>
          )}
        </div>
      </section>

      {/* Filters */}
      <div className="container pt-8 pb-4 flex flex-wrap gap-2">
        {(['All', ...CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium border transition-colors',
              filter === cat
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border/60 hover:border-primary/40',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Thread list */}
      <section className="container pb-12 max-w-3xl space-y-4">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">
              {filter === 'All'
                ? 'No discussions yet. Be the first to start one!'
                : `No discussions in ${filter}. Start one?`}
            </p>
          </div>
        )}

        {!isLoading &&
          filtered.map((thread) => (
            <Link key={thread.id} to={`/discussions/${thread.id}`}>
              <article className="rounded-xl border border-border/60 bg-card p-5 hover:shadow-md hover:border-primary/20 transition-all duration-300">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0 ${categoryStyle[thread.category]}`}
                      >
                        {thread.category}
                      </Badge>
                    </div>
                    <h2 className="font-display text-lg font-semibold tracking-tight leading-snug mb-1.5">
                      {thread.title}
                    </h2>
                    {thread.body && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{thread.body}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    {thread.authorName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {timeAgo(thread.createdAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="h-3 w-3" />
                    {thread.commentCount} comments
                  </span>
                </div>
              </article>
            </Link>
          ))}
      </section>
    </div>
  );
}
