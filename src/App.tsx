
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/auth"; // Ensure we're importing from the correct barrel
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import ShiftSwaps from "./pages/ShiftSwaps";
import SwapsList from "./pages/SwapsList";
import LeaveSwaps from "./pages/LeaveSwaps";
import CalendarManagement from "./pages/CalendarManagement";
import Settings from "./pages/Settings";
import SystemSettings from "./pages/SystemSettings";
import Admin from "./pages/Admin";
import Roadmap from "./pages/Roadmap";
import Feedback from "./pages/Feedback";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<Index />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* App Routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/shifts" element={<ShiftSwaps />} />
            <Route path="/swaps-list" element={<SwapsList />} />
            <Route path="/leave-swaps" element={<LeaveSwaps />} />
            <Route path="/calendar" element={<CalendarManagement />} /> {/* Roster page */}
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/system-settings" element={<SystemSettings />} />
            <Route path="/admin" element={<Admin />} />
            
            {/* Catch-all for non-existent routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
