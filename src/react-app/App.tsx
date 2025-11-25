import { BrowserRouter as Router, Routes, Route } from "react-router";
import { lazy, Suspense } from 'react';
import ProtectedRoute from "@/react-app/components/ProtectedRoute";

// Lazy load todas as páginas
const HomePage = lazy(() => import("@/react-app/pages/Home"));
const LoginPage = lazy(() => import("@/react-app/pages/Login"));
const RegisterPage = lazy(() => import("@/react-app/pages/Register"));
const DashboardPage = lazy(() => import("@/react-app/pages/Dashboard"));
const CitiesPage = lazy(() => import("@/react-app/pages/Cities"));
const ProfessionalsPage = lazy(() => import("@/react-app/pages/Professionals"));
const StepProcessPage = lazy(() => import("@/react-app/pages/StepProcess"));
const ConfigurationsPage = lazy(() => import("@/react-app/pages/Configurations"));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Carregando...</p>
    </div>
  </div>
);

export default function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute requiredRole="administrator">
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cities" 
            element={
              <ProtectedRoute requiredRole="administrator">
                <CitiesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/professionals" 
            element={
              <ProtectedRoute requiredRole="supervisor">
                <ProfessionalsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/step-process" 
            element={
              <ProtectedRoute>
                <StepProcessPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/configurations" 
            element={
              <ProtectedRoute requiredRole="administrator">
                <ConfigurationsPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Suspense>
    </Router>
  );
}
