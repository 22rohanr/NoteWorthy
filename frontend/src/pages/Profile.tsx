import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User,
  PenLine,
  MessageSquare,
  Heart,
  FlaskConical,
  Bookmark,
  Calendar,
  Star,
  Save,
  X,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useAuth, type UserProfile } from '@/contexts/AuthContext';
import { apiGet, apiPatch } from '@/lib/api';
import { toast } from 'sonner';

interface ReviewSummary {
  id: string;
  fragranceId: string;
  rating: { overall: number; longevity: number; sillage: number; value: number };
  content: string;
  upvotes: number;
  createdAt: string;
  fragrance?: { id: string; name: string; brand: { name: string } };
}

interface DiscussionSummary {
  id: string;
  title: string;
  category: string;
  commentCount: number;
  createdAt: string;
}

interface CollectionFragranceSummary {
  id: string;
  name: string;
  brand: { name: string };
}

interface ProfileData {
  user: UserProfile;
  collectionFragrances?: {
    owned: CollectionFragranceSummary[];
    sampled: CollectionFragranceSummary[];
    wishlist: CollectionFragranceSummary[];
  };
  reviews: ReviewSummary[];
  reviewCount: number;
  discussions: DiscussionSummary[];
  discussionCount: number;
}

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { firebaseUser, idToken, userProfile, refreshProfile } = useAuth();

  const viewingUserId = userId || firebaseUser?.uid;
  const isOwnProfile = !userId || userId === firebaseUser?.uid;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');

  const fetchProfile = useCallback(async () => {
    if (!viewingUserId) return;
    setIsLoading(true);
    try {
      const data = await apiGet<ProfileData>(
        `/auth/profile/${viewingUserId}`,
        idToken ?? undefined,
      );
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [viewingUserId, idToken]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const startEditing = () => {
    if (!profile) return;
    setEditUsername(profile.user.username);
    setEditBio(profile.user.bio || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveProfile = async () => {
    if (!idToken) return;
    setIsSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (editUsername.trim() && editUsername !== profile?.user.username) {
        body.username = editUsername.trim();
      }
      if (editBio !== (profile?.user.bio || '')) {
        body.bio = editBio;
      }
      if (Object.keys(body).length === 0) {
        setIsEditing(false);
        return;
      }
      await apiPatch<{ user: UserProfile }>('/auth/profile', body, idToken);
      await refreshProfile();
      await fetchProfile();
      setIsEditing(false);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!viewingUserId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="font-display text-xl font-medium mb-2">Sign in to view your profile</h2>
          <Button asChild className="mt-4">
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 max-w-4xl">
          <div className="flex items-start gap-6 mb-8">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">User not found</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { user, reviews, reviewCount, discussions, discussionCount } = profile;
  const collection = user.collection || { owned: [], sampled: [], wishlist: [] };
  const collectionFragrances = profile.collectionFragrances || { owned: [], sampled: [], wishlist: [] };

  const rawPreferences = (user.preferences ?? {}) as Record<string, unknown>;
  const preferences = {
    favoriteNotes: Array.isArray(rawPreferences.favoriteNotes)
      ? (rawPreferences.favoriteNotes as string[])
      : Array.isArray(rawPreferences.likedNotes)
        ? (rawPreferences.likedNotes as string[])
        : [],
    avoidedNotes: Array.isArray(rawPreferences.avoidedNotes)
      ? (rawPreferences.avoidedNotes as string[])
      : [],
    favoriteConcentrations: Array.isArray(rawPreferences.favoriteConcentrations)
      ? (rawPreferences.favoriteConcentrations as string[])
      : Array.isArray(rawPreferences.preferredConcentrations)
        ? (rawPreferences.preferredConcentrations as string[])
        : [],
    favoriteOccasions: Array.isArray(rawPreferences.favoriteOccasions)
      ? (rawPreferences.favoriteOccasions as string[])
      : [],
  };

  const initial = user.username?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8 max-w-4xl">
        {/* Profile header */}
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
          <Avatar className="h-24 w-24 text-3xl">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-3">
                <Input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Username"
                  className="max-w-xs text-lg font-medium"
                />
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Write a short bio..."
                  className="max-w-lg resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveProfile} disabled={isSaving} className="gap-1.5">
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEditing} disabled={isSaving}>
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-display text-2xl md:text-3xl font-medium truncate">
                    {user.username}
                  </h1>
                  {isOwnProfile && (
                    <Button variant="ghost" size="sm" onClick={startEditing} className="gap-1.5 text-muted-foreground">
                      <PenLine className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                </div>
                {user.bio && (
                  <p className="text-muted-foreground mb-2 max-w-lg">{user.bio}</p>
                )}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {user.joinDate}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Collection stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Link
            to={isOwnProfile ? '/collection' : '#'}
            className="p-5 bg-card rounded-lg border border-border/50 hover:border-primary/30 transition-colors text-center"
          >
            <Heart className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-semibold">{collection.owned?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Owned</p>
          </Link>
          <Link
            to={isOwnProfile ? '/collection' : '#'}
            className="p-5 bg-card rounded-lg border border-border/50 hover:border-primary/30 transition-colors text-center"
          >
            <FlaskConical className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-semibold">{collection.sampled?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sampled</p>
          </Link>
          <Link
            to={isOwnProfile ? '/collection' : '#'}
            className="p-5 bg-card rounded-lg border border-border/50 hover:border-primary/30 transition-colors text-center"
          >
            <Bookmark className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-semibold">{collection.wishlist?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Wishlist</p>
          </Link>
        </div>

        {/* Preferences */}
        {(preferences.favoriteNotes.length > 0 ||
          preferences.avoidedNotes.length > 0 ||
          preferences.favoriteOccasions.length > 0) && (
          <div className="mb-8 p-5 bg-card rounded-lg border border-border/50 space-y-4">
            <h3 className="font-display text-lg font-medium">Preferences</h3>
            {preferences.favoriteNotes.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Favorite Notes</p>
                <div className="flex flex-wrap gap-1.5">
                  {preferences.favoriteNotes.map((note) => (
                    <Badge key={note} variant="secondary">{note}</Badge>
                  ))}
                </div>
              </div>
            )}
            {preferences.avoidedNotes.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Avoided Notes</p>
                <div className="flex flex-wrap gap-1.5">
                  {preferences.avoidedNotes.map((note) => (
                    <Badge key={note} variant="outline" className="text-destructive border-destructive/30">
                      {note}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {preferences.favoriteOccasions.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Occasions</p>
                <div className="flex flex-wrap gap-1.5">
                  {preferences.favoriteOccasions.map((occ) => (
                    <Badge key={occ} variant="secondary">{occ}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activity tabs */}
        <Tabs defaultValue="reviews" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="collection" className="gap-1.5">
              <Heart className="h-3.5 w-3.5" />
              Collection
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1.5">
              <PenLine className="h-3.5 w-3.5" />
              Reviews ({reviewCount})
            </TabsTrigger>
            <TabsTrigger value="discussions" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Discussions ({discussionCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collection" className="space-y-5">
            {(
              [
                { key: 'owned', label: 'Owned' },
                { key: 'sampled', label: 'Sampled' },
                { key: 'wishlist', label: 'Wishlist' },
              ] as const
            ).map(({ key, label }) => (
              <section key={key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{label}</h3>
                  <span className="text-xs text-muted-foreground">
                    {collectionFragrances[key].length}
                  </span>
                </div>

                {collectionFragrances[key].length === 0 ? (
                  <div className="rounded-lg border border-border/50 p-4 text-sm text-muted-foreground">
                    No fragrances yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {collectionFragrances[key].map((fragrance) => (
                      <Link
                        key={fragrance.id}
                        to={`/fragrance/${fragrance.id}`}
                        className="rounded-lg border border-border/60 bg-card p-4 hover:border-primary/30 transition-colors"
                      >
                        <p className="font-medium">{fragrance.name}</p>
                        <p className="text-sm text-muted-foreground">{fragrance.brand.name}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <PenLine className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>{isOwnProfile ? "You haven't written any reviews yet." : 'No reviews yet.'}</p>
                {isOwnProfile && (
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link to="/reviews/write">Write a Review</Link>
                  </Button>
                )}
              </div>
            ) : (
              reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-xl border border-border/60 bg-card p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    {review.fragrance ? (
                      <Link
                        to={`/fragrance/${review.fragrance.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {review.fragrance.name}
                        <span className="text-muted-foreground font-normal ml-1.5">
                          by {review.fragrance.brand.name}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Unknown fragrance</span>
                    )}
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-secondary rounded text-sm">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      <span className="font-medium">{review.rating.overall}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{review.content}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(['longevity', 'sillage', 'value'] as const).map((metric) => (
                      <div key={metric} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="capitalize text-muted-foreground">{metric}</span>
                          <span className="font-semibold">{review.rating[metric]}/10</span>
                        </div>
                        <Progress value={review.rating[metric] * 10} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span>{review.createdAt}</span>
                    <span>{review.upvotes} upvotes</span>
                  </div>
                </article>
              ))
            )}
          </TabsContent>

          <TabsContent value="discussions" className="space-y-4">
            {discussions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>{isOwnProfile ? "You haven't started any discussions yet." : 'No discussions yet.'}</p>
                {isOwnProfile && (
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link to="/discussions">Join the Conversation</Link>
                  </Button>
                )}
              </div>
            ) : (
              discussions.map((disc) => (
                <Link
                  key={disc.id}
                  to={`/discussions/${disc.id}`}
                  className="block rounded-xl border border-border/60 bg-card p-5 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="font-medium truncate">{disc.title}</h4>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">{disc.category}</Badge>
                        <span>{disc.commentCount} replies</span>
                        <span>{disc.createdAt}</span>
                      </div>
                    </div>
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </Link>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
