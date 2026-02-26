import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FragranceDetail from "../FragranceDetail";

const mockUseFragrance = vi.fn();
const mockUseSimilarFragrances = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useFragrance: () => mockUseFragrance(),
  useSimilarFragrances: () => mockUseSimilarFragrances(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    firebaseUser: null,
    idToken: null,
    loading: false,
    userProfile: null,
  }),
}));

vi.mock("@/components/layout/Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

vi.mock("@/components/fragrance/FragranceCard", () => ({
  FragranceCard: ({ fragrance }: { fragrance: { id: string; name: string } }) => (
    <div data-testid="similar-card">{fragrance.name}</div>
  ),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/fragrance/f1"]}>
        <Routes>
          <Route path="/fragrance/:id" element={<FragranceDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const baseFragrance = {
  id: "f1",
  name: "Base Scent",
  brand: { id: "b1", name: "Brand", country: "X" },
  releaseYear: 2020,
  concentration: "EDP" as const,
  gender: "Unisex" as const,
  description: "Desc",
  perfumer: "Nose",
  imageUrl: "",
  notes: { top: [], middle: [], base: [] },
  ratings: { overall: 8, longevity: 7, sillage: 7, value: 7, reviewCount: 1 },
  price: { amount: 100, currency: "USD", size: "50ml" },
};

beforeEach(() => {
  mockUseFragrance.mockReturnValue({
    fragrance: baseFragrance,
    reviews: [],
    isLoading: false,
    isMock: false,
  });

  mockUseSimilarFragrances.mockReturnValue({
    fragrances: [],
    isLoading: false,
    isMock: false,
  });
});

describe("FragranceDetail – Similar fragrances tab", () => {
  it.skip("shows an empty state when no similar fragrances are available", async () => {
    renderPage();

    // Switch to Similar tab
    screen.getByText("Similar Fragrances").click();

    expect(
      await screen.findByText(/No obvious scent twins yet/i),
    ).toBeInTheDocument();
  });
});

