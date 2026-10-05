const FIRST_LICENSE_INSTRUCTION_SERVICES = new Set([
  '1º Habilitação',
  'Reinicio (1º Habilitação)',
  'Reabilitação',
  'Adição de Categoria A',
  'Adição de Categoria B'
]);

export function resolvePrintInstructions(
  service: string | undefined,
  instructions: { general_instructions?: string; instructions_primeira_habilitacao?: string }
): string {
  return FIRST_LICENSE_INSTRUCTION_SERVICES.has(service || '')
    ? instructions.instructions_primeira_habilitacao || ''
    : instructions.general_instructions || '';
}
