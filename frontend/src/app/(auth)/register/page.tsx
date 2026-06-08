'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Radio } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { GlowButton } from '@/components/ui/GlowButton';
import { api } from '@/lib/api';
import { setAuth } from '@/lib/auth';
import type { User } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullname: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.auth.register(form);
      setAuth(res.accessToken, res.user as User);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
      <div className="absolute inset-0 bg-gradient-radial-blue opacity-50 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] relative"
      >
        <div className="gradient-border">
          <div className="inner glass-strong p-8 md:p-10 rounded-[15px]">
            <div className="flex items-center gap-4 mb-8">
              <Radio className="w-10 h-10 text-brand-yellow" strokeWidth={2} />
              <h1 className="text-xl font-bold">Créer un compte</h1>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Nom complet"
                value={form.fullname}
                onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <Input
                label="Mot de passe (8+ caractères)"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <GlowButton type="submit" className="w-full" disabled={loading}>
                {loading ? 'Création...' : "S'inscrire"}
              </GlowButton>
            </form>
            <p className="text-center text-xs text-slate-muted mt-8">
              <Link href="/login" className="text-brand-blue hover:text-brand-yellow font-semibold">
                Déjà un compte ?
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
