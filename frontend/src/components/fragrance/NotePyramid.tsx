import { Note } from '@/types/fragrance';
import { NoteBadge } from '@/components/ui/note-badge';

interface NotePyramidProps {
  notes: {
    top: Note[];
    middle: Note[];
    base: Note[];
  };
}

export function NotePyramid({ notes }: NotePyramidProps) {
  return (
    <div className="space-y-6">
      <h3 className="font-display text-lg font-medium">Note Pyramid</h3>
      
      <div className="space-y-5">
        {/* Top Notes */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Top Notes</span>
          </div>
          <div className="flex flex-wrap gap-2 pl-4">
            {notes.top.map((note) => (
              <NoteBadge key={note.id} note={note} size="sm" />
            ))}
          </div>
        </div>

        {/* Middle Notes */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Heart Notes</span>
          </div>
          <div className="flex flex-wrap gap-2 pl-4">
            {notes.middle.map((note) => (
              <NoteBadge key={note.id} note={note} size="sm" />
            ))}
          </div>
        </div>

        {/* Base Notes */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-800" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Base Notes</span>
          </div>
          <div className="flex flex-wrap gap-2 pl-4">
            {notes.base.map((note) => (
              <NoteBadge key={note.id} note={note} size="sm" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
