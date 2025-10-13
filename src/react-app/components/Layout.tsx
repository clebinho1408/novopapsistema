import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { 
  ClipboardList, 
  FileText, 
  MapPin, 
  Users, 
  Settings, 
  LogOut, 
  Menu,
  X,
  LayoutDashboard
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          setUserData(data);
          // Redirect collaborators to step-process page if they're on a restricted page
          if (data.role === 'collaborator') {
            const currentPath = location.pathname;
            const allowedPaths = ['/step-process'];
            if (!allowedPaths.includes(currentPath)) {
              navigate('/step-process');
            }
          }
          // Redirect supervisors to their allowed pages if they're on a restricted page
          if (data.role === 'supervisor') {
            const currentPath = location.pathname;
            const allowedPaths = ['/step-process', '/professionals'];
            if (!allowedPaths.includes(currentPath)) {
              navigate('/step-process');
            }
          }
        }
      })
      .catch(() => {
        navigate('/login');
      });
  }, [navigate, location.pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } finally {
      navigate('/login');
    }
  };

  const navigation = userData?.role === 'administrator' ? [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Passo a Passo', href: '/step-process', icon: FileText },
    { name: 'Cidades', href: '/cities', icon: MapPin },
    { name: 'Credenciados', href: '/professionals', icon: Users },
    { name: 'Configurações', href: '/configurations', icon: Settings },
  ] : userData?.role === 'supervisor' ? [
    { name: 'Passo a Passo', href: '/step-process', icon: FileText },
    { name: 'Credenciados', href: '/professionals', icon: Users },
  ] : [
    { name: 'Passo a Passo', href: '/step-process', icon: FileText },
  ];

  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <div className={`lg:hidden fixed inset-0 z-50 ${isMenuOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/25" onClick={() => setIsMenuOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">PAP - Sistema</span>
            </div>
            <button onClick={() => setIsMenuOpen(false)}>
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
          <nav className="mt-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm font-medium ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex items-center flex-shrink-0 px-4 py-6">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">PAP - Sistema</span>
            </div>
          </div>
          <div className="flex flex-col flex-grow">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top navigation */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden"
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex">
              <div className="w-full flex md:ml-0">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                  <div className="flex items-center h-16">
                    <h1 className="text-lg font-semibold text-gray-900">
                      {userData?.agency_name}
                    </h1>
                  </div>
                </div>
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <div className="font-medium text-gray-700">{userData?.name}</div>
                  <div className="text-gray-500 capitalize">{userData?.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
