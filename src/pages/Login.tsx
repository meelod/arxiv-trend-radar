import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthEnabled, startSession, verifyPassword } from '../lib/auth';

export default function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isAuthEnabled()) {
    // Auth is off entirely; bounce to home
    navigate('/', { replace: true });
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const ok = await verifyPassword(password);
    setBusy(false);
    if (ok) {
      startSession();
      navigate('/', { replace: true });
    } else {
      setError('Wrong password.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1">arxiv-trend-radar</h1>
        <p className="text-zinc-500 text-sm mb-6">Enter password to continue.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            placeholder="Password"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || !password}
            className="w-full py-2 bg-accent-500 text-white rounded-lg font-medium hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Checking…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
