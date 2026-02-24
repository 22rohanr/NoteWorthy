import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Header } from '@/components/layout/Header';
import { FragranceCard } from '@/components/fragrance/FragranceCard';
import { Skeleton } from "@/components/ui/skeleton";
import { useFragrances } from '@/hooks/use-api';
import { cn } from '@/lib/utils';

const FAMILY_META: Record<string, { desc: string }> = {
  Citrus:   { desc: 'Lemon, bergamot, orange' },
  Floral:   { desc: 'Rose, jasmine, lily' },
  Woody:    { desc: 'Sandalwood, cedar, vetiver' },
  Oriental: { desc: 'Amber, vanilla, incense' },
  Fresh:    { desc: 'Aquatic, green, ozonic' },
  Gourmand: { desc: 'Chocolate, caramel, coffee' },
  Spicy:    { desc: 'Pepper, cinnamon, cardamom' },
};

interface QuizState {
  likedFamilies: string[];
  avoidedFamilies: string[];
  budget: 'any' | 'under150' | '150to300' | 'over300';
  performance: 'longevity' | 'sillage' | 'value' | 'balanced';
  occasion: 'daily' | 'office' | 'evening' | 'special';
  gender: 'Unisex' | 'Masculine' | 'Feminine' | 'any';
}

const TOTAL_STEPS = 6;

export default function ScentQuiz() {
  const navigate = useNavigate();
  const { fragrances, notes, isLoading } = useFragrances();
  const [step, setStep] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const [quizState, setQuizState] = useState<QuizState>({
    likedFamilies: [],
    avoidedFamilies: [],
    budget: 'any',
    performance: 'balanced',
    occasion: 'daily',
    gender: 'any',
  });

  const families = useMemo(
    () => [...new Set(notes.map((n) => n.family).filter(Boolean))] as string[],
    [notes],
  );

  const noteIdsByFamily = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const n of notes) {
      if (n.family) {
        (map[n.family] ??= new Set()).add(n.id);
      }
    }
    return map;
  }, [notes]);

  const progress = (step / TOTAL_STEPS) * 100;

  const toggleFamily = (family: string, type: 'liked' | 'avoided') => {
    const key = type === 'liked' ? 'likedFamilies' : 'avoidedFamilies';
    const otherKey = type === 'liked' ? 'avoidedFamilies' : 'likedFamilies';

    setQuizState((prev) => ({
      ...prev,
      [key]: prev[key].includes(family)
        ? prev[key].filter((f) => f !== family)
        : [...prev[key], family],
      [otherKey]: prev[otherKey].filter((f) => f !== family),
    }));
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (showResults) {
      setShowResults(false);
    } else if (step > 1) {
      setStep(step - 1);
    } else {
      navigate('/');
    }
  };

  const getRecommendations = () => {
    return fragrances
      .map((fragrance) => {
        let score = 0;
        const allNoteIds = [
          ...fragrance.notes.top,
          ...fragrance.notes.middle,
          ...fragrance.notes.base,
        ].map((n) => n.id);

        // Score based on liked families
        for (const family of quizState.likedFamilies) {
          const ids = noteIdsByFamily[family];
          if (ids && allNoteIds.some((id) => ids.has(id))) {
            score += 20;
          }
        }

        // Penalize avoided families
        for (const family of quizState.avoidedFamilies) {
          const ids = noteIdsByFamily[family];
          if (ids && allNoteIds.some((id) => ids.has(id))) {
            score -= 30;
          }
        }

        // Budget filter
        if (quizState.budget !== 'any' && fragrance.price) {
          const price = fragrance.price.amount;
          if (quizState.budget === 'under150' && price <= 150) score += 10;
          else if (quizState.budget === '150to300' && price > 150 && price <= 300) score += 10;
          else if (quizState.budget === 'over300' && price > 300) score += 10;
          else score -= 5;
        }

        // Performance preference
        if (quizState.performance !== 'balanced') {
          const perf = fragrance.ratings[quizState.performance];
          score += perf * 2;
        } else {
          score += (fragrance.ratings.longevity + fragrance.ratings.sillage + fragrance.ratings.value) / 3;
        }

        // Gender preference
        if (quizState.gender !== 'any' && fragrance.gender === quizState.gender) {
          score += 15;
        } else if (quizState.gender !== 'any' && fragrance.gender === 'Unisex') {
          score += 5;
        }

        // Overall rating boost
        score += fragrance.ratings.overall * 3;

        return { fragrance, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  };

  const recommendations = showResults ? getRecommendations() : [];

  if (showResults) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <div className="container py-8 max-w-4xl">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Adjust preferences
          </button>

          {/* Results Header */}
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-medium text-primary">Your Personalized Picks</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-medium mb-3">
              We found {recommendations.length} perfect matches
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Based on your preferences for {quizState.likedFamilies.length > 0
                ? quizState.likedFamilies.join(', ').toLowerCase() + ' notes'
                : 'various scent profiles'
              }
            </p>
          </div>

          {/* Results Grid */}
          {recommendations.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
              {recommendations.map(({ fragrance }, index) => (
                <FragranceCard
                  key={fragrance.id}
                  fragrance={fragrance}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-lg border border-border/50 mb-10">
              <p className="text-muted-foreground mb-4">
                No exact matches found. Try adjusting your preferences.
              </p>
              <Button onClick={() => { setShowResults(false); setStep(1); }}>
                Start Over
              </Button>
            </div>
          )}

          {/* CTA */}
          <div className="bg-card rounded-xl p-6 md:p-8 border border-border/50 text-center animate-fade-in">
            <h3 className="font-display text-xl font-medium mb-2">
              Want to save your results?
            </h3>
            <p className="text-muted-foreground mb-4">
              Create a free account to add these to your wishlist and get notified of deals.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate('/discover')}>
                Keep Browsing
              </Button>
              <Button onClick={() => navigate('/signup')}>
                Create Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Progress bar */}
      <div className="border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {step === 1 ? 'Exit' : 'Back'}
            </button>
            <span className="text-sm text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {/* Quiz Content */}
      <div className="flex-1 container py-8 md:py-12 max-w-2xl">
        <div className="animate-fade-in" key={step}>
          {/* Step 1: Liked Families */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl md:text-3xl font-medium mb-2">
                  What scents do you love?
                </h2>
                <p className="text-muted-foreground">
                  Pick the scent families that appeal to you.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 py-4 max-w-md mx-auto">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 rounded-lg" />
                    ))
                  : families.map((family) => {
                      const meta = FAMILY_META[family];
                      return (
                        <button
                          key={family}
                          onClick={() => toggleFamily(family, 'liked')}
                          className={cn(
                            "relative p-4 rounded-lg border-2 text-left transition-all",
                            quizState.likedFamilies.includes(family)
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <p className="font-medium">{family}</p>
                          <p className="text-sm text-muted-foreground">{meta?.desc}</p>
                          {quizState.likedFamilies.includes(family) && (
                            <span className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </span>
                          )}
                        </button>
                      );
                    })}
              </div>
            </div>
          )}

          {/* Step 2: Avoided Families */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl md:text-3xl font-medium mb-2">
                  Any scent families to avoid?
                </h2>
                <p className="text-muted-foreground">
                  Select families you'd prefer to stay away from.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 py-4 max-w-md mx-auto">
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 rounded-lg" />
                    ))
                  : families
                      .filter((f) => !quizState.likedFamilies.includes(f))
                      .map((family) => {
                        const meta = FAMILY_META[family];
                        return (
                          <button
                            key={family}
                            onClick={() => toggleFamily(family, 'avoided')}
                            className={cn(
                              "relative p-4 rounded-lg border-2 text-left transition-all",
                              quizState.avoidedFamilies.includes(family)
                                ? "border-destructive bg-destructive/5"
                                : "border-border hover:border-destructive/50"
                            )}
                          >
                            <p className="font-medium">{family}</p>
                            <p className="text-sm text-muted-foreground">{meta?.desc}</p>
                            {quizState.avoidedFamilies.includes(family) && (
                              <span className="absolute top-2 right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                                <Check className="h-3 w-3 text-destructive-foreground" />
                              </span>
                            )}
                          </button>
                        );
                      })}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Skip if none apply
              </p>
            </div>
          )}

          {/* Step 3: Budget */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl md:text-3xl font-medium mb-2">
                  What's your budget?
                </h2>
                <p className="text-muted-foreground">
                  We'll show you options that fit your range.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 py-4 max-w-md mx-auto">
                {[
                  { value: 'any', label: 'Any budget', desc: 'Show me everything' },
                  { value: 'under150', label: 'Under $150', desc: 'Budget-friendly' },
                  { value: '150to300', label: '$150 - $300', desc: 'Mid-range' },
                  { value: 'over300', label: '$300+', desc: 'Luxury tier' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setQuizState((prev) => ({ ...prev, budget: option.value as QuizState['budget'] }))}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all",
                      quizState.budget === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Performance */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl md:text-3xl font-medium mb-2">
                  What matters most?
                </h2>
                <p className="text-muted-foreground">
                  Choose your top priority for fragrance performance.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 py-4 max-w-md mx-auto">
                {[
                  { value: 'longevity', label: 'Longevity', desc: 'Lasts all day long' },
                  { value: 'sillage', label: 'Projection', desc: 'Strong presence' },
                  { value: 'value', label: 'Value', desc: 'Best bang for buck' },
                  { value: 'balanced', label: 'Balanced', desc: 'All-around great' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setQuizState((prev) => ({ ...prev, performance: option.value as QuizState['performance'] }))}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all",
                      quizState.performance === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Occasion */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl md:text-3xl font-medium mb-2">
                  When will you wear it?
                </h2>
                <p className="text-muted-foreground">
                  This helps us match the right vibe.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 py-4 max-w-md mx-auto">
                {[
                  { value: 'daily', label: 'Daily Wear', desc: 'Versatile & easy' },
                  { value: 'office', label: 'Office', desc: 'Subtle & professional' },
                  { value: 'evening', label: 'Evening Out', desc: 'Bold & memorable' },
                  { value: 'special', label: 'Special Occasions', desc: 'Luxurious & unique' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setQuizState((prev) => ({ ...prev, occasion: option.value as QuizState['occasion'] }))}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all",
                      quizState.occasion === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Gender preference */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl md:text-3xl font-medium mb-2">
                  Any gender preference?
                </h2>
                <p className="text-muted-foreground">
                  Many love crossing traditional lines—choose what feels right.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 py-4 max-w-md mx-auto">
                {[
                  { value: 'any', label: 'Show me all', desc: 'No preference' },
                  { value: 'Unisex', label: 'Unisex', desc: 'Gender-neutral' },
                  { value: 'Masculine', label: 'Masculine', desc: 'Traditional men\'s' },
                  { value: 'Feminine', label: 'Feminine', desc: 'Traditional women\'s' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setQuizState((prev) => ({ ...prev, gender: option.value as QuizState['gender'] }))}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all",
                      quizState.gender === option.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with Next button */}
      <div className="border-t border-border bg-background">
        <div className="container py-4 flex justify-end">
          <Button onClick={handleNext} size="lg" className="gap-2">
            {step === TOTAL_STEPS ? 'See My Matches' : 'Continue'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
