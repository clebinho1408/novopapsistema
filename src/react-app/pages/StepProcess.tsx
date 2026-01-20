import Layout from '@/react-app/components/Layout';
import PrintableStepProcess from '@/react-app/components/PrintableStepProcess';
import { useState, useEffect } from 'react';
import { FileText, MapPin, DollarSign, CheckCircle, Eye, AlertTriangle } from 'lucide-react';
import type { City, ProcessStep, Fee, Professional } from '@/shared/types';

export default function StepProcess() {
  const [currentStep, setCurrentStep] = useState(1);
  const [cities, setCities] = useState<City[]>([]);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [currentPrintData, setCurrentPrintData] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    professional: Professional | null;
    stepName: string;
    stepId: number;
    professionalId: number;
  }>({
    isOpen: false,
    professional: null,
    stepName: '',
    stepId: 0,
    professionalId: 0
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [instructions, setInstructions] = useState<{ general_instructions?: string; required_documents?: string }>({});
  const [formData, setFormData] = useState({
    city_id: '',
    client_name: '',
    selected_steps: [] as number[],
    selected_professionals: {} as Record<string, number>,
    selected_fees: [] as number[],
    show_toxicologico_message: false
  });

  useEffect(() => {
    fetchData();
    fetchProcesses();
  }, []);

  useEffect(() => {
    if (fees.length === 0 || processSteps.length === 0 || !formData.client_name) return;
    
    const emissaoCNHFee = fees.find(f => f.name === 'Emissão da CNH');
    const transferenciaFee = fees.find(f => f.name === 'Transferência');
    const segundaViaFee = fees.find(f => f.name === '2º Via');
    
    const fotoStep = processSteps.find(step => step.type === 'foto');
    const taxaStep = processSteps.find(step => step.type === 'taxa');
    const psicologicoStep = processSteps.find(step => step.type === 'psicologo');
    const medicoStep = processSteps.find(step => step.type === 'medico');
    
    if (!emissaoCNHFee || !transferenciaFee) return;
    
    setFormData(prev => {
      const serviceName = prev.client_name;
      let newSelectedFees: number[] = [];
      let newSelectedSteps: number[] = [];
      
      // Definir regras de auto-seleção para cada serviço
      const serviceRules: Record<string, { steps: string[], fees: string[] }> = {
        '1º Habilitação': {
          steps: ['foto', 'taxa', 'psicologo', 'medico', 'prova'],
          fees: ['Emissão da CNH', 'Prova']
        },
        'Alteração de Dados': {
          steps: ['foto', 'taxa'],
          fees: ['Emissão da CNH']
        },
        'Alteração de Dados + EAR': {
          steps: ['foto', 'taxa', 'psicologo'],
          fees: ['Emissão da CNH']
        },
        'Renovação': {
          steps: ['foto', 'taxa', 'medico'],
          fees: ['Emissão da CNH']
        },
        'Renovação + EAR': {
          steps: ['foto', 'taxa', 'psicologo', 'medico'],
          fees: ['Emissão da CNH']
        },
        'Transferência + Renovação': {
          steps: ['foto', 'taxa', 'medico'],
          fees: ['Emissão da CNH', 'Transferência']
        },
        'Transferência + Renovação + EAR': {
          steps: ['foto', 'taxa', 'psicologo', 'medico'],
          fees: ['Emissão da CNH', 'Transferência']
        },
        'Transferência + Alteração de Dados': {
          steps: ['foto', 'taxa'],
          fees: ['Emissão da CNH', 'Transferência']
        },
        'Transferência + Alteração de Dados + EAR': {
          steps: ['foto', 'taxa', 'psicologo'],
          fees: ['Emissão da CNH', 'Transferência']
        },
        'Transferência + Definitiva': {
          steps: ['foto', 'taxa'],
          fees: ['Emissão da CNH', 'Transferência']
        }
      };
      
      const rule = serviceRules[serviceName];
      
      if (rule) {
        // Auto-selecionar etapas baseado na regra
        if (rule.steps.includes('foto') && fotoStep) {
          newSelectedSteps.push(fotoStep.id);
        }
        if (rule.steps.includes('taxa') && taxaStep) {
          newSelectedSteps.push(taxaStep.id);
        }
        if (rule.steps.includes('psicologo') && psicologicoStep) {
          newSelectedSteps.push(psicologicoStep.id);
        }
        if (rule.steps.includes('medico') && medicoStep) {
          newSelectedSteps.push(medicoStep.id);
        }
        
        // Auto-selecionar taxas baseado na regra
        if (rule.fees.includes('Emissão da CNH')) {
          newSelectedFees.push(emissaoCNHFee.id);
        }
        if (rule.fees.includes('Transferência')) {
          newSelectedFees.push(transferenciaFee.id);
        }
        if (rule.fees.includes('2º Via') && segundaViaFee) {
          newSelectedFees.push(segundaViaFee.id);
        }
      }
      
      return { ...prev, selected_fees: newSelectedFees, selected_steps: newSelectedSteps };
    });
  }, [formData.client_name, fees, processSteps]);

  // Auto-selecionar credenciado de Foto quando a cidade mudar
  useEffect(() => {
    if (!formData.city_id || professionals.length === 0 || processSteps.length === 0) return;
    
    // Verificar se há uma etapa do tipo "foto" selecionada
    const fotoStep = processSteps.find(step => step.type === 'foto');
    if (!fotoStep) return;
    
    const isFotoStepSelected = formData.selected_steps.includes(fotoStep.id);
    if (!isFotoStepSelected) return;
    
    // Buscar credenciado de foto daquela cidade
    const fotoProfessionalForCity = professionals.find(
      p => p.type === 'foto' && p.city_id.toString() === formData.city_id
    );
    
    setFormData(prev => {
      const currentSelectedProfId = prev.selected_professionals[fotoStep.id];
      
      // Se não há profissional de foto nessa cidade
      if (!fotoProfessionalForCity) {
        // Remover a seleção (limpar profissional de cidade antiga)
        const newProfessionals = { ...prev.selected_professionals };
        delete newProfessionals[fotoStep.id];
        
        return {
          ...prev,
          selected_professionals: newProfessionals
        };
      }
      
      // Se já tem um profissional selecionado
      if (currentSelectedProfId) {
        // Verificar se o profissional atual é da mesma cidade
        const currentSelectedProf = professionals.find(p => p.id === currentSelectedProfId);
        
        // Se for da mesma cidade, manter a seleção (não sobrescrever escolha manual)
        if (currentSelectedProf && currentSelectedProf.city_id.toString() === formData.city_id) {
          return prev;
        }
        
        // Se for de cidade diferente, atualizar para o profissional da nova cidade
      }
      
      // Auto-selecionar o profissional da cidade
      return {
        ...prev,
        selected_professionals: {
          ...prev.selected_professionals,
          [fotoStep.id]: fotoProfessionalForCity.id
        }
      };
    });
  }, [formData.city_id, formData.selected_steps, professionals, processSteps]);

  const fetchData = async () => {
    try {
      const [citiesRes, stepsRes, feesRes, profRes, instructionsRes] = await Promise.all([
        fetch('/api/cities', { credentials: 'include' }),
        fetch('/api/process-steps?active_only=true', { credentials: 'include' }),
        fetch(`/api/fees?t=${Date.now()}`, { credentials: 'include', cache: 'no-cache' }),
        fetch('/api/professionals', { credentials: 'include' }),
        fetch('/api/instructions', { credentials: 'include' })
      ]);

      const [citiesData, stepsData, feesData, profData, instructionsData] = await Promise.all([
        citiesRes.json(),
        stepsRes.json(),
        feesRes.json(),
        profRes.json(),
        instructionsRes.json()
      ]);

      setCities(citiesData);
      setProcessSteps(stepsData);
      console.log('📊 Taxas carregadas:', feesData.length, feesData.map((f: Fee) => f.name));
      setFees(feesData);
      setProfessionals(profData);
      setInstructions(instructionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchProcesses = async () => {
    try {
      const response = await fetch('/api/step-processes', { credentials: 'include' });
      const data = await response.json();
      setProcesses(data);
    } catch (error) {
      console.error('Error fetching processes:', error);
    }
  };

  const handleStepToggle = (stepId: number) => {
    setFormData(prev => ({
      ...prev,
      selected_steps: prev.selected_steps.includes(stepId)
        ? prev.selected_steps.filter(id => id !== stepId)
        : [...prev.selected_steps, stepId]
    }));
  };

  const handleProfessionalSelectChange = (stepId: number, selectedValue: string) => {
    console.log('Professional select changed:', { stepId, selectedValue });
    
    if (!selectedValue) {
      // Remover seleção
      const step = processSteps.find(s => s.id === stepId);
      
      setFormData(prev => {
        const newProfessionals = { ...prev.selected_professionals };
        delete newProfessionals[stepId];
        
        // Se for tipo prova, remover também a "Prova" pelo nome
        if (step?.type === 'prova') {
          const provaFee = fees.find(fee => fee.name === 'Prova');
          return {
            ...prev,
            selected_professionals: newProfessionals,
            selected_fees: provaFee 
              ? prev.selected_fees.filter(id => id !== provaFee.id)
              : prev.selected_fees
          };
        }
        
        return {
          ...prev,
          selected_professionals: newProfessionals
        };
      });
      return;
    }

    const professionalId = parseInt(selectedValue);
    const step = processSteps.find(s => s.id === stepId);
    const professional = professionals.find(p => p.id === professionalId);
    
    console.log('Found step:', step);
    console.log('Found professional:', professional);
    
    // Verificar se é médico ou psicólogo para mostrar confirmação
    if ((step?.type === 'medico' || step?.type === 'psicologo') && professional) {
      const stepName = step.type === 'medico' ? 'Exame Médico' : 'Exame Psicológico';
      console.log('Showing confirmation modal for:', stepName);
      
      setConfirmModal({
        isOpen: true,
        professional,
        stepName,
        stepId,
        professionalId
      });
      return;
    }
    
    // Para outros tipos, selecionar diretamente
    console.log('Selecting professional directly for non-medical type');
    
    // Se for tipo prova, auto-selecionar a "Taxa da Prova" pelo nome
    if (step?.type === 'prova') {
      const provaFee = fees.find(fee => fee.name === 'Prova');
      console.log('Step is prova, found provaFee:', provaFee);
      
      setFormData(prev => {
        const shouldAddFee = provaFee && !prev.selected_fees.includes(provaFee.id);
        console.log('Should add fee?', shouldAddFee, 'Current fees:', prev.selected_fees);
        
        return {
          ...prev,
          selected_professionals: {
            ...prev.selected_professionals,
            [stepId]: professionalId
          },
          selected_fees: shouldAddFee
            ? [...prev.selected_fees, provaFee.id]
            : prev.selected_fees
        };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        selected_professionals: {
          ...prev.selected_professionals,
          [stepId]: professionalId
        }
      }));
    }
  };

  const confirmProfessionalSelection = () => {
    console.log('Confirming professional selection');
    setFormData(prev => ({
      ...prev,
      selected_professionals: {
        ...prev.selected_professionals,
        [confirmModal.stepId]: confirmModal.professionalId
      }
    }));
    
    setConfirmModal({
      isOpen: false,
      professional: null,
      stepName: '',
      stepId: 0,
      professionalId: 0
    });
  };

  const cancelProfessionalSelection = () => {
    console.log('Canceling professional selection');
    setConfirmModal({
      isOpen: false,
      professional: null,
      stepName: '',
      stepId: 0,
      professionalId: 0
    });
  };

  const handleCancel = () => {
    // Reset form data
    setFormData({
      city_id: '',
      client_name: '',
      selected_steps: [],
      selected_professionals: {},
      selected_fees: [],
      show_toxicologico_message: false
    });
    // Reset to first step
    setCurrentStep(1);
    // Close form
    setShowForm(false);
  };

  const handleFeeToggle = (feeId: number) => {
    setFormData(prev => ({
      ...prev,
      selected_fees: prev.selected_fees.includes(feeId)
        ? prev.selected_fees.filter(id => id !== feeId)
        : [...prev.selected_fees, feeId]
    }));
  };

  const calculateTotal = () => {
    // Calcular total das taxas selecionadas manualmente (não vinculadas)
    const manualFeesTotal = formData.selected_fees.reduce((total, feeId) => {
      const fee = fees.find(f => f.id === feeId);
      return total + (fee ? parseFloat(fee.amount) : 0);
    }, 0);

    // Calcular total das taxas vinculadas automaticamente
    const linkedFeesTotal = fees.filter(fee => {
      if (!fee.linked_professional_type) return false;
      
      const hasLinkedProfessional = formData.selected_steps.some(stepId => {
        const step = processSteps.find(s => s.id === stepId);
        const professionalId = formData.selected_professionals[stepId];
        const professional = professionals.find(p => p.id === professionalId);
        return step?.type === fee.linked_professional_type && professional;
      });
      
      return hasLinkedProfessional;
    }).reduce((total, fee) => total + parseFloat(fee.amount), 0);

    return manualFeesTotal + linkedFeesTotal;
  };

  const handleSubmit = async () => {
    try {
      // Validate form data before sending
      if (!formData.city_id) {
        alert('Por favor, selecione uma cidade.');
        return;
      }

      if (formData.selected_steps.length === 0) {
        alert('Por favor, selecione pelo menos uma etapa.');
        return;
      }

      setIsSaving(true);
      console.log('Submitting form data:', formData);

      // Incluir taxas vinculadas automaticamente
        const linkedFees = fees.filter(fee => {
          if (!fee.linked_professional_type) return false;
          const hasLinkedProfessional = formData.selected_steps.some(stepId => {
            const step = processSteps.find(s => s.id === stepId);
            const professionalId = formData.selected_professionals[stepId];
            const professional = professionals.find(p => p.id === professionalId);
            return step?.type === fee.linked_professional_type && professional;
          });
          return hasLinkedProfessional;
        }).map(fee => fee.id);

        const allSelectedFees = [...formData.selected_fees, ...linkedFees];

        const response = await fetch('/api/step-processes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          city_id: parseInt(formData.city_id),
          client_name: formData.client_name || null,
          selected_steps: formData.selected_steps,
          selected_professionals: formData.selected_professionals,
          selected_fees: allSelectedFees,
          show_toxicologico_message: formData.show_toxicologico_message
        })
      });

      const responseData = await response.json();
      console.log('Response:', response.status, responseData);

      if (response.ok) {
        // Close form and reset state
        setShowForm(false);
        setCurrentStep(1);
        
        // Prepare print data for immediate printing
        const selectedCity = cities.find(c => c.id.toString() === formData.city_id);
        const selectedSteps = processSteps.filter(step => formData.selected_steps.includes(step.id));
        const selectedProfessionals: Record<string, any> = {};
        
        // Map selected professionals
        Object.entries(formData.selected_professionals).forEach(([stepId, profId]) => {
          const professional = professionals.find(p => p.id === profId);
          if (professional) {
            selectedProfessionals[stepId] = professional;
          }
        });

        // Como todas as taxas já foram incluídas no allSelectedFees enviado para o backend,
        // vamos buscar todas as taxas selecionadas (manuais + vinculadas)
        const selectedFees = fees.filter(fee => allSelectedFees.includes(fee.id));
        
        const printData = {
          client_name: formData.client_name,
          city: selectedCity!,
          selected_steps: selectedSteps,
          all_steps: processSteps, // Todas as etapas disponíveis
          selected_professionals: selectedProfessionals,
          selected_fees: selectedFees,
          total_amount: calculateTotal(),
          show_toxicologico_message: formData.show_toxicologico_message,
          general_instructions: instructions.general_instructions || ''
        };

        // Show print modal immediately
        setCurrentPrintData(printData);
        setShowPrintModal(true);
        
        // Reset form data
        setFormData({
          city_id: '',
          client_name: '',
          selected_steps: [],
          selected_professionals: {},
          selected_fees: [],
          show_toxicologico_message: false
        });
        
        // Refresh the process list
        fetchProcesses();
      } else {
        console.error('Error response:', response.status, responseData);
        const errorMessage = responseData.error || 'Erro ao salvar processo. Tente novamente.';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error creating process:', error);
      alert('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShowPrint = (process: any) => {
    // Fetch detailed process data for printing
    const selectedCity = cities.find(c => c.id === process.city_id);
    if (!selectedCity) return;

    // Get the full process data
    fetch(`/api/step-processes/${process.id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const printData = {
          client_name: process.client_name,
          city: selectedCity,
          selected_steps: data.steps || [],
          all_steps: processSteps, // Todas as etapas disponíveis
          selected_professionals: data.professionals || {},
          selected_fees: data.fees || [],
          total_amount: process.total_amount || 0,
          show_toxicologico_message: data.show_toxicologico_message || false,
          general_instructions: instructions.general_instructions || ''
        };
        setCurrentPrintData(printData);
        setShowPrintModal(true);
      })
      .catch(err => {
        console.error('Error fetching process details:', err);
        // Fallback with basic data
        const printData = {
          client_name: process.client_name,
          city: selectedCity,
          selected_steps: [],
          all_steps: processSteps, // Todas as etapas disponíveis
          selected_professionals: {},
          selected_fees: [],
          total_amount: process.total_amount || 0,
          general_instructions: instructions.general_instructions || ''
        };
        setCurrentPrintData(printData);
        setShowPrintModal(true);
      });
  };

  const getSelectedCity = () => cities.find(c => c.id.toString() === formData.city_id);
  const getStepProfessionals = (stepType: string, cityId: string) => {
    console.log('getStepProfessionals called with:', { stepType, cityId });
    console.log('Available professionals:', professionals);
    
    if (!cityId) {
      console.log('No cityId provided, returning empty array');
      return [];
    }
    
    // Filtrar por cidade apenas para médicos e psicólogos
    if (stepType === 'medico' || stepType === 'psicologo') {
      const filtered = professionals.filter(p => p.type === stepType && p.city_id.toString() === cityId);
      console.log(`Filtered ${stepType} professionals for city ${cityId}:`, filtered);
      return filtered;
    }
    
    // Para foto, prova e outros tipos, mostrar todos da agência (permitir escolha entre cidades)
    const filtered = professionals.filter(p => p.type === stepType);
    console.log(`Filtered ${stepType} professionals (all cities):`, filtered);
    return filtered;
  };

  if (showForm) {
    return (
      <Layout>
        <div className="py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h1 className="text-2xl font-semibold text-gray-900">Novo Passo a Passo</h1>
                <div className="mt-4 flex items-center space-x-4">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {step}
                      </div>
                      {step < 4 && <div className={`w-12 h-0.5 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {/* Step 1: Select City */}
                {currentStep === 1 && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Selecione a Cidade</h2>
                    <select
                      value={formData.city_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, city_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma cidade</option>
                      {cities.map(city => (
                        <option key={city.id} value={city.id.toString()}>{city.name}</option>
                      ))}
                    </select>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Serviço (opcional)</label>
                      <p className="text-xs text-gray-500 mb-2">Este campo preencherá automaticamente as Etapas e Taxas, conforme o Serviço selecionado</p>
                      <select
                        value={formData.client_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Selecione um serviço</option>
                        <option value="1º Habilitação">1º Habilitação</option>
                        <option value="Alteração de Dados">Alteração de Dados</option>
                        <option value="Alteração de Dados + EAR">Alteração de Dados + EAR</option>
                        <option value="Renovação">Renovação</option>
                        <option value="Renovação + EAR">Renovação + EAR</option>
                        <option value="Transferência + Renovação">Transferência + Renovação</option>
                        <option value="Transferência + Renovação + EAR">Transferência + Renovação + EAR</option>
                        <option value="Transferência + Alteração de Dados">Transferência + Alteração de Dados</option>
                        <option value="Transferência + Alteração de Dados + EAR">Transferência + Alteração de Dados + EAR</option>
                        <option value="Transferência + Definitiva">Transferência + Definitiva</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Step 2: Select Steps */}
                {currentStep === 2 && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Selecione as Etapas Necessárias</h2>
                    <div className="space-y-3">
                      {[...processSteps].sort((a, b) => a.sort_order - b.sort_order).map(step => {
                        const isSelected = formData.selected_steps.includes(step.id);
                        const hasDetails = step.title || step.description || step.obs;
                        
                        return (
                          <div key={step.id} className="space-y-2">
                            <label className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleStepToggle(step.id)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-gray-900">{step.name}</span>
                            </label>
                            
                            {isSelected && hasDetails && (
                              <div className="ml-7 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                                {step.title && (
                                  <p className="font-medium text-blue-900">{step.title}</p>
                                )}
                                {step.description && (
                                  <p className="text-blue-800 mt-1">{step.description}</p>
                                )}
                                {step.obs && (
                                  <p className="text-blue-700 mt-1 italic">Obs.: {step.obs}</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Professional selection for selected steps (excluding taxa) */}
                    {formData.selected_steps.filter(stepId => {
                      const step = processSteps.find(s => s.id === stepId);
                      return step?.type !== 'taxa';
                    }).length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-medium text-gray-900 mb-4">Selecione o Local/Credenciado</h3>
                        <div className="space-y-4">
                          {formData.selected_steps.filter(stepId => {
                            const step = processSteps.find(s => s.id === stepId);
                            return step?.type !== 'taxa';
                          }).map(stepId => {
                            const step = processSteps.find(s => s.id === stepId);
                            const stepProfessionals = getStepProfessionals(step?.type || '', formData.city_id);
                            
                            return (
                              <div key={stepId}>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  {step?.name} *
                                </label>
                                <select
                                  value={formData.selected_professionals[stepId] || ''}
                                  onChange={(e) => handleProfessionalSelectChange(stepId, e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  required
                                >
                                  <option value="">Selecione um credenciado</option>
                                  {stepProfessionals.map((prof: any) => (
                                    <option key={prof.id} value={prof.id}>
                                      {prof.name}{prof.city_name ? ` - ${prof.city_name}` : ''}
                                    </option>
                                  ))}
                                </select>
                                {stepProfessionals.length === 0 && (
                                  <p className="text-sm text-red-600 mt-1">
                                    Nenhum credenciado cadastrado para este tipo{step?.type === 'medico' || step?.type === 'psicologo' ? ' nesta cidade' : ''}
                                  </p>
                                )}
                                
                                {/* Special checkbox for medical exam */}
                                {step?.type === 'medico' && formData.selected_professionals[stepId] && (
                                  <div className="mt-3">
                                    <label className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={formData.show_toxicologico_message}
                                        onChange={(e) => setFormData(prev => ({ 
                                          ...prev, 
                                          show_toxicologico_message: e.target.checked 
                                        }))}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm text-gray-700">
                                        Exibir na impressão a mensagem "LEVAR O TOXICOLÓGICO"
                                      </span>
                                    </label>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Select Fees */}
                {currentStep === 3 && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Selecione as Taxas Aplicáveis</h2>
                    {(() => {
                      const taxaStep = processSteps.find(step => step.type === 'taxa');
                      const isTaxaStepSelected = taxaStep && formData.selected_steps.includes(taxaStep.id);
                      
                      return (
                        <>
                          {!isTaxaStepSelected && (
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-sm text-yellow-800">
                                ⚠️ A etapa "Taxa" não está selecionada. Selecione-a no passo anterior para habilitar as taxas.
                              </p>
                            </div>
                          )}
                          <div className="space-y-3">
                            {fees.filter(fee => {
                              // Mostrar taxas sem vínculo OU taxa da prova
                              // Taxas vinculadas a médico/psicólogo NÃO aparecem (são automáticas)
                              return !fee.linked_professional_type || fee.linked_professional_type === 'prova';
                            }).map(fee => {
                              const isProvaFee = fee.name === 'Prova';
                              const isFeeDisabled = !isTaxaStepSelected || isProvaFee;
                              
                              return (
                                <label key={fee.id} className={`flex items-center justify-between ${isFeeDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                  <div className="flex items-center space-x-3">
                                    <input
                                      type="checkbox"
                                      checked={formData.selected_fees.includes(fee.id)}
                                      onChange={() => handleFeeToggle(fee.id)}
                                      disabled={isFeeDisabled}
                                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
                                    />
                                    <span className="text-gray-900">
                                      {fee.name}
                                      {isProvaFee && (
                                        <span className="ml-2 text-xs text-gray-500">(automática)</span>
                                      )}
                                    </span>
                                  </div>
                                  <span className="text-gray-600 font-medium">R$ {parseFloat(fee.amount).toFixed(2)}</span>
                                </label>
                              );
                            })}
                          </div>
                          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-medium text-gray-900">Total:</span>
                              <span className="text-2xl font-bold text-blue-600">R$ {calculateTotal().toFixed(2)}</span>
                            </div>
                            {/* Mostrar informação sobre taxas vinculadas */}
                            {fees.some(fee => {
                              if (!fee.linked_professional_type) return false;
                              const hasLinkedProfessional = formData.selected_steps.some(stepId => {
                                const step = processSteps.find(s => s.id === stepId);
                                const professionalId = formData.selected_professionals[stepId];
                                const professional = professionals.find(p => p.id === professionalId);
                                return step?.type === fee.linked_professional_type && professional;
                              });
                              return hasLinkedProfessional;
                            }) && (
                              <div className="mt-2 text-sm text-gray-600">
                                * Total inclui taxas vinculadas aos profissionais selecionados
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Step 4: Summary */}
                {currentStep === 4 && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Resumo do Passo a Passo</h2>
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Informações Gerais</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p><strong>Cidade:</strong> {getSelectedCity()?.name}</p>
                          {formData.client_name && <p><strong>Serviço:</strong> {formData.client_name}</p>}
                          <p><strong>Total:</strong> R$ {calculateTotal().toFixed(2)}</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Etapas Selecionadas</h3>
                        <div className="space-y-3">
                          {formData.selected_steps.map(stepId => {
                            const step = processSteps.find(s => s.id === stepId);
                            const professionalId = formData.selected_professionals[stepId];
                            const professional = professionals.find(p => p.id === professionalId);
                            
                            return (
                              <div key={stepId} className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-medium text-gray-900">{step?.name}</h4>
                                {professional ? (
                                  <div className="mt-2 text-sm text-gray-600">
                                    <p><strong>Local/Credenciado:</strong> {professional.name}</p>
                                    {professional.address && <p><strong>Endereço:</strong> {professional.address}</p>}
                                    {professional.phone && <p><strong>Telefone:</strong> {professional.phone}</p>}
                                    {professional.email && <p><strong>Email:</strong> {professional.email}</p>}
                                    {professional.observations && <p><strong>Observações:</strong> {professional.observations}</p>}
                                  </div>
                                ) : step?.type === 'taxa' ? (
                                  <div className="mt-2 text-sm text-gray-600">
                                    <div className="space-y-1">
                                      <p><strong>Taxas selecionadas:</strong></p>
                                      {formData.selected_fees.map(feeId => {
                                        const fee = fees.find(f => f.id === feeId && !f.linked_professional_type);
                                        return fee ? (
                                          <p key={feeId} className="ml-4">• {fee.name}: R$ {parseFloat(fee.amount).toFixed(2)}</p>
                                        ) : null;
                                      })}
                                      {/* Mostrar taxas vinculadas */}
                                      {fees.filter(fee => {
                                        if (!fee.linked_professional_type) return false;
                                        const hasLinkedProfessional = formData.selected_steps.some(sId => {
                                          const s = processSteps.find(ps => ps.id === sId);
                                          const pId = formData.selected_professionals[sId];
                                          const p = professionals.find(pr => pr.id === pId);
                                          return s?.type === fee.linked_professional_type && p;
                                        });
                                        return hasLinkedProfessional;
                                      }).map(fee => (
                                        <p key={fee.id} className="ml-4 text-blue-600">• {fee.name}: R$ {parseFloat(fee.amount).toFixed(2)} (vinculada)</p>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                  <div>
                    {currentStep > 1 && (
                      <button
                        onClick={() => setCurrentStep(prev => prev - 1)}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Voltar
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    {currentStep < 4 ? (
                      <button
                        onClick={() => setCurrentStep(prev => prev + 1)}
                        disabled={
                          (currentStep === 1 && !formData.city_id) ||
                          (currentStep === 2 && (
                            formData.selected_steps.length === 0 ||
                            // Verificar se todos os steps (exceto taxa) têm profissionais selecionados
                            formData.selected_steps.filter(stepId => {
                              const step = processSteps.find(s => s.id === stepId);
                              return step?.type !== 'taxa';
                            }).some(stepId => !formData.selected_professionals[stepId])
                          ))
                        }
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próximo
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowWarningModal(true)}
                        disabled={formData.selected_steps.length === 0 || isSaving}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium"
                      >
                        {isSaving ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            <span>Salvar e Imprimir</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal - Positioned above all other elements */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div 
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={cancelProfessionalSelection}
              />

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Confirmar Seleção
                      </h3>
                      <div className="mt-2">
                        <p className="text-xl font-bold text-red-600 mb-2">
                          ATENÇÃO! CONFIRMA A SELEÇÃO?
                        </p>
                        <p className="text-sm text-gray-500 mb-3">
                          Credenciado selecionado para <strong>{confirmModal.stepName}</strong>:
                        </p>
                        <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-red-500">
                          <h4 className="font-bold text-lg text-gray-900 mb-2">
                            {confirmModal.professional?.name}
                          </h4>
                          {confirmModal.professional?.address && (
                            <p className="text-gray-700 text-sm mb-1">
                              <strong>Endereço:</strong> {confirmModal.professional.address}
                            </p>
                          )}
                          {confirmModal.professional?.phone && (
                            <p className="text-gray-600 text-sm">
                              <strong>Contato:</strong> {confirmModal.professional.phone}
                            </p>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-3 bg-yellow-50 p-2 rounded border border-yellow-200">
                          <strong>Importante:</strong> Verifique se os dados estão corretos antes de confirmar.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={confirmProfessionalSelection}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Confirmar Seleção
                  </button>
                  <button
                    type="button"
                    onClick={cancelProfessionalSelection}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warning Modal - DetranNet Document Check */}
        {showWarningModal && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div 
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={() => setShowWarningModal(false)}
              />

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                      <AlertTriangle className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                      <h3 className="text-xl leading-6 font-bold text-gray-900 mb-3">
                        Atenção, colaborador!
                      </h3>
                      <div className="mt-2">
                        <p className="text-base text-gray-700 leading-relaxed">
                          Antes de finalizar o atendimento, revise se todos os documentos exigidos estão devidamente anexados no DetranNet.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowWarningModal(false);
                      handleSubmit();
                    }}
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-8 py-3 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    OK, Entendi
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Passo a Passo</h1>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Novo Passo a Passo</span>
            </button>
          </div>

          {/* Processes List */}
          <div className="mt-6">
            {processes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Nenhum processo criado ainda</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Criar Primeiro Processo
                </button>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="divide-y divide-gray-200">
                  {processes.map((process: any) => (
                    <div key={process.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {process.client_name || `Processo #${process.id}`}
                          </h3>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {process.city_name}
                            </span>
                            <span className="flex items-center">
                              <DollarSign className="w-4 h-4 mr-1" />
                              R$ {parseFloat(process.total_amount || 0).toFixed(2)}
                            </span>
                            <span>
                              {new Date(process.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleShowPrint(process)}
                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Ver/Imprimir</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print Modal */}
      {showPrintModal && currentPrintData && (
        <PrintableStepProcess
          isOpen={showPrintModal}
          onClose={() => {
            setShowPrintModal(false);
            setCurrentPrintData(null);
          }}
          processData={currentPrintData}
        />
      )}
    </Layout>
  );
}
