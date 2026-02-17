import { Link } from 'react-router-dom';
import { Star, Heart } from 'lucide-react';
import { Fragrance } from '@/types/fragrance';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection } from '@/hooks/use-collection';

interface FragranceCardProps {
  fragrance: Fragrance;
  className?: string;
  style?: React.CSSProperties;
}

export function FragranceCard({ fragrance, className, style }: FragranceCardProps) {
  const [imgError, setImgError] = useState(false);
  const { userProfile } = useAuth();
  const { addToCollection, removeFromCollection, getTabsForFragrance, isMutating } =
    useCollection();

  const isWishlisted = userProfile
    ? getTabsForFragrance(fragrance.id).includes('wishlist')
    : false;

  const hasImage = !!fragrance.imageUrl && !imgError;
  const brandInitial = fragrance.brand.name?.charAt(0)?.toUpperCase() || '?';

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userProfile || isMutating) return;
    if (isWishlisted) {
      await removeFromCollection(fragrance.id, 'wishlist');
    } else {
      await addToCollection(fragrance.id, 'wishlist');
    }
  };

  return (
    <Link
      to={`/fragrance/${fragrance.id}`}
      className={cn(
        "group relative flex flex-col bg-card rounded-lg overflow-hidden shadow-soft hover:shadow-card transition-all duration-300",
        className
      )}
      style={style}
    >
      {/* Image container */}
      <div className="relative aspect-[3/4] bg-gradient-to-b from-secondary/50 to-secondary overflow-hidden">
        {hasImage ? (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <img
              src={fragrance.imageUrl}
              alt={`${fragrance.name} by ${fragrance.brand.name}`}
              className="max-w-[50%] max-h-[50%] object-contain transition-transform duration-500 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-display font-semibold text-primary-foreground/90">
                {brandInitial}
              </span>
            </div>
          </div>
        )}

        {/* Wishlist button */}
        <button
          onClick={handleWishlistToggle}
          className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              isWishlisted ? "fill-primary text-primary" : "text-foreground"
            )}
          />
        </button>

        {/* Concentration badge */}
        <span className="absolute bottom-3 left-3 px-2 py-0.5 text-xs font-medium bg-background/90 backdrop-blur-sm rounded">
          {fragrance.concentration}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {fragrance.brand.name}
        </p>
        <h3 className="font-display text-lg font-medium leading-tight mb-2 group-hover:text-primary transition-colors">
          {fragrance.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mt-auto">
          <Star className="h-4 w-4 fill-primary text-primary" />
          <span className="font-medium">{fragrance.ratings.overall.toFixed(1)}</span>
        </div>

        {/* Price */}
        {fragrance.price && (
          <p className="text-sm text-muted-foreground mt-2">
            ${fragrance.price.amount} / {fragrance.price.size}
          </p>
        )}
      </div>
    </Link>
  );
}
