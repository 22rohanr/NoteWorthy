import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Discover from "./pages/Discover";
import FragranceDetail from "./pages/FragranceDetail";
import Collection from "./pages/Collection";
import ScentQuiz from "./pages/ScentQuiz";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Brands from "./pages/Brands";
import Notes from "./pages/Notes";
import Reviews from "./pages/Reviews";
import WriteReview from "./pages/WriteReview";
import MyReviews from "./pages/MyReviews";
import Discussions from "./pages/Discussions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/fragrance/:id" element={<FragranceDetail />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/quiz" element={<ScentQuiz />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/brands" element={<Brands />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/reviews/write" element={<WriteReview />} />
            <Route path="/reviews/mine" element={<MyReviews />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/discussions" element={<Discussions />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
