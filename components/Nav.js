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
