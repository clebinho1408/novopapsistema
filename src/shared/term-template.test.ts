import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TERM_TEMPLATE_SERVICES,
  serviceUsesTermTemplate,
  shouldPrintTermTemplate,
} from './term-template';

test('auto-selects Termo only for the six configured services', () => {
  const expected = [
    '1º Habilitação',
    'Renovação + PCD',
    'Reinicio (1º Habilitação)',
    'Reabilitação',
    'Adição de Categoria A',
    'Adição de Categoria B',
  ];
  assert.deepEqual([...TERM_TEMPLATE_SERVICES], expected);
  for (const service of expected) {
    assert.equal(serviceUsesTermTemplate(service), true);
  }
  assert.equal(serviceUsesTermTemplate('Renovação'), false);
  assert.equal(serviceUsesTermTemplate('Alteração de Dados'), false);
  assert.equal(serviceUsesTermTemplate(''), false);
  assert.equal(serviceUsesTermTemplate(undefined), false);
});

test('explicit includeTerm overrides Prova Prática and service restrictions', () => {
  assert.equal(
    shouldPrintTermTemplate({
      includeTerm: true,
      clientName: 'Renovação + PCD',
      hasProvaPratica: false,
    }),
    true
  );
  assert.equal(
    shouldPrintTermTemplate({
      includeTerm: true,
      clientName: 'Renovação',
      hasProvaPratica: false,
    }),
    true
  );
  assert.equal(
    shouldPrintTermTemplate({
      includeTerm: false,
      clientName: '1º Habilitação',
      hasProvaPratica: true,
    }),
    false
  );
});

test('legacy null includeTerm preserves backward compatibility', () => {
  assert.equal(
    shouldPrintTermTemplate({
      includeTerm: null,
      clientName: '1º Habilitação',
      hasProvaPratica: true,
    }),
    true
  );
  assert.equal(
    shouldPrintTermTemplate({
      includeTerm: undefined,
      clientName: 'Renovação',
      hasProvaPratica: true,
    }),
    false
  );
});
