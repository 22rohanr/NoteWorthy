import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DiscussionDetail from "../DiscussionDetail";

const mockDiscussion = {
  id: "d1",
  title: "Best summer scent?",
  body: "Looking for something light and fresh for hot weather.",
  category: "Recommendation" as const,
  authorId: "u1",
  authorName: "Alice",
  authorAvatar: undefined,
  commentCount: 2,
  createdAt: new Date().toISOString(),
};

const mockReplies = [
  {
    id: "r1",
    body: "Try Acqua di Gio!",
    authorId: "u2",
    authorName: "Bob",
    authorAvatar: undefined,
    createdAt: new Date().toISOString(),
  },
  {
    id: "r2",
    body: "Light Blue is great too.",
    authorId: "u3",
    authorName: "Charlie",
    authorAvatar: undefined,
    createdAt: new Date().toISOString(),
  },
];

const mockUseDiscussion = vi.fn();
const mockUseAddReply = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useDiscussion: (id: string) => mockUseDiscussion(id),
  useAddReply: (id: string) => mockUseAddReply(id),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/components/layout/Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

function renderWithRoute(discussionId = "d1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/discussions/${discussionId}`]}>
        <Routes>
          <Route path="/discussions/:id" element={<DiscussionDetail />} />
          <Route path="/discussions" element={<div>discussions list</div>} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockUseDiscussion.mockReturnValue({
    discussion: mockDiscussion,
    replies: mockReplies,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseAddReply.mockReturnValue({
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

describe("DiscussionDetail page", () => {
  it("renders discussion title and body", () => {
    renderWithRoute();
    expect(screen.getByText("Best summer scent?")).toBeInTheDocument();
    expect(screen.getByText(/Looking for something light/)).toBeInTheDocument();
  });

  it("renders category badge", () => {
    renderWithRoute();
    expect(screen.getByText("Recommendation")).toBeInTheDocument();
  });

  it("renders author name", () => {
    renderWithRoute();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders all replies", () => {
    renderWithRoute();
    expect(screen.getByText("Try Acqua di Gio!")).toBeInTheDocument();
    expect(screen.getByText("Light Blue is great too.")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });

  it("shows reply count", () => {
    renderWithRoute();
    expect(screen.getByText("2 Replies")).toBeInTheDocument();
  });

  it("shows singular reply count", () => {
    mockUseDiscussion.mockReturnValue({
      discussion: mockDiscussion,
      replies: [mockReplies[0]],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithRoute();
    expect(screen.getByText("1 Reply")).toBeInTheDocument();
  });

  it("shows empty state when no replies", () => {
    mockUseDiscussion.mockReturnValue({
      discussion: mockDiscussion,
      replies: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithRoute();
    expect(screen.getByText(/No replies yet/)).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    mockUseDiscussion.mockReturnValue({
      discussion: null,
      replies: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    const { container } = renderWithRoute();
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows not found when discussion is null", () => {
    mockUseDiscussion.mockReturnValue({
      discussion: null,
      replies: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    renderWithRoute();
    expect(screen.getByText("Discussion not found.")).toBeInTheDocument();
  });

  it("shows sign-in prompt when not authenticated", () => {
    renderWithRoute();
    expect(screen.getByText(/Sign in to join/)).toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("shows reply form when authenticated", () => {
    mockUseAuth.mockReturnValue({
      firebaseUser: { uid: "u1" },
      idToken: "token",
      userProfile: { username: "Alice" },
      loading: false,
    });
    renderWithRoute();
    expect(screen.getByText("Add a Reply")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Share your thoughts...")).toBeInTheDocument();
  });

  it("reply button is disabled with empty text", () => {
    mockUseAuth.mockReturnValue({
      firebaseUser: { uid: "u1" },
      idToken: "token",
      userProfile: { username: "Alice" },
      loading: false,
    });
    renderWithRoute();
    const replyBtn = screen.getByRole("button", { name: /Reply/i });
    expect(replyBtn).toBeDisabled();
  });

  it("reply button enables with text", () => {
    mockUseAuth.mockReturnValue({
      firebaseUser: { uid: "u1" },
      idToken: "token",
      userProfile: { username: "Alice" },
      loading: false,
    });
    renderWithRoute();
    const textarea = screen.getByPlaceholderText("Share your thoughts...");
    fireEvent.change(textarea, { target: { value: "Nice suggestion!" } });
    const replyBtn = screen.getByRole("button", { name: /Reply/i });
    expect(replyBtn).not.toBeDisabled();
  });

  it("has back link to discussions list", () => {
    renderWithRoute();
    const backLink = screen.getByText("All Discussions");
    expect(backLink.closest("a")).toHaveAttribute("href", "/discussions");
  });
});
