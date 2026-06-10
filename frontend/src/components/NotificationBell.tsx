'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Mic2, DollarSign, Radio, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import { timeAgoFr } from '@/lib/utils';
import type { AppNotification } from '@/types';

function typeIcon(type: string | null) {
  switch (type) {
    case 'rappel_enregistrement':
      return <Mic2 className="w-4 h-4 text-violet-400" />;
    case 'sponsor_relance':
      return <DollarSign className="w-4 h-4 text-emerald-400" />;
    case 'episode_publie':
      return <Radio className="w-4 h-4 text-cyan-400" />;
    case 'invite_suivi':
      return <UserRound className="w-4 h-4 text-amber-400" />;
    default:
      return <Bell className="w-4 h-4 text-[var(--text-muted)]" />;
  }
}

interface NotificationBellProps {
  /** When true, mobile panel sits below the extra search row in TopBar */
  mobileSearchVisible?: boolean;
}

export function NotificationBell({ mobileSearchVisible = false }: NotificationBellProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list(),
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api.notifications.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (!open || !isMobile) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open, isMobile]);

  const handleClick = async (n: AppNotification) => {
    if (!n.read) await markRead.mutateAsync(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const mobileTop = mobileSearchVisible ? 'max-md:top-28' : 'max-md:top-14';

  const panel = (
    <div
      ref={panelRef}
      className={`
        z-50 overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-2xl
        max-md:fixed max-md:left-0 max-md:right-0 max-md:w-full max-md:max-w-[100vw]
        max-md:rounded-none max-md:border-x-0 max-md:mt-0
        ${mobileTop}
        md:absolute md:right-0 md:top-full md:mt-2 md:w-[min(100vw-2rem,360px)] md:rounded-xl
      `}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="text-sm font-semibold shrink-0">Notifications</span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            className="text-[10px] font-medium text-violet-400 hover:text-violet-300 flex items-center gap-1 shrink-0"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="max-md:hidden">Tout marquer comme lu</span>
            <span className="md:hidden">Tout lu</span>
          </button>
        )}
      </div>

      <div className="max-h-[min(70vh,400px)] overflow-y-auto overflow-x-hidden">
        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-sm text-center text-[var(--text-muted)]">
            Aucune notification
          </p>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-white/[0.04] transition-colors border-b border-white/5 last:border-b-0 ${
                !n.read ? 'bg-violet-500/[0.06]' : ''
              }`}
            >
              <div className="shrink-0 mt-0.5">{typeIcon(n.type)}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {n.title}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                  {n.message}
                </p>
                <p className="text-[10px] text-[var(--text-dimmed)] mt-1">
                  {timeAgoFr(n.createdAt)}
                </p>
              </div>
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0 mt-1.5" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  const mobilePortal =
    open && isMobile && mounted
      ? createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[44] bg-black/30 md:hidden"
              onClick={() => setOpen(false)}
              aria-label="Fermer les notifications"
            />
            {panel}
          </>,
          document.body,
        )
      : null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="btn-ghost relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {mobilePortal}
      {open && !isMobile && panel}
    </div>
  );
}
