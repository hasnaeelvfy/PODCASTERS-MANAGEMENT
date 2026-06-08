'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Radio } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { setAuth } from '@/lib/auth';
import type { User } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.auth.login({ email, password });
      setAuth(res.accessToken, res.user as User);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-[320px] bg-surface border border-white/[0.08] rounded-[4px] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-[4px] bg-gold flex items-center justify-center">
            <Radio className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">EL MAAKOUL</h1>
            <p className="text-label text-white/30">CRM PODCAST</p>
          </div>
        </div>

        <div className="section-number mb-4">CONNEXION</div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <p className="text-[10px] text-red-400 font-semibold mt-1.5">{error}</p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full h-11 mt-6">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-xs text-white/30 mt-8">
          Pas de compte ?{' '}
          <Link href="/register" className="text-gold hover:text-gold/70 font-semibold transition-colors">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
