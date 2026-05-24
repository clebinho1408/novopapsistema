import { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';
type DialogMode = 'alert' | 'confirm';

interface DialogState {
  isOpen: boolean;
  mode: DialogMode;
  variant: AlertVariant;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const CLOSED: DialogState = {
  isOpen: false,
  mode: 'alert',
  variant: 'info',
  title: '',
  message: '',
  confirmText: 'OK',
  cancelText: 'Cancelar',
  onConfirm: () => {},
  onCancel: () => {},
};

const VARIANT_TITLES: Record<AlertVariant, string> = {
  success: 'Sucesso',
  error: 'Erro',
  warning: 'Atenção',
  info: 'Informação',
};

export function useDialog() {
  const [state, setState] = useState<DialogState>(CLOSED);

  const close = () => setState(CLOSED);

  const showAlert = (
    message: string,
    variant: AlertVariant = 'info',
    title?: string
  ): Promise<void> =>
    new Promise(resolve =>
      setState({
        isOpen: true,
        mode: 'alert',
        variant,
        title: title ?? VARIANT_TITLES[variant],
        message,
        confirmText: 'OK',
        cancelText: 'Cancelar',
        onConfirm: () => { close(); resolve(); },
        onCancel: () => { close(); resolve(); },
      })
    );

  const showConfirm = (
    message: string,
    title = 'Confirmar',
    variant: AlertVariant = 'warning'
  ): Promise<boolean> =>
    new Promise(resolve =>
      setState({
        isOpen: true,
        mode: 'confirm',
        variant,
        title,
        message,
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        onConfirm: () => { close(); resolve(true); },
        onCancel: () => { close(); resolve(false); },
      })
    );

  return { showAlert, showConfirm, DialogComponent: <DialogModal {...state} /> };
}

function DialogModal({
  isOpen,
  mode,
  variant,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: DialogState) {
  if (!isOpen) return null;

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };
  const iconColors = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-orange-500',
    info: 'text-blue-500',
  };
  const confirmColors = {
    success: 'bg-green-600 hover:bg-green-700',
    error: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-orange-600 hover:bg-orange-700',
    info: 'bg-blue-600 hover:bg-blue-700',
  };

  const Icon = icons[variant];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={mode === 'alert' ? onConfirm : onCancel}
      />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 z-10">
        <div className="flex flex-col items-center text-center space-y-3">
          <Icon className={`w-12 h-12 ${iconColors[variant]}`} />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="mt-6 flex gap-3 justify-center">
          {mode === 'confirm' && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`${mode === 'confirm' ? 'flex-1' : 'px-10'} py-2 rounded-lg text-white font-medium text-sm ${confirmColors[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
