import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AuditDetail from "./pages/AuditDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/audit/:id" element={<ProtectedRoute><AuditDetail /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        
<footer aria-label="Development and copyright">
      <p data-asg-copyright="notice" style={{ maxWidth: "80rem", margin: "1rem auto 0", padding: "0 1rem 1rem", fontSize: "0.75rem", lineHeight: 1.6 }}>
        <a href="/intellectual-property.html" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "0.2em" }}>Code &amp; development: AnotherSEOGuru, a company of Touristas Technologies. Copyright &amp; permitted use.</a>
      </p>
    </footer>
</BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
