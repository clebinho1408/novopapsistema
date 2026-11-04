export const TERM_TEMPLATE_SERVICES = [
  '1º Habilitação',
  'Renovação + PCD',
  'Reinicio (1º Habilitação)',
  'Reabilitação',
  'Adição de Categoria A',
  'Adição de Categoria B',
] as const;

export const TERM_TEMPLATE_MAX_BYTES = 5 * 1024 * 1024;

export function serviceUsesTermTemplate(service?: string): boolean {
  return TERM_TEMPLATE_SERVICES.some(name => name === service);
}

export interface TermTemplateSettings {
  enabled: boolean;
  filename: string | null;
  size: number | null;
  updated_at: string | null;
  file_url: string | null;
}
