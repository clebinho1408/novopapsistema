import { serviceUsesTermTemplate, type TermTemplateSettings } from '@/shared/term-template';

// PDF.js renders the complete source page at print resolution. No native PDF
// viewer is involved in printing; the decoded image is part of the same DOM.
export async function prepareTermTemplate(service?: string): Promise<string | null> {
  if (!serviceUsesTermTemplate(service)) return null;
  const settingsResponse = await fetch('/api/term-template', { credentials: 'include', cache: 'no-store' });
  if (!settingsResponse.ok) throw new Error('Não foi possível consultar o modelo de termo.');
  const settings: TermTemplateSettings = await settingsResponse.json();
  if (!settings.enabled) return null;
  if (!settings.file_url) throw new Error('O termo está ativo, mas não possui PDF. Confira Configurações.');
  const response = await fetch(settings.file_url, { credentials: 'include', cache: 'no-store' });
  if (!response.ok) throw new Error('Não foi possível carregar o PDF do termo.');
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  GlobalWorkerOptions.workerSrc = workerUrl;
  const loadingTask = getDocument({
    data: new Uint8Array(await response.arrayBuffer()), isEvalSupported: false,
    useSystemFonts: true,
    cMapUrl: '/pdf-assets/cmaps/', cMapPacked: true,
    standardFontDataUrl: '/pdf-assets/standard_fonts/',
  });
  try {
    const pdf = await loadingTask.promise;
    if (pdf.numPages !== 1) throw new Error('O termo deve conter somente uma página.');
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    // Fit arbitrary page sizes/orientations into A4 at approximately 300 dpi.
    const scale = Math.min(2480 / base.width, 3508 / base.height);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar o termo para impressão.');
    await page.render({ canvasContext: context, viewport, background: 'white' }).promise;
    const image = canvas.toDataURL('image/png');
    // Decode before enabling the print action.
    const decoded = new Image();
    decoded.src = image;
    await decoded.decode();
    return image;
  } finally {
    await loadingTask.destroy();
  }
}

export function termPrintPage(image: string | null): string {
  return image ? `<section class="term-print-page" aria-label="Modelo de Termo - página 2"><img src="${image}" alt="Modelo de Termo" /></section>` : '';
}

export const TERM_PRINT_CSS = `
  .term-print-page { box-sizing: border-box; width: 100%; height: 277mm;
    break-before: page; page-break-before: always; break-inside: avoid;
    display: flex; align-items: center; justify-content: center; margin: 0; padding: 0; }
  .term-print-page img { display: block; width: 100%; height: 100%; object-fit: contain; }
  @media print { html, body { height: auto !important; overflow: visible !important; } }
`;
