"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Nav() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const r = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' });
        const data = await r.json();
        if (!mounted) return;
        setUser(data.user || null);
      } catch (e) {
        if (!mounted) return;
        setUser(null);
      }
    }

    load();

    function onAuthChanged() {
      load();
    }

    window.addEventListener('auth:changed', onAuthChanged);
    return () => { mounted = false; window.removeEventListener('auth:changed', onAuthChanged); };
  }, []);

  if (!user) return null;

  async function handleSignOut(e) {
    e.preventDefault();
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (err) {
      // ignore
    }
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
