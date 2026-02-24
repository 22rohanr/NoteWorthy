import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Discussions from "../Discussions";

const mockDiscussions = [
  {
    id: "d1",
    title: "Best summer scent?",
    body: "Looking for something fresh",
    category: "Recommendation" as const,
    authorId: "u1",
    authorName: "Alice",
    authorAvatar: undefined,
    commentCount: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: "d2",
    title: "BR540 vs Cloud",
    body: "Are they really similar?",
    category: "Comparison" as const,
    authorId: "u2",
    authorName: "Bob",
    authorAvatar: undefined,
    commentCount: 12,
    createdAt: new Date().toISOString(),
  },
  {
    id: "d3",
    title: "Aventus batch variation",
    body: "Why does it smell different?",
    category: "General" as const,
    authorId: "u3",
    authorName: "Charlie",
    authorAvatar: undefined,
    commentCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: "d4",
    title: "New niche releases 2026",
    body: "Exciting stuff",
    category: "News" as const,
    authorId: "u4",
    authorName: "Dana",
    authorAvatar: undefined,
    commentCount: 3,
    createdAt: new Date().toISOString(),
  },
];

const mockUseDiscussions = vi.fn();
const mockUseCreateDiscussion = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useDiscussions: () => mockUseDiscussions(),
  useCreateDiscussion: () => mockUseCreateDiscussion(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/components/layout/Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockUseDiscussions.mockReturnValue({
    discussions: mockDiscussions,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseCreateDiscussion.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  mockUseAuth.mockReturnValue({
    firebaseUser: null,
    idToken: null,
    userProfile: null,
    loading: false,
  });
});

describe("Discussions page", () => {
  it("renders all discussions", () => {
    renderWithProviders(<Discussions />);
    expect(screen.getByText("Best summer scent?")).toBeInTheDocument();
    expect(screen.getByText("BR540 vs Cloud")).toBeInTheDocument();
    expect(screen.getByText("Aventus batch variation")).toBeInTheDocument();
    expect(screen.getByText("New niche releases 2026")).toBeInTheDocument();
  });

  it("shows loading skeletons when loading", () => {
    mockUseDiscussions.mockReturnValue({
      discussions: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    const { container } = renderWithProviders(<Discussions />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty state when no discussions", () => {
    mockUseDiscussions.mockReturnValue({
      discussions: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<Discussions />);
    expect(screen.getByText(/No discussions yet/)).toBeInTheDocument();
  });

  it("filters by category when filter button clicked", () => {
    renderWithProviders(<Discussions />);

    const filterButtons = screen.getAllByRole("button");
    const comparisonFilter = filterButtons.find(
      (btn) => btn.textContent === "Comparison" && btn.classList.contains("rounded-full"),
    )!;
    fireEvent.click(comparisonFilter);
    expect(screen.getByText("BR540 vs Cloud")).toBeInTheDocument();
    expect(screen.queryByText("Best summer scent?")).not.toBeInTheDocument();
    expect(screen.queryByText("Aventus batch variation")).not.toBeInTheDocument();
  });

  it("shows all when All filter is selected", () => {
    renderWithProviders(<Discussions />);

    const filterButtons = screen.getAllByRole("button");
    const newsFilter = filterButtons.find(
      (btn) => btn.textContent === "News" && btn.classList.contains("rounded-full"),
    )!;
    fireEvent.click(newsFilter);

    const allFilter = filterButtons.find(
      (btn) => btn.textContent === "All" && btn.classList.contains("rounded-full"),
    )!;
    fireEvent.click(allFilter);
    expect(screen.getByText("Best summer scent?")).toBeInTheDocument();
    expect(screen.getByText("New niche releases 2026")).toBeInTheDocument();
  });

  it("shows sign-in button when not authenticated", () => {
    renderWithProviders(<Discussions />);
    expect(screen.getByText("Sign in to Discuss")).toBeInTheDocument();
  });

  it("shows Start a Discussion button when authenticated", () => {
    mockUseAuth.mockReturnValue({
      firebaseUser: { uid: "u1" },
      idToken: "token",
      userProfile: { username: "Alice" },
      loading: false,
    });
    renderWithProviders(<Discussions />);
    expect(screen.getByText("Start a Discussion")).toBeInTheDocument();
  });

  it("displays category badge on each discussion", () => {
    renderWithProviders(<Discussions />);
    // Each category appears at least twice: once as filter, once as badge
    expect(screen.getAllByText("Recommendation").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Comparison").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("General").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("News").length).toBeGreaterThanOrEqual(2);
  });

  it("displays author name and comment count", () => {
    renderWithProviders(<Discussions />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("5 comments")).toBeInTheDocument();
    expect(screen.getByText("12 comments")).toBeInTheDocument();
  });

  it("shows category-specific empty state message", () => {
    mockUseDiscussions.mockReturnValue({
      discussions: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithProviders(<Discussions />);
    fireEvent.click(screen.getByText("News"));
    expect(screen.getByText(/No discussions in News/)).toBeInTheDocument();
  });
});
