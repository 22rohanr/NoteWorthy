import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { FragranceCard } from '@/components/fragrance/FragranceCard';
import { NoteBadge } from '@/components/ui/note-badge';
import { fragrances, notes } from '@/data/dummyData';

const Index = () => {
  const featuredFragrances = fragrances.slice(0, 4);
  const popularNotes = notes.slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(180,130,80,0.15),transparent_50%)]" />
        <div className="container relative py-24 md:py-32">
          <div className="max-w-2xl space-y-6 animate-fade-in">
            <span className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-white/10 rounded-full backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              Discover your signature scent
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-medium leading-tight">
              Find fragrances you'll{' '}
              <span className="italic">actually</span> love
            </h1>
            <p className="text-lg text-white/70 max-w-lg">
              Explore thousands of fragrances with honest reviews, detailed note breakdowns, 
              and performance data from real enthusiasts.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button size="lg" className="bg-white text-foreground hover:bg-white/90" asChild>
                <Link to="/discover">
                  Start Exploring
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
                asChild
              >
                <Link to="/quiz">Help me find a scent</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 border-b border-border/50">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-primary/10">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg font-medium mb-1">Granular Search</h3>
                <p className="text-sm text-muted-foreground">
                  Filter by notes, performance, season, or price to find exactly what you want.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg font-medium mb-1">Community Reviews</h3>
                <p className="text-sm text-muted-foreground">
                  Real wear reports with longevity, sillage, and context-specific ratings.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg font-medium mb-1">Track Collections</h3>
                <p className="text-sm text-muted-foreground">
                  Log your owned, sampled, and wishlist fragrances in one place.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Fragrances */}
      <section className="py-16">
        <div className="container">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-medium">Featured Fragrances</h2>
              <p className="text-muted-foreground mt-1">Top-rated scents from the community</p>
            </div>
            <Button variant="ghost" className="hidden sm:flex" asChild>
              <Link to="/discover">
                View all
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featuredFragrances.map((fragrance, index) => (
              <FragranceCard 
                key={fragrance.id} 
                fragrance={fragrance} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` } as React.CSSProperties}
              />
            ))}
          </div>
          <div className="mt-6 text-center sm:hidden">
            <Button variant="outline" asChild>
              <Link to="/discover">View all fragrances</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Popular Notes Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-medium">Explore by Notes</h2>
            <p className="text-muted-foreground mt-2">
              Discover fragrances featuring your favorite ingredients
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
            {popularNotes.map((note) => (
              <Link 
                key={note.id} 
                to={`/discover?note=${note.name}`}
                className="transition-transform hover:scale-105"
              >
                <NoteBadge note={note} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="relative overflow-hidden rounded-2xl bg-card p-8 md:p-12 shadow-card">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />
            <div className="relative max-w-lg">
              <h2 className="font-display text-2xl md:text-3xl font-medium mb-4">
                Start your fragrance journey
              </h2>
              <p className="text-muted-foreground mb-6">
                Create a free account to log your collection, write reviews, 
                and get personalized recommendations.
              </p>
              <Button size="lg" asChild>
                <Link to="/signup">
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <span className="font-display text-xl font-semibold">Essence</span>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                The community-driven platform for fragrance discovery and reviews.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <p className="font-medium mb-3">Explore</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/discover" className="hover:text-foreground transition-colors">Discover</Link></li>
                  <li><Link to="/brands" className="hover:text-foreground transition-colors">Brands</Link></li>
                  <li><Link to="/notes" className="hover:text-foreground transition-colors">Notes</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-3">Community</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/reviews" className="hover:text-foreground transition-colors">Reviews</Link></li>
                  <li><Link to="/community" className="hover:text-foreground transition-colors">Discussions</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-3">Account</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link></li>
                  <li><Link to="/signup" className="hover:text-foreground transition-colors">Create Account</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-sm text-muted-foreground text-center">
            © 2024 Essence. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
