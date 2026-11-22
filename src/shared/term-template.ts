export const TERM_TEMPLATE_SERVICES = [
  '1º Habilitação',
  'Renovação + PCD',
  'Reinicio (1º Habilitação)',
  'Reabilitação',
  'Adição de Categoria A',
  'Adição de Categoria B',
] as const;

export const HIDE_TERM_SERVICES = [
  'Alteração de Dados',
  'Renovação',
  'Transferência + Renovação',
  'Transferência + Alteração de Dados',
  'Transferência + Definitiva',
  'Estrangeiro',
] as const;

export const TERM_TEMPLATE_MAX_BYTES = 5 * 1024 * 1024;

export function serviceUsesTermTemplate(service?: string): boolean {
  return TERM_TEMPLATE_SERVICES.some(name => name === service);
}

export function shouldHideTermStep(service?: string): boolean {
  if (!service) return false;
  return HIDE_TERM_SERVICES.some(name => name === service);
}

export function shouldPrintTermTemplate(params: {
  includeTerm?: boolean | null;
  clientName?: string;
  hasProvaPratica: boolean;
}): boolean {
  if (typeof params.includeTerm === 'boolean') {
    return params.includeTerm;
  }
  return params.hasProvaPratica && serviceUsesTermTemplate(params.clientName);
}

export interface TermTemplateSettings {
  enabled: boolean;
  filename: string | null;
  size: number | null;
  updated_at: string | null;
  file_url: string | null;
}
