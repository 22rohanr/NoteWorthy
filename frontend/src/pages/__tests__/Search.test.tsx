import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Search from "../Search";

const mockApiGet = vi.fn();

vi.mock("@/lib/api", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    firebaseUser: null,
    idToken: null,
    userProfile: null,
    loading: false,
  }),
}));

vi.mock("@/components/layout/Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

vi.mock("@/components/fragrance/FragranceCard", () => ({
  FragranceCard: ({ fragrance }: { fragrance: { name: string } }) => (
    <div data-testid="fragrance-card">{fragrance.name}</div>
  ),
}));

function renderPage(initialQuery = "") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const entry = initialQuery ? `/search?q=${encodeURIComponent(initialQuery)}` : "/search";
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[entry]}>
        <Search />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const mockResults = {
  query: "aventus",
  fragrances: [
    {
      id: "f1",
      name: "Aventus",
      brand: { id: "b1", name: "Creed", country: "France" },
      imageUrl: "",
      ratings: { overall: 9.2, reviewCount: 100, longevity: 8, sillage: 9, value: 6 },
      concentration: "EDP",
      gender: "Masculine",
      releaseYear: 2010,
      description: "",
      notes: { top: [], middle: [], base: [] },
    },
  ],
  fragranceCount: 1,
  brands: [{ id: "b1", name: "Creed", country: "France" }],
  brandCount: 1,
  notes: [],
  noteCount: 0,
  discussions: [
    {
      id: "d1",
      title: "Aventus batch talk",
      category: "General",
      authorName: "Alice",
      commentCount: 5,
      createdAt: "2025-06-01",
    },
  ],
  discussionCount: 1,
};

beforeEach(() => {
  mockApiGet.mockReset();
});

describe("Search page", () => {
  it("renders the search input", () => {
    renderPage();
    expect(
      screen.getByPlaceholderText(/search fragrances, brands/i),
    ).toBeInTheDocument();
  });

  it("shows empty prompt when no query is provided", () => {
    renderPage();
    expect(
      screen.getByText(/search across fragrances, brands/i),
    ).toBeInTheDocument();
  });

  it("fetches and displays results for a query param", async () => {
    mockApiGet.mockResolvedValueOnce(mockResults);
    renderPage("aventus");

    await waitFor(() => {
      expect(screen.getByText("Aventus")).toBeInTheDocument();
    });

    expect(screen.getByText("Creed")).toBeInTheDocument();
    expect(screen.getByText("Aventus batch talk")).toBeInTheDocument();
    expect(mockApiGet).toHaveBeenCalledWith("/search?q=aventus");
  });

  it("shows no-results message when nothing matches", async () => {
    mockApiGet.mockResolvedValueOnce({
      query: "zzz",
      fragrances: [],
      fragranceCount: 0,
      brands: [],
      brandCount: 0,
      notes: [],
      noteCount: 0,
      discussions: [],
      discussionCount: 0,
    });

    renderPage("zzz");

    await waitFor(() => {
      expect(screen.getByText(/no results for/i)).toBeInTheDocument();
    });
  });

  it("shows result count summary", async () => {
    mockApiGet.mockResolvedValueOnce(mockResults);
    renderPage("aventus");

    await waitFor(() => {
      expect(screen.getByText(/found 3 results/i)).toBeInTheDocument();
    });
  });

  it("displays section headers for each result category", async () => {
    mockApiGet.mockResolvedValueOnce(mockResults);
    renderPage("aventus");

    await waitFor(() => {
      expect(screen.getByText("Fragrances")).toBeInTheDocument();
      expect(screen.getByText("Brands")).toBeInTheDocument();
      expect(screen.getByText("Discussions")).toBeInTheDocument();
    });
  });

  it("submits a new search on Enter", async () => {
    mockApiGet.mockResolvedValue(mockResults);
    renderPage();

    const input = screen.getByPlaceholderText(/search fragrances, brands/i);
    fireEvent.change(input, { target: { value: "aventus" } });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalled();
    });
  });
});
