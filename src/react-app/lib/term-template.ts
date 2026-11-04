import { serviceUsesTermTemplate, type TermTemplateSettings } from '@/shared/term-template';

// PDF.js renders the complete source page at print resolution. No native PDF
// viewer is involved in printing; the decoded image is part of the same DOM.
let renderedTerm: { version: string; image: Promise<string> } | undefined;

export async function prepareTermTemplate(service?: string): Promise<string | null> {
  if (!serviceUsesTermTemplate(service)) return null;
  const settingsResponse = await fetch('/api/term-template', {
    credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  if (!settingsResponse.ok) throw new Error('Não foi possível consultar o modelo de termo.');
  const settings: TermTemplateSettings = await settingsResponse.json();
  if (!settings.enabled) { renderedTerm = undefined; return null; }
  if (!settings.file_url) throw new Error('O termo está ativo, mas não possui PDF. Confira Configurações.');
  // Always authenticate and recheck settings; reuse only the immutable version
  // returned by the current agency. Never cache settings or failed renders.
  if (renderedTerm?.version === settings.file_url) return renderedTerm.image;
  const entry = { version: settings.file_url, image: renderTerm(settings.file_url) };
  renderedTerm = entry;
  try { return await entry.image; }
  catch (error) { if (renderedTerm === entry) renderedTerm = undefined; throw error; }
}

async function renderTerm(url: string): Promise<string> {
  const [response, { getDocument, GlobalWorkerOptions }, { default: workerUrl }] = await Promise.all([
    fetch(url, { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(15000) }),
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  if (!response.ok) throw new Error('Não foi possível carregar o PDF do termo.');
  GlobalWorkerOptions.workerSrc = workerUrl;
  const loadingTask = getDocument({
    data: new Uint8Array(await response.arrayBuffer()), isEvalSupported: false,
    useSystemFonts: true,
    cMapUrl: '/pdf-assets/cmaps/', cMapPacked: true,
    standardFontDataUrl: '/pdf-assets/standard_fonts/',
  });
  const timeout = setTimeout(() => { void loadingTask.destroy(); }, 15000);
  try {
    const pdf = await loadingTask.promise;
    if (pdf.numPages !== 1) throw new Error('O termo deve conter somente uma página.');
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    // 200 dpi keeps A4 text legible with less than half the raster work of
    // 300 dpi. JPEG also avoids huge PNG data URLs for scanned terms.
    const scale = Math.min(1654 / base.width, 2339 / base.height);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar o termo para impressão.');
    await page.render({ canvasContext: context, viewport, background: 'white' }).promise;
    const image = canvas.toDataURL('image/jpeg', 0.95);
    // Decode before enabling the print action.
    const decoded = new Image();
    decoded.src = image;
    await decoded.decode();
    return image;
  } finally {
    clearTimeout(timeout);
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
