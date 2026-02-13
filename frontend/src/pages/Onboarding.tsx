import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, ShoppingBag, FlaskConical, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type ExperienceLevel = 'casual' | 'enthusiast' | null;

interface OnboardingState {
  experienceLevel: ExperienceLevel;
  likedNotes: string[];
  avoidedNotes: string[];
  occasions: string[];
}

const NOTE_OPTIONS = [
  'Bergamot', 'Oud', 'Rose', 'Citrus', 'Woody', 'Vanilla',
  'Leather', 'Aquatic', 'Amber', 'Musk', 'Jasmine', 'Sandalwood',
  'Lavender', 'Patchouli', 'Tobacco', 'Iris',
];

const OCCASION_OPTIONS = [
  { label: 'Everyday / Office', icon: '💼' },
  { label: 'Date Night', icon: '🌹' },
  { label: 'Special Events', icon: '✨' },
  { label: 'Summer', icon: '☀️' },
  { label: 'Winter', icon: '❄️' },
  { label: 'Gym / Active', icon: '🏃' },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');

  const [state, setState] = useState<OnboardingState>({
    experienceLevel: null,
    likedNotes: [],
    avoidedNotes: [],
    occasions: [],
  });

  const totalSteps = 3;
  const progressValue = (step / totalSteps) * 100;

  const animateTransition = useCallback((direction: 'left' | 'right', cb: () => void) => {
    setSlideDirection(direction);
    setIsTransitioning(true);
    setTimeout(() => {
      cb();
      setIsTransitioning(false);
    }, 250);
  }, []);

  const nextStep = () => {
    if (step < totalSteps) {
      animateTransition('left', () => setStep(step + 1));
    }
  };

  const prevStep = () => {
    if (step > 1) {
      animateTransition('right', () => setStep(step - 1));
    }
  };

  const skip = () => navigate('/');

  const complete = () => {
    // In a real app, save the profile to the backend
    navigate('/');
  };

  const toggleNote = (note: string, type: 'liked' | 'avoided') => {
    setState((prev) => {
      const key = type === 'liked' ? 'likedNotes' : 'avoidedNotes';
      const otherKey = type === 'liked' ? 'avoidedNotes' : 'likedNotes';
      const isSelected = prev[key].includes(note);

      return {
        ...prev,
        [key]: isSelected ? prev[key].filter((n) => n !== note) : [...prev[key], note],
        // Remove from the other list if present
        [otherKey]: prev[otherKey].filter((n) => n !== note),
      };
    });
  };

  const toggleOccasion = (occasion: string) => {
    setState((prev) => ({
      ...prev,
      occasions: prev.occasions.includes(occasion)
        ? prev.occasions.filter((o) => o !== occasion)
        : [...prev.occasions, occasion],
    }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with progress */}
      <header className="w-full border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between h-14">
          <span className="font-display text-xl font-semibold tracking-tight text-foreground">
            Essence
          </span>
          <Button variant="ghost" size="sm" className="text-muted-foreground text-sm" onClick={skip}>
            Skip for now
          </Button>
        </div>
        <div className="container pb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground min-w-[4rem]">
              Step {step} of {totalSteps}
            </span>
            <Progress value={progressValue} className="h-1.5 flex-1" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div
          className={cn(
            'w-full max-w-xl transition-all duration-250 ease-out',
            isTransitioning && slideDirection === 'left' && 'opacity-0 translate-x-8',
            isTransitioning && slideDirection === 'right' && 'opacity-0 -translate-x-8',
            !isTransitioning && 'opacity-100 translate-x-0'
          )}
        >
          {/* Step 1: Experience Level */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center space-y-3">
                <h1 className="font-display text-3xl md:text-4xl font-medium text-foreground">
                  How would you describe your fragrance journey?
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  This helps us personalize your experience from the start.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Casual Shopper */}
                <button
                  onClick={() => setState({ ...state, experienceLevel: 'casual' })}
                  className={cn(
                    'group relative rounded-xl border-2 p-6 text-left transition-all duration-200 hover:shadow-card',
                    state.experienceLevel === 'casual'
                      ? 'border-primary bg-primary/5 shadow-card'
                      : 'border-border/50 bg-card hover:border-primary/30'
                  )}
                >
                  {state.experienceLevel === 'casual' && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-display text-lg font-medium">Casual Shopper</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Looking for a signature scent without the guesswork.
                  </p>
                </button>

                {/* Fragrance Enthusiast */}
                <button
                  onClick={() => setState({ ...state, experienceLevel: 'enthusiast' })}
                  className={cn(
                    'group relative rounded-xl border-2 p-6 text-left transition-all duration-200 hover:shadow-card',
                    state.experienceLevel === 'enthusiast'
                      ? 'border-primary bg-primary/5 shadow-card'
                      : 'border-border/50 bg-card hover:border-primary/30'
                  )}
                >
                  {state.experienceLevel === 'enthusiast' && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <FlaskConical className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-display text-lg font-medium">Enthusiast</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    I actively collect, sample, and dissect notes.
                  </p>
                </button>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={nextStep}
                  disabled={!state.experienceLevel}
                  size="lg"
                  className="min-w-[140px]"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Note Preferences */}
          {step === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center space-y-3">
                <h1 className="font-display text-3xl md:text-4xl font-medium text-foreground">
                  What notes do you gravitate towards?
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Tap notes to sort them into your likes and dislikes.
                </p>
              </div>

              {/* Notes I Like */}
              <div className="space-y-3">
                <h3 className="font-display text-lg font-medium text-foreground">Notes I Like</h3>
                <div className="flex flex-wrap gap-2">
                  {NOTE_OPTIONS.map((note) => (
                    <button
                      key={`like-${note}`}
                      onClick={() => toggleNote(note, 'liked')}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border',
                        state.likedNotes.includes(note)
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-card border-border/50 text-foreground hover:border-primary/40 hover:bg-primary/5'
                      )}
                    >
                      {note}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes I Avoid */}
              <div className="space-y-3">
                <h3 className="font-display text-lg font-medium text-foreground">Notes I Avoid</h3>
                <div className="flex flex-wrap gap-2">
                  {NOTE_OPTIONS.map((note) => (
                    <button
                      key={`avoid-${note}`}
                      onClick={() => toggleNote(note, 'avoided')}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border',
                        state.avoidedNotes.includes(note)
                          ? 'bg-destructive/10 text-destructive border-destructive/30 shadow-sm'
                          : 'bg-card border-border/50 text-foreground hover:border-destructive/30 hover:bg-destructive/5'
                      )}
                    >
                      {note}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={prevStep} size="lg">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={nextStep} size="lg" className="min-w-[140px]">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Typical Usage */}
          {step === 3 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center space-y-3">
                <h1 className="font-display text-3xl md:text-4xl font-medium text-foreground">
                  When do you mostly wear fragrances?
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Select all occasions that apply to you.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {OCCASION_OPTIONS.map(({ label, icon }) => (
                  <button
                    key={label}
                    onClick={() => toggleOccasion(label)}
                    className={cn(
                      'relative rounded-xl border-2 p-5 text-center transition-all duration-200 hover:shadow-card',
                      state.occasions.includes(label)
                        ? 'border-primary bg-primary/5 shadow-card'
                        : 'border-border/50 bg-card hover:border-primary/30'
                    )}
                  >
                    {state.occasions.includes(label) && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <span className="text-2xl mb-2 block">{icon}</span>
                    <span className="text-sm font-medium text-foreground">{label}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={prevStep} size="lg">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={complete} size="lg" className="min-w-[180px]">
                  Complete Profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Onboarding;
