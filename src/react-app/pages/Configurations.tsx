import Layout from '@/react-app/components/Layout';
import { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash2, DollarSign, List, FileText, Upload, Users, Building2, Save, AlertTriangle } from 'lucide-react';
import type { ProcessStep, Fee, ProfessionalType } from '@/shared/types';
import { PROFESSIONAL_TYPE_LABELS } from '@/shared/types';
import RichTextEditor from '@/react-app/components/RichTextEditor';
import UserManagement from '@/react-app/components/UserManagement';

type TabType = 'steps' | 'fees' | 'users' | 'instructions' | 'agency' | 'processes';

export default function Configurations() {
  const [activeTab, setActiveTab] = useState<TabType>('steps');
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);


  useEffect(() => {
    fetchProcessSteps();
    fetchFees();
  }, []);

  const fetchProcessSteps = async () => {
    try {
      const response = await fetch('/api/process-steps?active_only=true', { credentials: 'include' });
      const data = await response.json();
      setProcessSteps(data);
    } catch (error) {
      console.error('Error fetching process steps:', error);
    }
  };

  const fetchFees = async () => {
    try {
      const response = await fetch('/api/fees', { credentials: 'include' });
      const data = await response.json();
      setFees(data);
    } catch (error) {
      console.error('Error fetching fees:', error);
    }
  };

  const tabs = [
    { id: 'steps', name: 'Etapas', icon: List },
    { id: 'fees', name: 'Taxas', icon: DollarSign },
    { id: 'instructions', name: 'Instruções', icon: FileText },
    { id: 'users', name: 'Usuários', icon: Users },
    { id: 'agency', name: 'Dados da Agência', icon: Building2 },
    { id: 'processes', name: 'Processos', icon: Trash2 },
  ];

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-2 rounded-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Configurações do Sistema</h1>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6 overflow-x-auto">
            <nav className="-mb-px flex space-x-8 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'steps' && <StepsConfiguration steps={processSteps} onUpdate={fetchProcessSteps} />}
          {activeTab === 'fees' && <FeesConfiguration fees={fees} onUpdate={fetchFees} />}
          {activeTab === 'instructions' && <InstructionsConfiguration />}
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'agency' && <AgencyDataConfiguration />}
          {activeTab === 'processes' && <ProcessesManagement />}
        </div>
      </div>
    </Layout>
  );
}

function StepsConfiguration({ steps, onUpdate }: { steps: ProcessStep[], onUpdate: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleStepToggle = async (stepId: number, checked: boolean) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/process-steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: checked })
      });

      if (response.ok) {
        onUpdate();
      } else {
        alert('Erro ao atualizar etapa');
      }
    } catch (error) {
      console.error('Error updating step:', error);
      alert('Erro ao atualizar etapa');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderChange = async (stepId: number, direction: 'up' | 'down') => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/process-steps/${stepId}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ direction })
      });

      if (response.ok) {
        onUpdate();
      } else {
        alert('Erro ao reordenar etapa');
      }
    } catch (error) {
      console.error('Error reordering step:', error);
      alert('Erro ao reordenar etapa');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Etapas do Processo</h2>
        <p className="text-sm text-gray-600">Configure as etapas disponíveis e sua ordem de exibição nos processos de habilitação</p>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex flex-col items-center space-y-1">
                  <button 
                    onClick={() => handleOrderChange(step.id, 'up')}
                    disabled={index === 0 || isLoading}
                    className="text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <span className="text-sm font-medium text-gray-700 min-w-[24px] text-center">#{step.sort_order}</span>
                  <button 
                    onClick={() => handleOrderChange(step.id, 'down')}
                    disabled={index === steps.length - 1 || isLoading}
                    className="text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{step.name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Tipo: {step.type}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      step.is_required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {step.is_required ? 'Obrigatória' : 'Opcional'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={step.is_active} 
                    onChange={(e) => handleStepToggle(step.id, e.target.checked)}
                    disabled={isLoading}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          ))}
        </div>
        {isLoading && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center space-x-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
              <span>Atualizando...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeesConfiguration({ fees, onUpdate }: { fees: Fee[], onUpdate: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [formData, setFormData] = useState({ name: '', amount: '', linked_professional_type: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const url = editingFee ? `/api/fees/${editingFee.id}` : '/api/fees';
      const method = editingFee ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          amount: parseFloat(formData.amount),
          linked_professional_type: formData.linked_professional_type || null
        })
      });

      if (response.ok) {
        setIsModalOpen(false);
        setFormData({ name: '', amount: '', linked_professional_type: '' });
        setEditingFee(null);
        onUpdate();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao salvar taxa');
      }
    } catch (error) {
      console.error('Error saving fee:', error);
      alert('Erro ao salvar taxa');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeeToggle = async (feeId: number, checked: boolean) => {
    try {
      const response = await fetch(`/api/fees/${feeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: checked })
      });

      if (response.ok) {
        onUpdate();
      } else {
        alert('Erro ao atualizar taxa');
      }
    } catch (error) {
      console.error('Error updating fee:', error);
      alert('Erro ao atualizar taxa');
    }
  };

  const handleDeleteFee = async (feeId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta taxa?')) return;

    try {
      const response = await fetch(`/api/fees/${feeId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        onUpdate();
      } else {
        alert('Erro ao excluir taxa');
      }
    } catch (error) {
      console.error('Error deleting fee:', error);
      alert('Erro ao excluir taxa');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Taxas</h2>
            <p className="text-sm text-gray-600">Configure as taxas disponíveis para os processos</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Taxa</span>
          </button>
        </div>
        <div className="p-6">
          {fees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhuma taxa cadastrada ainda</p>
              <p className="text-sm mt-1">Clique em "Nova Taxa" para adicionar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fees.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{fee.name}</h3>
                    <p className="text-lg font-semibold text-green-600">R$ {parseFloat(fee.amount).toFixed(2)}</p>
                    {fee.linked_professional_type && (
                      <div className="mt-1">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Vinculada: {PROFESSIONAL_TYPE_LABELS[fee.linked_professional_type as ProfessionalType]}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {fee.name !== 'Emissão da CNH' && fee.name !== 'Transferência' && (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={fee.is_active} 
                          onChange={(e) => handleFeeToggle(fee.id, e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    )}
                    <button 
                      onClick={() => {
                        setEditingFee(fee);
                        setFormData({ name: fee.name, amount: fee.amount, linked_professional_type: fee.linked_professional_type || '' });
                        setIsModalOpen(true);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {fee.name !== 'Emissão da CNH' && fee.name !== 'Transferência' && (
                      <button 
                        onClick={() => handleDeleteFee(fee.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingFee ? 'Editar Taxa' : 'Nova Taxa'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Taxa</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!!(editingFee && (editingFee.name === 'Emissão da CNH' || editingFee.name === 'Transferência'))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                />
                {editingFee && (editingFee.name === 'Emissão da CNH' || editingFee.name === 'Transferência') && (
                  <p className="text-xs text-gray-500 mt-1">O nome desta taxa não pode ser alterado</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vincular ao Tipo de Credenciado (opcional)</label>
                <select
                  value={formData.linked_professional_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, linked_professional_type: e.target.value }))}
                  disabled={!!(editingFee && (editingFee.name === 'Emissão da CNH' || editingFee.name === 'Transferência'))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Nenhum vínculo</option>
                  {Object.entries(PROFESSIONAL_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {editingFee && (editingFee.name === 'Emissão da CNH' || editingFee.name === 'Transferência') ? (
                  <p className="text-xs text-gray-500 mt-1">O vínculo desta taxa não pode ser alterado</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    Taxa só aparecerá no processo se houver credenciado deste tipo selecionado
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingFee(null);
                    setFormData({ name: '', amount: '', linked_professional_type: '' });
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>{isLoading ? 'Salvando...' : 'Salvar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InstructionsConfiguration() {
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchInstructions();
  }, []);

  const fetchInstructions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/instructions', { credentials: 'include' });
      const data = await response.json();
      setGeneralInstructions(data.general_instructions || '');
    } catch (error) {
      console.error('Error fetching instructions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          general_instructions: generalInstructions,
          required_documents: '' // Keep empty to maintain API compatibility
        })
      });

      if (response.ok) {
        alert('Instruções salvas com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao salvar instruções');
      }
    } catch (error) {
      console.error('Error saving instructions:', error);
      alert('Erro ao salvar instruções');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Instruções</h2>
        </div>
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Instruções</h2>
        <p className="text-sm text-gray-600">Configure instruções e orientações para os processos</p>
      </div>
      <div className="p-6">
        <div className="space-y-6">
          <div>
            <RichTextEditor
              value={generalInstructions}
              onChange={setGeneralInstructions}
              placeholder="Digite as instruções gerais para os processos de habilitação..."
              height={400}
            />
          </div>
          <div className="flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{isSaving ? 'Salvando...' : 'Salvar Instruções'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



function ProcessesManagement() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [processCount, setProcessCount] = useState(0);

  useEffect(() => {
    fetchProcessCount();
  }, []);

  const fetchProcessCount = async () => {
    try {
      const response = await fetch('/api/step-processes', { credentials: 'include' });
      const data = await response.json();
      setProcessCount(data.length);
    } catch (error) {
      console.error('Error fetching process count:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Tem certeza que deseja EXCLUIR TODOS os ${processCount} passo a passos criados? Esta ação não pode ser desfeita!`)) {
      return;
    }

    if (!confirm('ATENÇÃO: Esta ação é irreversível! Confirma a exclusão de TODOS os processos?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/step-processes/delete-all', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        alert('Todos os processos foram excluídos com sucesso!');
        fetchProcessCount();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao excluir processos');
      }
    } catch (error) {
      console.error('Error deleting processes:', error);
      alert('Erro ao excluir processos');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Gerenciar Processos</h2>
        <p className="text-sm text-gray-600">Exclusão em massa de todos os passo a passos criados</p>
      </div>
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Zona de Perigo</h3>
              <p className="text-sm text-red-700 mb-4">
                Esta ação irá excluir permanentemente TODOS os passo a passos criados na sua agência. 
                Esta operação não pode ser desfeita.
              </p>
              
              <div className="bg-white rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total de processos criados:</p>
                    <p className="text-2xl font-bold text-gray-900">{processCount}</p>
                  </div>
                  <FileText className="w-12 h-12 text-gray-400" />
                </div>
              </div>

              <button
                onClick={handleDeleteAll}
                disabled={isDeleting || processCount === 0}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold"
              >
                {isDeleting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <Trash2 className="w-5 h-5" />
                <span>{isDeleting ? 'Excluindo...' : 'Excluir Todos os Processos'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgencyDataConfiguration() {
  const [agencyData, setAgencyData] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'SC'
  });
  const [hasLogo, setHasLogo] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchAgencyData();
    checkLogo();
  }, []);

  const fetchAgencyData = async () => {
    try {
      const response = await fetch('/api/agencies/info', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAgencyData(data);
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || 'SC'
        });
      }
    } catch (error) {
      console.error('Error fetching agency data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkLogo = async () => {
    try {
      const response = await fetch('/api/agencies/logo', { credentials: 'include' });
      const data = await response.json();
      
      if (data.has_logo) {
        setHasLogo(true);
        setPreviewUrl(`/api/files/${encodeURIComponent(data.logo_key)}`);
      }
    } catch (error) {
      console.error('Error checking logo:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/agencies/info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedData = await response.json();
        setAgencyData(updatedData);
        setIsEditing(false);
        alert('Dados da agência atualizados com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao atualizar dados da agência');
      }
    } catch (error) {
      console.error('Error updating agency data:', error);
      alert('Erro ao atualizar dados da agência');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: agencyData?.name || '',
      email: agencyData?.email || '',
      phone: agencyData?.phone || '',
      address: agencyData?.address || '',
      city: agencyData?.city || '',
      state: agencyData?.state || 'SC'
    });
    setIsEditing(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Apenas arquivos de imagem são permitidos');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/agencies/logo', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setHasLogo(true);
        setPreviewUrl(`/api/files/${encodeURIComponent(data.logo_key)}`);
        alert('Logo atualizada com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao fazer upload da logo');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Erro ao fazer upload da logo');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Dados da Agência</h2>
        </div>
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agency Data */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Informações da Agência</h2>
            <p className="text-sm text-gray-600">Configure os dados principais da sua agência</p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Editar</span>
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
              </button>
            </div>
          )}
        </div>
        <div className="p-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Agência *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Nome da Agência:</span>
                  <p className="text-gray-900">{agencyData?.name || 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Email:</span>
                  <p className="text-gray-900">{agencyData?.email || 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Telefone:</span>
                  <p className="text-gray-900">{agencyData?.phone || 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Cidade/Estado:</span>
                  <p className="text-gray-900">
                    {agencyData?.city ? `${agencyData.city}, ${agencyData.state || 'SC'}` : 'Não informado'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Data de Cadastro:</span>
                  <p className="text-gray-900">
                    {agencyData?.created_at ? new Date(agencyData.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Não informado'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    agencyData?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {agencyData?.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
              {agencyData?.address && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Endereço:</span>
                  <p className="text-gray-900">{agencyData.address}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Logo Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Logo da Agência</h2>
          <p className="text-sm text-gray-600">Configure a logo que aparecerá na impressão dos processos</p>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {hasLogo && previewUrl && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Logo Atual</h3>
                <div className="max-w-xs">
                  <img 
                    src={previewUrl} 
                    alt="Logo da agência" 
                    className="max-w-full h-auto border border-gray-200 rounded-lg"
                    style={{ maxHeight: '200px' }}
                  />
                </div>
              </div>
            )}

            <div>
              <h3 className="font-medium text-gray-900 mb-3">
                {hasLogo ? 'Alterar Logo' : 'Adicionar Logo'}
              </h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <label htmlFor="logo-upload" className="cursor-pointer">
                      <span className="text-orange-600 hover:text-orange-700 font-medium">
                        Clique para selecionar uma imagem
                      </span>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-sm text-gray-500">
                    PNG, JPG até 5MB. Recomendado: 200x80px
                  </p>
                  {isUploading && (
                    <div className="text-sm text-orange-600">
                      Fazendo upload...
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Dicas para a Logo</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use uma imagem com fundo transparente (PNG) para melhor resultado</li>
                <li>• Mantenha uma proporção horizontal (largura maior que altura)</li>
                <li>• A logo aparecerá no cabeçalho dos documentos impressos</li>
                <li>• Teste a impressão para verificar a qualidade</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
