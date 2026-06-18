"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Nav() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const r = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'include' });
        const data = await r.json();
        if (!mounted) return;
        setUser(data.user || null);
      } catch (e) {
        console.error('[nav:fetch-me]', e);
        if (!mounted) return;
        setUser(null);
      }
    }

    load();

    function onAuthChanged() { load(); }
    function onStorage(e) { if (e.key === 'clearcents:auth') load(); }

    window.addEventListener('auth:changed', onAuthChanged);
    window.addEventListener('storage', onStorage);
    return () => { mounted = false; window.removeEventListener('auth:changed', onAuthChanged); };
  }, []);

  if (!user) return null;

  async function handleSignOut(e) {
    e.preventDefault();
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('[nav:logout]', err);
    }
    try { window.dispatchEvent(new CustomEvent('auth:changed')); } catch (e) { /* ignore */ }
    // After signing out, send the user to the sign-in page
    window.location = '/auth';
  }

  return (
    <>
      <Link href="/profile">Profile</Link>
      <button type="button" onClick={handleSignOut} className="signout-btn">
        Sign out
      </button>
    </>
  );
}
