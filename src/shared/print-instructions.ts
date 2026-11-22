const FIRST_LICENSE_INSTRUCTION_SERVICES = new Set([
  '1º Habilitação',
  'Reinicio (1º Habilitação)',
  'Reabilitação',
  'Adição de Categoria A',
  'Adição de Categoria B'
]);

export interface AgencyInstructionsPayload {
  general_instructions?: string;
  instructions_primeira_habilitacao?: string;
}

export interface InstructionCandidates {
  spacious: string;
  compact: string;
  hasAlternative: boolean;
}

export function stripInstructionHtml(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|li|div|h[1-6])>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeInstructionWeight(html?: string | null): number {
  if (!html) return 0;
  const plain = stripInstructionHtml(html);
  if (!plain) return 0;
  const lineBreaks = (html.match(/<(br|\/p|\/li|\/div)\b/gi) || []).length;
  return plain.length + lineBreaks * 40;
}

export function resolvePrintInstructions(
  service: string | undefined,
  instructions: AgencyInstructionsPayload
): string {
  const preferred = FIRST_LICENSE_INSTRUCTION_SERVICES.has(service || '')
    ? instructions.instructions_primeira_habilitacao || ''
    : instructions.general_instructions || '';
  if (stripInstructionHtml(preferred)) return preferred;
  const alternative = FIRST_LICENSE_INSTRUCTION_SERVICES.has(service || '')
    ? instructions.general_instructions || ''
    : instructions.instructions_primeira_habilitacao || '';
  return stripInstructionHtml(alternative) ? alternative : '';
}

export function resolveInstructionCandidates(
  service: string | undefined,
  instructions: AgencyInstructionsPayload
): InstructionCandidates {
  const first = instructions.general_instructions || '';
  const second = instructions.instructions_primeira_habilitacao || '';

  const firstPlain = stripInstructionHtml(first);
  const secondPlain = stripInstructionHtml(second);

  if (!firstPlain && !secondPlain) {
    return { spacious: '', compact: '', hasAlternative: false };
  }
  if (!firstPlain) {
    return { spacious: second, compact: '', hasAlternative: false };
  }
  if (!secondPlain) {
    return { spacious: first, compact: '', hasAlternative: false };
  }
  if (firstPlain === secondPlain) {
    const preferred = resolvePrintInstructions(service, instructions);
    return { spacious: preferred, compact: '', hasAlternative: false };
  }

  const firstWeight = computeInstructionWeight(first);
  const secondWeight = computeInstructionWeight(second);

  if (firstWeight === secondWeight) {
    const preferred = resolvePrintInstructions(service, instructions);
    const other = preferred === first ? second : first;
    return { spacious: preferred, compact: other, hasAlternative: true };
  }

  return firstWeight > secondWeight
    ? { spacious: first, compact: second, hasAlternative: true }
    : { spacious: second, compact: first, hasAlternative: true };
}
