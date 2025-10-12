import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { ClipboardList, Users, MapPin, Settings, FileText, Shield } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => {
        if (res.ok) {
          navigate('/dashboard');
        }
      })
      .catch(() => {
        // User not logged in, stay on home page
      });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                PAP - Sistema
              </h1>
            </div>
            <Link
              to="/login"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Sistema de Gestão de
            <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Processos do Detran
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Gerencie de forma eficiente todos os processos de habilitação com nossa plataforma 
            completa e isolada por agência. Cadastre cidades, profissionais e acompanhe cada etapa.
          </p>
          <Link
            to="/login"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 inline-block"
          >
            Começar Agora
          </Link>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Ambiente Isolado"
            description="Cada agência possui um ambiente totalmente isolado e seguro"
            gradient="from-blue-500 to-cyan-500"
          />
          <FeatureCard
            icon={<FileText className="w-8 h-8" />}
            title="Passo a Passo"
            description="Cadastre e acompanhe processos de habilitação completos"
            gradient="from-indigo-500 to-purple-500"
          />
          <FeatureCard
            icon={<MapPin className="w-8 h-8" />}
            title="Gerenciamento de Cidades"
            description="Cadastre e organize todas as cidades de Santa Catarina"
            gradient="from-purple-500 to-pink-500"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Profissionais Credenciados"
            description="Gerencie médicos, psicólogos e locais credenciados"
            gradient="from-pink-500 to-rose-500"
          />
          <FeatureCard
            icon={<Settings className="w-8 h-8" />}
            title="Configurações Flexíveis"
            description="Ajuste taxas, etapas e instruções conforme necessário"
            gradient="from-rose-500 to-orange-500"
          />
          <FeatureCard
            icon={<ClipboardList className="w-8 h-8" />}
            title="Integração Completa"
            description="Sistema completo para todos os processos do Detran"
            gradient="from-orange-500 to-yellow-500"
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description, gradient }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 group hover:-translate-y-2">
      <div className={`w-12 h-12 bg-gradient-to-r ${gradient} rounded-lg flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
