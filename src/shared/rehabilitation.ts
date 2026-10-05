export const REHABILITATION_SERVICE = 'Reabilitação';
export const REHABILITATION_STEP_TYPES = [
  'foto', 'taxa', 'psicologo', 'medico', 'prova_pratica'
] as const;

export function isServiceStepAllowed(service: string | undefined, type: string): boolean {
  return service !== REHABILITATION_SERVICE ||
    REHABILITATION_STEP_TYPES.some(requiredType => requiredType === type);
}