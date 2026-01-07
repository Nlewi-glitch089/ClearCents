"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StaffLinks() {
  const [role, setRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' });
        const data = await res.json();
        if (!mounted) return;
        setRole(data?.user?.role || null);
      } catch (e) {
        if (!mounted) return;
        setRole(null);
      }
    }

    load();

    function onAuthChanged() { load(); }
    window.addEventListener('auth:changed', onAuthChanged);
    return () => { mounted = false; window.removeEventListener('auth:changed', onAuthChanged); };
  }, []);

  if (!role) return null;
  if (role !== 'coach' && role !== 'instructor') return null;

  return (
    <>
      <Link href="/rubric" className="nav-link">Rubric</Link>
      <Link href="/reflection" className="nav-link">Reflection</Link>
    </>
  );
}
