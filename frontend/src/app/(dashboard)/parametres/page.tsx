'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Youtube, Music, Settings, Bell, Users, Shield, Eye, EyeOff, RefreshCw, Lock } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Input, Textarea } from '@/components/ui/Input';
import { GlowButton } from '@/components/ui/GlowButton';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { avatarColorFromName, userInitials } from '@/lib/utils';
import type { User } from '@/types';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
] as const;

const TABS = [
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'spotify', label: 'Spotify', icon: Music },
  { id: 'app', label: 'Application', icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'security', label: 'Sécurité', icon: Shield },
] as const;

type TabId = (typeof TABS)[number]['id'];

function UserRoleSelect({
  user,
  isSelf,
  onChange,
}: {
  user: User;
  isSelf: boolean;
  onChange: (role: string) => void;
}) {
  return (
    <div className="relative w-full md:w-36">
      <select
        value={user.role}
        disabled={isSelf}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Rôle de ${user.fullname}`}
        className="input-base w-full text-sm min-h-[44px] md:min-h-[42px] pr-10 disabled:opacity-80 disabled:cursor-not-allowed"
      >
        {ROLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {isSelf && (
        <Lock
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none"
          aria-hidden
        />
      )}
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  onRoleChange,
}: {
  user: User;
  isSelf: boolean;
  onRoleChange: (role: string) => void;
}) {
  const bg = avatarColorFromName(user.fullname);

  return (
    <div
      className={`px-4 py-4 border-b border-white/10 last:border-b-0 ${
        isSelf ? 'bg-violet-500/[0.06]' : ''
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ backgroundColor: bg }}
            aria-hidden
          >
            {userInitials(user.fullname)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
              {user.fullname}
              {isSelf && (
                <span className="text-[10px] font-medium text-violet-400 ml-1.5 normal-case">
                  (vous)
                </span>
              )}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{user.email}</p>
          </div>
          <div className="hidden md:block shrink-0">
            <UserRoleSelect user={user} isSelf={isSelf} onChange={onRoleChange} />
          </div>
        </div>
        <div className="w-full md:hidden">
          <UserRoleSelect user={user} isSelf={isSelf} onChange={onRoleChange} />
        </div>
      </div>
    </div>
  );
}

export default function ParametresPage() {
  const [tab, setTab] = useState<TabId>('youtube');
  const [showKey, setShowKey] = useState(false);
  const [youtubeKey, setYoutubeKey] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [notificationForm, setNotificationForm] = useState({
    notification_email: '',
    smtp_user: '',
    notify_shooting_reminder: true,
    notify_sponsor_confirmed: true,
    notify_weekly_report: false,
  });
  const [smtpAppPassword, setSmtpAppPassword] = useState('');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const toast = useToast();
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const { canManageUsers, canEdit } = usePermissions();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['settings-users'],
    queryFn: () => api.settings.users(),
    enabled: canManageUsers && tab === 'users',
  });

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string | null>) => api.settings.update(data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      const isNotifications = 'notification_email' in variables;
      toast.success(
        isNotifications
          ? 'Préférences de notification enregistrées'
          : 'Paramètres sauvegardés',
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!settings) return;
    setNotificationForm({
      notification_email: settings.notification_email || '',
      smtp_user: settings.smtp_user || '',
      notify_shooting_reminder: settings.notify_shooting_reminder !== 'false',
      notify_sponsor_confirmed: settings.notify_sponsor_confirmed !== 'false',
      notify_weekly_report: settings.notify_weekly_report === 'true',
    });
  }, [settings]);

  const testEmailMutation = useMutation({
    mutationFn: () => api.settings.testEmail(),
    onSuccess: (r) => toast.success(r.message),
    onError: (e: Error) => toast.error(e.message),
  });

  const testYoutube = useMutation({
    mutationFn: () => api.youtube.test(),
    onSuccess: (r) => (r.ok || r.connected) ? toast.success(r.message) : toast.error(r.message),
    onError: (e: Error) => toast.error(e.message),
  });

  const syncYoutube = useMutation({
    mutationFn: () => api.youtube.syncAll(),
    onSuccess: (r) => toast.success(`${r.synced}/${r.total} épisodes synchronisés`),
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => api.users.updateRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-users'] });
      toast.success('Rôle mis à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      api.auth.changePassword({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      }),
    onSuccess: (r) => {
      toast.success(r.message);
      setPasswordForm({ current: '', next: '', confirm: '' });
      setPasswordError('');
    },
    onError: (e: Error) => setPasswordError(e.message),
  });

  const validateNotificationEmail = (email: string, prefs: typeof notificationForm) => {
    const anyEnabled =
      prefs.notify_shooting_reminder ||
      prefs.notify_sponsor_confirmed ||
      prefs.notify_weekly_report;
    if (anyEnabled && !email.trim()) {
      return "L'email de notification est requis lorsqu'une alerte est activée";
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Adresse email invalide';
    }
    return '';
  };

  const handleSaveNotifications = () => {
    const email = notificationForm.notification_email.trim();
    const error = validateNotificationEmail(email, notificationForm);
    if (error) {
      setNotificationError(error);
      toast.error(error);
      return;
    }
    setNotificationError('');
    const payload: Record<string, string> = {
      notification_email: email,
      smtp_user: notificationForm.smtp_user.trim() || email,
      notify_shooting_reminder: notificationForm.notify_shooting_reminder ? 'true' : 'false',
      notify_sponsor_confirmed: notificationForm.notify_sponsor_confirmed ? 'true' : 'false',
      notify_weekly_report: notificationForm.notify_weekly_report ? 'true' : 'false',
    };
    if (smtpAppPassword.trim()) payload.smtp_app_password = smtpAppPassword.trim().replace(/\s/g, '');
    saveMutation.mutate(payload, {
      onSuccess: () => setSmtpAppPassword(''),
    });
  };

  const handleSave = () => {
    if (tab === 'notifications') {
      handleSaveNotifications();
      return;
    }
    const payload: Record<string, string | null> = { ...form };
    if (youtubeKey) payload.youtube_api_key = youtubeKey;
    saveMutation.mutate(payload);
  };

  const handleRoleChange = (userId: number, role: string) => {
    roleMutation.mutate({ id: userId, role });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (passwordForm.next.length < 8) {
      setPasswordError('Le mot de passe doit avoir au moins 8 caractères');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }
    changePasswordMutation.mutate();
  };

  const s = settings || {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0 max-w-full overflow-x-hidden">
      <TopBar title="Paramètres" showSearch={false} />

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-52 shrink-0 space-y-1">
          {TABS.map((t) => {
            if (t.id === 'users' && !canManageUsers) return null;
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  tab === t.id ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20' : 'text-[var(--text-muted)] hover:bg-white/[0.03]'
                }`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 glass-panel p-4 md:p-6 min-w-0 overflow-hidden">
          {isLoading ? <p className="text-[var(--text-muted)]">Chargement...</p> : (
            <>
              {tab === 'youtube' && (
                <div className="space-y-5">
                  <h2 className="text-lg font-bold">YouTube Data API</h2>
                  <div className="relative">
                    <Input label="YouTube API Key" type={showKey ? 'text' : 'password'}
                      placeholder={s.youtube_api_key_masked || 'Entrez votre clé API'}
                      value={youtubeKey} onChange={(e) => setYoutubeKey(e.target.value)} />
                    <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-9 btn-ghost p-1">
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3 min-w-0">
                    <GlowButton className="w-full md:w-auto min-h-[48px] md:min-h-0 justify-center" onClick={() => testYoutube.mutate()} disabled={testYoutube.isPending}>
                      Tester la connexion
                    </GlowButton>
                    {canEdit && (
                    <button className="btn-secondary w-full md:w-auto min-h-[48px] md:min-h-0 justify-center" onClick={() => syncYoutube.mutate()} disabled={syncYoutube.isPending}>
                      <RefreshCw className={`w-3 h-3 ${syncYoutube.isPending ? 'animate-spin' : ''}`} /> Synchroniser
                    </button>
                    )}
                  </div>
                  {s.youtube_last_sync && <p className="text-xs text-[var(--text-muted)]">Dernière sync : {new Date(s.youtube_last_sync).toLocaleString('fr-FR')}</p>}
                </div>
              )}

              {tab === 'spotify' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">Spotify</h2>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    Les écoutes Spotify ne sont pas disponibles via une API publique gratuite.
                    Saisissez-les manuellement dans chaque fiche épisode.
                  </p>
                  <Input label="Lien chaîne Spotify" placeholder="https://open.spotify.com/show/..."
                    defaultValue={s.spotify_channel_url || ''}
                    onChange={(e) => setForm({ ...form, spotify_channel_url: e.target.value })} />
                </div>
              )}

              {tab === 'app' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">Application</h2>
                  <Input label="Nom du podcast" defaultValue={s.podcast_name || ''} onChange={(e) => setForm({ ...form, podcast_name: e.target.value })} />
                  <Textarea label="Description" defaultValue={s.podcast_description || ''} onChange={(e) => setForm({ ...form, podcast_description: e.target.value })} rows={3} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Langue par défaut" defaultValue={s.default_language || 'fr'} onChange={(e) => setForm({ ...form, default_language: e.target.value })} />
                    <Input label="Devise" defaultValue={s.default_currency || 'MAD'} onChange={(e) => setForm({ ...form, default_currency: e.target.value })} />
                  </div>
                  <Input label="Fuseau horaire" defaultValue={s.timezone || 'Africa/Casablanca'} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
                </div>
              )}

              {tab === 'notifications' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">Notifications</h2>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Les alertes sont envoyées à l&apos;email ci-dessous. Utilisez un mot de passe d&apos;application Gmail
                    du <strong className="text-[var(--text-secondary)]">même compte</strong> que le compte d&apos;envoi
                    (activez la validation en 2 étapes sur Google, puis créez un mot de passe sur{' '}
                    <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-violet-300 underline">
                      myaccount.google.com/apppasswords
                    </a>
                    ).
                  </p>
                  <Input
                    label="Email de notification (destinataire)"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={notificationForm.notification_email}
                    error={notificationError}
                    onChange={(e) => {
                      setNotificationForm({ ...notificationForm, notification_email: e.target.value });
                      if (notificationError) setNotificationError('');
                    }}
                  />
                  <Input
                    label="Compte Gmail d'envoi (SMTP)"
                    type="email"
                    placeholder={notificationForm.notification_email || 'Même que l\'email de notification'}
                    value={notificationForm.smtp_user}
                    onChange={(e) => setNotificationForm({ ...notificationForm, smtp_user: e.target.value })}
                  />
                  <div className="relative">
                    <Input
                      label="Mot de passe d'application Gmail"
                      type={showSmtpPass ? 'text' : 'password'}
                      placeholder={s.smtp_app_password_masked || 'Collez le mot de passe d\'application (16 caractères)'}
                      value={smtpAppPassword}
                      onChange={(e) => setSmtpAppPassword(e.target.value)}
                    />
                    <button type="button" onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute right-3 top-9 btn-ghost p-1">
                      {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {[
                    { key: 'notify_shooting_reminder' as const, label: 'Rappel tournage J-7' },
                    { key: 'notify_sponsor_confirmed' as const, label: 'Alerte sponsor confirmé' },
                    { key: 'notify_weekly_report' as const, label: 'Rapport hebdomadaire' },
                  ].map((n) => (
                    <label key={n.key} className="flex items-center gap-3 text-sm cursor-pointer min-h-[44px]">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-violet-500"
                        checked={notificationForm[n.key]}
                        onChange={(e) =>
                          setNotificationForm({ ...notificationForm, [n.key]: e.target.checked })
                        }
                      />
                      {n.label}
                    </label>
                  ))}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <GlowButton
                      type="button"
                      variant="ghost"
                      onClick={() => testEmailMutation.mutate()}
                      disabled={testEmailMutation.isPending}
                    >
                      {testEmailMutation.isPending ? 'Envoi...' : 'Tester l\'envoi email'}
                    </GlowButton>
                    <span className="text-[10px] text-[var(--text-muted)]">Enregistrez d&apos;abord si vous venez de modifier le mot de passe.</span>
                  </div>
                </div>
              )}

              {tab === 'users' && canManageUsers && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">Utilisateurs</h2>
                  <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden md:max-w-2xl">
                    {users.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-[var(--text-muted)]">Aucun utilisateur.</p>
                    ) : (
                      users.map((u: User) => (
                        <UserRow
                          key={u.id}
                          user={u}
                          isSelf={currentUser?.id === u.id}
                          onRoleChange={(role) => handleRoleChange(u.id, role)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              {tab === 'security' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">Sécurité</h2>
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <Input
                      label="Mot de passe actuel"
                      type="password"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    />
                    <Input
                      label="Nouveau mot de passe"
                      type="password"
                      value={passwordForm.next}
                      onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                    />
                    <p className="text-xs text-[var(--text-muted)] -mt-2">Minimum 8 caractères</p>
                    <Input
                      label="Confirmer"
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    />
                    {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
                    <GlowButton type="submit" size="sm" disabled={changePasswordMutation.isPending}>
                      {changePasswordMutation.isPending ? 'Mise à jour...' : 'Mettre à jour'}
                    </GlowButton>
                  </form>
                </div>
              )}

              {tab !== 'users' && tab !== 'security' && canEdit && (
                <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
                  <GlowButton className="w-full md:w-auto min-h-[48px] md:min-h-0 justify-center" onClick={handleSave} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Sauvegarde...' : 'Enregistrer'}
                  </GlowButton>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
