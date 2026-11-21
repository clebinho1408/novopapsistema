import test from 'node:test';
import assert from 'node:assert/strict';
import qrcode from 'qrcode-generator';
import {
  PROVA_TEORICA_SCHEDULE_TEXT,
  PROVA_TEORICA_WHATSAPP_URL,
} from './prova-teorica';

test('Prova Teórica text matches requested scheduling notice', () => {
  assert.equal(
    PROVA_TEORICA_SCHEDULE_TEXT,
    'O agendamento pode ser feito pelo WhatsApp da Catarina do Detran 4836641800, ou de forma presencial aqui na Agência. A taxa deve estar paga antes do agendamento.'
  );
});

test('Prova Teórica WhatsApp QR URL targets 554836641800 and encodes to valid image data URL', () => {
  assert.equal(PROVA_TEORICA_WHATSAPP_URL, 'https://wa.me/554836641800');
  const code = qrcode(0, 'M');
  code.addData(PROVA_TEORICA_WHATSAPP_URL);
  code.make();
  const dataUrl = code.createDataURL(6, 12);
  assert.ok(dataUrl.startsWith('data:image/gif;base64,'));
});
