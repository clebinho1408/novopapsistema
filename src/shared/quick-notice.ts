export const QUICK_NOTICE_DURATIONS = [2, 4, 8] as const;
export type QuickNoticeDurationHours = (typeof QUICK_NOTICE_DURATIONS)[number];

export interface QuickNoticeCarrier {
  quick_notice?: string | null;
  quick_notice_until?: string | null;
}

export function isValidQuickNoticeDuration(hours: number): hours is QuickNoticeDurationHours {
  return hours === 2 || hours === 4 || hours === 8;
}

export function computeQuickNoticeUntil(durationHours: number, nowMs = Date.now()): string {
  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    throw new Error('Duração do aviso rápido deve ser maior que zero');
  }
  return new Date(nowMs + durationHours * 60 * 60 * 1000).toISOString();
}

export function getActiveQuickNotice(
  professional: QuickNoticeCarrier | null | undefined,
  nowMs = Date.now()
): string | null {
  if (!professional) return null;
  const message = typeof professional.quick_notice === 'string' ? professional.quick_notice.trim() : '';
  if (!message) return null;
  if (!professional.quick_notice_until) return null;
  const untilMs = new Date(professional.quick_notice_until).getTime();
  if (!Number.isFinite(untilMs) || untilMs <= nowMs) return null;
  return message;
}

export function escapeQuickNoticeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
