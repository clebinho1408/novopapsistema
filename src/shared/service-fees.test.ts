import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findLadvFee,
  formatCursoPraticoLadvBadge,
  getGroupedStepTypesForService,
  isAdicaoCategoriaServiceName,
  isLadvFeeName,
  shouldAutoSelectLadv,
  shouldHideLadvInFeeSelection,
} from './service-fees';

test('auto-selects LADV for 1º Habilitação, Reinício, and Adição de Categoria A/B', () => {
  assert.equal(shouldAutoSelectLadv('1º Habilitação'), true);
  assert.equal(shouldAutoSelectLadv('Reinicio (1º Habilitação)'), true);
  assert.equal(shouldAutoSelectLadv('Adição de Categoria A'), true);
  assert.equal(shouldAutoSelectLadv('Adição de Categoria B'), true);
  assert.equal(shouldAutoSelectLadv('Renovação'), false);
  assert.equal(shouldAutoSelectLadv('Alteração de Dados'), false);
  assert.equal(shouldAutoSelectLadv(''), false);
});

test('matches LADV fee name case-insensitively and formats TAXA LADV badge', () => {
  assert.equal(isLadvFeeName('LADV'), true);
  assert.equal(isLadvFeeName(' ladv '), true);
  assert.equal(isLadvFeeName('Prova Prática'), false);

  const ladv = findLadvFee([
    { id: 1, name: 'Emissão da CNH', amount: '106.26' },
    { id: 7, name: 'LADV', amount: '72.24' },
  ]);
  assert.equal(ladv?.id, 7);
  assert.equal(formatCursoPraticoLadvBadge(ladv!.amount), 'TAXA LADV: R$ 72.24');
});

test('groups only curso_pratico and prova_pratica for Adição de Categoria A and B', () => {
  assert.equal(isAdicaoCategoriaServiceName('Adição de Categoria A'), true);
  assert.equal(isAdicaoCategoriaServiceName('Adição de Categoria B'), true);
  assert.equal(isAdicaoCategoriaServiceName('1º Habilitação'), false);

  assert.deepEqual(getGroupedStepTypesForService('Adição de Categoria A'), [
    'curso_pratico',
    'prova_pratica',
  ]);
  assert.deepEqual(getGroupedStepTypesForService('Adição de Categoria B'), [
    'curso_pratico',
    'prova_pratica',
  ]);
  assert.deepEqual(getGroupedStepTypesForService('1º Habilitação'), [
    'prova_teorica',
    'curso_pratico',
    'prova_pratica',
  ]);
});

test('hides automatic LADV in fee selection only for Adição de Categoria A and B', () => {
  assert.equal(shouldHideLadvInFeeSelection('Adição de Categoria A'), true);
  assert.equal(shouldHideLadvInFeeSelection('Adição de Categoria B'), true);
  assert.equal(shouldHideLadvInFeeSelection('1º Habilitação'), false);
  assert.equal(shouldHideLadvInFeeSelection('Reinicio (1º Habilitação)'), false);
  assert.equal(shouldHideLadvInFeeSelection(''), false);
});

