import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUICK_NOTICE_DURATIONS,
  computeQuickNoticeUntil,
  escapeQuickNoticeHtml,
  getActiveQuickNotice,
  isValidQuickNoticeDuration,
} from './quick-notice';

test('supports 2h, 4h and 8h quick notice durations', () => {
  assert.deepEqual([...QUICK_NOTICE_DURATIONS], [2, 4, 8]);
  assert.equal(isValidQuickNoticeDuration(2), true);
  assert.equal(isValidQuickNoticeDuration(4), true);
  assert.equal(isValidQuickNoticeDuration(8), true);
  assert.equal(isValidQuickNoticeDuration(3), false);

  const now = Date.UTC(2026, 10, 22, 10, 0, 0);
  assert.equal(computeQuickNoticeUntil(2, now), new Date(now + 2 * 3600_000).toISOString());
  assert.equal(computeQuickNoticeUntil(4, now), new Date(now + 4 * 3600_000).toISOString());
  assert.equal(computeQuickNoticeUntil(8, now), new Date(now + 8 * 3600_000).toISOString());
});

test('getActiveQuickNotice returns trimmed message only while active and non-empty', () => {
  const now = Date.UTC(2026, 10, 22, 10, 0, 0);
  const future = new Date(now + 3600_000).toISOString();
  const past = new Date(now - 1000).toISOString();

  assert.equal(
    getActiveQuickNotice({ quick_notice: '  Hoje 22/11 fechamos mais cedo  ', quick_notice_until: future }, now),
    'Hoje 22/11 fechamos mais cedo'
  );
  assert.equal(
    getActiveQuickNotice({ quick_notice: 'Hoje 22/11 fechamos mais cedo', quick_notice_until: past }, now),
    null
  );
  assert.equal(
    getActiveQuickNotice({ quick_notice: '   ', quick_notice_until: future }, now),
    null
  );
  assert.equal(
    getActiveQuickNotice({ quick_notice: 'Aviso sem data', quick_notice_until: null }, now),
    null
  );
  assert.equal(getActiveQuickNotice(null, now), null);
});

test('escapeQuickNoticeHtml escapes unsafe HTML characters', () => {
  assert.equal(
    escapeQuickNoticeHtml('<script>"Hoje & amanhã"</script>'),
    '&lt;script&gt;&quot;Hoje &amp; amanhã&quot;&lt;/script&gt;'
  );
});
