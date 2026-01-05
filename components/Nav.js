"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Nav() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setUser(data.user || null);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
      });
    return () => (mounted = false);
  }, []);

  if (!user) return null;

  async function handleSignOut(e) {
    e.preventDefault();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      // ignore
    }
    window.location = '/';
  }

  return (
    <>
      <Link href="/profile">Profile</Link>
      <button onClick={handleSignOut} style={{ marginLeft: 8, background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 6 }}>
        Sign out
      </button>
    </>
  );
}
