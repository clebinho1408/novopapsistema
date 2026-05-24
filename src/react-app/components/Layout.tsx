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
  LayoutDashboard,
  Moon,
  Sun,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
  administrator: 'Administrador',
  supervisor: 'Supervisor',
  collaborator: 'Colaborador',
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => {
        if (!res.ok) { navigate('/login'); return; }
        return res.json();
      })
      .then(data => {
        if (data) {
          setUserData(data);
          if (data.role === 'collaborator') {
            const allowedPaths = ['/step-process'];
            if (!allowedPaths.includes(location.pathname)) navigate('/step-process');
          }
          if (data.role === 'supervisor') {
            const allowedPaths = ['/step-process', '/professionals'];
            if (!allowedPaths.includes(location.pathname)) navigate('/step-process');
          }
        }
      })
      .catch(() => navigate('/login'));
  }, [navigate, location.pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const UserInfo = () => (
    <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200 dark:border-gray-700">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{userData?.name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{ROLE_LABELS[userData?.role] ?? userData?.role}</div>
      </div>
      <button
        onClick={handleLogout}
        title="Sair"
        className="ml-3 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* Mobile overlay menu */}
      <div className={`lg:hidden fixed inset-0 z-50 ${isMenuOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/25" onClick={() => setIsMenuOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">PAP - Sistema</span>
            </div>
            <button onClick={() => setIsMenuOpen(false)}>
              <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <nav className="mt-4 flex-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center px-4 py-3 text-sm font-medium ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-r-2 border-blue-700'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <UserInfo />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center flex-shrink-0 px-4 py-6">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">PAP - Sistema</span>
            </div>
          </div>
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <UserInfo />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top bar */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white dark:bg-gray-800 shadow dark:shadow-gray-700/50">
          <button
            className="px-4 border-r border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden"
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between items-center">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {userData?.agency_name}
            </h1>
            <button
              onClick={() => setIsDark(d => !d)}
              title={isDark ? 'Tema claro' : 'Tema escuro'}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
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
