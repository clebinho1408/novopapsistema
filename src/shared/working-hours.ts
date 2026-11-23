const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const DAY_ABBR: Record<string, string> = {
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
  saturday: 'Sáb',
  sunday: 'Dom',
};

const DAY_FULL: Record<string, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export interface DayWorkingHours {
  start: string;
  end: string;
  start2?: string;
  end2?: string;
}

export type WorkingHoursMap = Record<string, DayWorkingHours>;

export interface FormattedWorkingSchedule {
  summaryLines: string[];
  daysText: string | null;
  rawHoursText: string | null;
}

function hasSecondPeriod(entry?: DayWorkingHours): boolean {
  return Boolean(entry?.start2?.trim() && entry?.end2?.trim());
}

function formatDayIntervals(entry: DayWorkingHours | undefined, useAs: boolean): string {
  const sep = useAs ? ' às ' : ' - ';
  const first = `${entry?.start ?? ''}${sep}${entry?.end ?? ''}`;
  if (hasSecondPeriod(entry)) {
    const second = `${entry?.start2?.trim() ?? ''} às ${entry?.end2?.trim() ?? ''}`;
    return `${first} - ${second}`;
  }
  return first;
}

function sameDaySchedule(a?: DayWorkingHours, b?: DayWorkingHours): boolean {
  return (
    (a?.start ?? '') === (b?.start ?? '') &&
    (a?.end ?? '') === (b?.end ?? '') &&
    (a?.start2?.trim() ?? '') === (b?.start2?.trim() ?? '') &&
    (a?.end2?.trim() ?? '') === (b?.end2?.trim() ?? '')
  );
}

function scheduleKey(entry?: DayWorkingHours): string {
  return [
    (entry?.start ?? '').trim(),
    (entry?.end ?? '').trim(),
    (entry?.start2 ?? '').trim(),
    (entry?.end2 ?? '').trim(),
  ].join('|');
}

function areContiguousDays(days: string[]): boolean {
  if (days.length < 2) return false;
  const indices = days.map((d) => DAY_ORDER.indexOf(d as (typeof DAY_ORDER)[number]));
  if (indices.some((idx) => idx === -1)) return false;
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) return false;
  }
  return true;
}

export function sanitizeWorkingHoursMap(map: WorkingHoursMap): WorkingHoursMap {
  const cleaned: WorkingHoursMap = {};
  for (const [day, entry] of Object.entries(map)) {
    if (!entry) continue;
    const item: DayWorkingHours = {
      start: entry.start || '',
      end: entry.end || '',
    };
    if (entry.start2?.trim() || entry.end2?.trim()) {
      item.start2 = entry.start2?.trim() || '';
      item.end2 = entry.end2?.trim() || '';
    }
    cleaned[day] = item;
  }
  return cleaned;
}

export function formatWorkingDaysList(workingDays?: string | null): string | null {
  if (!workingDays) return null;
  try {
    const parsed = JSON.parse(workingDays);
    if (Array.isArray(parsed)) {
      const formatted = parsed
        .map((day) => DAY_ABBR[String(day)] || String(day))
        .filter(Boolean)
        .join(', ');
      return formatted || null;
    }
  } catch {
    // Plain text fallback
  }
  return workingDays.trim() || null;
}

export function formatWorkingSchedule(
  workingDays?: string | null,
  workingHours?: string | null
): FormattedWorkingSchedule {
  const daysText = formatWorkingDaysList(workingDays);

  if (workingHours) {
    try {
      const hoursObj = JSON.parse(workingHours);
      if (hoursObj && typeof hoursObj === 'object' && !Array.isArray(hoursObj)) {
        const record = hoursObj as Record<string, DayWorkingHours | undefined>;
        let selectedDays: string[] = [];

        if (workingDays) {
          try {
            const parsedDays = JSON.parse(workingDays);
            if (Array.isArray(parsedDays)) {
              const filtered = parsedDays.map(String).filter((d) => Boolean(record[d]));
              const dayIndex = (day: string) => {
                const idx = DAY_ORDER.indexOf(day as (typeof DAY_ORDER)[number]);
                return idx === -1 ? DAY_ORDER.length : idx;
              };
              selectedDays = [...new Set(filtered)].sort((a, b) => dayIndex(a) - dayIndex(b));
            }
          } catch {
            selectedDays = [];
          }
        }

        if (selectedDays.length === 0) {
          selectedDays = DAY_ORDER.filter((d) => Boolean(record[d]));
          for (const key of Object.keys(record)) {
            if (!selectedDays.includes(key) && record[key]) {
              selectedDays.push(key);
            }
          }
        }

        if (selectedDays.length > 0) {
          const firstSchedule = record[selectedDays[0]];
          const anySecondPeriod = selectedDays.some((d) => hasSecondPeriod(record[d]));
          const allSame =
            Boolean(firstSchedule) &&
            selectedDays.every((d) => sameDaySchedule(record[d], firstSchedule));

          if (allSame && selectedDays.length > 1) {
            if (areContiguousDays(selectedDays)) {
              const first = DAY_FULL[selectedDays[0]] || selectedDays[0];
              const last =
                DAY_FULL[selectedDays[selectedDays.length - 1]] ||
                selectedDays[selectedDays.length - 1];
              return {
                summaryLines: [
                  `(${first} a ${last}: ${formatDayIntervals(firstSchedule, anySecondPeriod)})`,
                ],
                daysText: null,
                rawHoursText: null,
              };
            }
            const dayLabels = selectedDays.map((d) => DAY_ABBR[d] || d).join(', ');
            return {
              summaryLines: [
                `(${dayLabels}: ${formatDayIntervals(firstSchedule, true)})`,
              ],
              daysText: null,
              rawHoursText: null,
            };
          }

          if (allSame && selectedDays.length === 1) {
            const d = selectedDays[0];
            return {
              summaryLines: [
                `(${DAY_FULL[d] || DAY_ABBR[d] || d}: ${formatDayIntervals(firstSchedule, anySecondPeriod)})`,
              ],
              daysText: null,
              rawHoursText: null,
            };
          }

          const groups: Array<{ days: string[]; entry: DayWorkingHours | undefined }> = [];
          const groupIndexByKey = new Map<string, number>();

          for (const day of selectedDays) {
            const entry = record[day];
            const key = scheduleKey(entry);
            const existingIdx = groupIndexByKey.get(key);
            if (existingIdx !== undefined) {
              groups[existingIdx].days.push(day);
            } else {
              groupIndexByKey.set(key, groups.length);
              groups.push({ days: [day], entry });
            }
          }

          const hasRepeatedGroup = groups.some((g) => g.days.length > 1);
          const useAs = anySecondPeriod || hasRepeatedGroup;
          const items = groups.map((group) => {
            const dayLabels = group.days.map((d) => DAY_ABBR[d] || d).join(', ');
            return `(${dayLabels}: ${formatDayIntervals(group.entry, useAs)})`;
          });

          const chunkSize = anySecondPeriod ? 2 : 3;
          const lines: string[] = [];
          for (let i = 0; i < items.length; i += chunkSize) {
            lines.push(items.slice(i, i + chunkSize).join(' - '));
          }
          return {
            summaryLines: lines,
            daysText: null,
            rawHoursText: null,
          };
        }

        return {
          summaryLines: [],
          daysText,
          rawHoursText: null,
        };
      }
    } catch {
      // Plain text fallback
    }

    return {
      summaryLines: [],
      daysText,
      rawHoursText: workingHours.trim() || null,
    };
  }

  return {
    summaryLines: [],
    daysText,
    rawHoursText: null,
  };
}
