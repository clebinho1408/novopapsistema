export const LADV_AUTO_SELECT_SERVICES = [
  '1º Habilitação',
  'Reinicio (1º Habilitação)',
  'Adição de Categoria A',
  'Adição de Categoria B',
] as const;

export const ADICAO_CATEGORIA_SERVICES = [
  'Adição de Categoria A',
  'Adição de Categoria B',
] as const;

export function isLadvFeeName(name?: string | null): boolean {
  return (name ?? '').trim().toUpperCase() === 'LADV';
}

export function findLadvFee<T extends { name?: string | null }>(fees: T[]): T | undefined {
  return fees.find((fee) => isLadvFeeName(fee.name));
}

export function shouldAutoSelectLadv(serviceName?: string | null): boolean {
  if (!serviceName) return false;
  return (LADV_AUTO_SELECT_SERVICES as readonly string[]).includes(serviceName);
}

export function isAdicaoCategoriaServiceName(serviceName?: string | null): boolean {
  if (!serviceName) return false;
  return (ADICAO_CATEGORIA_SERVICES as readonly string[]).includes(serviceName);
}

export function getGroupedStepTypesForService(serviceName?: string | null): string[] {
  if (isAdicaoCategoriaServiceName(serviceName)) {
    return ['curso_pratico', 'prova_pratica'];
  }
  return ['prova_teorica', 'curso_pratico', 'prova_pratica'];
}

export function formatCursoPraticoLadvBadge(amount: string | number): string {
  const numeric = typeof amount === 'number' ? amount : parseFloat(String(amount));
  const safeValue = Number.isFinite(numeric) ? numeric : 0;
  return `TAXA LADV: R$ ${safeValue.toFixed(2)}`;
}
