import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "../Index";

const mockFragrances = [
  {
    id: "f1",
    name: "Aventus",
    brand: { id: "b1", name: "Creed", country: "France" },
    releaseYear: 2010,
    concentration: "EDP" as const,
    gender: "Masculine" as const,
    description: "Smoky pineapple",
    imageUrl: "",
    notes: { top: [], middle: [], base: [] },
    ratings: { overall: 9.2, longevity: 8, sillage: 9, value: 6, reviewCount: 100 },
    price: { amount: 350, currency: "USD", size: "100ml" },
  },
  {
    id: "f2",
    name: "Bleu de Chanel",
    brand: { id: "b2", name: "Chanel", country: "France" },
    releaseYear: 2010,
    concentration: "EDP" as const,
    gender: "Masculine" as const,
    description: "Fresh woody",
    imageUrl: "",
    notes: { top: [], middle: [], base: [] },
    ratings: { overall: 8.5, longevity: 7, sillage: 7, value: 7, reviewCount: 80 },
    price: { amount: 130, currency: "USD", size: "100ml" },
  },
];

const mockNotes = [
  { id: "n1", name: "Bergamot", family: "Citrus" as const },
  { id: "n2", name: "Rose", family: "Floral" as const },
];

const mockUseFragrances = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useFragrances: () => mockUseFragrances(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    firebaseUser: null,
    idToken: null,
    loading: false,
  }),
}));

vi.mock("@/components/layout/Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockUseFragrances.mockReturnValue({
    fragrances: mockFragrances,
    notes: mockNotes,
    isLoading: false,
    isMock: false,
  });
});

describe("Index page", () => {
  it("renders the hero section", () => {
    renderPage();
    expect(screen.getByText(/Find fragrances you'll/)).toBeInTheDocument();
    expect(screen.getByText("Start Exploring")).toBeInTheDocument();
  });

  it("renders featured fragrances from live data", () => {
    renderPage();
    expect(screen.getByText("Aventus")).toBeInTheDocument();
    expect(screen.getByText("Bleu de Chanel")).toBeInTheDocument();
  });

  it("renders the Featured Fragrances heading", () => {
    renderPage();
    expect(screen.getByText("Featured Fragrances")).toBeInTheDocument();
  });

  it("renders popular notes from live data", () => {
    renderPage();
    expect(screen.getByText("Bergamot")).toBeInTheDocument();
    expect(screen.getByText("Rose")).toBeInTheDocument();
  });

  it("shows loading skeletons when loading", () => {
    mockUseFragrances.mockReturnValue({
      fragrances: [],
      notes: [],
      isLoading: true,
      isMock: false,
    });
    const { container } = renderPage();
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("limits featured fragrances to 4", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      ...mockFragrances[0],
      id: `f${i}`,
      name: `Fragrance ${i}`,
    }));
    mockUseFragrances.mockReturnValue({
      fragrances: many,
      notes: mockNotes,
      isLoading: false,
      isMock: false,
    });
    renderPage();
    expect(screen.getByText("Fragrance 0")).toBeInTheDocument();
    expect(screen.getByText("Fragrance 3")).toBeInTheDocument();
    expect(screen.queryByText("Fragrance 4")).not.toBeInTheDocument();
  });

  it("limits popular notes to 8", () => {
    const manyNotes = Array.from({ length: 15 }, (_, i) => ({
      id: `n${i}`,
      name: `Note${i}`,
      family: "Citrus" as const,
    }));
    mockUseFragrances.mockReturnValue({
      fragrances: mockFragrances,
      notes: manyNotes,
      isLoading: false,
      isMock: false,
    });
    renderPage();
    expect(screen.getByText("Note0")).toBeInTheDocument();
    expect(screen.getByText("Note7")).toBeInTheDocument();
    expect(screen.queryByText("Note8")).not.toBeInTheDocument();
  });

  it("renders Explore by Notes section", () => {
    renderPage();
    expect(screen.getByText("Explore by Notes")).toBeInTheDocument();
  });

  it("renders CTA section", () => {
    renderPage();
    expect(screen.getByText("Start your fragrance journey")).toBeInTheDocument();
    expect(screen.getAllByText("Create Account").length).toBeGreaterThanOrEqual(1);
  });
});
