import qrcode from 'qrcode-generator';

const qrImages = new Map<string, string>();
export function printQrCode(url: string): string {
  if (!qrImages.has(url)) {
    const code = qrcode(0, 'M');
    code.addData(url);
    code.make();
    qrImages.set(url, code.createDataURL(6, 12));
  }
  return qrImages.get(url)!;
}

function within<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), milliseconds);
    promise.then(value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); });
  });
}

// Do not wait for window.load: a slow resource can prevent that event forever.
// Keep the popup open after print() so Brave/Chrome can open their native dialog
// asynchronously and users can print again after cancelling.
export async function preparePrintWindow(popup: Window, html: string): Promise<void> {
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  const doc = popup.document;
  const button = doc.querySelector<HTMLButtonElement>('#print-now');
  const status = doc.querySelector<HTMLElement>('#print-status');
  try {
    if (doc.readyState === 'loading') {
      await within(new Promise<void>(resolve => {
        doc.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
      }), 5000, 'A janela de impressão não terminou de preparar o documento.');
    }
    await within(Promise.all(Array.from(doc.images, async image => {
      await image.decode();
      if (!image.naturalWidth) throw new Error('Imagem indisponível.');
    })), 10000, 'Uma imagem não carregou. Tente preparar a impressão novamente.');
    if (doc.fonts) {
      await within(doc.fonts.ready, 5000, 'As fontes não carregaram. Tente novamente.');
    }
    // The document's synchronous DOMContentLoaded handlers fit page one before
    // printing; the term page is deliberately not included in that calculation.
    if (popup.closed) throw new Error('A janela de impressão foi fechada.');
    if (button) {
      button.disabled = false;
      button.onclick = () => { popup.focus(); popup.print(); };
    }
    if (status) status.textContent = 'Documento pronto. Se a impressão não abrir, clique em “Imprimir agora”.';
  } catch (error) {
    if (status) status.textContent = 'Não foi possível preparar o documento completo. Feche esta janela e tente novamente no sistema.';
    throw error;
  }
}
