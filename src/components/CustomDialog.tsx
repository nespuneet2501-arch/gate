import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle, XCircle, Info, Trash2, ShieldAlert } from 'lucide-react';

export type DialogType = 'info' | 'success' | 'error' | 'confirm' | 'danger';

interface CustomDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  requireValidationText?: string; // e.g. "OK"
  validationPlaceholder?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CustomDialog: React.FC<CustomDialogProps> = ({
  isOpen,
  title,
  message,
  type = 'info',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  requireValidationText = '',
  validationPlaceholder = 'Type "OK" to confirm',
  onConfirm,
  onCancel,
}) => {
  const [valInput, setValInput] = useState('');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setValInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmDisabled = requireValidationText 
    ? valInput.trim().toUpperCase() !== requireValidationText.toUpperCase()
    : false;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-emerald-500" size={32} />;
      case 'error':
        return <XCircle className="text-rose-500" size={32} />;
      case 'danger':
        return <Trash2 className="text-rose-600 animate-bounce" size={32} />;
      case 'confirm':
        return <AlertTriangle className="text-amber-500" size={32} />;
      case 'info':
      default:
        return <Info className="text-blue-500" size={32} />;
    }
  };

  const getHeaderBg = () => {
    switch (type) {
      case 'danger':
        return 'bg-rose-50 border-rose-100';
      case 'confirm':
        return 'bg-amber-50 border-amber-100';
      case 'success':
        return 'bg-emerald-50 border-emerald-100';
      case 'error':
        return 'bg-rose-50 border-rose-100';
      default:
        return 'bg-slate-50 border-slate-100';
    }
  };

  const getConfirmBtnStyle = () => {
    if (isConfirmDisabled) {
      return 'bg-slate-200 text-slate-400 cursor-not-allowed';
    }
    switch (type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 hover:scale-[1.02] active:scale-[0.98]';
      case 'confirm':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200 hover:scale-[1.02] active:scale-[0.98]';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:scale-[1.02] active:scale-[0.98]';
      default:
        return 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-200 hover:scale-[1.02] active:scale-[0.98]';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop overlay with blur effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="relative w-full max-w-md bg-white border border-slate-200/85 rounded-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* Header Icon area */}
          <div className={`p-5 border-b flex gap-3.5 items-start ${getHeaderBg()}`}>
            <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 shrink-0">
              {getIcon()}
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold font-display text-slate-900 leading-tight">
                {title}
              </h3>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                Database Action Safety Guard
              </div>
            </div>
          </div>

          {/* Modal Message body */}
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-line">
              {message}
            </p>

            {/* Validation input box if required */}
            {requireValidationText && (
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Required Action Authorization:
                </label>
                <input
                  type="text"
                  value={valInput}
                  onChange={(e) => setValInput(e.target.value)}
                  placeholder={validationPlaceholder}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 uppercase focus:outline-hidden focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all placeholder:text-slate-300"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400">
                  Please type <span className="font-bold text-rose-600 font-mono">"{requireValidationText}"</span> in the field above to enable the action.
                </p>
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-2.5 justify-end">
            {(type === 'confirm' || type === 'danger') && (
              <button
                type="button"
                onClick={onCancel}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm cursor-pointer"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              disabled={isConfirmDisabled}
              onClick={onConfirm}
              className={`text-xs font-semibold px-5 py-2 rounded-xl transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 ${getConfirmBtnStyle()}`}
            >
              {getIcon() && (type === 'danger' || type === 'success') && (
                <span className="shrink-0">🚀</span>
              )}
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
