// Client-side password gate.
// VITE_PASSWORD_HASH is injected at build time from the ACCESS_PASSWORD secret.
// If the env var is missing or set to the disabled sentinel, the gate is off.

const PASSWORD_HASH = import.meta.env.VITE_PASSWORD_HASH || '';
const SESSION_KEY = 'atr-session';
const SESSION_DAYS = 7;

export function isAuthEnabled(): boolean {
  return Boolean(PASSWORD_HASH) && PASSWORD_HASH !== 'DISABLED';
}

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPassword(password: string): Promise<boolean> {
  if (!isAuthEnabled()) return true;
  const hashed = await sha256Hex(password);
  return hashed === PASSWORD_HASH;
}

export function startSession(): void {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ expires }));
}

export function isSessionValid(): boolean {
  if (!isAuthEnabled()) return true;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const { expires } = JSON.parse(raw);
    return typeof expires === 'number' && expires > Date.now();
  } catch {
    return false;
  }
}

export function endSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
