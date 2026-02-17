import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { PenLine, LogIn, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Header } from '@/components/layout/Header';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useFragrances } from '@/hooks/use-api';
import { useCreateReview } from '@/hooks/use-reviews';

const WEATHER_OPTIONS = ['Spring', 'Summer', 'Fall', 'Winter', 'Any'] as const;
const OCCASION_OPTIONS = ['Daily', 'Evening Out', 'Office', 'Special Event', 'Casual'] as const;

export default function WriteReview() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { userProfile, idToken } = useAuth();
    const { fragrances, isLoading: fragsLoading } = useFragrances();
    const { createReview, isCreating } = useCreateReview();

    // Form state
    const [fragranceId, setFragranceId] = useState('');
    const [fragranceSearch, setFragranceSearch] = useState('');
    const [showFragranceDropdown, setShowFragranceDropdown] = useState(false);
    const [overall, setOverall] = useState(5);
    const [longevity, setLongevity] = useState(5);
    const [sillage, setSillage] = useState(5);
    const [value, setValue] = useState(5);
    const [sprays, setSprays] = useState('');
    const [weather, setWeather] = useState('');
    const [occasion, setOccasion] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState('');

    // Pre-fill fragrance from query param
    useEffect(() => {
        const preselected = searchParams.get('fragrance');
        if (preselected && fragrances.length > 0) {
            const match = fragrances.find((f) => f.id === preselected);
            if (match) {
                setFragranceId(match.id);
                setFragranceSearch(`${match.name} — ${match.brand.name}`);
            }
        }
    }, [searchParams, fragrances]);

    // Filter fragrances for search
    const filteredFragrances = useMemo(() => {
        if (!fragranceSearch.trim()) return fragrances.slice(0, 20);
        const q = fragranceSearch.toLowerCase();
        return fragrances
            .filter(
                (f) =>
                    f.name.toLowerCase().includes(q) ||
                    f.brand.name.toLowerCase().includes(q)
            )
            .slice(0, 20);
    }, [fragrances, fragranceSearch]);

    const selectedFragrance = fragrances.find((f) => f.id === fragranceId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!fragranceId) {
            setError('Please select a fragrance.');
            return;
        }
        if (!content.trim()) {
            setError('Please write a review.');
            return;
        }
        if (!idToken) {
            setError('You must be signed in.');
            return;
        }

        try {
            await createReview(
                {
                    fragranceId,
                    rating: { overall, longevity, sillage, value },
                    content: content.trim(),
                    ...(sprays || weather || occasion
                        ? {
                            wearContext: {
                                sprays: Number(sprays) || 0,
                                weather: weather || '',
                                occasion: occasion || '',
                            },
                        }
                        : {}),
                },
                idToken
            );
            // Success — navigate to the fragrance page or reviews feed
            navigate(fragranceId ? `/fragrance/${fragranceId}` : '/reviews');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to submit review.');
        }
    };

    // Not signed in
    if (!userProfile) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <div className="container py-16 text-center max-w-lg">
                    <PenLine className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h1 className="font-display text-3xl font-medium mb-2">Write a Review</h1>
                    <p className="text-muted-foreground mb-6">
                        Sign in to share your fragrance experience with the community.
                    </p>
                    <Button asChild>
                        <Link to="/login" className="gap-2">
                            <LogIn className="h-4 w-4" />
                            Sign In
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <div className="container py-8 max-w-2xl">
                {/* Back link */}
                <Button variant="ghost" size="sm" className="gap-2 mb-6" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Button>

                <h1 className="font-display text-3xl font-medium mb-2">Write a Review</h1>
                <p className="text-muted-foreground mb-8">
                    Share your wearing experience with the community.
                </p>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Fragrance picker */}
                    <div className="space-y-2">
                        <Label>Fragrance *</Label>
                        {selectedFragrance && !showFragranceDropdown ? (
                            <div className="flex items-center gap-3 p-3 bg-card border border-border/50 rounded-lg">
                                <div className="flex-1">
                                    <p className="font-medium">{selectedFragrance.name}</p>
                                    <p className="text-sm text-muted-foreground">{selectedFragrance.brand.name}</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setFragranceId('');
                                        setFragranceSearch('');
                                        setShowFragranceDropdown(true);
                                    }}
                                >
                                    Change
                                </Button>
                            </div>
                        ) : (
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={fragsLoading ? 'Loading fragrances...' : 'Search for a fragrance...'}
                                    value={fragranceSearch}
                                    onChange={(e) => {
                                        setFragranceSearch(e.target.value);
                                        setShowFragranceDropdown(true);
                                        setFragranceId('');
                                    }}
                                    onFocus={() => setShowFragranceDropdown(true)}
                                    className="pl-9"
                                />
                                {showFragranceDropdown && filteredFragrances.length > 0 && (
                                    <div className="absolute z-50 top-full mt-1 w-full max-h-64 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg">
                                        {filteredFragrances.map((f) => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                className="w-full text-left px-4 py-2.5 hover:bg-accent transition-colors text-sm"
                                                onClick={() => {
                                                    setFragranceId(f.id);
                                                    setFragranceSearch(`${f.name} — ${f.brand.name}`);
                                                    setShowFragranceDropdown(false);
                                                }}
                                            >
                                                <span className="font-medium">{f.name}</span>
                                                <span className="text-muted-foreground"> — {f.brand.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Ratings */}
                    <div className="space-y-6">
                        <Label className="text-base">Ratings</Label>

                        {[
                            { label: 'Overall', val: overall, set: setOverall },
                            { label: 'Longevity', val: longevity, set: setLongevity },
                            { label: 'Sillage', val: sillage, set: setSillage },
                            { label: 'Value', val: value, set: setValue },
                        ].map(({ label, val, set }) => (
                            <div key={label} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">{label}</Label>
                                    <span className="text-sm font-semibold tabular-nums">{val}/10</span>
                                </div>
                                <Slider
                                    min={1}
                                    max={10}
                                    step={1}
                                    value={[val]}
                                    onValueChange={([v]) => set(v)}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Wear context */}
                    <div className="space-y-4">
                        <Label className="text-base">Wear Context (optional)</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm"># Sprays</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={20}
                                    placeholder="e.g. 4"
                                    value={sprays}
                                    onChange={(e) => setSprays(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm">Season / Weather</Label>
                                <Select value={weather} onValueChange={setWeather}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {WEATHER_OPTIONS.map((w) => (
                                            <SelectItem key={w} value={w}>{w}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm">Occasion</Label>
                                <Select value={occasion} onValueChange={setOccasion}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {OCCASION_OPTIONS.map((o) => (
                                            <SelectItem key={o} value={o}>{o}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Written review */}
                    <div className="space-y-2">
                        <Label>Your Review *</Label>
                        <Textarea
                            placeholder="Share your experience wearing this fragrance — how did it open, how did it evolve, how did it make you feel?"
                            rows={5}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    {/* Submit */}
                    <Button type="submit" size="lg" className="w-full gap-2" disabled={isCreating}>
                        <PenLine className="h-4 w-4" />
                        {isCreating ? 'Submitting...' : 'Submit Review'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
