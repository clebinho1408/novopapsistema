import { BrowserRouter as Router, Routes, Route } from "react-router";
import HomePage from "@/react-app/pages/Home";
import LoginPage from "@/react-app/pages/Login";
import RegisterPage from "@/react-app/pages/Register";
import DashboardPage from "@/react-app/pages/Dashboard";
import CitiesPage from "@/react-app/pages/Cities";
import ProfessionalsPage from "@/react-app/pages/Professionals";
import StepProcessPage from "@/react-app/pages/StepProcess";
import ConfigurationsPage from "@/react-app/pages/Configurations";
import ProtectedRoute from "@/react-app/components/ProtectedRoute";

export default function App() {
  return (
    <Router>
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
            <ProtectedRoute requiredRole="administrator">
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
    </Router>
  );
}
