'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Youtube,
  Music,
  Music2,
  Instagram,
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Settings2,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { GlowCard } from '@/components/ui/GlowCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { api, ApiError } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import type { PlatformConnection, User } from '@/types';

const PLATFORM_META: Record<
  string,
  {
    label: string;
    description: string;
    icon: typeof Youtube;
    accent: string;
    envHint: string;
  }
> = {
  youtube: {
    label: 'YouTube',
    description: 'YouTube Analytics — vues, minutes regardées, abonnés',
    icon: Youtube,
    accent: 'text-red-400',
    envHint: 'YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET',
  },
  spotify: {
    label: 'Spotify',
    description: 'Spotify for Podcasters — écoutes et auditeurs',
    icon: Music,
    accent: 'text-emerald-400',
    envHint: 'SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET',
  },
  tiktok: {
    label: 'TikTok',
    description: 'TikTok Display API — abonnés, likes, vidéos',
    icon: Music2,
    accent: 'text-white',
    envHint: 'TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET',
  },
  instagram: {
    label: 'Instagram',
    description: 'Instagram Graph API — portée, impressions, abonnés',
    icon: Instagram,
    accent: 'text-pink-400',
    envHint: 'INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET',
  },
};

function StatusBadge({ connection }: { connection: PlatformConnection }) {
  if (connection.connected) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Connecté
      </span>
    );
  }
  if (!connection.oauthConfigured) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
        <Settings2 className="w-3.5 h-3.5" />
        Config requise
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-muted bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-lg">
      Non connecté
    </span>
  );
}

function PlatformConnectionCard({
  connection,
  canManage,
  onConnect,
  onDisconnect,
  connecting,
  disconnecting,
}: {
  connection: PlatformConnection;
  canManage: boolean;
  onConnect: (platform: string) => void;
  onDisconnect: (platform: string) => void;
  connecting: string | null;
  disconnecting: string | null;
}) {
  const meta = PLATFORM_META[connection.platform];
  if (!meta) return null;
  const Icon = meta.icon;
  const isConnecting = connecting === connection.platform;
  const isDisconnecting = disconnecting === connection.platform;

  return (
    <GlowCard className="!p-4 sm:!p-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-[4px] bg-bg-elevated/80 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
            <Icon className={`w-5 h-5 ${meta.accent}`} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="section-title">{meta.label}</h3>
              <StatusBadge connection={connection} />
            </div>
            <p className="text-sm text-slate-soft">{meta.description}</p>
            {connection.connected && connection.lastSync && (
              <p className="text-xs md:text-sm text-slate-muted mt-2">
                Dernière sync : {formatDateTime(connection.lastSync)}
              </p>
            )}
            {connection.connected && connection.expiresAt && (
              <p className="text-xs md:text-sm text-slate-muted">
                Expire : {formatDateTime(connection.expiresAt)}
              </p>
            )}
            {connection.lastSyncError && (
              <p className="text-sm text-amber-400/90 mt-2 leading-relaxed">
                Erreur sync : {connection.lastSyncError}
              </p>
            )}
            {!connection.oauthConfigured && (
              <p className="text-sm text-amber-400/80 mt-2">
                Variables .env : {meta.envHint}
              </p>
            )}
          </div>
        </div>

        {canManage && (
          <div className="flex gap-2 sm:flex-col sm:items-stretch w-full sm:w-auto">
            {connection.connected ? (
              <GlowButton
                variant="ghost"
                className="w-full h-10 mt-4 sm:w-auto sm:mt-0 min-w-[120px]"
                disabled={isDisconnecting}
                onClick={() => onDisconnect(connection.platform)}
              >
                <Unlink className="w-4 h-4 mr-1.5" />
                {isDisconnecting ? 'Déconnexion...' : 'Déconnecter'}
              </GlowButton>
            ) : (
              <GlowButton
                className="w-full h-10 mt-4 sm:w-auto sm:mt-0 min-w-[120px]"
                disabled={!connection.oauthConfigured || isConnecting}
                onClick={() => onConnect(connection.platform)}
              >
                <Link2 className="w-4 h-4 mr-1.5" />
                {isConnecting ? 'Redirection...' : 'Connecter'}
              </GlowButton>
            )}
          </div>
        )}
      </div>
    </GlowCard>
  );
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    setUser(getStoredUser<User>());
  }, []);

  useEffect(() => {
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const message = searchParams.get('message');
    if (!status || !platform) return;

    const label = PLATFORM_META[platform]?.label || platform;
    if (status === 'success') {
      setToast({ type: 'success', message: `${label} connecté avec succès.` });
      queryClient.invalidateQueries({ queryKey: ['platform-connections'] });
      queryClient.invalidateQueries({ queryKey: ['platform-analytics'] });
    } else {
      setToast({
        type: 'error',
        message: `Échec connexion ${label}${message ? ` : ${message}` : ''}.`,
      });
    }

    window.history.replaceState({}, '', '/integrations');
  }, [searchParams, queryClient]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const canManage = user?.role === 'admin' || user?.role === 'editor';

  const { data, isLoading } = useQuery({
    queryKey: ['platform-connections'],
    queryFn: () => api.analytics.connections(),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.analytics.syncNow(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['platform-connections'] });
      setToast({ type: 'success', message: 'Synchronisation lancée avec succès.' });
    },
    onError: (err: Error) => {
      setToast({ type: 'error', message: err.message || 'Échec de la synchronisation.' });
    },
  });

  const handleConnect = async (platform: string) => {
    setConnecting(platform);
    try {
      const { authorizationUrl } = await api.analytics.connect(platform);
      window.location.href = authorizationUrl;
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Impossible de démarrer la connexion OAuth.';
      setToast({ type: 'error', message: msg });
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    setDisconnecting(platform);
    try {
      await api.analytics.disconnect(platform);
      queryClient.invalidateQueries({ queryKey: ['platform-connections'] });
      queryClient.invalidateQueries({ queryKey: ['platform-analytics'] });
      setToast({ type: 'success', message: `${PLATFORM_META[platform]?.label || platform} déconnecté.` });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Échec de la déconnexion.';
      setToast({ type: 'error', message: msg });
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <TopBar
        title="Intégrations"
        subtitle="Connectez vos comptes YouTube, Spotify, TikTok et Instagram"
      />

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 flex items-center gap-3 p-4 rounded-[4px] border ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
              : 'bg-red-500/10 border-red-500/25 text-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <p className="text-sm">{toast.message}</p>
        </motion.div>
      )}

      <div className="card p-3 md:p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-tight text-[var(--text-primary)]">Synchronisation</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Auto toutes les 6 heures</p>
          </div>
          {canManage && (
            <button
              className="btn-secondary shrink-0"
              disabled={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
            >
              <RefreshCw className={`w-3 h-3 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              {syncMutation.isPending ? 'Sync...' : 'Sync maintenant'}
            </button>
          )}
        </div>
      </div>

      {!canManage && (
        <p className="text-sm text-slate-muted mb-4">
          Seuls les administrateurs et éditeurs peuvent gérer les connexions OAuth.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-32 rounded-[4px]" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {data?.connections.map((c) => (
            <PlatformConnectionCard
              key={c.platform}
              connection={c}
              canManage={!!canManage}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              connecting={connecting}
              disconnecting={disconnecting}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="skeleton h-24 rounded-[4px]" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-32 rounded-[4px]" />
          ))}
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}
