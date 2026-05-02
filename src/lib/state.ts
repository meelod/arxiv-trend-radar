/**
 * localStorage-backed UI state: bookmarks, read papers, filters.
 * All client-side. No server. Bookmarks survive refresh; clearing browser
 * storage drops them.
 */

const BOOKMARKS_KEY = 'atr-bookmarks';
const READ_KEY = 'atr-read';
const HIDE_READ_KEY = 'atr-hide-read';

export type BookmarkEntry = {
  id: string;
  title: string;
  authors?: string[];
  abs?: string;
  categories?: string[];
  paper_date?: string;
  bookmarked_at: string; // ISO string
  reason?: string;       // Optional snippet of "why_it_matters" or one_liner
};

// ---- Bookmarks ----

export function getBookmarks(): BookmarkEntry[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function isBookmarked(id: string): boolean {
  return getBookmarks().some((b) => b.id === id);
}

export function addBookmark(entry: Omit<BookmarkEntry, 'bookmarked_at'>): void {
  const existing = getBookmarks();
  if (existing.some((b) => b.id === entry.id)) return;
  const next: BookmarkEntry = { ...entry, bookmarked_at: new Date().toISOString() };
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([next, ...existing]));
  notify();
}

export function removeBookmark(id: string): void {
  const next = getBookmarks().filter((b) => b.id !== id);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
  notify();
}

export function toggleBookmark(entry: Omit<BookmarkEntry, 'bookmarked_at'>): void {
  if (isBookmarked(entry.id)) removeBookmark(entry.id);
  else addBookmark(entry);
}

// ---- Read state ----

function readSet(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function isRead(id: string): boolean {
  return readSet().has(id);
}

export function toggleRead(id: string): void {
  const set = readSet();
  if (set.has(id)) set.delete(id);
  else set.add(id);
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(set)));
  notify();
}

export function getReadIds(): Set<string> {
  return readSet();
}

// ---- Hide-read filter ----

export function getHideRead(): boolean {
  return localStorage.getItem(HIDE_READ_KEY) === '1';
}

export function setHideRead(v: boolean): void {
  localStorage.setItem(HIDE_READ_KEY, v ? '1' : '0');
  notify();
}

// ---- Subscribe ----
// Tiny pub-sub so React components can re-render after another component mutates state.

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}
export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
