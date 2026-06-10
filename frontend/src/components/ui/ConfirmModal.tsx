'use client';

import { useEffect } from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default' | 'success';
  icon?: 'warning' | 'success' | 'info';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'default',
  icon = 'warning',
}: ConfirmModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const getIcon = () => {
    switch (icon) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-emerald-400" />;
      case 'info':
        return <CheckCircle className="w-6 h-6 text-cyan-400" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-amber-400" />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'success':
        return 'bg-emerald-500 hover:bg-emerald-600 text-white';
      default:
        return 'bg-cyan-500 hover:bg-cyan-600 text-white';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 max-w-[100vw] overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-[min(100vw-2rem,28rem)] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-[#0B0F19] border border-[var(--border-subtle)] rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="p-6">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--bg-hover)] flex items-center justify-center">
                    {getIcon()}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-[var(--text-primary)] text-center mb-2">
                  {title}
                </h3>

                {/* Message */}
                <p className="text-sm text-[var(--text-muted)] text-center mb-6">
                  {message}
                </p>

                {/* Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 min-h-[48px] sm:min-h-0 px-4 py-2.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors font-medium text-sm"
                  >
                    {cancelText}
                  </button>
                  <button
                    onClick={() => {
                      onConfirm();
                      onClose();
                    }}
                    className={`flex-1 min-h-[48px] sm:min-h-0 px-4 py-2.5 rounded-lg ${getConfirmButtonClass()} transition-colors font-medium text-sm`}
                  >
                    {confirmText}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
