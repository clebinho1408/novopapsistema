import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatWorkingDaysList,
  formatWorkingSchedule,
  sanitizeWorkingHoursMap,
} from './working-hours';

test('formats uniform Monday-Friday JSON schedule into single range line', () => {
  const days = JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const hours = JSON.stringify({
    monday: { start: '12:00', end: '18:00' },
    tuesday: { start: '12:00', end: '18:00' },
    wednesday: { start: '12:00', end: '18:00' },
    thursday: { start: '12:00', end: '18:00' },
    friday: { start: '12:00', end: '18:00' },
  });

  const formatted = formatWorkingSchedule(days, hours);
  assert.deepEqual(formatted.summaryLines, ['(Segunda a Sexta: 12:00 - 18:00)']);
  assert.equal(formatted.daysText, null);
  assert.equal(formatted.rawHoursText, null);
});

test('formats two-period day mixed with single-period day using exact requested syntax', () => {
  const days = JSON.stringify(['tuesday', 'monday']);
  const hours = JSON.stringify({
    monday: { start: '08:00', end: '12:00', start2: '13:00', end2: '18:00' },
    tuesday: { start: '08:00', end: '12:00' },
  });

  const formatted = formatWorkingSchedule(days, hours);
  assert.deepEqual(formatted.summaryLines, [
    '(Seg: 08:00 às 12:00 - 13:00 às 18:00) - (Ter: 08:00 às 12:00)',
  ]);
});

test('formats uniform Monday-Friday schedule with two periods into single range line', () => {
  const days = JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const hours = JSON.stringify({
    monday: { start: '08:00', end: '12:00', start2: '13:00', end2: '18:00' },
    tuesday: { start: '08:00', end: '12:00', start2: '13:00', end2: '18:00' },
    wednesday: { start: '08:00', end: '12:00', start2: '13:00', end2: '18:00' },
    thursday: { start: '08:00', end: '12:00', start2: '13:00', end2: '18:00' },
    friday: { start: '08:00', end: '12:00', start2: '13:00', end2: '18:00' },
  });

  const formatted = formatWorkingSchedule(days, hours);
  assert.deepEqual(formatted.summaryLines, [
    '(Segunda a Sexta: 08:00 às 12:00 - 13:00 às 18:00)',
  ]);
});

test('formats varying JSON hours into grouped abbreviation lines of up to 3 days', () => {
  const days = JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday']);
  const hours = JSON.stringify({
    monday: { start: '08:00', end: '12:00' },
    tuesday: { start: '08:00', end: '12:00' },
    wednesday: { start: '13:00', end: '17:00' },
    thursday: { start: '09:00', end: '18:00' },
  });

  const formatted = formatWorkingSchedule(days, hours);
  assert.deepEqual(formatted.summaryLines, [
    '(Seg: 08:00 - 12:00) - (Ter: 08:00 - 12:00) - (Qua: 13:00 - 17:00)',
    '(Qui: 09:00 - 18:00)',
  ]);
});

test('sanitizeWorkingHoursMap drops empty second periods cleanly', () => {
  const cleaned = sanitizeWorkingHoursMap({
    monday: { start: '08:00', end: '12:00', start2: '', end2: '' },
    tuesday: { start: '08:00', end: '12:00', start2: '13:00', end2: '18:00' },
  });

  assert.deepEqual(cleaned, {
    monday: { start: '08:00', end: '12:00' },
    tuesday: { start: '08:00', end: '12:00', start2: '13:00', end2: '18:00' },
  });
});

test('falls back cleanly for plain text hours and day arrays', () => {
  const days = JSON.stringify(['monday', 'wednesday']);
  const formatted = formatWorkingSchedule(days, '08:00 às 17:00');
  assert.deepEqual(formatted.summaryLines, []);
  assert.equal(formatted.daysText, 'Seg, Qua');
  assert.equal(formatted.rawHoursText, '08:00 às 17:00');
  assert.equal(formatWorkingDaysList(days), 'Seg, Qua');
});
