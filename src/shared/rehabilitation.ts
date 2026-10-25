export const REHABILITATION_SERVICE = 'Reabilitação';
export const REHABILITATION_VEHICLE_NOTICE = 'Atenção! Veículos para a prova prática devem atender a Portaria Normativa Detran nº 12/2026, Art. 22: máximo 8 anos (motos), 12 anos (carros), 20 anos (ônibus/caminhões). Requisito: sem débitos em aberto.';

export function shouldShowRehabilitationVehicleNotice(
  service: string | undefined, stepType: string, isSelected: boolean
): boolean {
  return service === REHABILITATION_SERVICE && stepType === 'prova_pratica' && isSelected;
}

export const REHABILITATION_STEP_TYPES = [
  'foto', 'taxa', 'psicologo', 'medico', 'prova_teorica', 'prova_pratica'
] as const;

// Only Reabilitação overrides the configured order; never mutate shared arrays.
export function orderServiceSteps<T extends { type: string }>(service: string | undefined, steps: T[]): T[] {
  if (service !== REHABILITATION_SERVICE) return steps;
  const rank = (type: string) => {
    const index = REHABILITATION_STEP_TYPES.findIndex(required => required === type);
    return index < 0 ? REHABILITATION_STEP_TYPES.length : index;
  };
  return [...steps].sort((a, b) => rank(a.type) - rank(b.type));
}

export function isServiceStepAllowed(service: string | undefined, type: string): boolean {
  return service !== REHABILITATION_SERVICE ||
    REHABILITATION_STEP_TYPES.some(requiredType => requiredType === type);
}