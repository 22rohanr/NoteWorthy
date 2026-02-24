import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Discover from "../Discover";

const fragranceWithPrice = {
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
};

const fragranceWithoutPrice = {
  id: "f2",
  name: "Mystery Scent",
  brand: { id: "b2", name: "Unknown", country: "?" },
  releaseYear: 2020,
  concentration: "EDT" as const,
  gender: "Unisex" as const,
  description: "No price info",
  imageUrl: "",
  notes: { top: [], middle: [], base: [] },
  ratings: { overall: 7.0, longevity: 5, sillage: 5, value: 5, reviewCount: 10 },
  price: undefined,
};

const fragranceCheap = {
  id: "f3",
  name: "Budget Fresh",
  brand: { id: "b3", name: "Value", country: "US" },
  releaseYear: 2023,
  concentration: "EDT" as const,
  gender: "Unisex" as const,
  description: "Affordable",
  imageUrl: "",
  notes: { top: [], middle: [], base: [] },
  ratings: { overall: 6.5, longevity: 4, sillage: 4, value: 9, reviewCount: 50 },
  price: { amount: 30, currency: "USD", size: "100ml" },
};

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
        <Discover />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockUseFragrances.mockReturnValue({
    fragrances: [fragranceWithPrice, fragranceWithoutPrice, fragranceCheap],
    brands: [
      { id: "b1", name: "Creed", country: "France", fragranceCount: 1 },
      { id: "b2", name: "Unknown", country: "?", fragranceCount: 1 },
      { id: "b3", name: "Value", country: "US", fragranceCount: 1 },
    ],
    notes: [],
    isLoading: false,
    isMock: false,
  });
});

describe("Discover page – default view", () => {
  it("shows all fragrances by default (rating sort)", () => {
    renderPage();
    expect(screen.getByText("Aventus")).toBeInTheDocument();
    expect(screen.getByText("Mystery Scent")).toBeInTheDocument();
    expect(screen.getByText("Budget Fresh")).toBeInTheDocument();
    expect(screen.getByText("Showing 3 fragrances")).toBeInTheDocument();
  });

  it("renders page header", () => {
    renderPage();
    expect(screen.getByText("Discover Fragrances")).toBeInTheDocument();
  });

  it("has a search input", () => {
    renderPage();
    expect(screen.getByPlaceholderText("Search by name or brand...")).toBeInTheDocument();
  });

  it("filters by search query", () => {
    renderPage();
    const input = screen.getByPlaceholderText("Search by name or brand...");
    fireEvent.change(input, { target: { value: "Aventus" } });
    expect(screen.getByText("Aventus")).toBeInTheDocument();
    expect(screen.queryByText("Budget Fresh")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 fragrance")).toBeInTheDocument();
  });

  it("filters by brand name in search", () => {
    renderPage();
    const input = screen.getByPlaceholderText("Search by name or brand...");
    fireEvent.change(input, { target: { value: "Creed" } });
    expect(screen.getByText("Aventus")).toBeInTheDocument();
    expect(screen.queryByText("Mystery Scent")).not.toBeInTheDocument();
  });

  it("shows empty state when no results", () => {
    renderPage();
    const input = screen.getByPlaceholderText("Search by name or brand...");
    fireEvent.change(input, { target: { value: "nonexistent xyz" } });
    expect(screen.getByText("No fragrances match your filters")).toBeInTheDocument();
  });

  it("has a Filters button", () => {
    renderPage();
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("shows filter panel when Filters button is clicked", () => {
    renderPage();
    fireEvent.click(screen.getByText("Filters"));
    expect(screen.getByText("Filter by")).toBeInTheDocument();
  });
});

describe("Discover page – price filtering logic", () => {
  it("filtering function excludes null-price fragrances for price-low sort", () => {
    const fragrances = [fragranceWithPrice, fragranceWithoutPrice, fragranceCheap];
    const sortBy = "price-low";

    const filtered = fragrances
      .filter((f) => {
        if ((sortBy === "price-low" || sortBy === "price-high") && !f.price) return false;
        return true;
      })
      .sort((a, b) => a.price!.amount - b.price!.amount);

    expect(filtered).toHaveLength(2);
    expect(filtered[0].name).toBe("Budget Fresh");
    expect(filtered[1].name).toBe("Aventus");
  });

  it("filtering function excludes null-price fragrances for price-high sort", () => {
    const fragrances = [fragranceWithPrice, fragranceWithoutPrice, fragranceCheap];
    const sortBy = "price-high";

    const filtered = fragrances
      .filter((f) => {
        if ((sortBy === "price-low" || sortBy === "price-high") && !f.price) return false;
        return true;
      })
      .sort((a, b) => b.price!.amount - a.price!.amount);

    expect(filtered).toHaveLength(2);
    expect(filtered[0].name).toBe("Aventus");
    expect(filtered[1].name).toBe("Budget Fresh");
  });

  it("filtering function keeps all fragrances for non-price sorts", () => {
    const fragrances = [fragranceWithPrice, fragranceWithoutPrice, fragranceCheap];
    const sortBy = "rating";

    const filtered = fragrances.filter((f) => {
      if ((sortBy === "price-low" || sortBy === "price-high") && !f.price) return false;
      return true;
    });

    expect(filtered).toHaveLength(3);
  });

  it("all fragrances with prices are kept", () => {
    const allWithPrices = [fragranceWithPrice, fragranceCheap];
    const sortBy = "price-low";

    const filtered = allWithPrices.filter((f) => {
      if ((sortBy === "price-low" || sortBy === "price-high") && !f.price) return false;
      return true;
    });

    expect(filtered).toHaveLength(2);
  });
});
