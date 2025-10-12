import { useAuth } from '@getmocha/users-service/react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ClipboardList } from 'lucide-react';

export default function AuthCallback() {
  const { exchangeCodeForSessionToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await exchangeCodeForSessionToken();
        
        // Check if user needs agency setup
        const response = await fetch('/api/users/me', { credentials: 'include' });
        const data = await response.json();
        
        if (data.needs_agency_setup) {
          navigate('/agency-setup');
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Authentication failed:', error);
        navigate('/');
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl inline-block mb-4 animate-pulse">
          <ClipboardList className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Autenticando...</h2>
        <p className="text-gray-600">Aguarde enquanto configuramos sua conta.</p>
      </div>
    </div>
  );
}
