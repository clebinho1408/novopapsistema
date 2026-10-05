export const REHABILITATION_SERVICE = 'Reabilitação';
export const REHABILITATION_VEHICLE_NOTICE = 'Atenção! Veículos para a prova prática devem atender a Portaria Normativa Detran nº 12/2026, Art. 22: máximo 8 anos (motos), 12 anos (carros), 20 anos (ônibus/caminhões). Requisito: sem débitos em aberto.';

export function shouldShowRehabilitationVehicleNotice(
  service: string | undefined, stepType: string, isSelected: boolean
): boolean {
  return service === REHABILITATION_SERVICE && stepType === 'prova_pratica' && isSelected;
}

export const REHABILITATION_STEP_TYPES = [
  'foto', 'taxa', 'psicologo', 'medico', 'prova_pratica'
] as const;

export function isServiceStepAllowed(service: string | undefined, type: string): boolean {
  return service !== REHABILITATION_SERVICE ||
    REHABILITATION_STEP_TYPES.some(requiredType => requiredType === type);
}