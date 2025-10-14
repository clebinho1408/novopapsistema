import Layout from '@/react-app/components/Layout';
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { FileText, MapPin, Users, Settings, Plus } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    cities: 0,
    professionals: 0,
    processes: 0,
    recentProcesses: []
  });

  useEffect(() => {
    // Fetch dashboard stats
    Promise.all([
      fetch('/api/cities', { credentials: 'include' }),
      fetch('/api/professionals', { credentials: 'include' }),
      fetch('/api/step-processes', { credentials: 'include' })
    ]).then(async ([citiesRes, profRes, processesRes]) => {
      const cities = await citiesRes.json();
      const professionals = await profRes.json();
      const processes = await processesRes.json();
      
      setStats({
        cities: cities.length,
        professionals: professionals.length,
        processes: processes.length,
        recentProcesses: processes.slice(0, 5)
      });
    });
  }, []);

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Stats cards */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Cidades"
              value={stats.cities}
              icon={<MapPin className="w-6 h-6" />}
              color="bg-blue-500"
              link="/cities"
            />
            <StatsCard
              title="Credenciados"
              value={stats.professionals}
              icon={<Users className="w-6 h-6" />}
              color="bg-green-500"
              link="/professionals"
            />
            <StatsCard
              title="Processos"
              value={stats.processes}
              icon={<FileText className="w-6 h-6" />}
              color="bg-purple-500"
              link="/step-process"
            />
            <StatsCard
              title="Configurações"
              value="✓"
              icon={<Settings className="w-6 h-6" />}
              color="bg-orange-500"
              link="/configurations"
            />
          </div>

          {/* Main actions */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Ações Principais</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ActionCard
                title="Novo Passo a Passo"
                description="Criar novo processo de habilitação"
                icon={<Plus className="w-8 h-8" />}
                link="/step-process"
                color="from-blue-500 to-blue-600"
              />
              <ActionCard
                title="Gerenciar Cidades"
                description="Adicionar ou editar cidades"
                icon={<MapPin className="w-8 h-8" />}
                link="/cities"
                color="from-green-500 to-green-600"
              />
              <ActionCard
                title="Gerenciar Credenciados"
                description="Cadastrar médicos e psicólogos"
                icon={<Users className="w-8 h-8" />}
                link="/professionals"
                color="from-purple-500 to-purple-600"
              />
              <ActionCard
                title="Configurações"
                description="Ajustar taxas e etapas"
                icon={<Settings className="w-8 h-8" />}
                link="/configurations"
                color="from-orange-500 to-orange-600"
              />
            </div>
          </div>

          {/* Recent processes */}
          {stats.recentProcesses.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Processos Recentes</h2>
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {stats.recentProcesses.map((process: any, index) => (
                    <li key={index} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <FileText className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {process.client_name || 'Processo sem nome'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {process.city_name} • R$ {parseFloat(process.total_amount || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(process.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatsCard({ title, value, icon, color, link }: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  link: string;
}) {
  return (
    <Link to={link} className="group">
      <div className="bg-white overflow-hidden shadow rounded-lg group-hover:shadow-md transition-shadow">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`${color} text-white p-3 rounded-lg`}>
                {icon}
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
                <dd className="text-2xl font-semibold text-gray-900">{value}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ActionCard({ title, description, icon, link, color }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  color: string;
}) {
  return (
    <Link to={link} className="group">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 group-hover:shadow-md transition-all duration-200 group-hover:-translate-y-1">
        <div className={`w-12 h-12 bg-gradient-to-r ${color} rounded-lg flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-200`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </Link>
  );
}
