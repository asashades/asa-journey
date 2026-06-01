'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInAsGuest } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        if (!displayName.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, displayName);
      }
      router.push('/write');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      if (message.includes('user-not-found') || message.includes('wrong-password')) {
        setError('Wrong email or password, no cap');
      } else if (message.includes('email-already-in-use')) {
        setError('Email already taken, try another one');
      } else if (message.includes('weak-password')) {
        setError('Password too weak, needs at least 6 chars');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push('/write');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('popup-closed-by-user')) {
        setError('Popup closed, but no worries');
      } else {
        setError('Google sign-in failed, try again');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInAsGuest();
      router.push('/write');
    } catch (err: unknown) {
      setError('Guest mode failed, no worries try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold font-serif text-[#2F3331] mb-2">
          ASA Journey
        </h1>
        <p className="text-[#6F7476] font-light">your daily vibe, documented</p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 border border-[#CCD0CF] shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'register' && (
            <div>
              <label className="block text-sm text-[#6F7476] mb-2 font-light">yo, what's your name?</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#F2F2F3] border border-[#CCD0CF] rounded-xl px-4 py-3 text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none focus:border-[#5D8AFF] transition-colors"
                placeholder="your name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-[#6F7476] mb-2 font-light">email vibes</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#F2F2F3] border border-[#CCD0CF] rounded-xl px-4 py-3 text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none focus:border-[#5D8AFF] transition-colors"
              placeholder="you@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-[#6F7476] mb-2 font-light">password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#F2F2F3] border border-[#CCD0CF] rounded-xl px-4 py-3 text-[#2F3331] placeholder-[#A3A7A8] focus:outline-none focus:border-[#5D8AFF] transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-[#FF453A] text-sm py-2 font-light">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#00DC7D] text-white font-semibold hover:bg-[#00B866] transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                loading...
              </span>
            ) : mode === 'login' ? 'sign in' : 'create account'}
          </button>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#CCD0CF]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-[#A3A7A8]">or just vibe</span>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3.5 rounded-xl border border-[#CCD0CF] text-[#2F3331] hover:bg-[#F2F2F3] transition-colors flex items-center justify-center gap-3 disabled:opacity-50 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              continue with google
            </button>

            <button
              onClick={handleGuestSignIn}
              disabled={loading}
              className="w-full py-3.5 rounded-xl border border-[#CCD0CF] text-[#6F7476] hover:bg-[#F2F2F3] hover:text-[#2F3331] transition-colors disabled:opacity-50 font-light"
            >
              just browsing as guest
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-[#6F7476] font-light">
          {mode === 'login' ? (
            <>
              no account yet?{' '}
              <button onClick={() => setMode('register')} className="text-[#00DC7D] font-medium hover:underline">
                sign up
              </button>
            </>
          ) : (
            <>
              already vibing?{' '}
              <button onClick={() => setMode('login')} className="text-[#00DC7D] font-medium hover:underline">
                sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
