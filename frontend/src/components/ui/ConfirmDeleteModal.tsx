'use client';

import { useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  message: string;
  title?: string;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  message,
  title = 'Confirmer la suppression',
  loading = false,
  confirmText = 'Supprimer',
  cancelText = 'Annuler',
}: ConfirmDeleteModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !loading) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose, loading]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            onClick={() => !loading && onClose()}
          />
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 max-w-[100vw] overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-panel w-full max-w-md p-6 rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
              </div>

              <h3 className="text-lg font-bold text-red-400 text-center mb-2">{title}</h3>
              <p className="text-sm text-[var(--text-secondary)] text-center mb-6">{message}</p>

              <div className="flex flex-row gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg btn-ghost font-medium text-sm disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={() => void onConfirm()}
                  disabled={loading}
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
