import { cn } from '@/lib/utils';
import { Note } from '@/types/fragrance';

interface NoteBadgeProps {
  note: Note;
  size?: 'sm' | 'md';
  className?: string;
}

const familyColors: Record<string, string> = {
  Citrus: 'bg-amber-100 text-amber-800 border-amber-200',
  Floral: 'bg-pink-50 text-pink-700 border-pink-200',
  Woody: 'bg-orange-50 text-orange-800 border-orange-200',
  Oriental: 'bg-red-50 text-red-800 border-red-200',
  Fresh: 'bg-teal-50 text-teal-700 border-teal-200',
  Gourmand: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  Spicy: 'bg-rose-50 text-rose-800 border-rose-200',
};

export function NoteBadge({ note, size = 'md', className }: NoteBadgeProps) {
  const colorClass = note.family ? familyColors[note.family] : 'bg-secondary text-secondary-foreground border-border';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        colorClass,
        className
      )}
    >
      {note.name}
    </span>
  );
}
