import Layout from '@/react-app/components/Layout';
import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search, Phone, MapPin } from 'lucide-react';
import type { Professional, City, ProfessionalType, AttendanceType } from '@/shared/types';
import { PROFESSIONAL_TYPE_LABELS } from '@/shared/types';

export default function Professionals() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'foto' as ProfessionalType,
    city_id: '',
    phone: '',
    email: '',
    address: '',
    observations: '',
    attendance_type: 'AGENDAMENTO' as AttendanceType,
    working_days: [] as string[],
    working_hours: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    fetchProfessionals();
    fetchCities();
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await response.json();
      setUserRole(data.role);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchProfessionals = async () => {
    try {
      const response = await fetch('/api/professionals', { credentials: 'include' });
      const data = await response.json();
      setProfessionals(data);
    } catch (error) {
      console.error('Error fetching professionals:', error);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await fetch('/api/cities', { credentials: 'include' });
      const data = await response.json();
      setCities(data);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validação básica
      if (!formData.name.trim()) {
        alert('Nome é obrigatório');
        setIsLoading(false);
        return;
      }

      if (!formData.city_id) {
        alert('Cidade é obrigatória');
        setIsLoading(false);
        return;
      }

      const method = editingProfessional ? 'PATCH' : 'POST';
      const url = editingProfessional ? `/api/professionals/${editingProfessional.id}` : '/api/professionals';
      
      const requestData: any = {
        name: formData.name.trim(),
        type: formData.type,
        city_id: parseInt(formData.city_id),
        attendance_type: formData.attendance_type || 'AGENDAMENTO'
      };

      // Only include optional fields if they have values
      const trimmedPhone = formData.phone.trim();
      if (trimmedPhone) {
        requestData.phone = trimmedPhone;
      }

      const trimmedEmail = formData.email.trim();
      if (trimmedEmail) {
        requestData.email = trimmedEmail;
      }

      const trimmedAddress = formData.address.trim();
      if (trimmedAddress) {
        requestData.address = trimmedAddress;
      }

      const trimmedObservations = formData.observations.trim();
      if (trimmedObservations) {
        requestData.observations = trimmedObservations;
      }

      if (formData.working_days.length > 0) {
        requestData.working_days = JSON.stringify(formData.working_days);
      }

      const trimmedWorkingHours = formData.working_hours.trim();
      if (trimmedWorkingHours) {
        requestData.working_hours = trimmedWorkingHours;
      }

      console.log('=== DEBUGGING PROFESSIONAL CREATION ===');
      console.log('Request URL:', url);
      console.log('Request method:', method);
      console.log('Request data:', requestData);
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      // Primeiro tentar ler como texto para debug
      const responseText = await response.text();
      console.log('Raw response text:', responseText);

      if (response.ok) {
        try {
          const result = JSON.parse(responseText);
          console.log('Parsed success result:', result);
          fetchProfessionals();
          setIsModalOpen(false);
          resetForm();
        } catch (parseError) {
          console.error('Failed to parse success response:', parseError);
          alert('Credenciado salvo, mas erro ao processar resposta');
          fetchProfessionals();
          setIsModalOpen(false);
          resetForm();
        }
      } else {
        let errorMessage = 'Erro ao salvar credenciado';
        
        try {
          const errorData = JSON.parse(responseText);
          console.error('Parsed error response:', errorData);
          
          if (errorData && typeof errorData === 'object') {
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else if (typeof errorData.message === 'string') {
              errorMessage = errorData.message;
            } else {
              errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
            }
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `Erro HTTP ${response.status}: ${response.statusText || 'Erro desconhecido'}`;
        }
        
        console.error('Final error message:', errorMessage);
        alert(errorMessage);
      }
    } catch (networkError: any) {
      console.error('=== NETWORK ERROR ===');
      console.error('Network error details:', {
        name: networkError?.name,
        message: networkError?.message,
        stack: networkError?.stack,
        toString: networkError?.toString?.()
      });
      
      let errorMessage = 'Erro de conexão com o servidor';
      
      if (networkError instanceof Error) {
        errorMessage = `Erro de rede: ${networkError.message}`;
      } else if (typeof networkError === 'string') {
        errorMessage = `Erro: ${networkError}`;
      } else {
        errorMessage = 'Erro de conexão desconhecido';
      }
      
      console.error('Final network error message:', errorMessage);
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este credenciado?')) return;

    try {
      const response = await fetch(`/api/professionals/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (response.ok) {
        fetchProfessionals();
        alert('Credenciado excluído com sucesso!');
      } else {
        const errorData = await response.text();
        console.error('Delete error:', errorData);
        alert('Erro ao excluir credenciado. Tente novamente.');
      }
    } catch (error) {
      console.error('Error deleting professional:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro de conexão';
      alert(`Erro ao excluir credenciado: ${errorMessage}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'foto',
      city_id: '',
      phone: '',
      email: '',
      address: '',
      observations: '',
      attendance_type: 'AGENDAMENTO',
      working_days: [],
      working_hours: ''
    });
    setEditingProfessional(null);
  };

  const filteredProfessionals = professionals.filter(professional => {
    const matchesSearch = professional.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || professional.type === typeFilter;
    const matchesCity = cityFilter === 'all' || professional.city_id.toString() === cityFilter;
    return matchesSearch && matchesType && matchesCity;
  });

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Credenciados</h1>
            {(userRole === 'administrator' || userRole === 'supervisor') && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Credenciado</span>
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar credenciado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os tipos</option>
              {Object.entries(PROFESSIONAL_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas as cidades</option>
              {cities.map(city => (
                <option key={city.id} value={city.id.toString()}>{city.name}</option>
              ))}
            </select>
          </div>

          {/* Professionals List */}
          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="min-w-full">
              {filteredProfessionals.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm || typeFilter !== 'all' || cityFilter !== 'all' 
                      ? 'Nenhum credenciado encontrado' 
                      : 'Nenhum credenciado cadastrado'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 p-6">
                  {filteredProfessionals.map((professional: any) => (
                    <div key={professional.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="bg-blue-100 p-2 rounded-lg">
                              <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{professional.name}</h3>
                              <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                {PROFESSIONAL_TYPE_LABELS[professional.type as ProfessionalType]}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4" />
                              <span>{professional.city_name}</span>
                            </div>
                            {professional.phone && (
                              <div className="flex items-center space-x-2">
                                <Phone className="w-4 h-4" />
                                <span>{professional.phone}</span>
                              </div>
                            )}
                            {professional.email && (
                              <div className="col-span-2">
                                <strong>Email:</strong> {professional.email}
                              </div>
                            )}
                            {professional.address && (
                              <div className="col-span-2">
                                <strong>Endereço:</strong> {professional.address}
                              </div>
                            )}
                            {professional.observations && (
                              <div className="col-span-2">
                                <strong>Observações:</strong> {professional.observations}
                              </div>
                            )}
                            {professional.attendance_type && (
                              <div className="col-span-2">
                                <strong>Atendimento:</strong> {professional.attendance_type}
                              </div>
                            )}
                            {professional.working_days && (
                              <div className="col-span-2">
                                <strong>Dias de Funcionamento:</strong> {(() => {
                                  try {
                                    const days = JSON.parse(professional.working_days);
                                    const dayLabels: Record<string, string> = {
                                      'monday': 'Segunda',
                                      'tuesday': 'Terça',
                                      'wednesday': 'Quarta',
                                      'thursday': 'Quinta',
                                      'friday': 'Sexta',
                                      'saturday': 'Sábado',
                                      'sunday': 'Domingo'
                                    };
                                    return days.map((day: string) => dayLabels[day] || day).join(', ');
                                  } catch {
                                    return professional.working_days;
                                  }
                                })()}
                              </div>
                            )}
                            {professional.working_hours && (
                              <div className="col-span-2">
                                <strong>Horário de Funcionamento:</strong> {professional.working_hours}
                              </div>
                            )}
                          </div>
                        </div>
                        {(userRole === 'administrator' || userRole === 'supervisor') && (
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => {
                                setEditingProfessional(professional);
                                setFormData({
                                  name: professional.name,
                                  type: professional.type,
                                  city_id: professional.city_id.toString(),
                                  phone: professional.phone || '',
                                  email: professional.email || '',
                                  address: professional.address || '',
                                  observations: professional.observations || '',
                                  attendance_type: professional.attendance_type || 'AGENDAMENTO',
                                  working_days: (() => {
                                    try {
                                      return professional.working_days ? JSON.parse(professional.working_days) : [];
                                    } catch {
                                      return [];
                                    }
                                  })(),
                                  working_hours: professional.working_hours || ''
                                });
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {userRole === 'administrator' && (
                              <button
                                onClick={() => handleDelete(professional.id)}
                                className="p-2 text-gray-400 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingProfessional ? 'Editar Credenciado' : 'Novo Credenciado'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as ProfessionalType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {Object.entries(PROFESSIONAL_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cidade *</label>
                  <select
                    value={formData.city_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, city_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione uma cidade</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id.toString()}>{city.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Atendimento</label>
                  <select
                    value={formData.attendance_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, attendance_type: e.target.value as AttendanceType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="AGENDAMENTO">AGENDAMENTO</option>
                    <option value="POR ORDEM DE CHEGADA">POR ORDEM DE CHEGADA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(47) 99999-9999"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="exemplo@email.com"
                  />
                </div>
              </div>
              
              {/* Endereço - spans full width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                />
              </div>
              
              {/* Working Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dias de Funcionamento</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { value: 'monday', label: 'Segunda' },
                    { value: 'tuesday', label: 'Terça' },
                    { value: 'wednesday', label: 'Quarta' },
                    { value: 'thursday', label: 'Quinta' },
                    { value: 'friday', label: 'Sexta' },
                    { value: 'saturday', label: 'Sábado' },
                    { value: 'sunday', label: 'Domingo' }
                  ].map(day => (
                    <label key={day.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.working_days.includes(day.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              working_days: [...prev.working_days, day.value]
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              working_days: prev.working_days.filter(d => d !== day.value)
                            }));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Working Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Horário de Funcionamento</label>
                <input
                  type="text"
                  value={formData.working_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, working_hours: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 08:00 às 18:00 ou 08:00-12:00 / 14:00-18:00"
                />
              </div>

              {/* Observações - moved to last and spans full width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                <textarea
                  value={formData.observations}
                  onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Ex: Outras observações importantes"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
