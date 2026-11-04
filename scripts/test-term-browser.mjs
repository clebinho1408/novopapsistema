import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const sheet = pdf.addPage([595.28, 841.89]);
sheet.drawRectangle({ x: 12, y: 12, width: 571, height: 818, borderWidth: 2, borderColor: rgb(0, 0, 0) });
sheet.drawText('MODELO DE TERMO - PAGINA 2', { x: 40, y: 780, size: 22, font });
sheet.drawText('Inicio: texto de teste para verificar proporcao e legibilidade.', { x: 40, y: 720, size: 12, font });
sheet.drawText('FIM DO TERMO - NAO CORTAR', { x: 40, y: 40, size: 16, font });
const bytes = Buffer.from(await pdf.save());
let enabled = true, fileError = false, settingsError = false;
let settingsRequests = 0, fileRequests = 0;
await context.route('**/api/**', async route => {
  const url = new URL(route.request().url());
  if (url.pathname === '/api/term-template') {
    settingsRequests++;
    if (settingsError) return route.fulfill({ status: 503, json: { error: 'fixture unavailable' } });
    return route.fulfill({ json: { enabled, filename: 'termo.pdf', size: bytes.length,
      file_url: '/api/term-template/file?version=fixture', updated_at: '2026-11-04' } });
  }
  if (url.pathname === '/api/term-template/file') {
    fileRequests++;
    return fileError ? route.fulfill({ status: 503 }) : route.fulfill({ body: bytes, contentType: 'application/pdf' });
  }
  if (url.pathname === '/api/instructions') return route.fulfill({ json: {
    general_instructions: '<p>Instrucoes gerais de teste.</p>',
    instructions_primeira_habilitacao: '<p>Apresente documento de identificacao e siga as orientacoes da agencia.</p>',
  } });
  if (url.pathname === '/api/auth/me') return route.fulfill({ json: { name: 'Operador de teste', role: 'administrator' } });
  return route.fulfill({ json: {} });
});

async function mount(service, configuration = false, autoPrint = false) {
  await page.goto(`${origin}/login`);
  await page.evaluate(async ({ service, configuration, autoPrint }) => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { default: Component } = await import(configuration
      ? '/src/react-app/components/TermTemplateConfiguration.tsx'
      : '/src/react-app/components/PrintableStepProcess.tsx');
    const target = document.createElement('div');
    document.body.append(target);
    document.getElementById('root').style.display = 'none';
    const steps = ['foto', 'taxa', 'psicologo', 'medico', 'prova_teorica', 'prova_pratica'].map((type, i) => ({
      id: i + 1, type, name: ['Foto', 'Taxa', 'Exame Psicológico', 'Exame Médico', 'Prova Teórica', 'Prova Prática'][i],
      description: 'Orientacao de teste', is_active: true, sort_order: i + 1,
    }));
    ReactDOM.createRoot(target).render(React.createElement(Component, configuration ? {} : {
      isOpen: true, autoPrint, onClose() {},
      processData: { client_name: service, city: { name: 'Cidade de Teste' },
        selected_steps: steps, all_steps: steps, selected_professionals: {},
        selected_fees: [], total_amount: '0.00' },
    }));
  }, { service, configuration, autoPrint });
}

try {
  await mkdir('generated-artifacts/term-tests', { recursive: true });
  await mount('Reabilitação');
  await page.getByRole('img', { name: 'Conteúdo integral do modelo de termo' }).waitFor();
  await page.getByRole('button', { name: 'Imprimir', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Imprimir', exact: true }).isEnabled(), true);
  // Count the real automatic print trigger, but suppress the native dialog.
  // Do not stub close(): a premature popup close must fail this regression.
  await context.addInitScript(() => {
    window.__printCalls = 0;
    window.print = () => { window.__printCalls++; };
  });
  const requestsBeforeCache = fileRequests;
  const settingsBeforeCache = settingsRequests;
  await page.evaluate(async () => {
    const { prepareTermTemplate } = await import('/src/react-app/lib/term-template.ts');
    await prepareTermTemplate('Reabilitação');
  });
  assert.equal(fileRequests, requestsBeforeCache, 'Same immutable PDF version must reuse the prepared image');
  assert.equal(settingsRequests, settingsBeforeCache + 1, 'Settings must still be authenticated and rechecked');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Imprimir', exact: true }).click();
  const popup = await popupPromise;
  await popup.locator('.term-print-page img').waitFor();
  await popup.waitForFunction(() => window.__printCalls === 1, { timeout: 5000 });
  assert.equal(popup.isClosed(), false, 'Do not close the popup before the native print dialog opens');
  assert.equal(await popup.getByRole('button', { name: 'Imprimir agora', exact: true }).isEnabled(), true);
  await popup.getByRole('button', { name: 'Imprimir agora', exact: true }).click();
  assert.equal(await popup.evaluate(() => window.__printCalls), 2);
  await popup.getByText(/selecione “Imprimir dos dois lados/).waitFor();
  assert.equal(await popup.locator('img[src*="qrserver"]').count(), 0);
  await popup.screenshot({ path: 'generated-artifacts/term-tests/print-controls.png', fullPage: true });
  await popup.waitForFunction(() => document.querySelector('.container')?.getAttribute('data-adjusted'));
  await popup.emulateMedia({ media: 'print' });
  assert.equal(await popup.locator('#print-controls').isVisible(), false, 'Controls and duplex reminder must not be printed');
  const composed = await popup.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  const composedPdf = await PDFDocument.load(composed);
  assert.equal(composedPdf.getPageCount(), 2, 'Print must produce exactly two real A4 pages');
  for (const sheet of composedPdf.getPages()) {
    assert.ok(Math.abs(sheet.getWidth() - 595.28) < 1);
    assert.ok(Math.abs(sheet.getHeight() - 841.89) < 1);
  }
  await writeFile('generated-artifacts/term-tests/two-pages.pdf', composed);
  await popup.screenshot({ path: 'generated-artifacts/term-tests/print.png', fullPage: true });
  await popup.close();
  console.log('PASS: automatic print called, popup stays open, manual retry, local QR codes, versioned render cache, duplex reminder hidden on paper, two real A4 pages');

  for (const service of ['1º Habilitação', 'Renovação + PCD', 'Reinicio (1º Habilitação)', 'Adição de Categoria A', 'Adição de Categoria B']) {
    await mount(service);
    await page.getByRole('img', { name: 'Conteúdo integral do modelo de termo' }).waitFor();
  }
  for (const service of ['Renovação', 'Renovação + EAR + PCD', '']) {
    const before = settingsRequests;
    await mount(service);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Imprimir' && !button.disabled));
    assert.equal(await page.getByRole('img', { name: 'Conteúdo integral do modelo de termo' }).count(), 0);
    assert.equal(settingsRequests, before, 'Unrelated services must not depend on term storage');
  }
  enabled = false;
  await mount('Reabilitação');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Imprimir' && !button.disabled));
  assert.equal(await page.getByRole('img', { name: 'Conteúdo integral do modelo de termo' }).count(), 0);
  // Verify no blank extra page when disabled.
  const disabledPopupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Imprimir', exact: true }).click();
  const disabledPopup = await disabledPopupPromise;
  await disabledPopup.waitForFunction(() => window.__printCalls === 1);
  assert.equal(await disabledPopup.getByText(/Documento com 2 páginas/).count(), 0);
  await disabledPopup.waitForFunction(() => document.querySelector('.container')?.getAttribute('data-adjusted'));
  const singlePage = await disabledPopup.pdf({ format: 'A4', preferCSSPageSize: true });
  assert.equal((await PDFDocument.load(singlePage)).getPageCount(), 1);
  await disabledPopup.close();
  enabled = true;
  fileError = true;
  await mount('Reabilitação');
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Imprimir', exact: true }).isDisabled(), true);
  fileError = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await page.getByRole('img', { name: 'Conteúdo integral do modelo de termo' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Imprimir', exact: true }).isEnabled(), true);
  settingsError = true;
  await mount('Reabilitação', false, true);
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Imprimir', exact: true }).isDisabled(), true);
  settingsError = false;
  // Successful auto-print (the list's actual mode), not only its error branch.
  const autoPopupPromise = page.waitForEvent('popup');
  await mount('Reabilitação', false, true);
  const autoPopup = await autoPopupPromise;
  await autoPopup.waitForFunction(() => window.__printCalls === 1);
  assert.equal(autoPopup.isClosed(), false);
  assert.equal(await autoPopup.locator('.term-print-page img').count(), 1);
  await autoPopup.close();
  await context.addInitScript(() => {
    const open = window.open.bind(window);
    let blocked = false;
    window.open = (...args) => {
      if (!blocked) { blocked = true; return null; }
      return open(...args);
    };
  });
  await mount('Reabilitação', false, true);
  await page.getByText('O navegador bloqueou a abertura automática.', { exact: false }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Imprimir', exact: true }).isEnabled(), true);
  const recoveredPopupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Imprimir', exact: true }).click();
  const recoveredPopup = await recoveredPopupPromise;
  await recoveredPopup.waitForFunction(() => window.__printCalls === 1);
  await recoveredPopup.close();
  console.log('PASS: blocked automatic popup recovers through an enabled manual print button');
  console.log('PASS: six exact services, excluded services, disabled without blank page, failure/retry, auto-print failure protection');

  await mount('', true);
  await page.getByRole('heading', { name: 'Modelo de Termo', exact: true }).waitFor();
  await page.getByRole('switch').waitFor();
  await page.screenshot({ path: 'generated-artifacts/term-tests/settings-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'generated-artifacts/term-tests/settings-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log('PASS: settings component desktop/mobile, no horizontal overflow, no browser errors');
} finally { await browser.close(); }
