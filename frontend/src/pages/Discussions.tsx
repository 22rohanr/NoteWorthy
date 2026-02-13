import { useState } from 'react';
import { MessageSquarePlus, MessageCircle, User, Clock } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { discussions, type Discussion } from '@/data/discussionData';

const categoryStyle: Record<Discussion['category'], string> = {
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
  return hours > 0 ? `${hours}h ago` : 'just now';
}

export default function Discussions() {
  const [filter, setFilter] = useState<Discussion['category'] | 'All'>('All');
  const categories: Array<Discussion['category'] | 'All'> = ['All', 'Recommendation', 'Comparison', 'General', 'News'];
  const filtered = filter === 'All' ? discussions : discussions.filter((d) => d.category === filter);

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
          <Button className="gap-2 self-start md:self-auto">
            <MessageSquarePlus className="h-4 w-4" />
            Start a Discussion
          </Button>
        </div>
      </section>

      {/* Filters */}
      <div className="container pt-8 pb-4 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
              filter === cat
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border/60 hover:border-primary/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Thread list */}
      <section className="container pb-12 max-w-3xl space-y-4">
        {filtered.map((thread) => (
          <article
            key={thread.id}
            className="rounded-xl border border-border/60 bg-card p-5 hover:shadow-md hover:border-primary/20 transition-all duration-300 cursor-pointer"
          >
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
                <p className="text-sm text-muted-foreground line-clamp-2">{thread.preview}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="h-3 w-3" />
                {thread.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {timeAgo(thread.timestamp)}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-3 w-3" />
                {thread.commentCount} comments
              </span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
