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

export interface FormattedWorkingSchedule {
  summaryLines: string[];
  daysText: string | null;
  rawHoursText: string | null;
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
        const record = hoursObj as Record<string, { start?: string; end?: string } | undefined>;
        let selectedDays: string[] = [];

        if (workingDays) {
          try {
            const parsedDays = JSON.parse(workingDays);
            if (Array.isArray(parsedDays)) {
              selectedDays = parsedDays.map(String).filter((d) => Boolean(record[d]));
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
          const allSame =
            Boolean(firstSchedule) &&
            selectedDays.every(
              (d) =>
                record[d]?.start === firstSchedule?.start &&
                record[d]?.end === firstSchedule?.end
            );

          if (allSame && selectedDays.length > 1) {
            const first = DAY_FULL[selectedDays[0]] || selectedDays[0];
            const last =
              DAY_FULL[selectedDays[selectedDays.length - 1]] ||
              selectedDays[selectedDays.length - 1];
            return {
              summaryLines: [
                `(${first} a ${last}: ${firstSchedule?.start ?? ''} - ${firstSchedule?.end ?? ''})`,
              ],
              daysText: null,
              rawHoursText: null,
            };
          }

          if (allSame && selectedDays.length === 1) {
            const d = selectedDays[0];
            return {
              summaryLines: [
                `(${DAY_FULL[d] || DAY_ABBR[d] || d}: ${firstSchedule?.start ?? ''} - ${firstSchedule?.end ?? ''})`,
              ],
              daysText: null,
              rawHoursText: null,
            };
          }

          const items = selectedDays.map(
            (d) =>
              `(${DAY_ABBR[d] || d}: ${record[d]?.start ?? ''} - ${record[d]?.end ?? ''})`
          );
          const lines: string[] = [];
          for (let i = 0; i < items.length; i += 3) {
            lines.push(items.slice(i, i + 3).join(' - '));
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
