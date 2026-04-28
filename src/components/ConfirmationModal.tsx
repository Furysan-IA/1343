import React from 'react';
import { AlertTriangle, X, CheckCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'info' | 'danger';
  details?: string[];
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning',
  details = []
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getColorClasses = () => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
      default:
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: 'text-amber-600',
          button: 'bg-amber-600 hover:bg-amber-700'
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className={`${colors.bg} border-b-2 ${colors.border} p-6 rounded-t-xl`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {type === 'info' ? (
                <CheckCircle className={`w-8 h-8 ${colors.icon}`} />
              ) : (
                <AlertTriangle className={`w-8 h-8 ${colors.icon}`} />
              )}
              <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-slate-700 leading-relaxed">{message}</p>

          {details.length > 0 && (
            <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4">
              <ul className="space-y-2">
                {details.map((detail, idx) => (
                  <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-slate-400 mt-0.5">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-4 py-3 ${colors.button} text-white rounded-lg transition-colors font-semibold`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
