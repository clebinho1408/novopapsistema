import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'administrator' | 'supervisor' | 'collaborator';
  agency_id: number;
  agency_name: string;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'administrator' | 'supervisor' | 'collaborator';
}

export default function ProtectedRoute({ children, requiredRole = 'collaborator' }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => {
        if (!res.ok) {
          navigate('/login');
          return;
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setUser(data);
          
          // Check if user has required role
          // Role hierarchy: administrator > supervisor > collaborator
          if (requiredRole === 'administrator' && data.role !== 'administrator') {
            // Non-admin trying to access admin-only page
            navigate('/step-process');
            return;
          }
          
          if (requiredRole === 'supervisor' && !['administrator', 'supervisor'].includes(data.role)) {
            // Collaborator trying to access supervisor page
            navigate('/step-process');
            return;
          }
        }
        setIsLoading(false);
      })
      .catch(() => {
        navigate('/login');
      });
  }, [navigate, requiredRole]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
