import Layout from '@/react-app/components/Layout';
import { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search, Phone, MapPin, Clock, CalendarClock, X, Trash } from 'lucide-react';
import type { Professional, City, ProfessionalType, AttendanceType } from '@/shared/types';
import { PROFESSIONAL_TYPE_LABELS } from '@/shared/types';

const DAYS = [
  { value: 'monday', label: 'Segunda' },
  { value: 'tuesday', label: 'Terça' },
  { value: 'wednesday', label: 'Quarta' },
  { value: 'thursday', label: 'Quinta' },
  { value: 'friday', label: 'Sexta' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

const DAY_LABELS: Record<string, string> = {
  monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta',
  thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo'
};

interface ScheduledChange {
  id: number;
  professional_id: number;
  scheduled_at: string;
  working_days: string | null;
  working_hours: string | null;
  observations: string | null;
  created_at: string;
  applied_at: string | null;
}

export default function Professionals() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  type WorkingHoursMap = Record<string, { start: string; end: string }>;

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
    working_hours: {} as WorkingHoursMap
  });
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  // Schedule modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [schedulingProfessional, setSchedulingProfessional] = useState<Professional | null>(null);
  const [scheduledChanges, setScheduledChanges] = useState<ScheduledChange[]>([]);
  const [scheduleForm, setScheduleForm] = useState({
    scheduled_at: '',
    working_days: [] as string[],
    working_hours: {} as WorkingHoursMap,
    observations: '',
    change_working_days: false,
    change_working_hours: false,
    change_observations: false,
  });
  const [isScheduleLoading, setIsScheduleLoading] = useState(false);

  useEffect(() => {
    fetchProfessionals();
    fetchCities();
    fetchUserData();

    // Verifica agendamentos pendentes a cada 30 segundos
    const interval = setInterval(() => {
      fetchProfessionals();
    }, 30000);

    return () => clearInterval(interval);
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

  const fetchScheduledChanges = async (professionalId: number) => {
    try {
      const response = await fetch(`/api/professionals/${professionalId}/scheduled-changes`, { credentials: 'include' });
      const data = await response.json();
      setScheduledChanges(data);
    } catch (error) {
      console.error('Error fetching scheduled changes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.name.trim()) { alert('Nome é obrigatório'); setIsLoading(false); return; }
      if (!formData.city_id) { alert('Cidade é obrigatória'); setIsLoading(false); return; }

      const method = editingProfessional ? 'PATCH' : 'POST';
      const url = editingProfessional ? `/api/professionals/${editingProfessional.id}` : '/api/professionals';

      const requestData: any = {
        name: formData.name.trim(),
        type: formData.type,
        city_id: parseInt(formData.city_id),
        attendance_type: formData.attendance_type || 'AGENDAMENTO'
      };

      if (formData.phone.trim()) requestData.phone = formData.phone.trim();
      if (formData.email.trim()) requestData.email = formData.email.trim();
      if (formData.address.trim()) requestData.address = formData.address.trim();
      if (formData.observations.trim()) requestData.observations = formData.observations.trim();
      if (formData.working_days.length > 0) requestData.working_days = JSON.stringify(formData.working_days);
      if (Object.keys(formData.working_hours).length > 0) requestData.working_hours = JSON.stringify(formData.working_hours);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        await response.json();
        fetchProfessionals();
        setIsModalOpen(false);
        resetForm();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || `Erro HTTP ${response.status}`);
      }
    } catch (networkError: any) {
      alert(`Erro de conexão: ${networkError instanceof Error ? networkError.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este credenciado?')) return;
    try {
      const response = await fetch(`/api/professionals/${id}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) { fetchProfessionals(); alert('Credenciado excluído com sucesso!'); }
      else alert('Erro ao excluir credenciado. Tente novamente.');
    } catch (error) {
      alert(`Erro ao excluir: ${error instanceof Error ? error.message : 'Erro de conexão'}`);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', type: 'foto', city_id: '', phone: '', email: '', address: '', observations: '', attendance_type: 'AGENDAMENTO', working_days: [], working_hours: {} });
    setEditingProfessional(null);
  };

  const openScheduleModal = (professional: Professional) => {
    setSchedulingProfessional(professional);
    setScheduleForm({ scheduled_at: '', working_days: [], working_hours: {}, observations: '', change_working_days: false, change_working_hours: false, change_observations: false });
    fetchScheduledChanges(professional.id);
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingProfessional) return;
    if (!scheduleForm.scheduled_at) { alert('Informe a data e hora do agendamento'); return; }
    if (!scheduleForm.change_working_days && !scheduleForm.change_working_hours && !scheduleForm.change_observations) {
      alert('Selecione pelo menos um campo para alterar');
      return;
    }
    setIsScheduleLoading(true);
    try {
      // Convert local datetime to UTC ISO string to avoid timezone issues
      const payload: any = { scheduled_at: new Date(scheduleForm.scheduled_at).toISOString() };
      if (scheduleForm.change_working_days) payload.working_days = scheduleForm.working_days.length > 0 ? JSON.stringify(scheduleForm.working_days) : '';
      if (scheduleForm.change_working_hours) payload.working_hours = Object.keys(scheduleForm.working_hours).length > 0 ? JSON.stringify(scheduleForm.working_hours) : '';
      if (scheduleForm.change_observations) payload.observations = scheduleForm.observations;

      const response = await fetch(`/api/professionals/${schedulingProfessional.id}/scheduled-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        alert('Alteração agendada com sucesso!');
        setScheduleForm({ scheduled_at: '', working_days: [], working_hours: {}, observations: '', change_working_days: false, change_working_hours: false, change_observations: false });
        fetchScheduledChanges(schedulingProfessional.id);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'Erro ao agendar alteração');
      }
    } catch (error) {
      alert('Erro de conexão');
    } finally {
      setIsScheduleLoading(false);
    }
  };

  const handleDeleteSchedule = async (changeId: number) => {
    if (!schedulingProfessional) return;
    if (!confirm('Cancelar este agendamento?')) return;
    try {
      const response = await fetch(`/api/professionals/${schedulingProfessional.id}/scheduled-changes/${changeId}`, {
        method: 'DELETE', credentials: 'include'
      });
      if (response.ok) fetchScheduledChanges(schedulingProfessional.id);
      else alert('Erro ao cancelar agendamento');
    } catch {
      alert('Erro de conexão');
    }
  };

  const formatScheduledAt = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch { return dateStr; }
  };

  const filteredProfessionals = professionals.filter(p => {
    return p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (typeFilter === 'all' || p.type === typeFilter) &&
      (cityFilter === 'all' || p.city_id.toString() === cityFilter);
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
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">Todos os tipos</option>
              {Object.entries(PROFESSIONAL_TYPE_LABELS)
                .filter(([value]) => !['curso_teorico', 'prova_teorica', 'curso_pratico', 'prova_pratica'].includes(value))
                .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">Todas as cidades</option>
              {cities.map(city => <option key={city.id} value={city.id.toString()}>{city.name}</option>)}
            </select>
          </div>

          {/* Professionals List */}
          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="min-w-full">
              {filteredProfessionals.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">{searchTerm || typeFilter !== 'all' || cityFilter !== 'all' ? 'Nenhum credenciado encontrado' : 'Nenhum credenciado cadastrado'}</p>
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
                            {professional.email && <div className="col-span-2"><strong>Email:</strong> {professional.email}</div>}
                            {professional.address && <div className="col-span-2"><strong>Endereço:</strong> {professional.address}</div>}
                            {professional.attendance_type && <div className="col-span-2"><strong>Atendimento:</strong> {professional.attendance_type}</div>}
                            {(professional.working_days || professional.working_hours) && (
                              <div className="col-span-2">
                                <strong>Dias de Funcionamento e Horários:</strong>{' '}
                                {(() => {
                                  const DAY_ORDER_LIST = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
                                  const abbr: Record<string,string> = { monday:'Seg', tuesday:'Ter', wednesday:'Qua', thursday:'Qui', friday:'Sex', saturday:'Sáb', sunday:'Dom' };
                                  try {
                                    if (professional.working_hours) {
                                      const h = JSON.parse(professional.working_hours);
                                      if (typeof h === 'object' && !Array.isArray(h)) {
                                        const days = professional.working_days
                                          ? JSON.parse(professional.working_days).filter((d: string) => h[d])
                                          : DAY_ORDER_LIST.filter(d => h[d]);
                                        return days.map((d: string) => `${abbr[d] || d}: ${h[d].start} - ${h[d].end}`).join(' | ');
                                      }
                                      return professional.working_hours;
                                    }
                                    if (professional.working_days) {
                                      return JSON.parse(professional.working_days).map((d: string) => DAY_LABELS[d] || d).join(', ');
                                    }
                                  } catch { return professional.working_days || professional.working_hours || ''; }
                                })()}
                              </div>
                            )}
                            {professional.observations && <div className="col-span-2"><strong>Observações:</strong> {professional.observations}</div>}
                          </div>
                        </div>
                        {(userRole === 'administrator' || userRole === 'supervisor') && (
                          <div className="flex space-x-1 ml-4">
                            <button
                              title="Agendar alteração"
                              onClick={() => openScheduleModal(professional)}
                              className="p-2 text-gray-400 hover:text-purple-600"
                            >
                              <CalendarClock className="w-4 h-4" />
                            </button>
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
                                  working_days: (() => { try { return professional.working_days ? JSON.parse(professional.working_days) : []; } catch { return []; } })(),
                                  working_hours: (() => { try { if (!professional.working_hours) return {}; const p = JSON.parse(professional.working_hours); return (typeof p === 'object' && !Array.isArray(p)) ? p : {}; } catch { return {}; } })()
                                });
                                setIsModalOpen(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {userRole === 'administrator' && (
                              <button onClick={() => handleDelete(professional.id)} className="p-2 text-gray-400 hover:text-red-600">
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

      {/* Edit/Create Modal */}
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
                  <input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
                  <select value={formData.type} onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as ProfessionalType }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                    {Object.entries(PROFESSIONAL_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cidade *</label>
                  <select value={formData.city_id} onChange={(e) => setFormData(prev => ({ ...prev, city_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                    <option value="">Selecione uma cidade</option>
                    {cities.map(city => <option key={city.id} value={city.id.toString()}>{city.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Atendimento</label>
                  <select value={formData.attendance_type} onChange={(e) => setFormData(prev => ({ ...prev, attendance_type: e.target.value as AttendanceType }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="AGENDAMENTO">AGENDAMENTO</option>
                    <option value="POR ORDEM DE CHEGADA">POR ORDEM DE CHEGADA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="(47) 99999-9999" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="exemplo@email.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dias de Funcionamento e Horários</label>
                <div className="space-y-2">
                  {DAYS.map(day => (
                    <div key={day.value} className="flex items-center gap-3 flex-wrap">
                      <label className="flex items-center space-x-2 w-24 shrink-0">
                        <input
                          type="checkbox"
                          checked={formData.working_days.includes(day.value)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData(prev => ({
                              ...prev,
                              working_days: checked ? [...prev.working_days, day.value] : prev.working_days.filter(d => d !== day.value),
                              working_hours: checked
                                ? { ...prev.working_hours, [day.value]: { start: '', end: '' } }
                                : Object.fromEntries(Object.entries(prev.working_hours).filter(([k]) => k !== day.value))
                            }));
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{day.label}</span>
                      </label>
                      {formData.working_days.includes(day.value) && (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={formData.working_hours[day.value]?.start || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, working_hours: { ...prev.working_hours, [day.value]: { ...prev.working_hours[day.value], start: e.target.value } } }))}
                            className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-gray-500 text-sm">às</span>
                          <input
                            type="time"
                            value={formData.working_hours[day.value]?.end || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, working_hours: { ...prev.working_hours, [day.value]: { ...prev.working_hours[day.value], end: e.target.value } } }))}
                            className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                <textarea value={formData.observations} onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} placeholder="Ex: Outras observações importantes" />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{isLoading ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {isScheduleModalOpen && schedulingProfessional && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center space-x-2">
                <CalendarClock className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">Agendar Alteração</h2>
              </div>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Credenciado: <strong>{schedulingProfessional.name}</strong>
              </p>

              {/* New schedule form */}
              <form onSubmit={handleScheduleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data e hora para aplicar a alteração *
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.scheduled_at}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <p className="text-xs text-gray-500">Marque os campos que deseja alterar:</p>

                {/* Working Hours */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <label className="flex items-center space-x-2 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleForm.change_working_hours}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, change_working_hours: e.target.checked }))}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Alterar Horário de Funcionamento</span>
                  </label>
                  {scheduleForm.change_working_hours && (
                    <div className="space-y-2 ml-6 mt-2">
                      {DAYS.map(day => {
                        const hrs = scheduleForm.working_hours[day.value];
                        return (
                          <div key={day.value} className="flex items-center gap-3 flex-wrap">
                            <label className="flex items-center space-x-2 w-24 shrink-0">
                              <input
                                type="checkbox"
                                checked={!!hrs}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setScheduleForm(prev => ({
                                    ...prev,
                                    working_hours: checked
                                      ? { ...prev.working_hours, [day.value]: { start: '', end: '' } }
                                      : Object.fromEntries(Object.entries(prev.working_hours).filter(([k]) => k !== day.value))
                                  }));
                                }}
                                className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">{day.label}</span>
                            </label>
                            {hrs && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={hrs.start || ''}
                                  onChange={(e) => setScheduleForm(prev => ({ ...prev, working_hours: { ...prev.working_hours, [day.value]: { ...prev.working_hours[day.value], start: e.target.value } } }))}
                                  className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                                />
                                <span className="text-gray-500 text-sm">às</span>
                                <input
                                  type="time"
                                  value={hrs.end || ''}
                                  onChange={(e) => setScheduleForm(prev => ({ ...prev, working_hours: { ...prev.working_hours, [day.value]: { ...prev.working_hours[day.value], end: e.target.value } } }))}
                                  className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Observations */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <label className="flex items-center space-x-2 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleForm.change_observations}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, change_observations: e.target.checked }))}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Alterar Observações</span>
                  </label>
                  {scheduleForm.change_observations && (
                    <textarea
                      value={scheduleForm.observations}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, observations: e.target.value }))}
                      placeholder="Novo texto de observações"
                      className="w-full ml-6 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                      style={{ width: 'calc(100% - 1.5rem)' }}
                      rows={2}
                    />
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isScheduleLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Clock className="w-4 h-4" />
                    <span>{isScheduleLoading ? 'Agendando...' : 'Agendar Alteração'}</span>
                  </button>
                </div>
              </form>

              {/* Pending schedules list */}
              {scheduledChanges.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span>Agendamentos Pendentes ({scheduledChanges.filter(c => !c.applied_at).length})</span>
                  </h3>
                  <div className="space-y-2">
                    {scheduledChanges.map(change => (
                      <div key={change.id} className={`border rounded-lg p-3 text-sm ${change.applied_at ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatScheduledAt(change.scheduled_at)}</span>
                              {change.applied_at && <span className="text-green-600 text-xs ml-2">(Aplicado)</span>}
                            </div>
                            <div className="mt-1 text-gray-600 space-y-0.5">
                              {change.working_days !== null && (
                                <div><strong>Dias:</strong> {(() => { try { const d = JSON.parse(change.working_days || '[]'); return d.length > 0 ? d.map((x: string) => DAY_LABELS[x] || x).join(', ') : '(limpar dias)'; } catch { return change.working_days || '(limpar dias)'; } })()}</div>
                              )}
                              {change.working_hours !== null && (
                                <div><strong>Horário:</strong> {change.working_hours || '(limpar horário)'}</div>
                              )}
                              {change.observations !== null && (
                                <div><strong>Obs.:</strong> {change.observations || '(limpar observações)'}</div>
                              )}
                            </div>
                          </div>
                          {!change.applied_at && (
                            <button onClick={() => handleDeleteSchedule(change.id)} className="ml-2 p-1 text-gray-400 hover:text-red-600" title="Cancelar agendamento">
                              <Trash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
