import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { notes, noteFamilies } from '@/data/dummyData';

const familyColors: Record<string, string> = {
  Citrus: 'bg-yellow-100/80 text-yellow-800 hover:bg-yellow-200/80 border-yellow-200',
  Floral: 'bg-pink-100/80 text-pink-800 hover:bg-pink-200/80 border-pink-200',
  Woody: 'bg-amber-100/80 text-amber-800 hover:bg-amber-200/80 border-amber-200',
  Oriental: 'bg-orange-100/80 text-orange-800 hover:bg-orange-200/80 border-orange-200',
  Fresh: 'bg-teal-100/80 text-teal-800 hover:bg-teal-200/80 border-teal-200',
  Gourmand: 'bg-rose-100/80 text-rose-800 hover:bg-rose-200/80 border-rose-200',
  Spicy: 'bg-red-100/80 text-red-800 hover:bg-red-200/80 border-red-200',
};

export default function Notes() {
  const grouped = noteFamilies.map((family) => ({
    family,
    items: notes.filter((n) => n.family === family),
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="border-b border-border/40 bg-secondary/30">
        <div className="container py-16 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            Ingredient Explorer
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-lg">
            Click any note to discover fragrances featuring that ingredient. Notes are grouped by their olfactory family.
          </p>
        </div>
      </section>

      {/* Families */}
      <section className="container py-12 space-y-10">
        {grouped.map(({ family, items }) =>
          items.length > 0 ? (
            <div key={family}>
              <h2 className="font-display text-2xl font-semibold tracking-tight mb-4">
                {family}
              </h2>
              <div className="flex flex-wrap gap-3">
                {items.map((note) => (
                  <Link
                    key={note.id}
                    to={`/discover?note=${encodeURIComponent(note.name)}`}
                    className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${familyColors[family] ?? 'bg-secondary text-foreground hover:bg-secondary/80 border-border'}`}
                  >
                    {note.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null
        )}
      </section>
    </div>
  );
}
