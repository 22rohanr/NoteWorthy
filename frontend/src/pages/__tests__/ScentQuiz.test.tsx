import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ScentQuiz from "../ScentQuiz";

const mockNotes = [
  { id: "n1", name: "Bergamot", family: "Citrus" },
  { id: "n2", name: "Rose", family: "Floral" },
  { id: "n3", name: "Cedar", family: "Woody" },
  { id: "n4", name: "Vanilla", family: "Oriental" },
  { id: "n5", name: "Mint", family: "Fresh" },
  { id: "n6", name: "Chocolate", family: "Gourmand" },
  { id: "n7", name: "Pepper", family: "Spicy" },
];

const mockFragrances = [
  {
    id: "f1",
    name: "Summer Breeze",
    brand: { id: "b1", name: "TestBrand", country: "US" },
    releaseYear: 2022,
    concentration: "EDP" as const,
    gender: "Unisex" as const,
    description: "Fresh and citrusy",
    imageUrl: "",
    notes: {
      top: [{ id: "n1", name: "Bergamot", family: "Citrus" }],
      middle: [{ id: "n5", name: "Mint", family: "Fresh" }],
      base: [{ id: "n3", name: "Cedar", family: "Woody" }],
    },
    ratings: { overall: 8.5, longevity: 7, sillage: 6, value: 8, reviewCount: 50 },
    price: { amount: 120, currency: "USD", size: "100ml" },
  },
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

function renderQuiz() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ScentQuiz />
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

describe("ScentQuiz", () => {
  it("renders step 1 with note families", () => {
    renderQuiz();
    expect(screen.getByText("What scents do you love?")).toBeInTheDocument();
    expect(screen.getByText("Citrus")).toBeInTheDocument();
    expect(screen.getByText("Floral")).toBeInTheDocument();
    expect(screen.getByText("Woody")).toBeInTheDocument();
    expect(screen.getByText("Oriental")).toBeInTheDocument();
    expect(screen.getByText("Fresh")).toBeInTheDocument();
    expect(screen.getByText("Gourmand")).toBeInTheDocument();
    expect(screen.getByText("Spicy")).toBeInTheDocument();
  });

  it("shows family descriptions", () => {
    renderQuiz();
    expect(screen.getByText("Lemon, bergamot, orange")).toBeInTheDocument();
    expect(screen.getByText("Rose, jasmine, lily")).toBeInTheDocument();
    expect(screen.getByText("Sandalwood, cedar, vetiver")).toBeInTheDocument();
  });

  it("does NOT show individual notes (no 666 notes)", () => {
    renderQuiz();
    expect(screen.queryByText("Bergamot")).not.toBeInTheDocument();
    expect(screen.queryByText("Rose")).not.toBeInTheDocument();
  });

  it("advances to step 2 on Continue", () => {
    renderQuiz();
    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText(/Any scent families to avoid/)).toBeInTheDocument();
  });

  it("step 2 excludes families liked in step 1", () => {
    renderQuiz();
    fireEvent.click(screen.getByText("Citrus"));
    fireEvent.click(screen.getByText("Continue"));
    // Citrus should not appear in step 2
    const cards = screen.getAllByRole("button");
    const citrusCards = cards.filter((btn) => btn.textContent?.includes("Citrus"));
    expect(citrusCards.length).toBe(0);
  });

  it("navigates through all 6 steps", () => {
    renderQuiz();
    expect(screen.getByText("Step 1 of 6")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("Step 2 of 6")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("Step 3 of 6")).toBeInTheDocument();
    expect(screen.getByText("What's your budget?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("Step 4 of 6")).toBeInTheDocument();
    expect(screen.getByText("What matters most?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("Step 5 of 6")).toBeInTheDocument();
    expect(screen.getByText("When will you wear it?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("Step 6 of 6")).toBeInTheDocument();
    expect(screen.getByText("Any gender preference?")).toBeInTheDocument();
  });

  it("shows results after completing all steps", () => {
    renderQuiz();
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText("Continue"));
    }
    fireEvent.click(screen.getByText("See My Matches"));
    expect(screen.getByText("Your Personalized Picks")).toBeInTheDocument();
  });

  it("back button goes to previous step", () => {
    renderQuiz();
    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("Step 2 of 6")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Step 1 of 6")).toBeInTheDocument();
  });

  it("shows loading skeletons when loading", () => {
    mockUseFragrances.mockReturnValue({
      fragrances: [],
      notes: [],
      isLoading: true,
      isMock: false,
    });
    const { container } = renderQuiz();
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("results show matched fragrances from live data", () => {
    renderQuiz();
    fireEvent.click(screen.getByText("Citrus"));
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText("Continue"));
    }
    fireEvent.click(screen.getByText("See My Matches"));
    expect(screen.getByText("Summer Breeze")).toBeInTheDocument();
  });

  it("results page has adjust preferences link", () => {
    renderQuiz();
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText("Continue"));
    }
    fireEvent.click(screen.getByText("See My Matches"));
    expect(screen.getByText("Adjust preferences")).toBeInTheDocument();
  });
});
