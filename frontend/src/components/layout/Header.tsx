import { Link } from 'react-router-dom';
import { Search, User, Heart, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-xl font-semibold tracking-tight">
            NoteWorthy
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/discover" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Discover
          </Link>
          <Link to="/brands" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Brands
          </Link>
          <Link to="/notes" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Notes
          </Link>
          <Link to="/reviews" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Reviews
          </Link>
          <Link to="/discussions" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Discussions
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className={`hidden md:flex items-center transition-all duration-300 ${isSearchOpen ? 'w-64' : 'w-10'}`}>
            {isSearchOpen ? (
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search fragrances..."
                  className="pl-9 pr-4 h-9 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/20"
                  autoFocus
                  onBlur={() => setIsSearchOpen(false)}
                />
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
            <Link to="/collection">
              <Heart className="h-4 w-4" />
            </Link>
          </Button>

          <Button variant="ghost" size="sm" className="hidden md:inline-flex text-sm" asChild>
            <Link to="/login">Sign In</Link>
          </Button>

          <Button size="sm" className="hidden md:inline-flex text-sm" asChild>
            <Link to="/signup">Create Account</Link>
          </Button>

          <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" asChild>
            <Link to="/login">
              <User className="h-4 w-4" />
            </Link>
          </Button>

          {/* Mobile menu */}
          <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
