import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Profile from "../Profile";

const mockApiGet = vi.fn();
const mockApiPatch = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/lib/api", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPatch: (...args: unknown[]) => mockApiPatch(...args),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/components/layout/Header", () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

const mockProfileData = {
  user: {
    id: "uid-1",
    username: "Alice",
    email: "alice@test.com",
    avatar: "",
    bio: "Fragrance enthusiast",
    preferences: {
      favoriteNotes: ["Bergamot", "Rose"],
      avoidedNotes: ["Oud"],
      favoriteConcentrations: [],
      favoriteOccasions: ["Date Night"],
    },
    collection: { owned: ["f1", "f2"], sampled: ["f3"], wishlist: [] },
    joinDate: "2025-01-15",
  },
  reviews: [
    {
      id: "r1",
      fragranceId: "f1",
      rating: { overall: 9, longevity: 8, sillage: 7, value: 6 },
      content: "Amazing scent!",
      upvotes: 5,
      createdAt: "2025-06-01",
      fragrance: { id: "f1", name: "Aventus", brand: { name: "Creed" } },
    },
  ],
  reviewCount: 1,
  discussions: [
    {
      id: "d1",
      title: "Best summer scent?",
      category: "Recommendation",
      commentCount: 3,
      createdAt: "2025-07-01",
    },
  ],
  discussionCount: 1,
};

function renderOwnProfile() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderPublicProfile(userId: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/profile/${userId}`]}>
        <Routes>
          <Route path="/profile/:userId" element={<Profile />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockApiGet.mockReset();
  mockApiPatch.mockReset();
  mockUseAuth.mockReturnValue({
    firebaseUser: { uid: "uid-1" },
    idToken: "fake-token",
    userProfile: { id: "uid-1", username: "Alice" },
    loading: false,
    refreshProfile: vi.fn(),
  });
});

describe("Profile page – own profile", () => {
  it("displays username and bio", async () => {
    mockApiGet.mockResolvedValueOnce(mockProfileData);
    renderOwnProfile();

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
    expect(screen.getByText("Fragrance enthusiast")).toBeInTheDocument();
  });

  it("shows join date", async () => {
    mockApiGet.mockResolvedValueOnce(mockProfileData);
    renderOwnProfile();

    await waitFor(() => {
      expect(screen.getByText(/joined 2025-01-15/i)).toBeInTheDocument();
    });
  });

  it("displays collection stats", async () => {
    mockApiGet.mockResolvedValueOnce(mockProfileData);
    renderOwnProfile();

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument(); // owned
      expect(screen.getByText("1")).toBeInTheDocument(); // sampled
      expect(screen.getByText("0")).toBeInTheDocument(); // wishlist
    });
    expect(screen.getByText("Owned")).toBeInTheDocument();
    expect(screen.getByText("Sampled")).toBeInTheDocument();
    expect(screen.getByText("Wishlist")).toBeInTheDocument();
  });

  it("shows preferences badges", async () => {
    mockApiGet.mockResolvedValueOnce(mockProfileData);
    renderOwnProfile();

    await waitFor(() => {
      expect(screen.getByText("Bergamot")).toBeInTheDocument();
      expect(screen.getByText("Rose")).toBeInTheDocument();
      expect(screen.getByText("Oud")).toBeInTheDocument();
      expect(screen.getByText("Date Night")).toBeInTheDocument();
    });
  });

  it("shows edit button for own profile", async () => {
    mockApiGet.mockResolvedValueOnce(mockProfileData);
    renderOwnProfile();

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });
  });

  it("shows recent reviews in activity tab", async () => {
    mockApiGet.mockResolvedValueOnce(mockProfileData);
    renderOwnProfile();

    await waitFor(() => {
      expect(screen.getByText("Aventus")).toBeInTheDocument();
      expect(screen.getByText("Amazing scent!")).toBeInTheDocument();
    });
  });

  it("shows discussions tab", async () => {
    mockApiGet.mockResolvedValueOnce(mockProfileData);
    renderOwnProfile();

    await waitFor(() => {
      expect(screen.getByText(/Discussions \(1\)/)).toBeInTheDocument();
    });
  });

  it("enters edit mode when Edit is clicked", async () => {
    mockApiGet.mockResolvedValueOnce(mockProfileData);
    renderOwnProfile();

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Edit"));

    expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Fragrance enthusiast")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });
});

describe("Profile page – public profile", () => {
  it("does not show edit button for other users", async () => {
    mockApiGet.mockResolvedValueOnce(mockProfileData);
    renderPublicProfile("other-uid");

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });
});

describe("Profile page – not logged in", () => {
  it("shows sign-in prompt when viewing /profile without auth", () => {
    mockUseAuth.mockReturnValue({
      firebaseUser: null,
      idToken: null,
      userProfile: null,
      loading: false,
      refreshProfile: vi.fn(),
    });
    renderOwnProfile();

    expect(screen.getByText(/sign in to view your profile/i)).toBeInTheDocument();
  });
});

describe("Profile page – user not found", () => {
  it("shows not-found message for unknown user", async () => {
    mockApiGet.mockRejectedValueOnce(new Error("Not found"));
    renderPublicProfile("nonexistent");

    await waitFor(() => {
      expect(screen.getByText("User not found")).toBeInTheDocument();
    });
  });
});
