'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Moon, Bell, LogOut, User } from 'lucide-react';
import { clearAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { useTheme } from '@/contexts/ThemeContext';
import type { User as AppUser } from '@/types';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const { theme, toggleTheme } = useTheme();
  const user = getStoredUser<AppUser>();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const handleLogout = async () => {
    try { await api.auth.logout(); } catch { /* ignore */ }
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden max-w-[100vw] overflow-hidden">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Fermer"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute left-0 top-0 bottom-0 w-[min(100%,280px)] max-w-[85vw] bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Menu</span>
              <button type="button" onClick={onClose} className="btn-ghost p-2 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0" aria-label="Fermer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {user && (
              <div className="px-4 py-4 border-b border-[var(--border-subtle)] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400/30 to-pink-400/30 border border-[var(--border-subtle)] flex items-center justify-center text-sm font-bold text-cyan-300">
                  {user.fullname?.[0] || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{user.fullname}</p>
                  <p className="text-xs text-[var(--text-muted)] capitalize">{user.role}</p>
                </div>
              </div>
            )}

            <div className="flex-1 p-3 space-y-1">
              <button type="button" onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-3 min-h-[48px] rounded-xl hover:bg-[var(--bg-hover)] transition-colors text-sm">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              </button>
              <button type="button" className="w-full flex items-center gap-3 px-3 py-3 min-h-[48px] rounded-xl hover:bg-[var(--bg-hover)] transition-colors text-sm text-[var(--text-muted)]">
                <Bell className="w-4 h-4" />
                Notifications
              </button>
              <Link href="/parametres" onClick={onClose} className="w-full flex items-center gap-3 px-3 py-3 min-h-[48px] rounded-xl hover:bg-[var(--bg-hover)] transition-colors text-sm">
                <User className="w-4 h-4" />
                Paramètres
              </Link>
            </div>

            <div className="p-3 border-t border-[var(--border-subtle)] pb-safe">
              <button type="button" onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 min-h-[48px] rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm">
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
