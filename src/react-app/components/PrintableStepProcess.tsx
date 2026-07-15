import { useState, useEffect, useRef, lazy } from 'react';
import type { ProcessStep, Professional, Fee, City } from '@/shared/types';

const TOXICOLOGICO_ATIVO = new Date() >= new Date('2026-06-01');

// Lazy load ícones apenas quando necessário
const X = lazy(() => import('lucide-react').then(mod => ({ default: mod.X })));
const Printer = lazy(() => import('lucide-react').then(mod => ({ default: mod.Printer })));
const Mail = lazy(() => import('lucide-react').then(mod => ({ default: mod.Mail })));

interface PrintableStepProcessProps {
  isOpen: boolean;
  onClose: () => void;
  autoPrint?: boolean;
  processData: {
    client_name?: string;
    city: City;
    selected_steps: ProcessStep[];
    all_steps: ProcessStep[]; // Todas as etapas disponíveis
    selected_professionals: Record<string, Professional>;
    selected_fees: Fee[];
    total_amount: string; // Database returns as string (decimal/numeric)
    show_toxicologico_message?: boolean;
    show_toxicologico_habilitacao?: boolean;
    general_instructions?: string;
    categoria_atual?: string;
  };
}

export default function PrintableStepProcess({ isOpen, onClose, autoPrint, processData }: PrintableStepProcessProps) {
  const isAdicaoCategoria = processData.client_name === 'Adição de Categoria A' || processData.client_name === 'Adição de Categoria B';
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [generalInstructions, setGeneralInstructions] = useState<string>('');
  const [emailModal, setEmailModal] = useState({ isOpen: false, email: '' });
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const autoPrintFiredRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  // Auto-print: dispara impressão assim que os dados carregam
  useEffect(() => {
    if (!isOpen || !autoPrint || isLoading || autoPrintFiredRef.current) return;
    autoPrintFiredRef.current = true;
    handlePrint();
  }, [isLoading, isOpen, autoPrint]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        checkAgencyLogo(),
        fetchInstructions(),
        fetchCurrentUser()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAgencyLogo = async () => {
    try {
      const response = await fetch('/api/agencies/logo', { credentials: 'include' });
      const data = await response.json();
      
      if (data.has_logo) {
        setLogoUrl(`/api/files/${encodeURIComponent(data.logo_key)}`);
      }
    } catch (error) {
      console.error('Error checking logo:', error);
    }
  };

  const fetchInstructions = async () => {
    try {
      const response = await fetch('/api/instructions', { credentials: 'include' });
      const data = await response.json();
      const is1aHab = processData.client_name === '1º Habilitação';
      const hasProvaPratica = processData.selected_steps.some(s => s.type === 'prova_pratica');
      const useFirstHab = is1aHab || (!processData.client_name && hasProvaPratica);
      const resolved = useFirstHab
        ? (data.instructions_primeira_habilitacao || '')
        : (data.general_instructions || '');
      setGeneralInstructions(resolved);
    } catch (error) {
      console.error('Error fetching instructions:', error);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await response.json();
      setCurrentUserName(data.name || '');
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  if (!isOpen) return null;

  const handlePrint = () => {
    // Create a new window with only the print content
    const printContent = generatePrintHTML();
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Close the modal immediately after opening the print window
      onClose();
      
      // Wait for content to load and font adjustment to complete, then print
      printWindow.onload = () => {
        let checkAttempts = 0;
        const maxCheckAttempts = 100; // 5 seconds max
        
        const checkAdjustmentComplete = () => {
          const container = printWindow.document.querySelector('.container');
          const adjustedStatus = container?.getAttribute('data-adjusted');
          
          if (adjustedStatus === 'true' || adjustedStatus === 'failed') {
            // Print regardless of fit status
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
            }, 100);
          } else if (checkAttempts < maxCheckAttempts) {
            // Still adjusting - check again
            checkAttempts++;
            setTimeout(checkAdjustmentComplete, 50);
          } else {
            // Timeout - print anyway
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
            }, 100);
          }
        };
        checkAdjustmentComplete();
      };
    }
  };

  const handleSendEmail = async () => {
    if (!emailModal.email) {
      alert('Por favor, informe o email do destinatário.');
      return;
    }

    // Buscar nome da agência
    let agencyName = 'Agência';
    try {
      const response = await fetch('/api/agencies/info', { credentials: 'include' });
      const agencyData = await response.json();
      agencyName = agencyData.name || 'Agência';
    } catch (error) {
      console.error('Error fetching agency name:', error);
    }

    // Gerar o conteúdo do email em texto simples
    const emailContent = generateEmailContent();
    const subject = `Agência Regional - ${agencyName}`;
    
    // Criar o link do Gmail Compose diretamente
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailModal.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailContent)}`;
    
    // Abrir o Gmail
    window.open(gmailLink, '_blank');
    
    // Fechar o modal principal e o modal de email
    setEmailModal({ isOpen: false, email: '' });
    onClose();
    
    alert('Abrindo o Gmail com o conteúdo pré-carregado!');
  };

  const generatePrintHTML = () => {
    // Verificar se as etapas de curso/prova estão selecionadas
    const hasExtraSteps = ['curso_teorico', 'prova_teorica', 'curso_pratico', 'prova_pratica'].some(type => 
      processData.selected_steps.some(step => step.type === type)
    );
    
    // COM etapas extras = tamanhos menores (X)
    // SEM etapas extras = tamanhos maiores (Y)
    const sizesWithExtra = {
      professionalName: '15px',
      professionalInfo: '12px',
      professionalPhone: '12px',
      scheduleLabel: '11px',
      instructions: '13px',
      stepNumber: '15px',
      stepTitle: '13px',
      stepIcon: '32px',
      cardMinHeight: '160px',
      cardWithFeeMinHeight: '190px',
      headerTitle: '28px',
      feeItem: '12px',
      feeBadge: '12px',
      totalAmount: '14px',
    };
    
    const sizesWithoutExtra = {
      professionalName: '13px',
      professionalInfo: '10.5px',
      professionalPhone: '13px',
      scheduleLabel: '10.5px',
      instructions: '12px',
      stepNumber: '14px',
      stepTitle: '13px',
      stepIcon: '32px',
      cardMinHeight: '160px',
      cardWithFeeMinHeight: '180px',
      headerTitle: '24px',
      feeItem: '13px',
      feeBadge: '15px',
      totalAmount: '14px',
    };
    
    const sizes = hasExtraSteps ? sizesWithExtra : sizesWithoutExtra;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Passo a Passo - ${processData.client_name || 'Cliente'}</title>
    <meta charset="UTF-8">
    <style>
        html, body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            background: white;
            color: black;
            line-height: 1.25;
            height: 100%;
        }
        .container {
            max-width: none;
            margin: 12px;
            padding: 0;
            min-height: calc(100vh - 24px);
            display: flex;
            flex-direction: column;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid black;
        }
        .logo-section {
            display: flex;
            align-items: center;
        }
        .logo {
            width: 36px;
            height: 36px;
            background-color: black;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: bold;
            margin-right: 12px;
        }
        .logo-text h1 {
            font-size: 22px;
            font-weight: bold;
            margin: 0;
        }
        .logo-text p {
            font-size: 14px;
            margin: 0;
        }
        .header-info {
            text-align: right;
        }
        .header-info h2 {
            font-size: 18px;
            font-weight: bold;
            margin: 0;
        }
        .header-info p {
            font-size: 14px;
            margin: 3px 0 0 0;
        }
        .steps-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 8px;
            align-items: stretch;
        }
        .step-card {
            border: 2px solid black;
            min-height: auto;
            page-break-inside: avoid;
            display: flex;
            flex-direction: column;
        }
        .step-card-with-fee {
            border: 2px solid black;
            min-height: ${sizes.cardWithFeeMinHeight};
            page-break-inside: avoid;
            position: relative;
            display: flex;
            flex-direction: column;
        }
        .step-header {
            background-color: #f5f5f5;
            padding: 6px 8px;
            border-bottom: 2px solid black;
            display: flex;
            align-items: center;
            height: 45px;
        }
        .step-icon {
            font-size: ${sizes.stepIcon};
            margin-right: 10px;
        }
        .step-number-and-title {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .step-number-text {
            font-size: ${sizes.stepNumber};
            font-weight: bold;
            margin: 0;
            text-align: center;
        }
        .step-title {
            font-size: ${sizes.stepTitle};
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
            margin-top: 2px;
        }
        .step-content {
            padding: 8px;
            position: relative;
        }
        .step-content-with-fee {
            padding: 8px 8px 44px 8px;
            position: relative;
            min-height: 145px;
            flex: 1;
        }
        .fee-badge {
            position: absolute;
            bottom: 7px;
            right: 7px;
            font-size: 12.5px;
            font-weight: bold;
            color: black;
            background-color: #f5f5f5;
            padding: 4px 10px;
            border: 2px solid black;
            border-radius: 4px;
            white-space: nowrap;
            text-align: right;
            line-height: 1;
        }
        .professional-name {
            font-size: ${sizes.professionalName};
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .professional-info {
            font-size: ${sizes.professionalInfo};
            margin-bottom: 4px;
        }
        .schedule-info {
            margin-top: 6px;
        }
        .schedule-label {
            font-size: ${sizes.scheduleLabel};
            font-weight: bold;
            margin-bottom: 3px;
        }
        .fee-section h4 {
            font-size: ${sizes.feeItem};
            font-weight: bold;
            text-transform: uppercase;
            margin: 0 0 7px 0;
        }
        .fee-item {
            font-size: ${sizes.feeItem};
            margin-bottom: 4px;
        }
        .fee-total {
            margin-top: 7px;
            padding-top: 7px;
            border-top: 1px solid black;
        }
        .fee-total-text {
            font-size: 15px;
            font-weight: bold;
        }
        .total-and-prova-container {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin: 8px 0;
            justify-content: space-between;
        }
        .total-amount-card {
            position: relative;
            display: flex;
            justify-content: flex-end;
            flex-shrink: 0;
            margin-left: auto;
        }
        .total-amount-box {
            background-color: #f5f5f5;
            border: 2px solid black;
            padding: 8px 14px;
            border-radius: 5px;
            text-align: center;
        }
        .total-amount-text {
            font-size: ${sizes.totalAmount};
            font-weight: bold;
            color: black;
            margin: 0;
        }
        .prova-card {
            border: 2px solid black;
            min-height: 105px;
            width: 480px;
            flex-shrink: 0;
        }
        .prova-header {
            background-color: #f5f5f5;
            padding: 5px 8px;
            border-bottom: 2px solid black;
            display: flex;
            align-items: center;
        }
        .prova-header .step-icon {
            font-size: 22px;
            margin-right: 8px;
        }
        .prova-title {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .prova-title .step-number-text {
            font-size: 14px;
            font-weight: bold;
            margin: 0;
            text-align: center;
        }
        .prova-title .step-title {
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
            margin-top: 2px;
        }
        .prova-content {
            padding: 6px 8px;
        }
        .prova-content .professional-name {
            font-size: 15.5px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .prova-content .schedule-info {
            margin-top: 5px;
        }
        .prova-content .schedule-label {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 3px;
        }
        .prova-content .professional-info {
            font-size: 13px;
            margin-bottom: 3px;
        }
        .instructions {
            border-top: 2px solid black;
            padding-top: 8px;
            page-break-inside: avoid;
        }
        .instructions h3 {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .instructions-content {
            line-height: 1.1 !important;
            color: #333;
            word-wrap: break-word;
            overflow-wrap: break-word;
            font-size: ${sizes.instructions};
        }
        .instructions-content * {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            line-height: 1.1 !important;
        }
        .instructions-content p {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1.1 !important;
            display: block;
        }
        .instructions-content ul,
        .instructions-content ol {
            margin: 0 !important;
            padding-left: 22px !important;
        }
        .instructions-content li {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1.1 !important;
        }
        .instructions-content strong {
            font-weight: bold;
        }
        .instructions-content em {
            font-style: italic;
        }
        .instructions-content br {
            display: block;
            content: "";
            margin: 0 !important;
            line-height: 0 !important;
        }
        .footer {
            margin-top: auto;
            padding-top: 4px;
            padding-bottom: 8mm;
            border-top: 1px solid black;
            page-break-after: avoid;
            page-break-before: avoid;
        }
        .footer p {
            font-size: 11px;
            margin: 0;
        }
        @media print {
            html, body { 
                margin: 0;
                padding: 0;
                font-size: 11px;
                height: 100%;
                overflow: hidden;
                line-height: 1.1;
            }
            .container { 
                max-width: none;
                margin: 2mm 4mm 1mm 4mm;
                min-height: calc(297mm - 18mm);
                max-height: calc(297mm - 18mm);
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            .step-card {
                page-break-inside: avoid;
                min-height: 130px;
            }
            .step-card-with-fee {
                page-break-inside: avoid;
                min-height: 150px;
                position: relative;
            }
            .instructions {
                page-break-inside: avoid;
            }
            .instructions-content {
                font-size: clamp(8px, 1.1vw, 11px);
                line-height: 1.1 !important;
            }
            .instructions-content * {
                margin-top: 0 !important;
                margin-bottom: 0 !important;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
                line-height: 1.1 !important;
            }
            .instructions-content p {
                margin: 0 !important;
                padding: 0 !important;
                line-height: 1.1 !important;
            }
            .instructions-content br {
                margin: 0 !important;
                line-height: 0 !important;
            }
            .header {
                margin-bottom: 6px;
                padding-bottom: 4px;
            }
            .steps-grid {
                gap: 5px;
                margin-bottom: 5px;
            }
            .step-content {
                padding: 5px;
            }
            .step-content-with-fee {
                padding: 5px 5px 32px 5px;
                position: relative;
                min-height: 105px;
            }
            .fee-badge {
                position: absolute;
                bottom: 7px;
                right: 7px;
                font-size: 11.5px;
                padding: 3px 8px;
                white-space: nowrap;
                text-align: right;
                line-height: 1;
            }
            .professional-info {
                font-size: ${sizes.professionalInfo};
                margin-bottom: 2px;
            }
            .professional-name {
                font-size: ${sizes.professionalName};
                margin-bottom: 2px;
            }
            .schedule-label {
                font-size: ${sizes.scheduleLabel};
            }
            .fee-section h4 {
                font-size: ${sizes.feeItem};
            }
            .fee-item {
                font-size: ${sizes.feeItem};
            }
            .step-header {
                padding: 3px 4px;
            }
            .step-icon {
                font-size: 24px;
            }
            .step-number-text {
                font-size: ${sizes.stepNumber};
            }
            .step-title {
                font-size: ${sizes.stepTitle};
            }
            .footer {
                margin-top: auto;
                page-break-inside: avoid;
                page-break-after: avoid;
                page-break-before: avoid;
            }
        }
        @media print {
            /* Ocultar ponto e vírgula na impressão */
            .hide-semicolon-print {
                display: none;
            }
        }
        @page {
            margin: 5mm 5mm 0mm 5mm;
            size: A4;
            orphans: 4;
            widows: 4;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                ${logoUrl ? `
                    <img src="${logoUrl}" alt="Logo da Agência" style="max-height: 80px; max-width: 160px; margin-right: 12px;" />
                ` : ''}
                <div class="logo-text">
                    <h1 style="font-size: ${sizes.headerTitle}; font-weight: bold; margin: 0;">SIGA O PASSO A PASSO</h1>
                </div>
            </div>
            <div class="header-info">
                ${processData.client_name === 'Adição de Categoria A' && processData.categoria_atual ? `
                <p style="font-size: 11px; margin: 0 0 4px 0; line-height: 1.3;">Categoria Atual: <strong>${processData.categoria_atual}</strong></p>
                ` : ''}
                ${currentUserName ? `
                <p style="font-size: 11px; margin: 0; line-height: 1.3;">Impresso por:</p>
                <p style="font-size: 12px; font-weight: bold; margin: 0; line-height: 1.3;">${currentUserName}</p>
                ` : ''}
            </div>
        </div>

        <!-- Steps Grid -->
        <div class="steps-grid">
            ${(() => {
              const filteredSteps = (processData.all_steps || processData.selected_steps).filter(step => {
                // Excluir prova (processada separadamente)
                if (step.type === 'prova') return false;
                
                const isSelected = processData.selected_steps.find(s => s.id === step.id);
                
                // Tipos de etapas que devem SEMPRE aparecer (mesmo que não selecionadas)
                // const alwaysShowTypes = ['psicologo', 'medico']; // Mantido comentado se necessário para referência futura
                
                // Para outras etapas condicionais, só mostrar se selecionadas
                const conditionalTypes = ['curso_teorico', 'prova_teorica', 'curso_pratico', 'prova_pratica'];
                
                // Caso especial: CURSO TEÓRICO nunca aparece para Adição de Categoria A/B
                if (step.type === 'curso_teorico') {
                  const isAdicaoCategoria = processData.client_name === 'Adição de Categoria A' || processData.client_name === 'Adição de Categoria B';
                  if (isAdicaoCategoria) return false;
                  const hasRelatedSteps = ['prova_teorica', 'curso_pratico', 'prova_pratica'].some(type => 
                    processData.selected_steps.some(s => s.type === type)
                  );
                  if (!hasRelatedSteps && !isSelected) return false;
                  return true;
                }
                
                if (conditionalTypes.includes(step.type)) {
                  return isSelected;
                }
                
                return true;
              });
              let stepCounter = 0;
              
              return filteredSteps.map((step) => {
                const isSelected = processData.selected_steps.find(s => s.id === step.id);
                const professional = isSelected ? processData.selected_professionals[step.id.toString()] : null;
                
                // Caso especial: Exame Psicológico não selecionado
                if (step.type === 'psicologo' && !isSelected) {
                  const stepIcon = getStepIcon(step.type);
                  return `
                    <div class="step-card">
                        <div class="step-header">
                            <div class="step-icon">${stepIcon}</div>
                            <div class="step-number-and-title" style="flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                                <div class="step-title">
                                    <strong>EXAME PSICOLÓGICO</strong>
                                </div>
                            </div>
                        </div>
                        <div class="step-content" style="display: flex; align-items: center; justify-content: center; text-align: center; min-height: 120px; padding: 15px;">
                            <h2 style="font-size: 22px; font-weight: bold; line-height: 1.3; margin: 0; text-transform: uppercase;">
                                ATENÇÃO: O CONDUTOR OPTOU POR NÃO COLOCAR O EAR NA SUA CNH
                            </h2>
                        </div>
                    </div>
                  `;
                }

                // Caso especial: Exame Médico ou Curso Teórico não selecionado
                if ((step.type === 'medico' && (!isSelected || !professional)) || (step.type === 'curso_teorico' && !isSelected)) {
                  const stepIcon = getStepIcon(step.type);
                  const title = step.type === 'medico' ? 'EXAME MÉDICO' : 'CURSO TEÓRICO';
                  return `
                    <div class="step-card">
                        <div class="step-header">
                            <div class="step-icon">${stepIcon}</div>
                            <div class="step-number-and-title" style="flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                                <div class="step-title">
                                    <strong>${title}</strong>
                                </div>
                            </div>
                        </div>
                        <div class="step-content" style="display: flex; align-items: center; justify-content: center; text-align: center; min-height: 120px;">
                            <span style="font-size: 80px; color: #000000; font-weight: bold; line-height: 1;">X</span>
                        </div>
                    </div>
                  `;
                }

                // Para taxas, verificar se há taxas não vinculadas selecionadas
                const hasTaxesSelected = step.type === 'taxa' && isSelected && 
                  processData.selected_fees.filter(fee => !fee.linked_professional_type).length > 0;
                
                // Etapas que não precisam de credenciado (cursos e provas teóricas/práticas)
                const noProfessionalTypes = ['curso_teorico', 'prova_teorica', 'curso_pratico', 'prova_pratica'];
                const isNoProfessionalStep = noProfessionalTypes.includes(step.type) && isSelected;
                
                // Incrementar contador apenas se há dados para exibir
                const hasData = professional || hasTaxesSelected || isNoProfessionalStep;
                if (hasData) {
                  stepCounter++;
                }
                const stepNumber = stepCounter;
                const stepIcon = getStepIcon(step.type);
              
              // Check if this step has a linked fee to determine card height
              const linkedFee = step.type === 'curso_pratico'
                ? processData.selected_fees.find(fee => fee.name === 'LADV')
                : processData.selected_fees.find(fee => fee.linked_professional_type === step.type);
              const cardClass = linkedFee && (professional || ['prova_teorica', 'prova_pratica', 'curso_pratico'].includes(step.type)) ? "step-card-with-fee" : "step-card";
              const contentClass = linkedFee && (professional || ['prova_teorica', 'prova_pratica', 'curso_pratico'].includes(step.type)) ? "step-content-with-fee" : "step-content";
              
              return `
                <div class="${cardClass}">
                    <div class="step-header">
                        <div class="step-icon">${stepIcon}</div>
                        <div class="step-number-and-title">
                            ${hasData ? `<p class="step-number-text"><strong>(${stepNumber}°) PASSO</strong></p>` : ''}
                            <div class="step-title">
                                <strong>${step.name}</strong>
                            </div>
                        </div>
                    </div>
                    <div class="${contentClass}">
                        ${professional ? `
                            <div class="professional-name"><strong>${professional.name}</strong></div>
                            ${professional.address || professional.city_name ? `<div class="professional-info">${professional.address ? `${professional.address}${professional.city_name ? ` - ${professional.city_name}` : ''}` : professional.city_name || ''}</div>` : ''}
                            ${professional.attendance_type ? `
                                <div class="schedule-info">
                                    <div class="schedule-label"><strong>${professional.attendance_type}:</strong></div>
                                    ${professional.phone ? `
                                        <div class="professional-info" style="font-size: ${sizes.professionalPhone};"><strong>${professional.phone}</strong> - Somente mensagem WhatsApp</div>
                                    ` : ''}
                                </div>
                            ` : ''}
                            ${professional.email ? `
                                <div class="professional-info" style="margin-top: 2px;"><strong>Email:</strong> ${professional.email}</div>
                            ` : ''}
                            ${(() => {
                              let workingInfo = '';
                              const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
                              const DAY_ABBR: Record<string,string> = { monday:'Seg', tuesday:'Ter', wednesday:'Qua', thursday:'Qui', friday:'Sex', saturday:'Sáb', sunday:'Dom' };
                              const DAY_FULL: Record<string,string> = { monday:'Segunda', tuesday:'Terça', wednesday:'Quarta', thursday:'Quinta', friday:'Sexta', saturday:'Sábado', sunday:'Domingo' };
                              if (professional.working_hours) {
                                try {
                                  const hoursObj = JSON.parse(professional.working_hours);
                                  if (typeof hoursObj === 'object' && !Array.isArray(hoursObj)) {
                                    const selectedDays = professional.working_days
                                      ? JSON.parse(professional.working_days).filter((d: string) => hoursObj[d])
                                      : DAY_ORDER.filter(d => hoursObj[d]);
                                    // Check if all selected days have identical hours
                                    const allSame = selectedDays.length > 0 && selectedDays.every((d: string) =>
                                      hoursObj[d].start === hoursObj[selectedDays[0]].start &&
                                      hoursObj[d].end === hoursObj[selectedDays[0]].end
                                    );
                                    if (allSame && selectedDays.length > 1) {
                                      const first = DAY_FULL[selectedDays[0]] || selectedDays[0];
                                      const last = DAY_FULL[selectedDays[selectedDays.length - 1]] || selectedDays[selectedDays.length - 1];
                                      const t = hoursObj[selectedDays[0]];
                                      workingInfo += `<div class="professional-info" style="margin-top: 4px; font-size: 11.5px; font-weight: 600; line-height: 1.5;">(${first} a ${last}: ${t.start} - ${t.end})</div>`;
                                    } else if (allSame && selectedDays.length === 1) {
                                      const d = selectedDays[0];
                                      const t = hoursObj[d];
                                      workingInfo += `<div class="professional-info" style="margin-top: 4px; font-size: 11px; line-height: 1.5;">(${DAY_FULL[d] || DAY_ABBR[d] || d}: ${t.start} - ${t.end})</div>`;
                                    } else {
                                      const items = selectedDays.map((d: string) => `(${DAY_ABBR[d] || d}: ${hoursObj[d].start} - ${hoursObj[d].end})`);
                                      const lines: string[] = [];
                                      for (let i = 0; i < items.length; i += 3) lines.push(items.slice(i, i + 3).join(' - '));
                                      workingInfo += `<div class="professional-info" style="margin-top: 4px; font-size: 11px; line-height: 1.5;">${lines.join('<br/>')}</div>`;
                                    }
                                  } else {
                                    throw new Error('not object');
                                  }
                                } catch {
                                  if (professional.working_days) {
                                    try {
                                      const days = JSON.parse(professional.working_days).map((d: string) => DAY_ABBR[d] || d).join(', ');
                                      workingInfo += `<div class="professional-info" style="margin-top: 4px; font-size: 11px;"><strong>Dias:</strong> ${days}</div>`;
                                    } catch { workingInfo += `<div class="professional-info" style="margin-top: 4px; font-size: 11px;"><strong>Dias:</strong> ${professional.working_days}</div>`; }
                                  }
                                  workingInfo += `<div class="professional-info" style="margin-top: 1px; font-size: 11px;"><strong>Horário:</strong> ${professional.working_hours}</div>`;
                                }
                              } else if (professional.working_days) {
                                try {
                                  const days = JSON.parse(professional.working_days).map((d: string) => DAY_ABBR[d] || d).join(', ');
                                  workingInfo += `<div class="professional-info" style="margin-top: 4px; font-size: 11px;"><strong>Dias:</strong> ${days}</div>`;
                                } catch { workingInfo += `<div class="professional-info" style="margin-top: 4px; font-size: 11px;"><strong>Dias:</strong> ${professional.working_days}</div>`; }
                              }
                              return workingInfo;
                            })()}
                            ${professional.observations ? `<div class="professional-info" style="margin-top: 6px;">${professional.observations}</div>` : ''}
                            ${step.type === 'medico' && processData.show_toxicologico_message ? `
                              <div style="margin-top: 6px; text-align: center;">
                                <div style="font-size: 11px; font-weight: bold; color: black;">
                                  <strong>*** LEVAR O TOXICOLÓGICO ***</strong>
                                </div>
                              </div>
                            ` : ''}
                        ` : isNoProfessionalStep ? `
                            <div style="padding: 6px; min-height: 40px;">
                                ${step.description ? `<div style="font-size: 14px; font-weight: bold; color: black; margin-bottom: 4px; line-height: 1.2;">${step.description}</div>` : ''}
                                ${step.obs ? `<div style="font-size: 13px; font-weight: bold; color: black;">Obs.: ${step.obs}</div>` : ''}
                                ${!step.description && !step.obs ? `<div style="font-size: 13px; color: #666; text-align: center;">Etapa selecionada</div>` : ''}
                            </div>
                        ` : (step.type === 'taxa' && hasTaxesSelected) ? `
                            <div class="fee-section">
                                <h4><strong>TAXAS A PAGAR:</strong></h4>
                                ${processData.selected_fees.filter(fee => {
                                  // Incluir apenas taxas sem vínculo, exceto LADV (exibida no card Curso Prático)
                                  return !fee.linked_professional_type && fee.name !== 'LADV';
                                }).map(fee => `
                                    <div class="fee-item"><strong>${fee.name}: R$ ${parseFloat(fee.amount).toFixed(2)}</strong></div>
                                `).join('')}
                            </div>
                        ` : step.type === 'psicologo' ? `
                            <div style="display: flex; align-items: center; justify-content: center; min-height: 70px; padding: 8px;">
                                <div style="font-size: 16px; font-weight: bold; color: black; line-height: 1.2; text-align: center;">ATENÇÃO: O CONDUTOR OPTOU POR NÃO COLOCAR O EAR NA SUA CNH</div>
                            </div>
                        ` : `
                            <div style="display: flex; align-items: center; justify-content: center; height: 70px;">
                                <div style="font-size: 54px; font-weight: bold; color: black; line-height: 1;">✕</div>
                            </div>
                        `}

                        ${linkedFee ? (
                          (step.type === 'medico' && processData.selected_steps.some((s: any) => s.type === 'prova')) ? `
                            <div style="position: absolute; bottom: 7px; right: 7px; display: flex; align-items: center; gap: 8px;">
                              <strong style="font-size: 12px; color: black; line-height: 1.3; white-space: nowrap;">Taxa cobrada 3X (Uma por Médico)</strong>
                              <span style="font-size: 12.5px; font-weight: bold; color: black; background-color: #f5f5f5; padding: 4px 10px; border: 2px solid black; border-radius: 4px; white-space: nowrap;">TAXA: R$ ${parseFloat(linkedFee.amount).toFixed(2)}</span>
                            </div>
                          ` : `
                            <div class="fee-badge">
                                <strong>${(['medico', 'psicologo'].includes(step.type)) ? 'TAXA' : `TAXA ${linkedFee.name}`}: R$ ${parseFloat(linkedFee.amount).toFixed(2)}</strong>
                            </div>
                          `
                        ) : ''}
                    </div>
                </div>
              `;
              }).join('');
            })()}
        </div>

        ${TOXICOLOGICO_ATIVO && processData.show_toxicologico_habilitacao && !isAdicaoCategoria ? `
        <div style="width: 100%; margin-top: 5px; border: 2px solid black; border-radius: 6px; background-color: #fffbeb; padding: 10px 16px; box-sizing: border-box;">
          <div style="font-size: 12px; font-weight: bold; color: black; line-height: 1.5; text-align: center;">
            ⚠️ ATENÇÃO: PARA OBTER SUA CNH, VOCÊ DEVE FAZER O EXAME TOXICOLÓGICO EM UM LABORATÓRIO CREDENCIADO AO SENATRAN. A CARTEIRA SÓ SERÁ EMITIDA COM O RESULTADO NEGATIVO.
          </div>
        </div>
        ` : ''}

        <!-- Total Amount Card and Prova Card Container -->
        <div class="total-and-prova-container">
            ${(() => {
              const allSteps = processData.all_steps || processData.selected_steps;
              const provaStep = allSteps.find(step => step.type === 'prova');
              const isSelected = provaStep ? processData.selected_steps.find(s => s.id === provaStep.id) : false;
              if (!provaStep || !isSelected) {
                return `
                  <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                    <div style="background-color: white; border: 2px solid black; padding: 9px; border-radius: 5px; text-align: center; max-width: 400px;">
                      <div style="font-size: 12px; font-weight: bold; color: black; line-height: 1.3;">⚠️ ATENÇÃO: PRAZO PARA RETIRAR A CNH/PID FÍSICA SERÁ DE 180 DIAS, CONTANDO A PARTIR DA DATA DA SUA EMISSÃO</div>
                    </div>
                    <div class="total-amount-box">
                      <div class="total-amount-text"><strong>VALOR TOTAL: R$ ${processData.selected_fees.reduce((sum: number, fee: Fee) => sum + parseFloat(String(fee.amount)), 0).toFixed(2)}</strong></div>
                      ${TOXICOLOGICO_ATIVO && processData.show_toxicologico_habilitacao && !isAdicaoCategoria ? `<div style="font-size: 10px; font-weight: bold; color: black; margin-top: 3px;">+ Valor do Toxicológico</div>` : ''}
                    </div>
                  </div>
                `;
              }
              
              // Calcular o número do passo baseado nos passos anteriores que têm dados
              let stepNumber = 0;
              const filteredStepsForCounter = allSteps.filter(s => s.type !== 'prova');
              const noProfTypes = ['curso_teorico', 'prova_teorica', 'curso_pratico', 'prova_pratica'];
              filteredStepsForCounter.forEach(step => {
                const stepSelected = processData.selected_steps.find(s => s.id === step.id);
                const stepProfessional = stepSelected ? processData.selected_professionals[step.id.toString()] : null;
                const stepHasTaxes = step.type === 'taxa' && stepSelected && 
                  processData.selected_fees.filter(fee => !fee.linked_professional_type).length > 0;
                const isNoProfStep = noProfTypes.includes(step.type) && stepSelected;
                
                // Só contar se estiver REALMENTE selecionado (com profissional ou dados)
                if (stepProfessional || stepHasTaxes || isNoProfStep) {
                  stepNumber++;
                }
              });
              stepNumber++; // Incrementar para o passo atual (prova)
              
              return (() => {
                const pcdFee = processData.selected_fees.find((fee: Fee) => fee.linked_professional_type === 'prova');
                const pcdFeeAmount = pcdFee ? parseFloat(String(pcdFee.amount)).toFixed(2) : '0.00';
                const medicoFeeForBonus = processData.selected_fees.find((fee: Fee) => fee.linked_professional_type === 'medico');
                const medicoBonus = medicoFeeForBonus ? parseFloat(String(medicoFeeForBonus.amount)) * 2 : 0;
                const totalWithPCD = (processData.selected_fees.reduce((sum: number, fee: Fee) => sum + parseFloat(String(fee.amount)), 0) + medicoBonus).toFixed(2);
                return `
                <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
                  <!-- Bloco PCD principal -->
                  <div style="border: 2px solid black; border-radius: 5px; background: white; width: 100%; box-sizing: border-box;">
                    <!-- Cabeçalho -->
                    <div class="step-header" style="border-bottom: 1px solid #ccc;">
                        <div class="step-icon" style="font-size: 28px;">♿</div>
                        <div class="step-number-and-title">
                            <p class="step-number-text"><strong>(${stepNumber}º) PASSO</strong></p>
                            <div class="step-title"><strong>AGENDAMENTO PROVA DE DIREÇÃO PCD</strong></div>
                        </div>
                    </div>
                    <!-- Conteúdo em duas colunas -->
                    <div style="display: flex; gap: 0; align-items: stretch; min-height: 110px;">
                      <!-- Coluna esquerda: passos + QR code -->
                      <div style="flex: 1; padding: 10px 12px; border-right: 1px solid #ccc; font-size: 12px; line-height: 1.8; color: black;">
                          <div><strong>1º Passo:</strong> Pagar a Taxa</div>
                          <div><strong>2º Passo:</strong> Enviar uma mensagem WhatsApp para</div>
                          <div style="display: flex; align-items: center; gap: 10px; margin-top: 6px;">
                              <strong style="font-size: 13px;">(47) 99227-4189</strong>
                              <img src="https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=https://wa.me/5547992274189" alt="QR WhatsApp" style="width: 72px; height: 72px; display: block;" />
                          </div>
                      </div>
                      <!-- Coluna direita: aviso -->
                      <div style="flex: 1.2; padding: 10px 14px; display: flex; flex-direction: column; justify-content: space-between;">
                          <p style="font-size: 11.5px; font-weight: bold; color: black; line-height: 1.5; margin: 0; text-align: justify;">
                            ATENÇÃO: O DETRAN não fornece veículo para a prova de direção. O condutor deve apresentar seu próprio veículo, já configurado com as restrições indicadas pelo médico na CNH. Se sua CNH estiver vencida, a prova deve ser realizada em uma autoescola ou em veículo com duplo comando de um instrutor autônomo.
                          </p>
                          <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
                            <span style="font-size: 12.5px; font-weight: bold; color: black; background-color: #f5f5f5; padding: 4px 10px; border: 2px solid black; border-radius: 4px; white-space: nowrap;">TAXA: R$ ${pcdFeeAmount}</span>
                          </div>
                      </div>
                    </div>
                  </div>

                  <!-- Total + aviso CNH -->
                  <div style="display: flex; gap: 10px; align-items: center; justify-content: space-between; width: 100%;">
                    <div style="background-color: white; border: 2px solid black; padding: 9px; border-radius: 5px; text-align: center; max-width: 400px;">
                      <div style="font-size: 12px; font-weight: bold; color: black; line-height: 1.3;">⚠️ ATENÇÃO: PRAZO PARA RETIRAR A CNH/PID FÍSICA SERÁ DE 180 DIAS, CONTANDO A PARTIR DA DATA DA SUA EMISSÃO</div>
                    </div>
                    <div class="total-amount-card">
                      <div class="total-amount-box">
                          <div class="total-amount-text"><strong>VALOR TOTAL: R$ ${totalWithPCD}</strong></div>
                          ${TOXICOLOGICO_ATIVO && processData.show_toxicologico_habilitacao && !isAdicaoCategoria ? `<div style="font-size: 10px; font-weight: bold; color: black; margin-top: 3px;">+ Valor do Toxicológico</div>` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              `})();
            })()}
        </div>

        <!-- General Instructions -->
        ${generalInstructions ? `
        <div class="instructions">
            <div class="instructions-content">
                ${generalInstructions}
            </div>
        </div>
        ` : ''}

    </div>
    <script>
        // Auto-adjust font size to fit content in one page
        window.addEventListener('load', function() {
            const container = document.querySelector('.container');
            const instructions = document.querySelector('.instructions-content');
            
            if (!container || !instructions) {
                if (container) container.setAttribute('data-adjusted', 'true');
                return;
            }

            // Reset all paragraph/list margins immediately on load
            instructions.querySelectorAll('p, li, ul, ol, br, span').forEach(function(el) {
                el.style.setProperty('margin', '0', 'important');
                el.style.setProperty('padding', '0', 'important');
                el.style.setProperty('line-height', '1.1', 'important');
            });
            
            // Maximum height in pixels (287mm = ~1084px at 96dpi)
            const maxHeight = 1084;
            let fontSize = 14; // Start with default size
            let attempts = 0;
            const maxAttempts = 50; // Increased attempts
            
            function adjustFontSize() {
                const currentHeight = container.offsetHeight;
                
                if (currentHeight > maxHeight && fontSize > 5 && attempts < maxAttempts) {
                    fontSize -= 0.3; // Smaller steps for finer control
                    instructions.style.setProperty('font-size', fontSize + 'px', 'important');
                    instructions.style.setProperty('line-height', '1.1', 'important');
                    // Reset margins on all child elements
                    instructions.querySelectorAll('p, li, ul, ol, br').forEach(function(el) {
                        el.style.setProperty('margin', '0', 'important');
                        el.style.setProperty('padding', '0', 'important');
                        el.style.setProperty('line-height', '1.1', 'important');
                    });
                    attempts++;
                    
                    // Use requestAnimationFrame to ensure DOM has updated
                    requestAnimationFrame(adjustFontSize);
                } else {
                    // Check if we succeeded or exhausted attempts
                    if (currentHeight <= maxHeight) {
                        // Success!
                        container.setAttribute('data-adjusted', 'true');
                    } else if (fontSize <= 5) {
                        // Try one last time with tighter line-height
                        instructions.style.setProperty('line-height', '1.0', 'important');
                        requestAnimationFrame(() => {
                            // Mark as complete regardless of fit
                            container.setAttribute('data-adjusted', 'true');
                        });
                    } else {
                        // Mark as complete regardless of fit
                        container.setAttribute('data-adjusted', 'true');
                    }
                }
            }
            
            adjustFontSize();
        });

        // Ocultar ponto e vírgula apenas na impressão
        window.addEventListener('load', function() {
            const container = document.querySelector('.container');
            if (container) {
                const walker = document.createTreeWalker(
                    container,
                    NodeFilter.SHOW_TEXT,
                    null
                );
                
                const nodesToReplace = [];
                let node;
                
                while (node = walker.nextNode()) {
                    if (node.textContent.includes(';')) {
                        nodesToReplace.push(node);
                    }
                }
                
                nodesToReplace.forEach(textNode => {
                    const parent = textNode.parentNode;
                    const text = textNode.textContent;
                    const parts = text.split(';');
                    
                    const fragment = document.createDocumentFragment();
                    parts.forEach((part, index) => {
                        fragment.appendChild(document.createTextNode(part));
                        if (index < parts.length - 1) {
                            const semicolon = document.createElement('span');
                            semicolon.className = 'hide-semicolon-print';
                            semicolon.textContent = ';';
                            fragment.appendChild(semicolon);
                        }
                    });
                    
                    parent.replaceChild(fragment, textNode);
                });
            }
        });
    </script>
</body>
</html>`;
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'foto':
        return '📷';
      case 'taxa':
        return '💰';
      case 'medico':
        return '👨‍⚕️';
      case 'psicologo':
        return '🧠';
      case 'prova':
        return '📝';
      case 'toxicologico':
        return '🧪';
      default:
        return '📋';
    }
  };

  const generateEmailContent = () => {
    let content = `SIGA O PASSO A PASSO\n`;
    content += `\n======================================\n\n`;

    // Tipos de etapas que só devem aparecer se estiverem selecionadas
    const conditionalTypes = ['curso_teorico', 'prova_teorica', 'curso_pratico', 'prova_pratica'];

    // Filtrar etapas (excluindo prova para processar separadamente e etapas condicionais não selecionadas)
    const isAdicaoCategoriaText = processData.client_name === 'Adição de Categoria A' || processData.client_name === 'Adição de Categoria B';
    const filteredSteps = (processData.all_steps || processData.selected_steps).filter((step: any) => {
      if (step.type === 'prova') return false;
      // Nunca mostrar curso_teorico para Adição de Categoria A/B
      if (step.type === 'curso_teorico' && isAdicaoCategoriaText) return false;
      // Para etapas condicionais, só mostrar se selecionadas
      if (conditionalTypes.includes(step.type)) {
        return processData.selected_steps.find((s: any) => s.id === step.id);
      }
      return true;
    });
    let stepCounter = 0;

    // Tipos de etapas que não precisam de credenciado
    const noProfessionalTypes = ['curso_teorico', 'prova_teorica', 'curso_pratico', 'prova_pratica'];

    // Apenas incluir steps que têm dados (profissionais selecionados, taxas ou etapas sem credenciado)
    filteredSteps.forEach((step: any) => {
      const isSelected = processData.selected_steps.find((s: any) => s.id === step.id);
      const professional = isSelected ? processData.selected_professionals[step.id.toString()] : null;
      
      // Para taxas, verificar se há taxas não vinculadas selecionadas
      const hasTaxesSelected = step.type === 'taxa' && isSelected && 
        processData.selected_fees.filter((fee: any) => !fee.linked_professional_type).length > 0;
      
      // Etapas que não precisam de credenciado
      const isNoProfessionalStep = noProfessionalTypes.includes(step.type) && isSelected;
      
      const hasData = professional || hasTaxesSelected || isNoProfessionalStep;
      
      // Só incluir no email se tiver dados
      if (!hasData) return;
      
      stepCounter++;

      content += `${getStepIcon(step.type)} ${step.name.toUpperCase()}\n`;
      content += `(${stepCounter}° PASSO)\n`;
      content += `${'-'.repeat(40)}\n`;

      if (isNoProfessionalStep && !professional) {
        // Etapas sem credenciado - exibir descrição e obs
        if (step.description) {
          content += `${step.description}\n`;
        }
        if (step.obs) {
          content += `Obs.: ${step.obs}\n`;
        }
        if (!step.description && !step.obs) {
          content += `Etapa selecionada\n`;
        }
      } else if (professional) {
        content += `${professional.name}\n`;
        
        if (professional.address || professional.city_name) {
          const location = professional.address 
            ? `${professional.address}${professional.city_name ? ` - ${professional.city_name}` : ''}`
            : professional.city_name || '';
          content += `${location}\n`;
        }
        
        if (professional.attendance_type) {
          content += `\n${professional.attendance_type}:\n`;
          if (professional.phone) {
            content += `${professional.phone} - Somente mensagem WhatsApp\n`;
          }
        }
        
        if (professional.email) {
          content += `EMAIL: ${professional.email}\n`;
        }
        
        if (professional.working_days) {
          try {
            const days = JSON.parse(professional.working_days);
            const dayLabels: Record<string, string> = {
              'monday': 'Seg',
              'tuesday': 'Ter', 
              'wednesday': 'Qua',
              'thursday': 'Qui',
              'friday': 'Sex',
              'saturday': 'Sáb',
              'sunday': 'Dom'
            };
            const daysList = days.map((day: string) => dayLabels[day] || day).join(', ');
            content += `DIAS: ${daysList}\n`;
          } catch {
            content += `DIAS: ${professional.working_days}\n`;
          }
        }
        
        if (professional.working_hours) {
          content += `HORÁRIO: ${professional.working_hours}\n`;
        }
        
        if (professional.observations) {
          content += `OBSERVAÇÕES: ${professional.observations}\n`;
        }
        
        // Taxa vinculada
        const linkedFee = processData.selected_fees.find((fee: any) => fee.linked_professional_type === step.type);
        if (linkedFee) {
          content += `TAXA: R$ ${parseFloat(linkedFee.amount).toFixed(2)}\n`;
        }
        
        // Mensagem toxicológico
        if (step.type === 'medico' && processData.show_toxicologico_message) {
          content += `\n>> LEVAR O TOXICOLÓGICO <<\n`;
        }
        
      } else if (step.type === 'taxa') {
        content += `TAXAS A PAGAR:\n`;
        processData.selected_fees.filter((fee: any) => !fee.linked_professional_type).forEach((fee: any) => {
          content += `• ${fee.name}: R$ ${parseFloat(fee.amount).toFixed(2)}\n`;
        });
      }
      
      content += `\n`;
    });

    // Processar etapa de prova separadamente
    const allSteps = processData.all_steps || processData.selected_steps;
    const provaStep = allSteps.find((step: any) => step.type === 'prova');
    if (provaStep) {
      const isSelected = processData.selected_steps.find((s: any) => s.id === provaStep.id);
      const professional = isSelected ? processData.selected_professionals[provaStep.id.toString()] : null;
      
      if (professional) {
        // Calcular o número do passo
        let provaStepNumber = filteredSteps.filter((step: any) => {
          const stepSelected = processData.selected_steps.find((s: any) => s.id === step.id);
          const stepProfessional = stepSelected ? processData.selected_professionals[step.id.toString()] : null;
          const stepHasTaxes = step.type === 'taxa' && stepSelected && 
            processData.selected_fees.filter((fee: any) => !fee.linked_professional_type).length > 0;
          const isNoProfStep = noProfessionalTypes.includes(step.type) && stepSelected;
          return stepProfessional || stepHasTaxes || isNoProfStep;
        }).length + 1;
        
        content += `📝 PROVA\n`;
        content += `(${provaStepNumber}° PASSO)\n`;
        content += `${'-'.repeat(40)}\n`;
        content += `${professional.name}\n`;
        
        if (professional.attendance_type) {
          content += `${professional.attendance_type}:\n`;
          if (professional.phone) {
            content += `${professional.phone} - Somente mensagem WhatsApp\n`;
          }
        }
        
        if (professional.email) {
          content += `EMAIL: ${professional.email}\n`;
        }
        
        if (professional.observations) {
          content += `OBS: ${professional.observations}\n`;
        }
        
        content += `\n`;
      }
    }

    // Valor total
    content += `======================================\n`;
    content += `VALOR TOTAL: R$ ${parseFloat(processData.total_amount).toFixed(2)}\n`;
    if (TOXICOLOGICO_ATIVO && processData.show_toxicologico_habilitacao && !isAdicaoCategoria) {
      content += `+ Valor do Toxicológico\n`;
    }
    content += `======================================\n\n`;

    // Aviso sobre prazo para retirada da CNH
    content += `⚠️  AVISO IMPORTANTE:\n`;
    content += `ATENÇÃO: PRAZO PARA RETIRAR A CNH/PID FÍSICA SERÁ DE 180 DIAS, CONTANDO A PARTIR DA DATA DA SUA EMISSÃO\n`;
    content += `${'-'.repeat(40)}\n\n`;

    // Verificar se exame psicológico não foi selecionado
    const allStepsForEmail = processData.all_steps || processData.selected_steps;
    const psicologoStep = allStepsForEmail.find(step => step.type === 'psicologo');
    
    if (psicologoStep) {
      const isPsicologoSelected = processData.selected_steps.find(s => s.id === psicologoStep.id);
      const hasPsicologoProfessional = isPsicologoSelected ? processData.selected_professionals[psicologoStep.id.toString()] : null;
      
      if (!hasPsicologoProfessional) {
        content += `⚠️  AVISO IMPORTANTE:\n`;
        content += `ATENÇÃO: O CONDUTOR OPTOU POR NÃO COLOCAR O EAR NA SUA CNH\n`;
        content += `${'-'.repeat(40)}\n\n`;
      }
    }

    // Instruções gerais
    if (generalInstructions) {
      content += `INSTRUÇÕES GERAIS:\n`;
      content += `${'-'.repeat(40)}\n`;
      
      // Processar instruções preservando formatação de listas e parágrafos
      const plainTextInstructions = generalInstructions
        .replace(/<br\s*\/?>/gi, '\n')           // Replace <br> tags with line breaks
        .replace(/<\/p>/gi, '\n\n')              // Replace closing </p> with double line break
        .replace(/<p[^>]*>/gi, '')               // Remove opening <p> tags
        .replace(/<li[^>]*>/gi, '• ')            // Replace <li> with bullet point
        .replace(/<\/li>/gi, '\n')               // Replace closing </li> with line break
        .replace(/<ul[^>]*>|<\/ul>/gi, '\n')     // Replace <ul> tags with line break
        .replace(/<ol[^>]*>|<\/ol>/gi, '\n')     // Replace <ol> tags with line break
        .replace(/<strong[^>]*>|<\/strong>/gi, '') // Remove <strong> tags
        .replace(/<em[^>]*>|<\/em>/gi, '')       // Remove <em> tags
        .replace(/<[^>]*>/g, '')                 // Remove any remaining HTML tags
        .replace(/&nbsp;/g, ' ')                 // Replace &nbsp; with spaces
        .replace(/&amp;/g, '&')                  // Replace &amp; with &
        .replace(/&lt;/g, '<')                   // Replace &lt; with <
        .replace(/&gt;/g, '>')                   // Replace &gt; with >
        .replace(/&quot;/g, '"')                 // Replace &quot; with "
        .replace(/;/g, ';\n\n')                  // Replace semicolon with semicolon + double line break
        .replace(/\n{3,}/g, '\n\n')              // Replace 3+ line breaks with double line break
        .trim();
      
      content += `${plainTextInstructions}\n\n`;
    }

    // Rodapé
    content += `Documento gerado pelo PAP - Sistema - ${new Date().toLocaleDateString('pt-BR')}\n`;
    if (currentUserName) {
      content += `Enviado por: ${currentUserName}\n`;
    }

    return content;
  };

  // Quando autoPrint está ativo, mostra apenas loading enquanto prepara — o useEffect dispara handlePrint() ao terminar
  if (autoPrint) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-700 font-medium">Preparando impressão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-auto">
        {/* Header Controls */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Passo a Passo - Visualização</h2>
          <div className="flex items-center space-x-2">
            {isLoading && (
              <span className="text-sm text-gray-600 mr-2">Carregando instruções...</span>
            )}
            <button
              onClick={() => setEmailModal({ isOpen: true, email: '' })}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="w-4 h-4" />
              <span>Enviar por Email</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

          {/* Preview Content */}
        <div className="p-8">
          <div className="max-w-none">
            {/* Header */}
            <div className="flex items-center mb-8 pb-4 border-b-2 border-black">
              <div className="flex items-center space-x-4">
                {logoUrl && (
                  <img 
                    src={logoUrl} 
                    alt="Logo da Agência" 
                    className="max-h-16 max-w-32 object-contain"
                  />
                )}
                <div>
                  <h1 className="text-3xl font-bold">SIGA O PASSO A PASSO</h1>
                </div>
              </div>
            </div>

            {/* Steps Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(() => {
                const filteredSteps = (processData.all_steps || processData.selected_steps).filter(step => step.type !== 'prova');
                let stepCounter = 0;
                
                // Tipos de etapas que não precisam de credenciado
                const noProfessionalTypes = ['curso_teorico', 'prova_teorica', 'curso_pratico', 'prova_pratica'];
                
                return filteredSteps.map((step) => {
                  const isSelected = processData.selected_steps.find(s => s.id === step.id);
                  const professional = isSelected ? processData.selected_professionals[step.id.toString()] : null;
                  
                  // Para taxas, verificar se há taxas não vinculadas selecionadas
                  const hasTaxesSelected = step.type === 'taxa' && isSelected && 
                    processData.selected_fees.filter(fee => !fee.linked_professional_type).length > 0;
                  
                  // Etapas que não precisam de credenciado
                  const isNoProfessionalStep = noProfessionalTypes.includes(step.type) && isSelected;
                  
                  // Incrementar contador apenas se há dados para exibir
                  const hasData = professional || hasTaxesSelected || isNoProfessionalStep;
                  if (hasData) {
                    stepCounter++;
                  }
                  
                  const stepNumber = stepCounter;
                
                return (
                  <div key={step.id} className={`border-2 border-black ${(() => {
                    // Buscar taxa vinculada a este tipo de profissional para ajustar altura
                    const linkedFee = step.type === 'curso_pratico'
                      ? processData.selected_fees.find(fee => fee.name === 'LADV')
                      : processData.selected_fees.find(fee => fee.linked_professional_type === step.type);
                    return linkedFee && (professional || step.type === 'curso_pratico') ? 'min-h-[220px]' : 'min-h-[200px]';
                  })()}`}>
                    {/* Step Header */}
                    <div className="bg-gray-100 p-3 border-b-2 border-black">
                      <div className="flex items-center space-x-4">
                        <div className="text-4xl">
                          {getStepIcon(step.type)}
                        </div>
                        <div className="flex-1 text-center">
                          {hasData && (
                            <div className="text-lg font-bold">({stepNumber}°) PASSO</div>
                          )}
                          <h3 className="font-bold text-base uppercase mt-1">
                            {step.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className={`p-3 relative ${(() => {
                      // Buscar taxa vinculada a este tipo de profissional para ajustar padding
                      const linkedFee = step.type === 'curso_pratico'
                        ? processData.selected_fees.find(fee => fee.name === 'LADV')
                        : processData.selected_fees.find(fee => fee.linked_professional_type === step.type);
                      return linkedFee && (professional || step.type === 'curso_pratico') ? 'pb-10' : '';
                    })()}`}>
                      {professional ? (
                        <div className="space-y-2">
                          <h4 className="font-bold text-sm uppercase">
                            {professional.name}
                          </h4>
                          
                          {(professional.address || professional.city_name) && (
                            <p className="text-xs">
                              {professional.address}{professional.address && professional.city_name ? ' - ' : ''}{professional.city_name}
                            </p>
                          )}
                          
                          {professional.attendance_type && (
                            <div className="mt-3">
                              <p className="text-xs font-bold">{professional.attendance_type}:</p>
                              {professional.phone && (
                                <p className="text-sm">
                                  {professional.phone} - Somente mensagem WhatsApp
                                </p>
                              )}
                            </div>
                          )}
                          
                          {professional.email && (
                            <div className="mt-2">
                              <p className="text-xs">
                                <strong>Email:</strong> {professional.email}
                              </p>
                            </div>
                          )}
                          
                          {(professional.working_days || professional.working_hours) && (
                            <div className="mt-3 space-y-1">
                              {professional.working_days && (
                                <p className="text-xs">
                                  <strong>Dias:</strong> {(() => {
                                    try {
                                      const days = JSON.parse(professional.working_days);
                                      const dayLabels: Record<string, string> = {
                                        'monday': 'Seg',
                                        'tuesday': 'Ter',
                                        'wednesday': 'Qua',
                                        'thursday': 'Qui',
                                        'friday': 'Sex',
                                        'saturday': 'Sáb',
                                        'sunday': 'Dom'
                                      };
                                      return days.map((day: string) => dayLabels[day as keyof typeof dayLabels] || day).join(', ');
                                    } catch {
                                      return professional.working_days;
                                    }
                                  })()}
                                </p>
                              )}
                              {professional.working_hours && (
                                <p className="text-xs">
                                  <strong>Horário:</strong> {professional.working_hours}
                                </p>
                              )}
                            </div>
                          )}
                          
                          {professional.observations && (
                            <div className="mt-3">
                              <p className="text-xs">
                                {professional.observations}
                              </p>
                            </div>
                          )}
                          
                          {(() => {
                            // Buscar taxa vinculada a este tipo de profissional
                            const linkedFee = step.type === 'curso_pratico'
                              ? processData.selected_fees.find(fee => fee.name === 'LADV')
                              : processData.selected_fees.find(fee => fee.linked_professional_type === step.type);
                            return linkedFee ? (
                              <div className="absolute bottom-1 right-1">
                                <div className="bg-gray-100 border border-black px-2 py-1 rounded text-xs font-bold shadow-sm">
                                  {step.type === 'curso_pratico' ? `TAXA LADV: R$ ${parseFloat(linkedFee.amount).toFixed(2)}` : `R$ ${parseFloat(linkedFee.amount).toFixed(2)}`}
                                </div>
                              </div>
                            ) : null;
                          })()}
                          
                          {/* Toxicológico message for medical exam */}
                          {step.type === 'medico' && processData.show_toxicologico_message && (
                            <div className="mt-3 text-center">
                              <p className="text-xs font-bold text-black">
                                LEVAR O TOXICOLÓGICO
                              </p>
                            </div>
                          )}
                        </div>
                      ) : isNoProfessionalStep ? (
                        <div className="space-y-2 p-2 relative">
                          {step.description && (
                            <p className="text-xs font-bold text-black">{step.description}</p>
                          )}
                          {step.obs && (
                            <p className="text-xs font-bold text-black">Obs.: {step.obs}</p>
                          )}
                          {!step.description && !step.obs && (
                            <p className="text-xs text-gray-500 text-center">Etapa selecionada</p>
                          )}
                          {step.type === 'curso_pratico' && (() => {
                            const ladvFee = processData.selected_fees.find(fee => fee.name === 'LADV');
                            return ladvFee ? (
                              <div className="absolute bottom-1 right-1">
                                <div className="bg-gray-100 border border-black px-2 py-1 rounded text-xs font-bold shadow-sm">
                                  TAXA LADV: R$ {parseFloat(ladvFee.amount).toFixed(2)}
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      ) : step.type === 'taxa' && isSelected ? (
                        <div className="space-y-2">
                          <h4 className="font-bold text-sm uppercase">
                            TAXAS A PAGAR:
                          </h4>
                          {processData.selected_fees.filter(fee => {
                            // Apenas incluir taxas sem vínculo, exceto LADV (exibida no card Curso Prático)
                            return !fee.linked_professional_type && fee.name !== 'LADV';
                          }).map(fee => (
                            <div key={fee.id} className="text-xs">
                              {fee.name}: R$ {parseFloat(fee.amount).toFixed(2)}
                            </div>
                          ))}
                        </div>
                      ) : step.type === 'psicologo' ? (
                        <div className="flex items-center justify-center min-h-[120px] p-3">
                          <div className="text-2xl font-bold text-black leading-tight text-center">ATENÇÃO: O CONDUTOR OPTOU POR NÃO COLOCAR O EAR NA SUA CNH</div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-16">
                          <div className="text-6xl font-bold text-black">✕</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
                });
              })()}
            </div>

            {/* Total Amount Card and Prova Card Container */}
            <div className="flex items-start gap-2 mb-4 justify-between">
              {(() => {
                const allSteps = processData.all_steps || processData.selected_steps;
                const provaStep = allSteps.find(step => step.type === 'prova');
                const isSelected = provaStep ? processData.selected_steps.find(s => s.id === provaStep.id) : false;
                
                if (!provaStep || !isSelected) {
                  return (
                    <div className="w-full flex items-center gap-3 justify-between">
                      <div className="bg-white border-2 border-black p-3 rounded-lg text-center max-w-sm">
                        <div className="text-xs font-bold text-black leading-tight">
                          ⚠️ ATENÇÃO: PRAZO PARA RETIRAR A CNH/PID FÍSICA SERÁ DE 180 DIAS, CONTANDO A PARTIR DA DATA DA SUA EMISSÃO
                        </div>
                      </div>
                      <div className="bg-gray-100 border-2 border-black p-3 rounded-lg text-center flex-shrink-0">
                        <div className="text-sm font-bold text-black">
                          <strong>VALOR TOTAL: R$ {parseFloat(processData.total_amount).toFixed(2)}</strong>
                        </div>
                        {TOXICOLOGICO_ATIVO && processData.show_toxicologico_habilitacao && !isAdicaoCategoria && (
                          <div className="text-xs font-bold text-black mt-1">+ Valor do Toxicológico</div>
                        )}
                      </div>
                    </div>
                  );
                }
                
                const professional = isSelected ? processData.selected_professionals[provaStep.id.toString()] : null;
                
                // Calcular o número do passo baseado nos passos anteriores que têm dados
                let stepNumber = 0;
                const filteredSteps = allSteps.filter(s => s.type !== 'prova');
                const noProfTypes = ['curso_teorico', 'prova_teorica', 'curso_pratico', 'prova_pratica'];
                filteredSteps.forEach(step => {
                  const stepSelected = processData.selected_steps.find(s => s.id === step.id);
                  const stepProfessional = stepSelected ? processData.selected_professionals[step.id.toString()] : null;
                  const stepHasTaxes = step.type === 'taxa' && stepSelected && 
                    processData.selected_fees.filter(fee => !fee.linked_professional_type).length > 0;
                  const isNoProfStep = noProfTypes.includes(step.type) && stepSelected;
                  if (stepProfessional || stepHasTaxes || isNoProfStep) {
                    stepNumber++;
                  }
                });
                stepNumber++; // Incrementar para o passo atual (prova)
                
                return (
                  <>
                    <div className="border-2 border-black w-[480px] min-h-24 flex-shrink-0">
                      {/* Prova Header */}
                      <div className="bg-gray-100 px-2 py-1 border-b-2 border-black flex items-center h-8">
                        <div className="text-xl mr-2">📝</div>
                        <div className="flex-1 text-center">
                          {professional && (
                            <div className="text-sm font-bold">({stepNumber}°) PASSO - PROVA</div>
                          )}
                          {!professional && (
                            <div className="text-sm font-bold">PROVA</div>
                          )}
                        </div>
                      </div>

                      {/* Prova Content */}
                      <div className="p-2 flex flex-col justify-center min-h-[64px]">
                        {professional ? (
                          <div className="space-y-1">
                            <h4 className="font-bold text-sm uppercase">
                              {professional.name}
                            </h4>
                            {professional.attendance_type && (
                              <div className="text-sm">
                                <span className="font-bold">{professional.attendance_type}:</span>
                                {professional.phone && ` ${professional.phone}`}
                              </div>
                            )}
                            {professional.email && (
                              <div className="text-sm mt-1">
                                {professional.email}
                              </div>
                            )}
                            {professional.observations && (
                              <div className="text-sm mt-1">
                                <span className="font-bold">OBS:</span> {professional.observations}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-12">
                            <div className="text-4xl font-bold text-black">✕</div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full flex gap-3 items-center justify-between">
                      <div className="bg-white border-2 border-black p-3 rounded-lg text-center max-w-sm">
                        <div className="text-xs font-bold text-black leading-tight">
                          ⚠️ ATENÇÃO: PRAZO PARA RETIRAR A CNH/PID FÍSICA SERÁ DE 180 DIAS, CONTANDO A PARTIR DA DATA DA SUA EMISSÃO
                        </div>
                      </div>
                      <div className="bg-gray-100 border-2 border-black p-3 rounded-lg text-center flex-shrink-0">
                        <div className="text-sm font-bold text-black">
                          VALOR TOTAL: R$ {parseFloat(processData.total_amount).toFixed(2)}
                        </div>
                        {TOXICOLOGICO_ATIVO && processData.show_toxicologico_habilitacao && !isAdicaoCategoria && (
                          <div className="text-xs font-bold text-black mt-1">+ Valor do Toxicológico</div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* General Instructions */}
            {generalInstructions && (
              <div className="border-t-2 border-black pt-6">
                <div className="leading-[1.2]" style={{ fontSize: 'clamp(10px, 1.5vw, 15px)' }}>
                  <div dangerouslySetInnerHTML={{ 
                    __html: generalInstructions
                  }} />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-black text-center">
              <p className="text-xs">
                Documento gerado pelo PAP - Sistema - {new Date().toLocaleDateString('pt-BR')}
              </p>
              {currentUserName && (
                <p className="text-xs mt-1">
                  Impresso por: {currentUserName}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {emailModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Enviar por Email</h3>
              <button
                onClick={() => setEmailModal({ isOpen: false, email: '' })}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email do destinatário
                </label>
                <input
                  type="email"
                  value={emailModal.email}
                  onChange={(e) => setEmailModal(prev => ({ ...prev, email: e.target.value.toLowerCase() }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="exemplo@email.com"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Isso abrirá seu cliente de email padrão (Gmail, Outlook, etc.) com o conteúdo já carregado.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setEmailModal({ isOpen: false, email: '' })}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={!emailModal.email}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Abrir no Gmail</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
