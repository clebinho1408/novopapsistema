import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeInstructionWeight,
  resolveInstructionCandidates,
  resolvePrintInstructions,
  stripInstructionHtml,
} from './print-instructions';

test('stripInstructionHtml removes HTML tags cleanly and collapses whitespace', () => {
  assert.equal(stripInstructionHtml('<p>Olá&nbsp;<strong>mundo</strong></p><br/><p>Linha 2</p>'), 'Olá mundo Linha 2');
  assert.equal(stripInstructionHtml('<p><br></p>'), '');
  assert.equal(stripInstructionHtml(undefined), '');
});

test('resolveInstructionCandidates picks larger instruction as spacious and smaller as compact regardless of slot', () => {
  const shortText = '<p>Levar RG e CPF.</p>';
  const longText = '<p>Levar RG, CPF e comprovante de residência atualizado dos últimos 90 dias.</p><p>Pagar taxas antes do agendamento.</p>';

  const caseA = resolveInstructionCandidates('Renovação', {
    general_instructions: longText,
    instructions_primeira_habilitacao: shortText,
  });
  assert.equal(caseA.spacious, longText);
  assert.equal(caseA.compact, shortText);
  assert.equal(caseA.hasAlternative, true);

  const caseB = resolveInstructionCandidates('Renovação', {
    general_instructions: shortText,
    instructions_primeira_habilitacao: longText,
  });
  assert.equal(caseB.spacious, longText);
  assert.equal(caseB.compact, shortText);
  assert.equal(caseB.hasAlternative, true);
  assert.ok(computeInstructionWeight(longText) > computeInstructionWeight(shortText));
});

test('resolveInstructionCandidates handles single-instruction and empty configurations', () => {
  const onlyOne = resolveInstructionCandidates('1º Habilitação', {
    general_instructions: '<p>Única instrução</p>',
    instructions_primeira_habilitacao: '<p><br></p>',
  });
  assert.equal(onlyOne.spacious, '<p>Única instrução</p>');
  assert.equal(onlyOne.compact, '');
  assert.equal(onlyOne.hasAlternative, false);

  const empty = resolveInstructionCandidates(undefined, {});
  assert.deepEqual(empty, { spacious: '', compact: '', hasAlternative: false });
});

test('resolvePrintInstructions falls back to the non-empty instruction when preferred slot is blank', () => {
  assert.equal(
    resolvePrintInstructions('1º Habilitação', {
      general_instructions: '<p>Instrução geral</p>',
      instructions_primeira_habilitacao: '',
    }),
    '<p>Instrução geral</p>'
  );
});
