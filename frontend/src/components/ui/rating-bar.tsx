import { cn } from '@/lib/utils';

interface RatingBarProps {
  label: string;
  value: number;
  maxValue?: number;
  className?: string;
}

export function RatingBar({ label, value, maxValue = 10, className }: RatingBarProps) {
  const percentage = (value / maxValue) * 100;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
