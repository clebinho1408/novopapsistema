import { useEffect, useState } from 'react';
import { FileText, Upload, ExternalLink } from 'lucide-react';
import { TERM_TEMPLATE_MAX_BYTES, TERM_TEMPLATE_SERVICES, type TermTemplateSettings } from '@/shared/term-template';

export default function TermTemplateConfiguration() {
  const [settings, setSettings] = useState<TermTemplateSettings | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [inputKey, setInputKey] = useState(0);

  async function load() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/term-template', { credentials: 'include', cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível carregar o modelo de termo.');
      setSettings(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar o termo.');
    } finally { setBusy(false); }
  }

  useEffect(() => { void load(); }, []);

  async function save(upload: boolean) {
    if (upload && (!file || file.size > TERM_TEMPLATE_MAX_BYTES || file.size === 0)) {
      setError('Selecione um PDF de até 5 MB, com somente uma página.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const form = new FormData();
      if (file) form.set('file', file);
      const response = await fetch('/api/term-template', {
        method: upload ? 'POST' : 'PATCH', credentials: 'include',
        headers: upload ? undefined : { 'Content-Type': 'application/json' },
        body: upload ? form : JSON.stringify({ enabled: !settings?.enabled }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível salvar o termo.');
      setSettings(result);
      if (upload) { setFile(null); setInputKey(key => key + 1); }
      setMessage(upload ? 'PDF salvo. Confira o estado de ativação abaixo.' :
        result.enabled ? 'Termo ativado para impressão.' : 'Termo desativado. O PDF continua salvo.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar o termo.');
    } finally { setBusy(false); }
  }

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200" aria-labelledby="term-heading">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 id="term-heading" className="text-lg font-medium text-gray-900">Modelo de Termo</h2>
        <p className="text-sm text-gray-600">PDF padrão da agência para a segunda página do Passo a Passo.</p>
      </div>
      <div className="p-6 space-y-6">
        {error && <div role="alert" className="p-3 rounded-lg bg-red-50 text-red-800 text-sm">
          {error}
          {!settings && <button disabled={busy} onClick={load} className="ml-3 underline">Tentar novamente</button>}
        </div>}
        {message && <p role="status" className="p-3 rounded-lg bg-green-50 text-green-800 text-sm">{message}</p>}
        {!settings && busy && <p role="status" className="text-gray-600">Carregando modelo...</p>}
        {settings && <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-gray-200 rounded-lg">
            <div className="min-w-0">
              <h3 className="font-medium text-gray-900">Inclusão na impressão: {settings.enabled ? 'ativada' : 'desativada'}</h3>
              <p className="text-sm text-gray-600">Desativar mantém o arquivo salvo para uso posterior.</p>
            </div>
            <button type="button" role="switch" aria-checked={settings.enabled} aria-label="Incluir termo na impressão"
              onClick={() => save(false)} disabled={busy || !settings.file_url}
              className={`shrink-0 px-4 py-2 rounded-lg text-white disabled:opacity-50 ${settings.enabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
              {settings.enabled ? 'Desativar termo' : 'Ativar termo'}
            </button>
          </div>
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5" /> PDF cadastrado</h3>
            {settings.file_url ? <div className="text-sm space-y-2">
              <p className="break-all text-gray-700">{settings.filename} ({Math.ceil((settings.size || 0) / 1024)} KB)</p>
              <a href={settings.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-orange-700 underline">
                <ExternalLink className="w-4 h-4" /> Abrir PDF para conferir
              </a>
            </div> : <p className="text-sm text-gray-500">Nenhum PDF cadastrado. Envie o arquivo antes de ativar.</p>}
            <label htmlFor="term-pdf" className="block text-sm font-medium text-gray-700">{settings.file_url ? 'Substituir PDF' : 'Enviar PDF'}</label>
            <input key={inputKey} id="term-pdf" type="file" accept="application/pdf,.pdf" disabled={busy}
              onChange={event => { setFile(event.target.files?.[0] || null); setError(''); setMessage(''); }}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-700" />
            <p className="text-xs text-gray-500">Somente uma página, até 5 MB, sem senha. Substituir o arquivo mantém o estado de ativação atual.</p>
            <button onClick={() => save(true)} disabled={busy || !file}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
              <Upload className="w-4 h-4" /> {busy ? 'Aguarde...' : 'Salvar PDF'}
            </button>
          </div>
          <div className="text-sm text-gray-600 border-t border-gray-200 pt-4">
            <p className="font-medium text-gray-800 mb-2">Serviços que recebem o termo quando ativado:</p>
            <ul className="list-disc pl-5 space-y-1">{TERM_TEMPLATE_SERVICES.map(service => <li key={service}>{service}</li>)}</ul>
            <p className="mt-3">A prévia, a impressão e a reimpressão usam o modelo atual. O termo não é enviado por email.</p>
          </div>
        </>}
      </div>
    </section>
  );
}
